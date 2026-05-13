package http

import (
	"encoding/json"
	"fmt"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/bulolo/owlapi/internal/domain"
	"github.com/bulolo/owlapi/internal/service"
	"github.com/gin-gonic/gin"
)

type QueryTestHandler struct {
	tenants     service.TenantService
	gateways    service.GatewayBroker
	queries     service.QueryService
	endpoints   service.APIEndpointService
	dataSources service.DataSourceService
}

// HandleTestQuery godoc
// @Summary 测试执行 API 端点
// @ID testQuery
// @Tags query
// @Security BearerAuth
// @Accept json
// @Produce json
// @Param slug path string true "租户slug"
// @Param body body object{endpoint_id=int,params=object,ignore_scripts=bool} true "测试参数"
// @Success 200 {object} object
// @Router /v1/tenants/{slug}/query/test [post]
func (h *QueryTestHandler) HandleTestQuery(c *gin.Context) {
	tenant := GetTenant(c)

	var req struct {
		EndpointID    int64             `json:"endpoint_id" binding:"required"`
		Params        map[string]string `json:"params"`
		IgnoreScripts bool              `json:"ignore_scripts"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		Fail(c, http.StatusBadRequest, err.Error())
		return
	}
	if req.Params == nil {
		req.Params = make(map[string]string)
	}

	endpoint, err := h.endpoints.GetByID(c.Request.Context(), tenant.ID, req.EndpointID)
	if err != nil {
		FailErr(c, domain.ErrNotFound("endpoint not found"))
		return
	}
	if req.IgnoreScripts {
		endpoint.PreScriptID = 0
		endpoint.PostScriptID = 0
	}

	ds, err := h.dataSources.GetByID(c.Request.Context(), tenant.ID, endpoint.DataSourceID)
	if err != nil || len(ds.Envs) == 0 {
		FailErr(c, domain.ErrNotFound("datasource env not found"))
		return
	}
	var prodEnv *domain.DataSourceEnv
	for _, e := range ds.Envs {
		if e.Env == "prod" {
			prodEnv = e
			break
		}
	}
	if prodEnv == nil {
		FailErr(c, domain.ErrNotFound("datasource prod env not found"))
		return
	}

	tenantID := strconv.FormatInt(tenant.ID, 10)
	gatewayID := strconv.FormatInt(prodEnv.GatewayID, 10)

	if stream := h.gateways.GetStream(gatewayID); stream == nil {
		FailErr(c, domain.ErrUnavailable(fmt.Sprintf("gateway %s is not connected", gatewayID)))
		return
	}

	result, err := h.queries.Execute(c.Request.Context(), tenantID, endpoint, req.Params)
	if err != nil {
		FailErr(c, err)
		return
	}
	if !result.Success {
		Fail(c, http.StatusInternalServerError, result.Error)
		return
	}
	c.Data(http.StatusOK, "application/json", result.Data)
}

type SchemaColumn struct {
	Name     string `json:"name"`
	Type     string `json:"type"`
	Nullable bool   `json:"nullable"`
}

type SchemaTable struct {
	Name    string         `json:"name"`
	Columns []SchemaColumn `json:"columns"`
}

const schemaSQLPostgres = `
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position
`

const schemaSQLMySQL = `
SELECT table_name, column_name, column_type AS data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = DATABASE()
ORDER BY table_name, ordinal_position
`

const schemaSQLSQLite = `
SELECT m.name AS table_name, p.name AS column_name, p.type AS data_type,
  CASE WHEN p."notnull" = 1 THEN 'NO' ELSE 'YES' END AS is_nullable
FROM sqlite_master m, pragma_table_info(m.name) p
WHERE m.type = 'table'
ORDER BY m.name, p.cid
`

const schemaSQLSQLServer = `
SELECT SCHEMA_NAME(t.schema_id) + '.' + t.name AS table_name,
  c.name AS column_name, tp.name AS data_type,
  CASE WHEN c.is_nullable = 1 THEN 'YES' ELSE 'NO' END AS is_nullable
FROM sys.tables t
JOIN sys.columns c ON t.object_id = c.object_id
JOIN sys.types tp ON c.user_type_id = tp.user_type_id
ORDER BY table_name, c.column_id
`

func schemaQueryForDSN(dsn string) string {
	if strings.HasPrefix(dsn, "postgres://") || strings.HasPrefix(dsn, "postgresql://") {
		return schemaSQLPostgres
	}
	if strings.HasPrefix(dsn, "sqlserver://") {
		return schemaSQLSQLServer
	}
	if strings.Contains(dsn, "@tcp(") || strings.Contains(dsn, "@(") {
		return schemaSQLMySQL
	}
	return schemaSQLSQLite
}

// HandleGetSchema godoc
// @Summary 获取数据源表结构
// @ID getDatasourceSchema
// @Tags query
// @Security BearerAuth
// @Produce json
// @Param slug path string true "租户slug"
// @Param datasourceId path int true "数据源ID"
// @Success 200 {object} object{data=[]object{name=string,columns=array}}
// @Router /v1/tenants/{slug}/datasources/{datasourceId}/schema [get]
func (h *QueryTestHandler) HandleGetSchema(c *gin.Context) {
	tenant := GetTenant(c)
	dsID, ok := pathInt64(c, "datasourceId")
	if !ok {
		return
	}

	ds, err := h.dataSources.GetByID(c.Request.Context(), tenant.ID, dsID)
	if err != nil || len(ds.Envs) == 0 {
		FailErr(c, domain.ErrNotFound("datasource not found"))
		return
	}
	var prodEnv *domain.DataSourceEnv
	for _, e := range ds.Envs {
		if e.Env == "prod" {
			prodEnv = e
			break
		}
	}
	if prodEnv == nil {
		FailErr(c, domain.ErrNotFound("datasource prod env not found"))
		return
	}

	tenantID := strconv.FormatInt(tenant.ID, 10)
	gatewayID := strconv.FormatInt(prodEnv.GatewayID, 10)

	if stream := h.gateways.GetStream(gatewayID); stream == nil {
		FailErr(c, domain.ErrUnavailable(fmt.Sprintf("gateway %s is not connected", gatewayID)))
		return
	}

	schemaSQL := schemaQueryForDSN(prodEnv.DSN)
	result, err := h.queries.ExecuteDirect(c.Request.Context(), tenantID, gatewayID, prodEnv.DSN, schemaSQL)
	if err != nil {
		FailErr(c, err)
		return
	}
	if !result.Success {
		Fail(c, http.StatusInternalServerError, result.Error)
		return
	}

	// Parse rows — use interface{} to handle any value type, then stringify.
	var rawRows []map[string]interface{}
	if err := json.Unmarshal(result.Data, &rawRows); err != nil {
		Fail(c, http.StatusInternalServerError, "failed to parse schema result")
		return
	}

	stringify := func(v interface{}) string {
		if v == nil {
			return ""
		}
		if s, ok := v.(string); ok {
			return s
		}
		return fmt.Sprintf("%v", v)
	}

	tableMap := make(map[string]*SchemaTable)
	tableOrder := []string{}
	for _, raw := range rawRows {
		// Normalize keys to lowercase — MySQL may return information_schema
		// column names in uppercase (TABLE_NAME, COLUMN_NAME, etc.)
		row := make(map[string]interface{}, len(raw))
		for k, v := range raw {
			row[strings.ToLower(k)] = v
		}
		tbl := stringify(row["table_name"])
		if tbl == "" {
			continue
		}
		if _, exists := tableMap[tbl]; !exists {
			tableMap[tbl] = &SchemaTable{Name: tbl, Columns: []SchemaColumn{}}
			tableOrder = append(tableOrder, tbl)
		}
		tableMap[tbl].Columns = append(tableMap[tbl].Columns, SchemaColumn{
			Name:     stringify(row["column_name"]),
			Type:     stringify(row["data_type"]),
			Nullable: stringify(row["is_nullable"]) == "YES",
		})
	}
	sort.Strings(tableOrder)
	tables := make([]SchemaTable, 0, len(tableOrder))
	for _, name := range tableOrder {
		tables = append(tables, *tableMap[name])
	}
	OK(c, tables)
}

// HandleTestDatasource godoc
// @Summary 测试数据源连接
// @ID testDatasource
// @Tags datasource
// @Security BearerAuth
// @Accept json
// @Produce json
// @Param slug path string true "租户slug"
// @Param body body object{dsn=string,gateway_id=int} true "连接信息"
// @Success 200 {object} object{data=object{latency_ms=int64}}
// @Router /v1/tenants/{slug}/datasources/test [post]
func (h *QueryTestHandler) HandleTestDatasource(c *gin.Context) {
	tenant := GetTenant(c)
	var req struct {
		DSN       string `json:"dsn" binding:"required"`
		GatewayID int64  `json:"gateway_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		Fail(c, http.StatusBadRequest, err.Error())
		return
	}

	tenantID := strconv.FormatInt(tenant.ID, 10)
	gatewayID := strconv.FormatInt(req.GatewayID, 10)
	if stream := h.gateways.GetStream(gatewayID); stream == nil {
		FailErr(c, domain.ErrUnavailable(fmt.Sprintf("gateway %s is not connected", gatewayID)))
		return
	}

	start := time.Now()
	result, err := h.queries.ExecuteDirect(c.Request.Context(), tenantID, gatewayID, req.DSN, "SELECT 1")
	if err != nil {
		FailErr(c, err)
		return
	}
	latencyMs := time.Since(start).Milliseconds()
	if !result.Success {
		Fail(c, http.StatusBadRequest, result.Error)
		return
	}
	OK(c, map[string]int64{"latency_ms": latencyMs})
}

// HandlePreviewTable godoc
// @Summary 预览表数据
// @ID previewTable
// @Tags query
// @Security BearerAuth
// @Produce json
// @Param slug path string true "租户slug"
// @Param datasourceId path int true "数据源ID"
// @Param table path string true "表名"
// @Param limit query int false "行数上限（默认100，最多500）"
// @Success 200 {object} object
// @Router /v1/tenants/{slug}/datasources/{datasourceId}/tables/{table}/preview [get]
func (h *QueryTestHandler) HandlePreviewTable(c *gin.Context) {
	tenant := GetTenant(c)
	dsID, ok := pathInt64(c, "datasourceId")
	if !ok {
		return
	}

	table := c.Param("table")
	for _, ch := range table {
		if !((ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || (ch >= '0' && ch <= '9') || ch == '_' || ch == '.') {
			Fail(c, http.StatusBadRequest, "invalid table name")
			return
		}
	}

	limit := 100
	if l := c.Query("limit"); l != "" {
		if lv, err := strconv.Atoi(l); err == nil && lv > 0 && lv <= 500 {
			limit = lv
		}
	}

	ds, err := h.dataSources.GetByID(c.Request.Context(), tenant.ID, dsID)
	if err != nil || len(ds.Envs) == 0 {
		FailErr(c, domain.ErrNotFound("datasource not found"))
		return
	}
	var prodEnv *domain.DataSourceEnv
	for _, e := range ds.Envs {
		if e.Env == "prod" {
			prodEnv = e
			break
		}
	}
	if prodEnv == nil {
		FailErr(c, domain.ErrNotFound("datasource prod env not found"))
		return
	}

	tenantID := strconv.FormatInt(tenant.ID, 10)
	gatewayID := strconv.FormatInt(prodEnv.GatewayID, 10)
	if stream := h.gateways.GetStream(gatewayID); stream == nil {
		FailErr(c, domain.ErrUnavailable(fmt.Sprintf("gateway %s is not connected", gatewayID)))
		return
	}

	var previewSQL string
	if strings.HasPrefix(prodEnv.DSN, "sqlserver://") {
		// Quote schema.table as [schema].[table] to handle any casing/special chars
		parts := strings.SplitN(table, ".", 2)
		var quoted string
		if len(parts) == 2 {
			quoted = fmt.Sprintf("[%s].[%s]", parts[0], parts[1])
		} else {
			quoted = fmt.Sprintf("[%s]", parts[0])
		}
		previewSQL = fmt.Sprintf("SELECT TOP %d * FROM %s", limit, quoted)
	} else {
		previewSQL = fmt.Sprintf("SELECT * FROM %s LIMIT %d", table, limit)
	}
	result, err := h.queries.ExecuteDirect(c.Request.Context(), tenantID, gatewayID, prodEnv.DSN, previewSQL)
	if err != nil {
		FailErr(c, err)
		return
	}
	if !result.Success {
		Fail(c, http.StatusInternalServerError, result.Error)
		return
	}
	OK(c, json.RawMessage(result.Data))
}
