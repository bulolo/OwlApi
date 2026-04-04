package gateway

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/hongjunyao/owlapi/internal/pb"
)

type Executor struct{}

func NewExecutor() *Executor {
	return &Executor{}
}

func (e *Executor) Execute(req *pb.ExecuteQueryRequest) *pb.QueryResult {
	start := time.Now()

	// Mock execution: In a real implementation, you'd use a DB pool
	// identified by req.DatasourceId and execute req.Sql with req.Params.
	
	mockData := []map[string]interface{}{
		{"id": 1, "name": "Mock Result 1", "query": req.Sql},
		{"id": 2, "name": "Mock Result 2", "params": req.Params},
	}

	jsonData, err := json.Marshal(mockData)
	if err != nil {
		return &pb.QueryResult{
			RequestId: req.RequestId,
			Success:   false,
			Error:     fmt.Sprintf("failed to marshal result: %v", err),
		}
	}

	return &pb.QueryResult{
		RequestId:        req.RequestId,
		Success:          true,
		Data:             jsonData,
		RowsAffected:     int64(len(mockData)),
		ExecutionTimeMs:  time.Since(start).Milliseconds(),
	}
}
