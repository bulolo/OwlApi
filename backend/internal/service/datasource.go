package service

import (
	"context"

	"github.com/bulolo/owlapi/internal/domain"
)

type DataSourceService interface {
	List(ctx context.Context, tenantID int64, p domain.ListParams) ([]*domain.DataSource, int, error)
	GetByID(ctx context.Context, tenantID, id int64) (*domain.DataSource, error)
	GetEnv(ctx context.Context, datasourceID int64, env string) (*domain.DataSourceEnv, error)
	Create(ctx context.Context, ds *domain.DataSource) error
	Update(ctx context.Context, ds *domain.DataSource) error
	Delete(ctx context.Context, tenantID, id int64) error
}

type dataSourceService struct{ repo domain.DataSourceRepository }

func NewDataSourceService(repo domain.DataSourceRepository) DataSourceService {
	return &dataSourceService{repo: repo}
}

func (s *dataSourceService) List(ctx context.Context, tenantID int64, p domain.ListParams) ([]*domain.DataSource, int, error) {
	return s.repo.ListDataSources(ctx, tenantID, p)
}

func (s *dataSourceService) GetByID(ctx context.Context, tenantID, id int64) (*domain.DataSource, error) {
	return s.repo.GetDataSourceByID(ctx, tenantID, id)
}

func (s *dataSourceService) Create(ctx context.Context, ds *domain.DataSource) error {
	existing, _ := s.repo.GetDataSourceByName(ctx, ds.TenantID, ds.Name)
	if existing != nil {
		return domain.ErrConflictf("datasource name '%s' already exists", ds.Name)
	}
	return s.repo.CreateDataSource(ctx, ds)
}

func (s *dataSourceService) Update(ctx context.Context, ds *domain.DataSource) error {
	return s.repo.UpdateDataSource(ctx, ds)
}

func (s *dataSourceService) Delete(ctx context.Context, tenantID, id int64) error {
	return s.repo.DeleteDataSource(ctx, tenantID, id)
}

func (s *dataSourceService) GetEnv(ctx context.Context, datasourceID int64, env string) (*domain.DataSourceEnv, error) {
	return s.repo.GetDataSourceEnv(ctx, datasourceID, env)
}
