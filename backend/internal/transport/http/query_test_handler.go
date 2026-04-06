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
	tenants      service.TenantService
	gateways     service.GatewayService
	queries      service.QueryService
	endpointRepo domain.APIEndpointRepository
	dsRepo       domain.DataSourceRepository
}

// HandleTestQuery executes an endpoint with params, going through the full script pipeline.
// POST /api/v1/tenants/:slug/query/test
// Body: { "endpoint_id": 1, "params": {"page":"1","size":"10"} }
func (h *QueryTestHandler) HandleTestQuery(c *gin.Context) {
	tenant, err := h.tenants.GetBySlug(c.Request.Context(), c.Param("slug"))
	if err != nil {
		Fail(c, http.StatusNotFound, "tenant not found")
		return
	}

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

	endpoint, err := h.endpointRepo.GetAPIEndpointByID(c.Request.Context(), tenant.ID, req.EndpointID)
	if err != nil {
		Fail(c, http.StatusNotFound, "endpoint not found")
		return
	}

	if req.IgnoreScripts {
		endpoint.PreScriptID = 0
		endpoint.PostScriptID = 0
	}

	dsEnv, err := h.dsRepo.GetDataSourceEnv(c.Request.Context(), endpoint.DataSourceID, "prod")
	if err != nil {
		Fail(c, http.StatusNotFound, fmt.Sprintf("datasource env not found: %v", err))
		return
	}

	tenantID := strconv.FormatInt(tenant.ID, 10)
	gatewayID := strconv.FormatInt(dsEnv.GatewayID, 10)

	if stream := h.gateways.GetStream(tenantID, gatewayID); stream == nil {
		Fail(c, http.StatusServiceUnavailable, fmt.Sprintf("gateway %s is not connected", gatewayID))
		return
	}

	result, err := h.queries.Execute(c.Request.Context(), tenantID, gatewayID, endpoint, req.Params)
	if err != nil {
		Fail(c, http.StatusInternalServerError, err.Error())
		return
	}

	if !result.Success {
		Fail(c, http.StatusInternalServerError, result.Error)
		return
	}

	// Raw JSON passthrough — result.Data is already JSON-encoded from gateway
	c.Data(http.StatusOK, "application/json", result.Data) //nolint:passthrough
}
