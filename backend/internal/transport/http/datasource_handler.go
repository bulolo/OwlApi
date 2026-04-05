package http

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/hongjunyao/owlapi/internal/domain"
	"github.com/hongjunyao/owlapi/internal/service"
)

type DataSourceHandler struct {
	tenants service.TenantService
	repo    domain.ProjectRepository
}

func (h *DataSourceHandler) HandleList(c *gin.Context) {
	tenant, err := h.tenants.GetBySlug(c.Request.Context(), c.Param("slug"))
	if err != nil {
		Fail(c, http.StatusNotFound, "tenant not found")
		return
	}
	list, err := h.repo.ListDataSources(c.Request.Context(), tenant.ID)
	if err != nil {
		Fail(c, http.StatusInternalServerError, err.Error())
		return
	}
	OK(c, gin.H{"list": list, "total": len(list)})
}

type createDSEnvReq struct {
	Env       string `json:"env" binding:"required"`
	DSN       string `json:"dsn" binding:"required"`
	GatewayID int64  `json:"gateway_id" binding:"required"`
}

func (h *DataSourceHandler) HandleCreate(c *gin.Context) {
	tenant, err := h.tenants.GetBySlug(c.Request.Context(), c.Param("slug"))
	if err != nil {
		Fail(c, http.StatusNotFound, "tenant not found")
		return
	}
	var req struct {
		Name   string           `json:"name" binding:"required"`
		Type   string           `json:"type" binding:"required"`
		IsDual bool             `json:"is_dual"`
		Envs   []createDSEnvReq `json:"envs" binding:"required,min=1"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		Fail(c, http.StatusBadRequest, err.Error())
		return
	}
	ds := &domain.DataSource{
		TenantID: tenant.ID,
		Name:     req.Name,
		IsDual:   req.IsDual,
		Type:     req.Type,
	}
	for _, e := range req.Envs {
		ds.Envs = append(ds.Envs, &domain.DataSourceEnv{
			Env: e.Env, DSN: e.DSN, GatewayID: e.GatewayID,
		})
	}
	if err := h.repo.CreateDataSource(c.Request.Context(), ds); err != nil {
		Fail(c, http.StatusInternalServerError, err.Error())
		return
	}
	OK(c, ds)
}

func (h *DataSourceHandler) HandleGet(c *gin.Context) {
	tenant, err := h.tenants.GetBySlug(c.Request.Context(), c.Param("slug"))
	if err != nil {
		Fail(c, http.StatusNotFound, "tenant not found")
		return
	}
	dsID, err := strconv.ParseInt(c.Param("datasourceId"), 10, 64)
	if err != nil {
		Fail(c, http.StatusBadRequest, "invalid datasource id")
		return
	}
	ds, err := h.repo.GetDataSourceByID(c.Request.Context(), tenant.ID, dsID)
	if err != nil {
		Fail(c, http.StatusNotFound, "datasource not found")
		return
	}
	OK(c, ds)
}

func (h *DataSourceHandler) HandleUpdate(c *gin.Context) {
	tenant, err := h.tenants.GetBySlug(c.Request.Context(), c.Param("slug"))
	if err != nil {
		Fail(c, http.StatusNotFound, "tenant not found")
		return
	}
	dsID, err := strconv.ParseInt(c.Param("datasourceId"), 10, 64)
	if err != nil {
		Fail(c, http.StatusBadRequest, "invalid datasource id")
		return
	}
	ds, err := h.repo.GetDataSourceByID(c.Request.Context(), tenant.ID, dsID)
	if err != nil {
		Fail(c, http.StatusNotFound, "datasource not found")
		return
	}
	var req struct {
		Name   string           `json:"name"`
		Type   string           `json:"type"`
		IsDual *bool            `json:"is_dual"`
		Envs   []createDSEnvReq `json:"envs"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		Fail(c, http.StatusBadRequest, err.Error())
		return
	}
	if req.Name != "" {
		ds.Name = req.Name
	}
	if req.Type != "" {
		ds.Type = req.Type
	}
	if req.IsDual != nil {
		ds.IsDual = *req.IsDual
	}
	if len(req.Envs) > 0 {
		ds.Envs = nil
		for _, e := range req.Envs {
			ds.Envs = append(ds.Envs, &domain.DataSourceEnv{
				Env: e.Env, DSN: e.DSN, GatewayID: e.GatewayID,
			})
		}
	}
	if err := h.repo.UpdateDataSource(c.Request.Context(), ds); err != nil {
		Fail(c, http.StatusInternalServerError, err.Error())
		return
	}
	// Reload with envs
	ds, _ = h.repo.GetDataSourceByID(c.Request.Context(), tenant.ID, dsID)
	OK(c, ds)
}

func (h *DataSourceHandler) HandleDelete(c *gin.Context) {
	tenant, err := h.tenants.GetBySlug(c.Request.Context(), c.Param("slug"))
	if err != nil {
		Fail(c, http.StatusNotFound, "tenant not found")
		return
	}
	dsID, err := strconv.ParseInt(c.Param("datasourceId"), 10, 64)
	if err != nil {
		Fail(c, http.StatusBadRequest, "invalid datasource id")
		return
	}
	if err := h.repo.DeleteDataSource(c.Request.Context(), tenant.ID, dsID); err != nil {
		Fail(c, http.StatusInternalServerError, err.Error())
		return
	}
	OK(c, nil)
}
