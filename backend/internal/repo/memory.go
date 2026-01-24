package repo

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/hongjunyao/owlapi/internal/domain"
)

type memoryRepo struct {
	runners   sync.Map // map[string]*domain.Runner
	endpoints sync.Map // map[string]*domain.APIEndpoint
	configs   sync.Map // map[string]*domain.AIProxyConfig
}

func NewMemoryRepo() domain.RunnerRepository {
	return &memoryRepo{}
}

func NewProjectRepo(mr *memoryRepo) domain.ProjectRepository {
	return mr
}

func GetMemoryRepoInstance() *memoryRepo {
	return &memoryRepo{}
}

// RunnerRepository implementation
func (r *memoryRepo) Create(ctx context.Context, runner *domain.Runner) error {
	r.runners.Store(runner.ID, runner)
	return nil
}

func (r *memoryRepo) GetByID(ctx context.Context, id string) (*domain.Runner, error) {
	val, ok := r.runners.Load(id)
	if !ok {
		return nil, fmt.Errorf("runner not found")
	}
	return val.(*domain.Runner), nil
}

func (r *memoryRepo) UpdateStatus(ctx context.Context, id string, status string) error {
	runner, err := r.GetByID(ctx, id)
	if err != nil {
		return err
	}
	runner.Status = status
	runner.LastSeen = time.Now()
	r.runners.Store(id, runner)
	return nil
}

func (r *memoryRepo) Heartbeat(ctx context.Context, id string) error {
	return r.UpdateStatus(ctx, id, "online")
}

// ProjectRepository implementation
func (r *memoryRepo) GetDataSourceByID(ctx context.Context, id string) (*domain.DataSource, error) {
	return nil, fmt.Errorf("not implemented")
}

func (r *memoryRepo) GetAPIEndpointByPath(ctx context.Context, path string) (*domain.APIEndpoint, error) {
	val, ok := r.endpoints.Load(path)
	if !ok {
		return nil, fmt.Errorf("endpoint not found")
	}
	return val.(*domain.APIEndpoint), nil
}

func (r *memoryRepo) GetAIProxyConfigByID(ctx context.Context, id string) (*domain.AIProxyConfig, error) {
	val, ok := r.configs.Load(id)
	if !ok {
		return nil, fmt.Errorf("ai config not found")
	}
	return val.(*domain.AIProxyConfig), nil
}

// Helper methods for initialization
func (r *memoryRepo) AddEndpoint(endpoint *domain.APIEndpoint) {
	r.endpoints.Store(endpoint.Path, endpoint)
}
