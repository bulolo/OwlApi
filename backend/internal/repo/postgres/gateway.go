package postgres

import (
	"context"
	"fmt"
	"time"

	"github.com/bulolo/owlapi/internal/domain"
)

type GatewayRepo struct{ DB *DB }

var _ domain.GatewayRepository = (*GatewayRepo)(nil)

func (r *GatewayRepo) Create(ctx context.Context, gw *domain.Gateway) error {
	var tenantID *int64
	if !gw.IsPlatform {
		tenantID = &gw.TenantID
	}
	return r.DB.Pool.QueryRow(ctx,
		`INSERT INTO gateways (tenant_id, is_platform, name, token, status, version, last_seen)
		 VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
		tenantID, gw.IsPlatform, gw.Name, gw.Token, gw.Status, gw.Version, time.Now(),
	).Scan(&gw.ID)
}

func (r *GatewayRepo) GetByID(ctx context.Context, tenantID, id int64) (*domain.Gateway, error) {
	var gw domain.Gateway
	var tid *int64
	err := r.DB.Pool.QueryRow(ctx,
		`SELECT id, tenant_id, is_platform, name, token, status, ip, last_seen, version
		 FROM gateways WHERE id=$1 AND (tenant_id=$2 OR is_platform=TRUE)`,
		id, tenantID,
	).Scan(&gw.ID, &tid, &gw.IsPlatform, &gw.Name, &gw.Token, &gw.Status, &gw.IP, &gw.LastSeen, &gw.Version)
	if err != nil {
		return nil, err
	}
	if tid != nil {
		gw.TenantID = *tid
	}
	return &gw, nil
}

func (r *GatewayRepo) GetByToken(ctx context.Context, token string) (*domain.Gateway, error) {
	var gw domain.Gateway
	var tid *int64
	err := r.DB.Pool.QueryRow(ctx,
		`SELECT id, tenant_id, is_platform, name, token, status, ip, last_seen, version
		 FROM gateways WHERE token=$1`,
		token,
	).Scan(&gw.ID, &tid, &gw.IsPlatform, &gw.Name, &gw.Token, &gw.Status, &gw.IP, &gw.LastSeen, &gw.Version)
	if err != nil {
		return nil, err
	}
	if tid != nil {
		gw.TenantID = *tid
	}
	return &gw, nil
}

func (r *GatewayRepo) UpdateStatus(ctx context.Context, id int64, status domain.GatewayStatus, ip string) error {
	_, err := r.DB.Pool.Exec(ctx,
		`UPDATE gateways SET status=$1, ip=$2, last_seen=$3 WHERE id=$4`,
		status, ip, time.Now(), id)
	return err
}

func (r *GatewayRepo) List(ctx context.Context, tenantID int64, p domain.ListParams) ([]*domain.Gateway, int, error) {
	where := "WHERE (tenant_id=$1 OR is_platform=TRUE)"
	args := []interface{}{tenantID}
	argN := 2
	if p.Keyword != "" {
		where += fmt.Sprintf(" AND (name ILIKE $%d OR ip ILIKE $%d)", argN, argN)
		args = append(args, "%"+p.Keyword+"%")
		argN++
	}

	var total int
	if err := r.DB.Pool.QueryRow(ctx, `SELECT COUNT(*) FROM gateways `+where, args...).Scan(&total); err != nil {
		return nil, 0, err
	}
	pgSuffix, pgArgs := appendPagination(p, argN, args)
	rows, err := r.DB.Pool.Query(ctx,
		fmt.Sprintf(`SELECT id, tenant_id, is_platform, name, token, status, ip, last_seen, version
		             FROM gateways %s ORDER BY is_platform DESC, id%s`, where, pgSuffix),
		pgArgs...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var list []*domain.Gateway
	for rows.Next() {
		var gw domain.Gateway
		var tid *int64
		if err := rows.Scan(&gw.ID, &tid, &gw.IsPlatform, &gw.Name, &gw.Token, &gw.Status, &gw.IP, &gw.LastSeen, &gw.Version); err != nil {
			return nil, 0, err
		}
		if tid != nil {
			gw.TenantID = *tid
		}
		list = append(list, &gw)
	}
	return list, total, rows.Err()
}

func (r *GatewayRepo) Delete(ctx context.Context, tenantID, id int64) error {
	_, err := r.DB.Pool.Exec(ctx,
		`DELETE FROM gateways WHERE tenant_id=$1 AND id=$2 AND is_platform=FALSE`,
		tenantID, id)
	return err
}
