package service

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"sync"
	"time"

	"github.com/hongjunyao/owlapi/internal/domain"
	"github.com/hongjunyao/owlapi/internal/pb"
)

var (
	ErrGatewayNotConnected = errors.New("gateway not connected")
	ErrDatasourceNotFound  = errors.New("datasource env not found")
	ErrQueryTimeout        = errors.New("query execution timeout")
)

type QueryService interface {
	Execute(ctx context.Context, tenantID, gatewayID string, endpoint *domain.APIEndpoint, params map[string]string) (*pb.QueryResult, error)
	ExecuteDirect(ctx context.Context, tenantID, gatewayID, dsn, sql string) (*pb.QueryResult, error)
	NotifyResult(result *pb.QueryResult)
}

type queryService struct {
	gateways   GatewayService
	dsRepo     domain.DataSourceRepository
	scriptRepo domain.ScriptRepository
	pending    sync.Map
}

func NewQueryService(gateways GatewayService, dsRepo domain.DataSourceRepository, scriptRepo domain.ScriptRepository) QueryService {
	return &queryService{gateways: gateways, dsRepo: dsRepo, scriptRepo: scriptRepo}
}

func generateRequestID() string {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		// Fallback to timestamp if crypto/rand fails
		return fmt.Sprintf("req_%d", time.Now().UnixNano())
	}
	return "req_" + hex.EncodeToString(b)
}

func (s *queryService) Execute(ctx context.Context, tenantID, gatewayID string, endpoint *domain.APIEndpoint, params map[string]string) (*pb.QueryResult, error) {
	stream := s.gateways.GetStream(tenantID, gatewayID)
	if stream == nil {
		return nil, fmt.Errorf("%w: gateway %s for tenant %s", ErrGatewayNotConnected, gatewayID, tenantID)
	}

	dsEnv, err := s.dsRepo.GetDataSourceEnv(ctx, endpoint.DataSourceID, "prod")
	if err != nil {
		return nil, fmt.Errorf("%w: datasource %d: %v", ErrDatasourceNotFound, endpoint.DataSourceID, err)
	}

	// Resolve scripts — distinguish "not found" from real DB errors
	var preScript, postScript string
	if endpoint.PreScriptID > 0 {
		sc, err := s.scriptRepo.GetScriptByID(ctx, endpoint.TenantID, endpoint.PreScriptID)
		if err != nil {
			return nil, fmt.Errorf("pre_script %d lookup failed: %w", endpoint.PreScriptID, err)
		}
		preScript = sc.Code
	}
	if endpoint.PostScriptID > 0 {
		sc, err := s.scriptRepo.GetScriptByID(ctx, endpoint.TenantID, endpoint.PostScriptID)
		if err != nil {
			return nil, fmt.Errorf("post_script %d lookup failed: %w", endpoint.PostScriptID, err)
		}
		postScript = sc.Code
	}

	requestID := generateRequestID()
	resultChan := make(chan *pb.QueryResult, 1)
	s.pending.Store(requestID, resultChan)
	defer s.pending.Delete(requestID)

	err = stream.Send(&pb.ServerMessage{
		Payload: &pb.ServerMessage_ExecuteQuery{
			ExecuteQuery: &pb.ExecuteQueryRequest{
				RequestId:      requestID,
				DatasourceId:   dsEnv.DSN,
				Sql:            endpoint.SQL,
				Params:         params,
				TimeoutSeconds: 30,
				PreScript:      preScript,
				PostScript:     postScript,
			},
		},
	})
	if err != nil {
		return nil, err
	}

	timer := time.NewTimer(35 * time.Second)
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

func (s *queryService) ExecuteDirect(ctx context.Context, tenantID, gatewayID, dsn, sqlStr string) (*pb.QueryResult, error) {
	stream := s.gateways.GetStream(tenantID, gatewayID)
	if stream == nil {
		return nil, fmt.Errorf("%w: gateway %s", ErrGatewayNotConnected, gatewayID)
	}

	requestID := generateRequestID()
	resultChan := make(chan *pb.QueryResult, 1)
	s.pending.Store(requestID, resultChan)
	defer s.pending.Delete(requestID)

	err := stream.Send(&pb.ServerMessage{
		Payload: &pb.ServerMessage_ExecuteQuery{
			ExecuteQuery: &pb.ExecuteQueryRequest{
				RequestId:      requestID,
				DatasourceId:   dsn,
				Sql:            sqlStr,
				TimeoutSeconds: 30,
			},
		},
	})
	if err != nil {
		return nil, err
	}

	timer := time.NewTimer(35 * time.Second)
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
