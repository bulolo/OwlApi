package service

import (
	"context"
	"fmt"
	"strconv"
	"sync"
	"time"

	"github.com/hongjunyao/owlapi/internal/domain"
	"github.com/hongjunyao/owlapi/internal/pb"
)

type QueryService interface {
	Execute(ctx context.Context, tenantID, gatewayID string, endpoint *domain.APIEndpoint, params map[string]string) (*pb.QueryResult, error)
	ExecuteDirect(ctx context.Context, tenantID, gatewayID, dsn, sql string) (*pb.QueryResult, error)
	NotifyResult(result *pb.QueryResult)
}

type queryService struct {
	gateways GatewayService
	repo     domain.ProjectRepository
	pending  sync.Map
}

func NewQueryService(gateways GatewayService, repo domain.ProjectRepository) QueryService {
	return &queryService{gateways: gateways, repo: repo}
}

func (s *queryService) Execute(ctx context.Context, tenantID, gatewayID string, endpoint *domain.APIEndpoint, params map[string]string) (*pb.QueryResult, error) {
	stream := s.gateways.GetStream(tenantID, gatewayID)
	if stream == nil {
		return nil, fmt.Errorf("gateway %s not connected for tenant %s", gatewayID, tenantID)
	}

	// Resolve: endpoint → project → datasource → env → DSN
	tid, _ := strconv.ParseInt(tenantID, 10, 64)
	project, err := s.repo.GetProjectByID(ctx, tid, endpoint.ProjectID)
	if err != nil {
		return nil, fmt.Errorf("project %d not found: %v", endpoint.ProjectID, err)
	}
	// Default to prod env for query execution
	dsEnv, err := s.repo.GetDataSourceEnv(ctx, project.DataSourceID, "prod")
	if err != nil {
		return nil, fmt.Errorf("datasource env not found for datasource %d: %v", project.DataSourceID, err)
	}

	requestID := fmt.Sprintf("req_%d", time.Now().UnixNano())
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
			},
		},
	})
	if err != nil {
		return nil, err
	}

	select {
	case res := <-resultChan:
		return res, nil
	case <-ctx.Done():
		return nil, ctx.Err()
	case <-time.After(35 * time.Second):
		return nil, fmt.Errorf("query execution timeout")
	}
}

func (s *queryService) ExecuteDirect(ctx context.Context, tenantID, gatewayID, dsn, sqlStr string) (*pb.QueryResult, error) {
	stream := s.gateways.GetStream(tenantID, gatewayID)
	if stream == nil {
		return nil, fmt.Errorf("gateway %s not connected", gatewayID)
	}

	requestID := fmt.Sprintf("req_%d", time.Now().UnixNano())
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

	select {
	case res := <-resultChan:
		return res, nil
	case <-ctx.Done():
		return nil, ctx.Err()
	case <-time.After(35 * time.Second):
		return nil, fmt.Errorf("query execution timeout")
	}
}

func (s *queryService) NotifyResult(result *pb.QueryResult) {
	if val, ok := s.pending.Load(result.RequestId); ok {
		ch := val.(chan *pb.QueryResult)
		ch <- result
	}
}
