package service

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"strconv"
	"sync"
	"time"

	"github.com/bulolo/owlapi/internal/domain"
	"github.com/bulolo/owlapi/internal/pb"
)

var (
	ErrQueryTimeout = errors.New("query execution timeout")
)

type QueryService interface {
	Execute(ctx context.Context, tenantID string, envID int64, endpoint *domain.APIEndpoint, params map[string]string) (*pb.QueryResult, error)
	ExecuteDirect(ctx context.Context, tenantID, gatewayID, dsn, sql string) (*pb.QueryResult, error)
	NotifyResult(result *pb.QueryResult)
}

type queryService struct {
	gateways          GatewayBroker
	envs              EnvironmentService
	scripts           ScriptService
	pending           sync.Map
	serverWaitSeconds int
}

func NewQueryService(gateways GatewayBroker, envs EnvironmentService, scripts ScriptService, serverWaitSeconds int) QueryService {
	if serverWaitSeconds <= 0 {
		serverWaitSeconds = 35
	}
	return &queryService{gateways: gateways, envs: envs, scripts: scripts, serverWaitSeconds: serverWaitSeconds}
}

func generateRequestID() string {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return fmt.Sprintf("req_%d", time.Now().UnixNano())
	}
	return "req_" + hex.EncodeToString(b)
}

// Execute resolves the endpoint's datasource_alias within the given env to a
// physical DataSource, then dispatches the SQL through the bound gateway.
func (s *queryService) Execute(ctx context.Context, tenantID string, envID int64, endpoint *domain.APIEndpoint, params map[string]string) (*pb.QueryResult, error) {
	ds, err := s.envs.Resolve(ctx, endpoint.TenantID, envID, endpoint.DataSourceAlias)
	if err != nil {
		return nil, domain.ErrBadRequestf("alias '%s' not bound in this env", endpoint.DataSourceAlias)
	}

	gatewayID := strconv.FormatInt(ds.GatewayID, 10)
	stream := s.gateways.GetStream(gatewayID)
	if stream == nil {
		return nil, domain.ErrUnavailablef("gateway %s not connected", gatewayID)
	}

	preScripts, err := s.resolveChain(ctx, endpoint.TenantID, endpoint.PreScripts, "pre_script")
	if err != nil {
		return nil, err
	}
	postScripts, err := s.resolveChain(ctx, endpoint.TenantID, endpoint.PostScripts, "post_script")
	if err != nil {
		return nil, err
	}

	requestID := generateRequestID()
	resultChan := make(chan *pb.QueryResult, 1)
	s.pending.Store(requestID, resultChan)
	defer s.pending.Delete(requestID)

	err = stream.Send(&pb.ServerMessage{
		Payload: &pb.ServerMessage_ExecuteQuery{
			ExecuteQuery: &pb.ExecuteQueryRequest{
				RequestId:      requestID,
				Dsn:            ds.DSN,
				DbType:         "",
				Sql:            endpoint.SQL,
				Params:         params,
				TimeoutSeconds: 30,
				PreScripts:     preScripts,
				PostScripts:    postScripts,
			},
		},
	})
	if err != nil {
		return nil, err
	}

	timer := time.NewTimer(time.Duration(s.serverWaitSeconds) * time.Second)
	defer timer.Stop()

	select {
	case res := <-resultChan:
		return res, nil
	case <-ctx.Done():
		return nil, ctx.Err()
	case <-timer.C:
		return nil, ErrQueryTimeout
	}
}

// resolveChain turns an ordered pre/post chain into the JS code strings sent to
// the gateway. Inline steps use their own code; library steps resolve code by ID.
// Empty-code steps are skipped so they don't perturb the chain.
func (s *queryService) resolveChain(ctx context.Context, tenantID int64, steps []domain.ScriptStep, label string) ([]string, error) {
	var codes []string
	for _, step := range steps {
		switch step.Source {
		case domain.ScriptStepInline:
			if step.Code != "" {
				codes = append(codes, step.Code)
			}
		case domain.ScriptStepLibrary:
			if step.ScriptID <= 0 {
				continue
			}
			sc, err := s.scripts.GetByID(ctx, tenantID, step.ScriptID)
			if err != nil {
				return nil, domain.ErrInternalf("%s %d lookup failed: %v", label, step.ScriptID, err)
			}
			if sc.Code != "" {
				codes = append(codes, sc.Code)
			}
		}
	}
	return codes, nil
}

func (s *queryService) ExecuteDirect(ctx context.Context, tenantID, gatewayID, dsn, sqlStr string) (*pb.QueryResult, error) {
	stream := s.gateways.GetStream(gatewayID)
	if stream == nil {
		return nil, domain.ErrUnavailablef("gateway %s not connected", gatewayID)
	}

	requestID := generateRequestID()
	resultChan := make(chan *pb.QueryResult, 1)
	s.pending.Store(requestID, resultChan)
	defer s.pending.Delete(requestID)

	err := stream.Send(&pb.ServerMessage{
		Payload: &pb.ServerMessage_ExecuteQuery{
			ExecuteQuery: &pb.ExecuteQueryRequest{
				RequestId:      requestID,
				Dsn:            dsn,
				DbType:         "",
				Sql:            sqlStr,
				TimeoutSeconds: 30,
			},
		},
	})
	if err != nil {
		return nil, err
	}

	timer := time.NewTimer(time.Duration(s.serverWaitSeconds) * time.Second)
	defer timer.Stop()

	select {
	case res := <-resultChan:
		return res, nil
	case <-ctx.Done():
		return nil, ctx.Err()
	case <-timer.C:
		return nil, ErrQueryTimeout
	}
}

func (s *queryService) NotifyResult(result *pb.QueryResult) {
	if val, ok := s.pending.Load(result.RequestId); ok {
		ch := val.(chan *pb.QueryResult)
		ch <- result
	}
}
