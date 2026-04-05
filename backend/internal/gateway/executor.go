package gateway

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log/slog"
	"strings"
	"sync"
	"time"

	"github.com/hongjunyao/owlapi/internal/pb"
	_ "github.com/jackc/pgx/v5/stdlib" // PostgreSQL driver
	_ "modernc.org/sqlite"             // SQLite driver
)

// Executor manages database connections and executes SQL queries.
type Executor struct {
	mu    sync.RWMutex
	conns map[string]*sql.DB
}

func NewExecutor() *Executor {
	return &Executor{conns: make(map[string]*sql.DB)}
}

// resolveDriver determines the sql.Open driver name from a DSN string.
func resolveDriver(dsn string) string {
	if strings.HasPrefix(dsn, "postgres://") || strings.HasPrefix(dsn, "postgresql://") {
		return "pgx"
	}
	if strings.Contains(dsn, "mysql") || strings.Contains(dsn, ":3306") || strings.Contains(dsn, ":9030") {
		return "mysql"
	}
	if strings.HasPrefix(dsn, "sqlserver://") || strings.Contains(dsn, ":1433") {
		return "sqlserver"
	}
	if strings.HasSuffix(dsn, ".db") || strings.HasSuffix(dsn, ".sqlite") || strings.Contains(dsn, "sqlite") {
		return "sqlite"
	}
	return "pgx"
}

func (e *Executor) getConn(dsn string) (*sql.DB, error) {
	e.mu.RLock()
	if db, ok := e.conns[dsn]; ok {
		e.mu.RUnlock()
		return db, nil
	}
	e.mu.RUnlock()

	e.mu.Lock()
	defer e.mu.Unlock()

	if db, ok := e.conns[dsn]; ok {
		return db, nil
	}

	driver := resolveDriver(dsn)
	db, err := sql.Open(driver, dsn)
	if err != nil {
		return nil, fmt.Errorf("open %s: %w", driver, err)
	}
	db.SetMaxOpenConns(10)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(5 * time.Minute)

	e.conns[dsn] = db
	slog.Info("Opened database connection", "driver", driver, "dsn", dsn)
	return db, nil
}

// replaceParams substitutes @key placeholders in SQL with values from params map.
func replaceParams(sql string, params map[string]string) string {
	if len(params) == 0 {
		return sql
	}
	for k, v := range params {
		sql = strings.ReplaceAll(sql, "@"+k, "'"+strings.ReplaceAll(v, "'", "''")+"'")
	}
	return sql
}

func (e *Executor) Execute(req *pb.ExecuteQueryRequest) *pb.QueryResult {
	start := time.Now()

	if req.DatasourceId == "" {
		return &pb.QueryResult{RequestId: req.RequestId, Success: false, Error: "datasource DSN is empty"}
	}

	db, err := e.getConn(req.DatasourceId)
	if err != nil {
		return &pb.QueryResult{RequestId: req.RequestId, Success: false, Error: fmt.Sprintf("connect failed: %v", err)}
	}

	finalSQL := replaceParams(req.Sql, req.Params)
	rows, err := db.Query(finalSQL)
	if err != nil {
		return &pb.QueryResult{RequestId: req.RequestId, Success: false, Error: fmt.Sprintf("query failed: %v", err)}
	}
	defer rows.Close()

	columns, err := rows.Columns()
	if err != nil {
		return &pb.QueryResult{RequestId: req.RequestId, Success: false, Error: fmt.Sprintf("columns failed: %v", err)}
	}

	var results []map[string]interface{}
	for rows.Next() {
		values := make([]interface{}, len(columns))
		ptrs := make([]interface{}, len(columns))
		for i := range values {
			ptrs[i] = &values[i]
		}
		if err := rows.Scan(ptrs...); err != nil {
			return &pb.QueryResult{RequestId: req.RequestId, Success: false, Error: fmt.Sprintf("scan failed: %v", err)}
		}
		row := make(map[string]interface{}, len(columns))
		for i, col := range columns {
			val := values[i]
			if b, ok := val.([]byte); ok {
				val = string(b)
			}
			row[col] = val
		}
		results = append(results, row)
	}

	jsonData, err := json.Marshal(results)
	if err != nil {
		return &pb.QueryResult{RequestId: req.RequestId, Success: false, Error: fmt.Sprintf("marshal failed: %v", err)}
	}

	return &pb.QueryResult{
		RequestId:       req.RequestId,
		Success:         true,
		Data:            jsonData,
		RowsAffected:    int64(len(results)),
		ExecutionTimeMs: time.Since(start).Milliseconds(),
	}
}

// InitDemoData creates demo tables and sample data in the given SQLite database.
func (e *Executor) InitDemoData(dsn string) {
	db, err := e.getConn(dsn)
	if err != nil {
		slog.Error("Failed to init demo data", "dsn", dsn, "error", err)
		return
	}

	queries := []string{
		`CREATE TABLE IF NOT EXISTS users (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL,
			email TEXT NOT NULL UNIQUE,
			role TEXT NOT NULL DEFAULT 'user',
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS products (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL,
			price REAL NOT NULL,
			stock INTEGER NOT NULL DEFAULT 0,
			category TEXT NOT NULL DEFAULT 'general',
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS orders (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			user_id INTEGER NOT NULL,
			product_id INTEGER NOT NULL,
			quantity INTEGER NOT NULL DEFAULT 1,
			total REAL NOT NULL,
			status TEXT NOT NULL DEFAULT 'pending',
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)`,
	}

	for _, q := range queries {
		if _, err := db.Exec(q); err != nil {
			slog.Error("Failed to create demo table", "error", err)
			return
		}
	}

	// Insert sample data (idempotent — skip if data exists)
	var count int
	db.QueryRow("SELECT COUNT(*) FROM users").Scan(&count)
	if count > 0 {
		slog.Info("Demo data already exists, skipping")
		return
	}

	seedSQL := []string{
		`INSERT INTO users (name, email, role) VALUES
			('张三', 'zhangsan@example.com', 'admin'),
			('李四', 'lisi@example.com', 'user'),
			('王五', 'wangwu@example.com', 'user'),
			('赵六', 'zhaoliu@example.com', 'viewer'),
			('钱七', 'qianqi@example.com', 'user')`,
		`INSERT INTO products (name, price, stock, category) VALUES
			('MacBook Pro 14"', 14999.00, 50, 'electronics'),
			('iPhone 16 Pro', 8999.00, 200, 'electronics'),
			('AirPods Pro 2', 1899.00, 500, 'electronics'),
			('机械键盘 K8', 599.00, 150, 'peripherals'),
			('4K 显示器 27"', 2499.00, 80, 'peripherals'),
			('USB-C 扩展坞', 399.00, 300, 'peripherals'),
			('编程书籍套装', 199.00, 1000, 'books'),
			('Go 语言圣经', 89.00, 500, 'books')`,
		`INSERT INTO orders (user_id, product_id, quantity, total, status) VALUES
			(1, 1, 1, 14999.00, 'completed'),
			(1, 3, 2, 3798.00, 'completed'),
			(2, 2, 1, 8999.00, 'shipped'),
			(2, 4, 1, 599.00, 'pending'),
			(3, 5, 2, 4998.00, 'completed'),
			(3, 7, 3, 597.00, 'shipped'),
			(4, 6, 1, 399.00, 'pending'),
			(5, 8, 2, 178.00, 'completed'),
			(5, 1, 1, 14999.00, 'shipped')`,
	}

	for _, q := range seedSQL {
		if _, err := db.Exec(q); err != nil {
			slog.Error("Failed to seed demo data", "error", err)
			return
		}
	}

	slog.Info("Demo data initialized", "dsn", dsn)
}
