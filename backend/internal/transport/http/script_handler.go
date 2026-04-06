package http

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/bulolo/owlapi/internal/domain"
	"github.com/bulolo/owlapi/internal/service"
)

type ScriptHandler struct{ scripts service.ScriptService }

// HandleList godoc
// @Summary 获取脚本列表
// @ID listScripts
// @Tags script
// @Security BearerAuth
// @Produce json
// @Param slug path string true "租户slug"
// @Param page query int false "页码（默认1）"
// @Param size query int false "每页数量（默认10）"
// @Param is_pager query int false "是否分页，0=返回全部（默认1）"
// @Param keyword query string false "关键词搜索"
// @Success 200 {object} RScriptList
// @Router /v1/tenants/{slug}/scripts [get]
func (h *ScriptHandler) HandleList(c *gin.Context) {
	tenant := GetTenant(c)
	lp := parseListParams(c)
	list, total, err := h.scripts.List(c.Request.Context(), tenant.ID, lp)
	if err != nil {
		FailErr(c, err)
		return
	}
	OKPaged(c, list, lp, total)
}

// HandleCreate godoc
// @Summary 创建脚本
// @ID createScript
// @Tags script
// @Security BearerAuth
// @Accept json
// @Produce json
// @Param slug path string true "租户slug"
// @Param body body object{name=string,type=string,code=string,description=string} true "脚本信息"
// @Success 200 {object} RScript
// @Router /v1/tenants/{slug}/scripts [post]
func (h *ScriptHandler) HandleCreate(c *gin.Context) {
	tenant := GetTenant(c)
	var req struct {
		Name        string `json:"name" binding:"required"`
		Type        string `json:"type" binding:"required"`
		Code        string `json:"code" binding:"required"`
		Description string `json:"description"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		Fail(c, http.StatusBadRequest, err.Error())
		return
	}
	s := &domain.Script{TenantID: tenant.ID, Name: req.Name, Type: req.Type, Code: req.Code, Description: req.Description}
	if err := h.scripts.Create(c.Request.Context(), s); err != nil {
		FailErr(c, err)
		return
	}
	OK(c, s)
}

// HandleUpdate godoc
// @Summary 更新脚本
// @ID updateScript
// @Tags script
// @Security BearerAuth
// @Accept json
// @Produce json
// @Param slug path string true "租户slug"
// @Param scriptId path int true "脚本ID"
// @Param body body object{name=string,type=string,code=string,description=string} false "更新信息"
// @Success 200 {object} RScript
// @Router /v1/tenants/{slug}/scripts/{scriptId} [put]
func (h *ScriptHandler) HandleUpdate(c *gin.Context) {
	tenant := GetTenant(c)
	sid, ok := pathInt64(c, "scriptId")
	if !ok {
		return
	}
	var req struct {
		Name        string `json:"name"`
		Type        string `json:"type"`
		Code        string `json:"code"`
		Description string `json:"description"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		Fail(c, http.StatusBadRequest, err.Error())
		return
	}
	s := &domain.Script{ID: sid, TenantID: tenant.ID, Name: req.Name, Type: req.Type, Code: req.Code, Description: req.Description}
	if err := h.scripts.Update(c.Request.Context(), s); err != nil {
		FailErr(c, err)
		return
	}
	OK(c, s)
}

// HandleDelete godoc
// @Summary 删除脚本
// @ID deleteScript
// @Tags script
// @Security BearerAuth
// @Produce json
// @Param slug path string true "租户slug"
// @Param scriptId path int true "脚本ID"
// @Success 200 {object} R
// @Router /v1/tenants/{slug}/scripts/{scriptId} [delete]
func (h *ScriptHandler) HandleDelete(c *gin.Context) {
	tenant := GetTenant(c)
	sid, ok := pathInt64(c, "scriptId")
	if !ok {
		return
	}
	if err := h.scripts.Delete(c.Request.Context(), tenant.ID, sid); err != nil {
		FailErr(c, err)
		return
	}
	OK(c, nil)
}
