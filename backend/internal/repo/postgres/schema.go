package postgres

import (
	"context"
	"database/sql"
	"embed"
	"fmt"
	"io/fs"
	"log/slog"

	"github.com/bulolo/owlapi/internal/edition"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/jackc/pgx/v5/stdlib"
	"github.com/pressly/goose/v3"
)

//go:embed migrations/*.sql
var migrationFS embed.FS

// EEMigrationSource is an EE module's standalone migration set.
// Each source gets its own goose tracking table so applying / rolling back is
// independent of core schema versioning.
type EEMigrationSource struct {
	Name string // unique slug, e.g. "sdk_publish"; used to derive table name
	FS   fs.FS  // embed.FS rooted somewhere containing the migration dir
	Dir  string // path inside FS, e.g. "migrations"
}

var eeMigrationSources []EEMigrationSource

// RegisterEEMigrationSource is called from EE module init() at import time.
// CE builds have nothing registered → empty slice → no-op.
func RegisterEEMigrationSource(src EEMigrationSource) {
	eeMigrationSources = append(eeMigrationSources, src)
}

type DB struct {
	Pool *pgxpool.Pool
}

func NewDB(ctx context.Context, dsn string) (*DB, error) {
	cfg, err := pgxpool.ParseConfig(dsn)
	if err != nil {
		return nil, fmt.Errorf("failed to parse DSN: %w", err)
	}
	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		return nil, fmt.Errorf("failed to create pool: %w", err)
	}
	if err := pool.Ping(ctx); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}
	db := &DB{Pool: pool}
	// 只跑核心 schema。EE 迁移依赖 edition.IsLicensed()，而 edition.Init 又依赖核心表
	// system_meta 里的 installation_id（安装绑定），故 EE 迁移拆出到 MigrateEE()，
	// 由调用方在 edition.Init 之后显式调用。
	if err := db.migrateCore(); err != nil {
		return nil, fmt.Errorf("failed to run core migrations: %w", err)
	}
	return db, nil
}

func (db *DB) migrateCore() error {
	sqlDB := stdlib.OpenDBFromPool(db.Pool)
	defer func() {
		if err := sqlDB.Close(); err != nil {
			slog.Warn("failed to close migration db handle", "error", err)
		}
	}()

	if err := goose.SetDialect("postgres"); err != nil {
		return fmt.Errorf("goose set dialect: %w", err)
	}
	goose.SetBaseFS(migrationFS)
	goose.SetTableName("goose_db_version")
	if err := goose.Up(sqlDB, "migrations"); err != nil {
		return fmt.Errorf("goose up: %w", err)
	}
	slog.Info("Core database migrations applied successfully")
	return nil
}

// MigrateEE 跑 EE 模块迁移，仅在已授权时执行；每个模块用独立的版本表，与核心 schema 解耦。
// 必须在 edition.Init 之后调用（它读 edition.IsLicensed()）。CE 构建 eeMigrationSources 为空 → no-op。
func (db *DB) MigrateEE() error {
	if !edition.IsLicensed() || len(eeMigrationSources) == 0 {
		return nil
	}
	sqlDB := stdlib.OpenDBFromPool(db.Pool)
	defer func() {
		if err := sqlDB.Close(); err != nil {
			slog.Warn("failed to close ee migration db handle", "error", err)
		}
	}()
	if err := goose.SetDialect("postgres"); err != nil {
		return fmt.Errorf("goose set dialect: %w", err)
	}
	for _, src := range eeMigrationSources {
		if err := runEEMigrations(sqlDB, src); err != nil {
			return fmt.Errorf("ee migration %q: %w", src.Name, err)
		}
	}
	return nil
}

func runEEMigrations(sqlDB *sql.DB, src EEMigrationSource) error {
	goose.SetBaseFS(src.FS)
	goose.SetTableName(fmt.Sprintf("goose_ee_%s_version", src.Name))
	defer func() {
		// Reset goose globals so subsequent EE sources don't leak state across iterations.
		goose.SetBaseFS(nil)
		goose.SetTableName("goose_db_version")
	}()

	dir := src.Dir
	if dir == "" {
		dir = "migrations"
	}
	if err := goose.Up(sqlDB, dir); err != nil {
		return err
	}
	slog.Info("EE migrations applied", "module", src.Name)
	return nil
}
