package gateway

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log/slog"
	"regexp"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/dop251/goja"
	"github.com/bulolo/owlapi/internal/pb"
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

// redactDSN masks credentials in a DSN for safe logging.
var reCredentials = regexp.MustCompile(`://([^:]+):([^@]+)@`)

func redactDSN(dsn string) string {
	return reCredentials.ReplaceAllString(dsn, "://$1:***@")
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
	slog.Info("Opened database connection", "driver", driver, "dsn", redactDSN(dsn))
	return db, nil
}

// allowedSQLPrefixes defines the SQL statement types that are permitted.
var allowedSQLPrefixes = []string{"SELECT", "INSERT", "UPDATE", "DELETE", "WITH"}

// validateSQLStatement checks that a SQL statement starts with an allowed keyword.
func validateSQLStatement(stmt string) error {
	upper := strings.TrimSpace(strings.ToUpper(stmt))
	for _, prefix := range allowedSQLPrefixes {
		if strings.HasPrefix(upper, prefix) {
			return nil
		}
	}
	return fmt.Errorf("forbidden SQL statement type: only SELECT/INSERT/UPDATE/DELETE/WITH are allowed")
}

// buildQueryArgs substitutes :key placeholders in SQL with driver-specific placeholders
// and extracts the arguments into a slice.
func buildQueryArgs(sqlText string, params map[string]string, driver string) (string, []interface{}) {
	if len(params) == 0 && !strings.Contains(sqlText, ":") {
		return sqlText, nil
	}

	var args []interface{}
	counter := 1
	var sb strings.Builder

	inQuote := false
	i := 0
	for i < len(sqlText) {
		ch := sqlText[i]
		if ch == '\'' && (i == 0 || sqlText[i-1] != '\\') {
			inQuote = !inQuote
			sb.WriteByte(ch)
			i++
			continue
		}

		if !inQuote && ch == ':' {
			j := i + 1
			for j < len(sqlText) && isAlphaNum(sqlText[j]) {
				j++
			}
			if j > i+1 {
				key := sqlText[i+1 : j]
				if val, ok := params[key]; ok {
					args = append(args, val)
					switch driver {
					case "pgx":
						sb.WriteString(fmt.Sprintf("$%d", counter))
					case "sqlserver":
						sb.WriteString(fmt.Sprintf("@p%d", counter))
					default: // mysql, sqlite
						sb.WriteString("?")
					}
					counter++
					i = j
					continue
				}
			}
		}

		sb.WriteByte(ch)
		i++
	}

	return sb.String(), args
}

// reNamedParam matches :word placeholders (excluding ::type_casts in PostgreSQL).
var reNamedParam = regexp.MustCompile(`:([a-zA-Z_]\w*)`)

// stripUnresolvedConditions removes AND / OR sub-clauses that still contain
// unresolved :placeholder tokens after replaceParams has run.
func stripUnresolvedConditions(sql string, params map[string]string) string {
	if !reNamedParam.MatchString(sql) {
		return sql
	}

	upper := strings.ToUpper(sql)

	whereIdx := -1
	depth := 0
	for i := 0; i < len(upper); i++ {
		switch upper[i] {
		case '(':
			depth++
		case ')':
			depth--
		case 'W':
			if depth == 0 && i+5 <= len(upper) && upper[i:i+5] == "WHERE" {
				whereIdx = i
			}
		}
	}
	if whereIdx < 0 {
		return sql
	}

	clauseEnd := len(sql)
	depth = 0
	terminators := []string{"GROUP BY", "ORDER BY", "LIMIT", "HAVING", "UNION"}
	for i := whereIdx + 5; i < len(upper); i++ {
		switch upper[i] {
		case '(':
			depth++
		case ')':
			depth--
		}
		if depth == 0 {
			for _, t := range terminators {
				if i+len(t) <= len(upper) && upper[i:i+len(t)] == t {
					clauseEnd = i
					goto done
				}
			}
		}
	}
done:

	before := sql[:whereIdx+5]
	whereBody := sql[whereIdx+5 : clauseEnd]
	after := sql[clauseEnd:]

	pieces := splitConditions(whereBody)

	var kept []condPiece
	for _, p := range pieces {
		var unresolved bool
		matches := reNamedParam.FindAllStringSubmatch(p.expr, -1)
		for _, m := range matches {
			if _, ok := params[m[1]]; !ok {
				unresolved = true
				break
			}
		}
		if unresolved {
			continue
		}
		kept = append(kept, p)
	}

	if len(kept) == 0 {
		result := strings.TrimSpace(sql[:whereIdx])
		if t := strings.TrimSpace(after); t != "" {
			result += " " + t
		}
		return result
	}

	var sb strings.Builder
	sb.WriteString(before)
	for i, p := range kept {
		if i == 0 {
			sb.WriteString(" " + strings.TrimSpace(p.expr))
		} else {
			sb.WriteString(" " + p.keyword + " " + strings.TrimSpace(p.expr))
		}
	}
	if strings.TrimSpace(after) != "" {
		sb.WriteString(" " + strings.TrimSpace(after))
	}

	return sb.String()
}

type condPiece struct {
	keyword string
	expr    string
}

func splitConditions(body string) []condPiece {
	upper := strings.ToUpper(body)
	type marker struct {
		pos     int
		keyword string
		len     int
	}
	var markers []marker
	depth := 0
	for i := 0; i < len(upper); i++ {
		switch upper[i] {
		case '(':
			depth++
		case ')':
			depth--
		case 'A':
			if depth == 0 && i+3 <= len(upper) && upper[i:i+3] == "AND" &&
				(i == 0 || !isAlphaNum(upper[i-1])) &&
				(i+3 >= len(upper) || !isAlphaNum(upper[i+3])) {
				markers = append(markers, marker{pos: i, keyword: "AND", len: 3})
			}
		case 'O':
			if depth == 0 && i+2 <= len(upper) && upper[i:i+2] == "OR" &&
				(i == 0 || !isAlphaNum(upper[i-1])) &&
				(i+2 >= len(upper) || !isAlphaNum(upper[i+2])) {
				markers = append(markers, marker{pos: i, keyword: "OR", len: 2})
			}
		}
	}

	if len(markers) == 0 {
		return []condPiece{{keyword: "", expr: body}}
	}

	sort.Slice(markers, func(i, j int) bool { return markers[i].pos < markers[j].pos })

	var pieces []condPiece
	pieces = append(pieces, condPiece{keyword: "", expr: body[:markers[0].pos]})
	for i, m := range markers {
		end := len(body)
		if i+1 < len(markers) {
			end = markers[i+1].pos
		}
		pieces = append(pieces, condPiece{keyword: m.keyword, expr: body[m.pos+m.len : end]})
	}
	return pieces
}

func isAlphaNum(b byte) bool {
	return (b >= 'A' && b <= 'Z') || (b >= 'a' && b <= 'z') || (b >= '0' && b <= '9') || b == '_'
}

func (e *Executor) Execute(req *pb.ExecuteQueryRequest) *pb.QueryResult {
	start := time.Now()

	if req.DatasourceId == "" {
		return fail(req.RequestId, "datasource DSN is empty")
	}

	db, err := e.getConn(req.DatasourceId)
	if err != nil {
		return fail(req.RequestId, fmt.Sprintf("connect failed: %v", err))
	}

	// Pre-script: can modify params and optionally rewrite SQL
	params := req.Params
	sqlText := req.Sql
	if req.PreScript != "" {
		psr, err := runPreScript(req.PreScript, params, sqlText)
		if err != nil {
			return fail(req.RequestId, fmt.Sprintf("pre_script failed: %v", err))
		}
		params = psr.Params
		if psr.SQL != "" {
			sqlText = psr.SQL
		}
	}

	driver := resolveDriver(req.DatasourceId)

	// If SQL contains :limit/:offset but params don't provide them, strip the LIMIT clause
	if strings.Contains(sqlText, ":limit") {
		if _, hasLimit := params["limit"]; !hasLimit {
			sqlText = reLimitOffset.ReplaceAllString(sqlText, "")
		}
	}

	fullSQL := stripUnresolvedConditions(sqlText, params)

	// Auto-generate COUNT query only for paginated SELECT
	if req.PostScript != "" && strings.HasPrefix(strings.TrimSpace(strings.ToUpper(req.Sql)), "SELECT") &&
		reLimitOffset.MatchString(req.Sql) {
		countSQL := stripOrderBy(stripLimitOffset(req.Sql))
		countSQL = "SELECT COUNT(*) FROM (" + countSQL + ") AS _t"
		resolvedCountSQL := stripUnresolvedConditions(countSQL, params)

		countQuery, countArgs := buildQueryArgs(resolvedCountSQL, params, driver)
		var total int64
		if err := db.QueryRow(countQuery, countArgs...).Scan(&total); err == nil {
			params["_total"] = fmt.Sprintf("%d", total)
		}
	}

	// Split into multiple statements
	stmts := splitStatements(fullSQL)

	// Validate all statements before execution
	for _, stmt := range stmts {
		stmt = strings.TrimSpace(stmt)
		if stmt == "" {
			continue
		}
		if err := validateSQLStatement(stmt); err != nil {
			return fail(req.RequestId, err.Error())
		}
	}

	// Execute all statements in a transaction
	tx, err := db.Begin()
	if err != nil {
		return fail(req.RequestId, fmt.Sprintf("begin tx failed: %v", err))
	}

	var results []map[string]interface{}
	var totalAffected int64

	rollbackFail := func(msg string) *pb.QueryResult {
		if rbErr := tx.Rollback(); rbErr != nil {
			slog.Error("rollback failed", "error", rbErr)
		}
		return fail(req.RequestId, msg)
	}

	for i, stmt := range stmts {
		stmt = strings.TrimSpace(stmt)
		if stmt == "" {
			continue
		}

		stmtQuery, stmtArgs := buildQueryArgs(stmt, params, driver)
		upper := strings.ToUpper(stmt)
		isLast := i == len(stmts)-1
		isSelect := strings.HasPrefix(upper, "SELECT") || strings.HasPrefix(upper, "WITH")

		if isSelect {
			rows, err := tx.Query(stmtQuery, stmtArgs...)
			if err != nil {
				return rollbackFail(fmt.Sprintf("query failed: %v", err))
			}
			if isLast {
				results, err = scanRows(rows)
				rows.Close()
				if err != nil {
					return rollbackFail(err.Error())
				}
			} else {
				rows.Close()
			}
		} else {
			res, err := tx.Exec(stmtQuery, stmtArgs...)
			if err != nil {
				return rollbackFail(fmt.Sprintf("exec failed: %v", err))
			}
			affected, err := res.RowsAffected()
			if err != nil {
				slog.Warn("RowsAffected unavailable", "error", err)
			}
			totalAffected += affected
			if isLast {
				results = []map[string]interface{}{{"affected_rows": totalAffected}}
			}
		}
	}

	if err := tx.Commit(); err != nil {
		return fail(req.RequestId, fmt.Sprintf("commit failed: %v", err))
	}

	// Post-script
	if req.PostScript != "" {
		transformed, err := runPostScript(req.PostScript, results, params)
		if err != nil {
			return fail(req.RequestId, fmt.Sprintf("post_script failed: %v", err))
		}
		jsonData, err := json.Marshal(transformed)
		if err != nil {
			return fail(req.RequestId, fmt.Sprintf("marshal post_script result failed: %v", err))
		}
		return &pb.QueryResult{RequestId: req.RequestId, Success: true, Data: jsonData, RowsAffected: totalAffected, ExecutionTimeMs: time.Since(start).Milliseconds()}
	}

	jsonData, err := json.Marshal(results)
	if err != nil {
		return fail(req.RequestId, fmt.Sprintf("marshal result failed: %v", err))
	}
	return &pb.QueryResult{RequestId: req.RequestId, Success: true, Data: jsonData, RowsAffected: totalAffected, ExecutionTimeMs: time.Since(start).Milliseconds()}
}

func fail(requestId, msg string) *pb.QueryResult {
	return &pb.QueryResult{RequestId: requestId, Success: false, Error: msg}
}

func scanRows(rows *sql.Rows) ([]map[string]interface{}, error) {
	columns, err := rows.Columns()
	if err != nil {
		return nil, fmt.Errorf("columns failed: %v", err)
	}
	var results []map[string]interface{}
	for rows.Next() {
		values := make([]interface{}, len(columns))
		ptrs := make([]interface{}, len(columns))
		for i := range values {
			ptrs[i] = &values[i]
		}
		if err := rows.Scan(ptrs...); err != nil {
			return nil, fmt.Errorf("scan failed: %v", err)
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
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("rows iteration: %v", err)
	}
	return results, nil
}

func splitStatements(sql string) []string {
	var stmts []string
	var buf strings.Builder
	inQuote := false
	for i := 0; i < len(sql); i++ {
		ch := sql[i]
		if ch == '\'' && (i == 0 || sql[i-1] != '\\') {
			inQuote = !inQuote
		}
		if ch == ';' && !inQuote {
			if s := strings.TrimSpace(buf.String()); s != "" {
				stmts = append(stmts, s)
			}
			buf.Reset()
		} else {
			buf.WriteByte(ch)
		}
	}
	if s := strings.TrimSpace(buf.String()); s != "" {
		stmts = append(stmts, s)
	}
	return stmts
}

type preScriptResult struct {
	Params map[string]string
	SQL    string
}

const jsTimeout = 5 * time.Second

// runPreScript executes JS: function main(params, sql) { ... return { params, sql? }; }
// Enforces a timeout to prevent infinite loops.
func runPreScript(code string, params map[string]string, sql string) (*preScriptResult, error) {
	vm := goja.New()
	vm.SetFieldNameMapper(goja.UncapFieldNameMapper())

	// Set up timeout via interrupt
	timer := time.AfterFunc(jsTimeout, func() { vm.Interrupt("script execution timeout") })
	defer timer.Stop()

	if _, err := vm.RunString(code); err != nil {
		return nil, err
	}
	mainFn, ok := goja.AssertFunction(vm.Get("main"))
	if !ok {
		return &preScriptResult{Params: params}, nil
	}
	result, err := mainFn(goja.Undefined(), vm.ToValue(params), vm.ToValue(sql))
	if err != nil {
		return nil, err
	}

	out := &preScriptResult{Params: make(map[string]string)}
	obj := result.ToObject(vm)
	keys := obj.Keys()

	if hasKey(keys, "params") {
		pObj := obj.Get("params").ToObject(vm)
		for _, k := range pObj.Keys() {
			out.Params[k] = pObj.Get(k).String()
		}
		if sqlVal := obj.Get("sql"); sqlVal != nil && !goja.IsUndefined(sqlVal) && !goja.IsNull(sqlVal) {
			out.SQL = sqlVal.String()
		}
	} else {
		for _, k := range keys {
			out.Params[k] = obj.Get(k).String()
		}
	}
	return out, nil
}

func hasKey(keys []string, target string) bool {
	for _, k := range keys {
		if k == target {
			return true
		}
	}
	return false
}

var reLimitOffset = regexp.MustCompile(`(?i)\s+LIMIT\s+\S+\s+OFFSET\s+\S+`)

func stripLimitOffset(sql string) string {
	return reLimitOffset.ReplaceAllString(sql, "")
}

func stripOrderBy(sql string) string {
	depth := 0
	upper := strings.ToUpper(sql)
	lastOrderBy := -1
	for i := 0; i < len(upper); i++ {
		switch upper[i] {
		case '(':
			depth++
		case ')':
			depth--
		case 'O':
			if depth == 0 && i+8 <= len(upper) && upper[i:i+8] == "ORDER BY" {
				lastOrderBy = i
			}
		}
	}
	if lastOrderBy >= 0 {
		return strings.TrimSpace(sql[:lastOrderBy])
	}
	return sql
}

// runPostScript executes JS: function main(data, params) { ... return any; }
// Enforces a timeout to prevent infinite loops.
func runPostScript(code string, data []map[string]interface{}, params map[string]string) (interface{}, error) {
	vm := goja.New()
	vm.SetFieldNameMapper(goja.UncapFieldNameMapper())

	timer := time.AfterFunc(jsTimeout, func() { vm.Interrupt("script execution timeout") })
	defer timer.Stop()

	if _, err := vm.RunString(code); err != nil {
		return nil, err
	}
	mainFn, ok := goja.AssertFunction(vm.Get("main"))
	if !ok {
		return data, nil
	}
	result, err := mainFn(goja.Undefined(), vm.ToValue(data), vm.ToValue(params))
	if err != nil {
		return nil, err
	}
	return result.Export(), nil
}

// InitDemoData creates demo tables and sample data in the given SQLite database.
func (e *Executor) InitDemoData(dsn string) {
	db, err := e.getConn(dsn)
	if err != nil {
		slog.Error("Failed to init demo data", "dsn", redactDSN(dsn), "error", err)
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

	var count int
	if err := db.QueryRow("SELECT COUNT(*) FROM users").Scan(&count); err != nil {
		slog.Error("Failed to check demo data", "error", err)
		return
	}
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

	slog.Info("Demo data initialized", "dsn", redactDSN(dsn))
}
