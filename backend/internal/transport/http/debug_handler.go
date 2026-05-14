package http

import (
	"fmt"
	"net/http"
	"strconv"
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
