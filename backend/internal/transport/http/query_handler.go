package http

import (
	"fmt"
	"log/slog"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/hongjunyao/owlapi/internal/domain"
	"github.com/hongjunyao/owlapi/internal/service"
)

type QueryHandler struct {
	queryService service.QueryService
	repo         domain.APIEndpointRepository
}

func NewQueryHandler(queryService service.QueryService, repo domain.APIEndpointRepository) *QueryHandler {
	return &QueryHandler{queryService: queryService, repo: repo}
}

func (h *QueryHandler) RegisterRoutes(r *gin.Engine) {
	r.POST("/api/v1/query/*path", h.HandleQuery)
}

func (h *QueryHandler) HandleQuery(c *gin.Context) {
	path := c.Param("path")
	tenantID := c.GetHeader("X-Tenant-ID")
	if tenantID == "" {
		Fail(c, http.StatusBadRequest, "X-Tenant-ID header required")
		return
	}

	tid, err := strconv.ParseInt(tenantID, 10, 64)
	if err != nil {
		Fail(c, http.StatusBadRequest, "invalid X-Tenant-ID")
		return
	}

	endpoint, err := h.repo.GetAPIEndpointByPath(c.Request.Context(), tid, path)
	if err != nil {
		Fail(c, http.StatusNotFound, "API endpoint not found")
		return
	}

	// All params from JSON body
	params := make(map[string]string)
	var body map[string]interface{}
	if err := c.ShouldBindJSON(&body); err != nil && err.Error() != "EOF" {
		Fail(c, http.StatusBadRequest, "invalid request body: "+err.Error())
		return
	}
	for _, p := range endpoint.Params {
		if bv, ok := body[p]; ok {
			params[p] = fmt.Sprintf("%v", bv)
		}
	}

	gatewayID := c.GetHeader("X-Gateway-ID")
	if gatewayID == "" {
		Fail(c, http.StatusBadRequest, "X-Gateway-ID header required")
		return
	}

	result, err := h.queryService.Execute(c.Request.Context(), tenantID, gatewayID, endpoint, params)
	if err != nil {
		slog.Error("Query execution failed", "path", path, "error", err)
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
