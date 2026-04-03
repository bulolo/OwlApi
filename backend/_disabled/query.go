package service

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/hongjunyao/owlapi/internal/domain"
	"github.com/hongjunyao/owlapi/internal/pb"
)

type QueryService interface {
	Execute(ctx context.Context, tenantID, runnerID string, endpoint *domain.APIEndpoint, params map[string]string) (*pb.QueryResult, error)
	NotifyResult(result *pb.QueryResult)
}

type queryService struct {
	runnerService RunnerService
	repo          domain.ProjectRepository
	pending       sync.Map // map[string]chan *pb.QueryResult
}

func NewQueryService(runnerService RunnerService, repo domain.ProjectRepository) QueryService {
	return &queryService{
		runnerService: runnerService,
		repo:          repo,
	}
}

func (s *queryService) Execute(ctx context.Context, tenantID, runnerID string, endpoint *domain.APIEndpoint, params map[string]string) (*pb.QueryResult, error) {
	stream := s.runnerService.GetStream(tenantID, runnerID)
	if stream == nil {
		return nil, fmt.Errorf("runner %s not connected for tenant %s", runnerID, tenantID)
	}

	requestID := fmt.Sprintf("req_%d", time.Now().UnixNano())
	resultChan := make(chan *pb.QueryResult, 1)
	s.pending.Store(requestID, resultChan)
	defer s.pending.Delete(requestID)

	// Send execution request to Agent
	err := stream.Send(&pb.ServerMessage{
		Payload: &pb.ServerMessage_ExecuteQuery{
			ExecuteQuery: &pb.ExecuteQueryRequest{
				RequestId:    requestID,
				DatasourceId: endpoint.DataSourceID,
				Sql:          endpoint.SQL,
				Params:       params,
				TimeoutSeconds: 30,
			},
		},
	})
	if err != nil {
		return nil, err
	}

	// Wait for result or timeout
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
