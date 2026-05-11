package http

import (
	"encoding/json"
	"fmt"
	"net/http"
	"sort"
	"strconv"
	"strings"

	"github.com/bulolo/owlapi/internal/domain"
	"github.com/bulolo/owlapi/internal/service"
	"github.com/gin-gonic/gin"
)

type QueryTestHandler struct {
	tenants     service.TenantService
	gateways    service.GatewayService
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

	if stream := h.gateways.GetStream(tenantID, gatewayID); stream == nil {
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

const schemaSQLSQLite = `
SELECT m.name AS table_name, p.name AS column_name, p.type AS data_type,
  CASE WHEN p."notnull" = 1 THEN 'NO' ELSE 'YES' END AS is_nullable
FROM sqlite_master m, pragma_table_info(m.name) p
WHERE m.type = 'table'
ORDER BY m.name, p.cid
`

func schemaQueryForDSN(dsn string) string {
	if strings.HasPrefix(dsn, "postgres://") || strings.HasPrefix(dsn, "postgresql://") {
		return schemaSQLPostgres
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

	if stream := h.gateways.GetStream(tenantID, gatewayID); stream == nil {
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
		tbl := stringify(raw["table_name"])
		if tbl == "" {
			continue
		}
		if _, exists := tableMap[tbl]; !exists {
			tableMap[tbl] = &SchemaTable{Name: tbl, Columns: []SchemaColumn{}}
			tableOrder = append(tableOrder, tbl)
		}
		tableMap[tbl].Columns = append(tableMap[tbl].Columns, SchemaColumn{
			Name:     stringify(raw["column_name"]),
			Type:     stringify(raw["data_type"]),
			Nullable: stringify(raw["is_nullable"]) == "YES",
		})
	}
	sort.Strings(tableOrder)
	tables := make([]SchemaTable, 0, len(tableOrder))
	for _, name := range tableOrder {
		tables = append(tables, *tableMap[name])
	}
	OK(c, tables)
}
