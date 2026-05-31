package postgres

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
)

// EnsureInstallationID 读取或首次生成部署级 installation_id（持久化于 system_meta 单行）。
//
// 设计要点（K8s 友好）：
//   - 存 DB 而非主机名/硬件指纹 → 多副本共享同一库即共享同一 installation_id。
//   - 并发安全：多副本首次同时启动时，INSERT ... ON CONFLICT 保证只落一个值，
//     后到者读到先到者写入的同一 id。
//   - 先读后写：已存在则不写，仅首次启动写一次。
func (db *DB) EnsureInstallationID(ctx context.Context) (string, error) {
	var id string
	err := db.Pool.QueryRow(ctx, `SELECT installation_id FROM system_meta WHERE id=1`).Scan(&id)
	if err == nil && id != "" {
		return id, nil
	}
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return "", err
	}
	// 行不存在或 installation_id 为空：竞态安全地补一个 UUID（pg 侧生成，免引入 Go 依赖）。
	if _, err := db.Pool.Exec(ctx, `
		INSERT INTO system_meta (id, installation_id) VALUES (1, gen_random_uuid()::text)
		ON CONFLICT (id) DO UPDATE
		  SET installation_id = COALESCE(NULLIF(system_meta.installation_id, ''), EXCLUDED.installation_id)
	`); err != nil {
		return "", err
	}
	if err := db.Pool.QueryRow(ctx, `SELECT installation_id FROM system_meta WHERE id=1`).Scan(&id); err != nil {
		return "", err
	}
	return id, nil
}
