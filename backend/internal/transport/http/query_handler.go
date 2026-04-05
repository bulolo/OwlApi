package http

import (
	"log/slog"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/hongjunyao/owlapi/internal/domain"
	"github.com/hongjunyao/owlapi/internal/service"
)

type QueryHandler struct {
	queryService service.QueryService
	repo         domain.ProjectRepository
}

func NewQueryHandler(queryService service.QueryService, repo domain.ProjectRepository) *QueryHandler {
	return &QueryHandler{queryService: queryService, repo: repo}
}

func (h *QueryHandler) RegisterRoutes(r *gin.Engine) {
	r.Match([]string{"GET", "POST"}, "/api/v1/query/*path", h.HandleQuery)
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

	params := make(map[string]string)
	for _, p := range endpoint.Params {
		val := c.Query(p)
		if val == "" {
			val = c.PostForm(p)
		}
		params[p] = val
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

	c.Data(http.StatusOK, "application/json", result.Data)
}
