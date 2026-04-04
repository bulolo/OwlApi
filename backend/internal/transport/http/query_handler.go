package http

// TODO: Integrate with QueryService after full wiring.

import (
	"log/slog"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/hongjunyao/owlapi/internal/domain"
	"github.com/hongjunyao/owlapi/internal/service"
)

type Handler struct {
	queryService service.QueryService
	repo         domain.ProjectRepository
}

func NewHandler(queryService service.QueryService, repo domain.ProjectRepository) *Handler {
	return &Handler{
		queryService: queryService,
		repo:         repo,
	}
}

func (h *Handler) RegisterRoutes(r *gin.Engine) {
	// SQL to API execution endpoint
	r.Match([]string{"GET", "POST"}, "/api/v1/query/*path", h.HandleQuery)
}

func (h *Handler) HandleQuery(c *gin.Context) {
	path := c.Param("path")
	tenantID := c.GetHeader("X-Tenant-ID")
	if tenantID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "X-Tenant-ID header required"})
		return
	}
	
	// 1. Find the endpoint by path
	endpoint, err := h.repo.GetAPIEndpointByPath(c.Request.Context(), tenantID, path)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "API endpoint not found"})
		return
	}

	// 2. Extract params
	params := make(map[string]string)
	for _, p := range endpoint.Params {
		val := c.Query(p)
		if val == "" {
			val = c.PostForm(p)
		}
		params[p] = val
	}

	// 3. Find an available Runner for this project
	// (Simplification: using a fixed runner_id for now or getting it from metadata)
	runnerID := c.GetHeader("X-Runner-ID")
	if runnerID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "X-Runner-ID header required"})
		return
	}

	// 4. Execute query via QueryService
	result, err := h.queryService.Execute(c.Request.Context(), tenantID, runnerID, endpoint, params)
	if err != nil {
		slog.Error("Query execution failed", "path", path, "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if !result.Success {
		c.JSON(http.StatusInternalServerError, gin.H{"error": result.Error})
		return
	}

	// 5. Return result
	c.Data(http.StatusOK, "application/json", result.Data)
}
