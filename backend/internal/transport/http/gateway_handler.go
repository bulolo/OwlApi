package http

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/bulolo/owlapi/internal/domain"
	"github.com/bulolo/owlapi/internal/service"
)

type GatewayHandler struct {
	gateways service.GatewayService
	tenants  service.TenantService
}

// HandleList godoc
// @Summary 获取网关列表
// @ID listGateways
// @Tags gateway
// @Security BearerAuth
// @Produce json
// @Param slug path string true "租户slug"
// @Param page query int false "页码（默认1）"
// @Param size query int false "每页数量（默认10）"
// @Param is_pager query int false "是否分页，0=返回全部（默认1）"
// @Param keyword query string false "关键词搜索"
// @Success 200 {object} RGatewayList
// @Router /v1/tenants/{slug}/gateways [get]
func (h *GatewayHandler) HandleList(c *gin.Context) {
	tenant := GetTenant(c)
	lp := parseListParams(c)
	list, total, err := h.gateways.List(c.Request.Context(), tenant.ID, lp)
	if err != nil {
		FailErr(c, err)
		return
	}
	OKPaged(c, list, lp, total)
}

// HandleCreate godoc
// @Summary 创建网关
// @ID createGateway
// @Tags gateway
// @Security BearerAuth
// @Accept json
// @Produce json
// @Param slug path string true "租户slug"
// @Param body body object{name=string} true "网关信息"
// @Success 200 {object} RGateway
// @Router /v1/tenants/{slug}/gateways [post]
func (h *GatewayHandler) HandleCreate(c *gin.Context) {
	tenant := GetTenant(c)
	var req struct {
		Name string `json:"name" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		Fail(c, http.StatusBadRequest, err.Error())
		return
	}
	gw := &domain.Gateway{TenantID: tenant.ID, Name: req.Name}
	if err := h.gateways.Create(c.Request.Context(), gw); err != nil {
		FailErr(c, err)
		return
	}
	OK(c, gin.H{
		"id":        gw.ID,
		"tenant_id": gw.TenantID,
		"name":      gw.Name,
		"token":     gw.Token,
		"status":    gw.Status,
		"version":   gw.Version,
	})
}

// HandleGet godoc
// @Summary 获取网关详情
// @ID getGateway
// @Tags gateway
// @Security BearerAuth
// @Produce json
// @Param slug path string true "租户slug"
// @Param gatewayId path int true "网关ID"
// @Success 200 {object} RGateway
// @Router /v1/tenants/{slug}/gateways/{gatewayId} [get]
func (h *GatewayHandler) HandleGet(c *gin.Context) {
	tenant := GetTenant(c)
	gwID, ok := pathInt64(c, "gatewayId")
	if !ok {
		return
	}
	gw, err := h.gateways.GetByID(c.Request.Context(), tenant.ID, gwID)
	if err != nil {
		FailErr(c, err)
		return
	}
	OK(c, gin.H{
		"id":        gw.ID,
		"tenant_id": gw.TenantID,
		"name":      gw.Name,
		"token":     gw.Token,
		"status":    gw.Status,
		"ip":        gw.IP,
		"last_seen": gw.LastSeen,
		"version":   gw.Version,
	})
}

// HandleDelete godoc
// @Summary 删除网关
// @ID deleteGateway
// @Tags gateway
// @Security BearerAuth
// @Produce json
// @Param slug path string true "租户slug"
// @Param gatewayId path int true "网关ID"
// @Success 200 {object} R
// @Router /v1/tenants/{slug}/gateways/{gatewayId} [delete]
func (h *GatewayHandler) HandleDelete(c *gin.Context) {
	tenant := GetTenant(c)
	gwID, ok := pathInt64(c, "gatewayId")
	if !ok {
		return
	}
	if err := h.gateways.Delete(c.Request.Context(), tenant.ID, gwID); err != nil {
		FailErr(c, err)
		return
	}
	OK(c, nil)
}
