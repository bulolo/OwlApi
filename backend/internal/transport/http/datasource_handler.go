package http

import (
	"net/http"

	"github.com/bulolo/owlapi/internal/domain"
	"github.com/bulolo/owlapi/internal/service"
	"github.com/gin-gonic/gin"
)

type DataSourceHandler struct{ dataSources service.DataSourceService }

// ── request types ────────────────────────────────────────────────────────────

type dsEnvReq struct {
	Env       string `json:"env"       binding:"required,oneof=dev prod"`
	DSN       string `json:"dsn"`
	GatewayID int64  `json:"gateway_id" binding:"required"`
}

type createDataSourceReq struct {
	Name   string     `json:"name"   binding:"required"`
	Type   string     `json:"type"   binding:"required,oneof=mysql postgres sqlserver starrocks doris sqlite"`
	IsDual bool       `json:"is_dual"`
	Envs   []dsEnvReq `json:"envs"   binding:"required,min=1"`
}

type updateDataSourceReq struct {
	Name   string     `json:"name"`
	Type   string     `json:"type"   binding:"omitempty,oneof=mysql postgres sqlserver starrocks doris sqlite"`
	IsDual *bool      `json:"is_dual"`
	Envs   []dsEnvReq `json:"envs"`
}

// ── handlers ─────────────────────────────────────────────────────────────────

// HandleList godoc
// @Summary 获取数据源列表
// @ID listDataSources
// @Tags datasource
// @Security BearerAuth
// @Produce json
// @Param slug path string true "租户slug"
// @Param page query int false "页码（默认1）"
// @Param size query int false "每页数量（默认10）"
// @Param is_pager query int false "是否分页，0=返回全部（默认1）"
// @Param keyword query string false "关键词搜索"
// @Success 200 {object} RDataSourceList
// @Router /v1/tenants/{slug}/datasources [get]
func (h *DataSourceHandler) HandleList(c *gin.Context) {
	tenant := GetTenant(c)
	lp := parseListParams(c)
	list, total, err := h.dataSources.List(c.Request.Context(), tenant.ID, lp)
	if err != nil {
		FailErr(c, err)
		return
	}
	// Mask DSN passwords before returning to the client.
	masked := make([]*domain.DataSource, len(list))
	for i, ds := range list {
		masked[i] = ds.MaskEnvs()
	}
	OKPaged(c, masked, lp, total)
}

// HandleCreate godoc
// @Summary 创建数据源
// @ID createDataSource
// @Tags datasource
// @Security BearerAuth
// @Accept json
// @Produce json
// @Param slug path string true "租户slug"
// @Param body body createDataSourceReq true "数据源信息"
// @Success 200 {object} RDataSource
// @Router /v1/tenants/{slug}/datasources [post]
func (h *DataSourceHandler) HandleCreate(c *gin.Context) {
	tenant := GetTenant(c)
	var req createDataSourceReq
	if err := c.ShouldBindJSON(&req); err != nil {
		Fail(c, http.StatusBadRequest, err.Error())
		return
	}
	ds := &domain.DataSource{TenantID: tenant.ID, Name: req.Name, IsDual: req.IsDual, Type: req.Type}
	for _, e := range req.Envs {
		ds.Envs = append(ds.Envs, &domain.DataSourceEnv{Env: e.Env, DSN: e.DSN, GatewayID: e.GatewayID})
	}
	if err := h.dataSources.Create(c.Request.Context(), ds); err != nil {
		FailErr(c, err)
		return
	}
	OK(c, ds.MaskEnvs())
}

// HandleGet godoc
// @Summary 获取数据源详情
// @ID getDataSource
// @Tags datasource
// @Security BearerAuth
// @Produce json
// @Param slug path string true "租户slug"
// @Param datasourceId path int true "数据源ID"
// @Success 200 {object} RDataSource
// @Router /v1/tenants/{slug}/datasources/{datasourceId} [get]
func (h *DataSourceHandler) HandleGet(c *gin.Context) {
	tenant := GetTenant(c)
	dsID, ok := pathInt64(c, "datasourceId")
	if !ok {
		return
	}
	ds, err := h.dataSources.GetByID(c.Request.Context(), tenant.ID, dsID)
	if err != nil {
		FailErr(c, err)
		return
	}
	OK(c, ds.MaskEnvs())
}

// HandleUpdate godoc
// @Summary 更新数据源
// @ID updateDataSource
// @Tags datasource
// @Security BearerAuth
// @Accept json
// @Produce json
// @Param slug path string true "租户slug"
// @Param datasourceId path int true "数据源ID"
// @Param body body updateDataSourceReq false "更新信息"
// @Success 200 {object} RDataSource
// @Router /v1/tenants/{slug}/datasources/{datasourceId} [put]
func (h *DataSourceHandler) HandleUpdate(c *gin.Context) {
	tenant := GetTenant(c)
	dsID, ok := pathInt64(c, "datasourceId")
	if !ok {
		return
	}
	ds, err := h.dataSources.GetByID(c.Request.Context(), tenant.ID, dsID)
	if err != nil {
		FailErr(c, err)
		return
	}
	var req updateDataSourceReq
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
			ds.Envs = append(ds.Envs, &domain.DataSourceEnv{Env: e.Env, DSN: e.DSN, GatewayID: e.GatewayID})
		}
	}
	if err := h.dataSources.Update(c.Request.Context(), ds); err != nil {
		FailErr(c, err)
		return
	}
	// Re-fetch to return the authoritative persisted state.
	updated, err := h.dataSources.GetByID(c.Request.Context(), tenant.ID, dsID)
	if err != nil {
		FailErr(c, err)
		return
	}
	OK(c, updated.MaskEnvs())
}

// HandleDelete godoc
// @Summary 删除数据源
// @ID deleteDataSource
// @Tags datasource
// @Security BearerAuth
// @Produce json
// @Param slug path string true "租户slug"
// @Param datasourceId path int true "数据源ID"
// @Success 200 {object} R
// @Router /v1/tenants/{slug}/datasources/{datasourceId} [delete]
func (h *DataSourceHandler) HandleDelete(c *gin.Context) {
	tenant := GetTenant(c)
	dsID, ok := pathInt64(c, "datasourceId")
	if !ok {
		return
	}
	if err := h.dataSources.Delete(c.Request.Context(), tenant.ID, dsID); err != nil {
		FailErr(c, err)
		return
	}
	OK(c, nil)
}
