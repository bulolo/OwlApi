package http

import (
	"fmt"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/hongjunyao/owlapi/internal/domain"
	"github.com/hongjunyao/owlapi/internal/service"
)

type QueryTestHandler struct {
	tenants  service.TenantService
	gateways service.GatewayService
	queries  service.QueryService
	repo     domain.ProjectRepository
}

// HandleTestQuery executes a SQL query against a datasource for testing purposes.
// POST /api/v1/tenants/:slug/query/test
// Body: { "datasource_id": 1, "sql": "SELECT * FROM users" }
func (h *QueryTestHandler) HandleTestQuery(c *gin.Context) {
	tenant, err := h.tenants.GetBySlug(c.Request.Context(), c.Param("slug"))
	if err != nil {
		Fail(c, http.StatusNotFound, "tenant not found")
		return
	}

	var req struct {
		DataSourceID int64  `json:"datasource_id" binding:"required"`
		SQL          string `json:"sql" binding:"required"`
		Env          string `json:"env"` // default: prod
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		Fail(c, http.StatusBadRequest, err.Error())
		return
	}
	if req.Env == "" {
		req.Env = "prod"
	}

	// Resolve datasource env → DSN + gateway_id
	dsEnv, err := h.repo.GetDataSourceEnv(c.Request.Context(), req.DataSourceID, req.Env)
	if err != nil {
		Fail(c, http.StatusNotFound, fmt.Sprintf("datasource env not found: %v", err))
		return
	}

	tenantID := strconv.FormatInt(tenant.ID, 10)
	gatewayID := strconv.FormatInt(dsEnv.GatewayID, 10)

	// Check gateway is connected
	stream := h.gateways.GetStream(tenantID, gatewayID)
	if stream == nil {
		Fail(c, http.StatusServiceUnavailable, fmt.Sprintf("gateway %s is not connected", gatewayID))
		return
	}

	// Build a temporary endpoint to reuse QueryService.Execute
	fakeEndpoint := &domain.APIEndpoint{
		ProjectID: 0,
		SQL:       req.SQL,
	}

	// We need to pass DSN directly — override the normal flow
	// Use the query service's internal mechanism
	result, err := h.queries.ExecuteDirect(c.Request.Context(), tenantID, gatewayID, dsEnv.DSN, req.SQL)
	if err != nil {
		Fail(c, http.StatusInternalServerError, err.Error())
		return
	}

	if !result.Success {
		Fail(c, http.StatusInternalServerError, result.Error)
		return
	}

	c.Data(http.StatusOK, "application/json", result.Data)
	_ = fakeEndpoint // suppress unused
}
