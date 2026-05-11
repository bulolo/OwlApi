package service

import (
	"context"

	"github.com/bulolo/owlapi/internal/domain"
)

type PlatformSettingsService interface {
	Get(ctx context.Context) (*domain.PlatformSettings, error)
	Update(ctx context.Context, allowSelfRegister bool) (*domain.PlatformSettings, error)
}

type platformSettingsService struct {
	repo domain.PlatformSettingsRepository
}

func NewPlatformSettingsService(repo domain.PlatformSettingsRepository) PlatformSettingsService {
	return &platformSettingsService{repo: repo}
}

func (s *platformSettingsService) Get(ctx context.Context) (*domain.PlatformSettings, error) {
	return s.repo.Get(ctx)
}

func (s *platformSettingsService) Update(ctx context.Context, allowSelfRegister bool) (*domain.PlatformSettings, error) {
	settings := &domain.PlatformSettings{AllowSelfRegister: allowSelfRegister}
	if err := s.repo.Update(ctx, settings); err != nil {
		return nil, err
	}
	return settings, nil
}
