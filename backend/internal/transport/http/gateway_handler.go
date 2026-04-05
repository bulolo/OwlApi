package http

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/hongjunyao/owlapi/internal/domain"
	"github.com/hongjunyao/owlapi/internal/service"
)

type GatewayHandler struct {
	gateways service.GatewayService
	tenants  service.TenantService
}

func (h *GatewayHandler) HandleList(c *gin.Context) {
	tenant, err := h.tenants.GetBySlug(c.Request.Context(), c.Param("slug"))
	if err != nil {
		Fail(c, http.StatusNotFound, "tenant not found")
		return
	}
	list, err := h.gateways.List(c.Request.Context(), tenant.ID)
	if err != nil {
		Fail(c, http.StatusInternalServerError, err.Error())
		return
	}
	OK(c, gin.H{"list": list, "total": len(list)})
}

func (h *GatewayHandler) HandleCreate(c *gin.Context) {
	tenant, err := h.tenants.GetBySlug(c.Request.Context(), c.Param("slug"))
	if err != nil {
		Fail(c, http.StatusNotFound, "tenant not found")
		return
	}
	var req struct {
		Name string `json:"name" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		Fail(c, http.StatusBadRequest, err.Error())
		return
	}
	gw := &domain.Gateway{TenantID: tenant.ID, Name: req.Name}
	if err := h.gateways.Create(c.Request.Context(), gw); err != nil {
		Fail(c, http.StatusInternalServerError, err.Error())
		return
	}
	// Return with token visible (only on creation)
	OK(c, gin.H{
		"id":        gw.ID,
		"tenant_id": gw.TenantID,
		"name":      gw.Name,
		"token":     gw.Token,
		"status":    gw.Status,
		"version":   gw.Version,
	})
}

func (h *GatewayHandler) HandleGet(c *gin.Context) {
	tenant, err := h.tenants.GetBySlug(c.Request.Context(), c.Param("slug"))
	if err != nil {
		Fail(c, http.StatusNotFound, "tenant not found")
		return
	}
	gwID, err := strconv.ParseInt(c.Param("gatewayId"), 10, 64)
	if err != nil {
		Fail(c, http.StatusBadRequest, "invalid gateway id")
		return
	}
	gw, err := h.gateways.GetByID(c.Request.Context(), tenant.ID, gwID)
	if err != nil {
		Fail(c, http.StatusNotFound, "gateway not found")
		return
	}
	// Return with token visible for deployment info
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

func (h *GatewayHandler) HandleDelete(c *gin.Context) {
	tenant, err := h.tenants.GetBySlug(c.Request.Context(), c.Param("slug"))
	if err != nil {
		Fail(c, http.StatusNotFound, "tenant not found")
		return
	}
	gwID, err := strconv.ParseInt(c.Param("gatewayId"), 10, 64)
	if err != nil {
		Fail(c, http.StatusBadRequest, "invalid gateway id")
		return
	}
	if err := h.gateways.Delete(c.Request.Context(), tenant.ID, gwID); err != nil {
		Fail(c, http.StatusInternalServerError, err.Error())
		return
	}
	OK(c, nil)
}
