package postgres

import (
	"context"

	"github.com/bulolo/owlapi/internal/domain"
)

type PlatformSettingsRepo struct{ DB *DB }

func (r *PlatformSettingsRepo) Get(ctx context.Context) (*domain.PlatformSettings, error) {
	var s domain.PlatformSettings
	err := r.DB.Pool.QueryRow(ctx, `SELECT allow_self_register FROM platform_settings WHERE id=1`).
		Scan(&s.AllowSelfRegister)
	if err != nil {
		return nil, err
	}
	return &s, nil
}

func (r *PlatformSettingsRepo) Update(ctx context.Context, s *domain.PlatformSettings) error {
	_, err := r.DB.Pool.Exec(ctx,
		`UPDATE platform_settings SET allow_self_register=$1 WHERE id=1`,
		s.AllowSelfRegister,
	)
	return err
}
