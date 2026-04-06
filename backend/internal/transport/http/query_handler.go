package http

import (
	"fmt"
	"log/slog"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/bulolo/owlapi/internal/service"
)

type QueryHandler struct {
	queryService service.QueryService
	endpoints    service.APIEndpointService
	tenants      service.TenantService
}

func NewQueryHandler(queryService service.QueryService, endpoints service.APIEndpointService, tenants service.TenantService) *QueryHandler {
	return &QueryHandler{queryService: queryService, endpoints: endpoints, tenants: tenants}
}

func (h *QueryHandler) RegisterRoutes(r *gin.Engine) {
	r.POST("/api/v1/tenants/:slug/query/*path", h.HandleQuery)
}

// HandleQuery godoc
// @Summary 执行动态 API 查询
// @ID executeQuery
// @Tags query
// @Accept json
// @Produce json
// @Param slug path string true "租户 slug"
// @Param path path string true "API 路径"
// @Param body body object{} false "查询参数（由端点 param_defs 定义）"
// @Success 200 {object} object
// @Router /api/v1/tenants/{slug}/query/{path} [post]
func (h *QueryHandler) HandleQuery(c *gin.Context) {
	tenant, err := h.tenants.GetBySlug(c.Request.Context(), c.Param("slug"))
	if err != nil {
		Fail(c, http.StatusNotFound, "tenant not found")
		return
	}

	path := c.Param("path")
	endpoint, err := h.endpoints.GetByPath(c.Request.Context(), tenant.ID, path)
	if err != nil {
		Fail(c, http.StatusNotFound, "API endpoint not found")
		return
	}

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

	tenantID := strconv.FormatInt(tenant.ID, 10)
	result, err := h.queryService.Execute(c.Request.Context(), tenantID, endpoint, params)
	if err != nil {
		slog.Error("Query execution failed", "slug", c.Param("slug"), "path", path, "error", err)
		FailErr(c, err)
		return
	}

	if !result.Success {
		Fail(c, http.StatusInternalServerError, result.Error)
		return
	}

	c.Data(http.StatusOK, "application/json", result.Data)
}
