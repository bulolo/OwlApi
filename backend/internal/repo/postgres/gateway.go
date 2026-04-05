package postgres

import (
	"context"
	"time"

	"github.com/hongjunyao/owlapi/internal/domain"
)

type GatewayRepo struct{ DB *DB }

var _ domain.GatewayRepository = (*GatewayRepo)(nil)

func (r *GatewayRepo) Create(ctx context.Context, gw *domain.Gateway) error {
	return r.DB.Pool.QueryRow(ctx,
		`INSERT INTO gateways (tenant_id, name, token, status, version, last_seen) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
		gw.TenantID, gw.Name, gw.Token, gw.Status, gw.Version, time.Now()).Scan(&gw.ID)
}

func (r *GatewayRepo) GetByID(ctx context.Context, tenantID, id int64) (*domain.Gateway, error) {
	var gw domain.Gateway
	err := r.DB.Pool.QueryRow(ctx,
		`SELECT id, tenant_id, name, token, status, ip, last_seen, version FROM gateways WHERE tenant_id=$1 AND id=$2`,
		tenantID, id).Scan(&gw.ID, &gw.TenantID, &gw.Name, &gw.Token, &gw.Status, &gw.IP, &gw.LastSeen, &gw.Version)
	if err != nil {
		return nil, err
	}
	return &gw, nil
}

func (r *GatewayRepo) UpdateStatus(ctx context.Context, tenantID, id int64, status domain.GatewayStatus, ip string) error {
	_, err := r.DB.Pool.Exec(ctx,
		`UPDATE gateways SET status=$1, ip=$2, last_seen=$3 WHERE tenant_id=$4 AND id=$5`,
		status, ip, time.Now(), tenantID, id)
	return err
}

func (r *GatewayRepo) List(ctx context.Context, tenantID int64) ([]*domain.Gateway, error) {
	rows, err := r.DB.Pool.Query(ctx,
		`SELECT id, tenant_id, name, token, status, ip, last_seen, version FROM gateways WHERE tenant_id=$1 ORDER BY id`,
		tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []*domain.Gateway
	for rows.Next() {
		var gw domain.Gateway
		if err := rows.Scan(&gw.ID, &gw.TenantID, &gw.Name, &gw.Token, &gw.Status, &gw.IP, &gw.LastSeen, &gw.Version); err != nil {
			return nil, err
		}
		list = append(list, &gw)
	}
	return list, nil
}

func (r *GatewayRepo) Delete(ctx context.Context, tenantID, id int64) error {
	_, err := r.DB.Pool.Exec(ctx,
		`DELETE FROM gateways WHERE tenant_id=$1 AND id=$2`, tenantID, id)
	return err
}
