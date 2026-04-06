package http

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/bulolo/owlapi/internal/domain"
	"github.com/bulolo/owlapi/internal/service"
)

type TenantUserHandler struct {
	tenants     service.TenantService
	tenantUsers service.TenantUserService
}

// HandleList godoc
// @Summary 获取租户成员列表
// @ID listUsers
// @Tags tenant-user
// @Security BearerAuth
// @Produce json
// @Param slug path string true "租户slug"
// @Param page query int false "页码（默认1）"
// @Param size query int false "每页数量（默认10）"
// @Param is_pager query int false "是否分页，0=返回全部（默认1）"
// @Param keyword query string false "关键词搜索"
// @Success 200 {object} RTenantUserList
// @Router /v1/tenants/{slug}/users [get]
func (h *TenantUserHandler) HandleList(c *gin.Context) {
	tenant := GetTenant(c)
	lp := parseListParams(c)
	users, total, err := h.tenantUsers.List(c.Request.Context(), tenant.ID, lp)
	if err != nil {
		FailErr(c, err)
		return
	}
	OKPaged(c, users, lp, total)
}

// HandleCreate godoc
// @Summary 添加租户成员
// @ID addUser
// @Tags tenant-user
// @Security BearerAuth
// @Accept json
// @Produce json
// @Param slug path string true "租户slug"
// @Param body body object{email=string,name=string,password=string,role=string} true "成员信息"
// @Success 200 {object} R
// @Router /v1/tenants/{slug}/users [post]
func (h *TenantUserHandler) HandleCreate(c *gin.Context) {
	tenant := GetTenant(c)
	var req struct {
		Email    string `json:"email" binding:"required"`
		Name     string `json:"name" binding:"required"`
		Password string `json:"password" binding:"required"`
		Role     string `json:"role" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		Fail(c, http.StatusBadRequest, err.Error())
		return
	}
	if err := h.tenantUsers.Create(c.Request.Context(), tenant.ID, service.AddTenantUserRequest{
		Email: req.Email, Name: req.Name, Password: req.Password, Role: domain.UserRole(req.Role),
	}); err != nil {
		FailErr(c, err)
		return
	}
	OK(c, nil)
}

// HandleUpdateRole godoc
// @Summary 更新成员角色
// @ID updateUserRole
// @Tags tenant-user
// @Security BearerAuth
// @Accept json
// @Produce json
// @Param slug path string true "租户slug"
// @Param userId path int true "用户ID"
// @Param body body object{role=string} true "角色"
// @Success 200 {object} R
// @Router /v1/tenants/{slug}/users/{userId}/role [put]
func (h *TenantUserHandler) HandleUpdateRole(c *gin.Context) {
	tenant := GetTenant(c)
	userID, ok := pathInt64(c, "userId")
	if !ok {
		return
	}
	var req struct {
		Role string `json:"role" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		Fail(c, http.StatusBadRequest, err.Error())
		return
	}
	if err := h.tenantUsers.UpdateRole(c.Request.Context(), tenant.ID, userID, domain.UserRole(req.Role)); err != nil {
		FailErr(c, err)
		return
	}
	OK(c, nil)
}

// HandleDelete godoc
// @Summary 移除租户成员
// @ID removeUser
// @Tags tenant-user
// @Security BearerAuth
// @Produce json
// @Param slug path string true "租户slug"
// @Param userId path int true "用户ID"
// @Success 200 {object} R
// @Router /v1/tenants/{slug}/users/{userId} [delete]
func (h *TenantUserHandler) HandleDelete(c *gin.Context) {
	tenant := GetTenant(c)
	userID, ok := pathInt64(c, "userId")
	if !ok {
		return
	}
	if err := h.tenantUsers.Delete(c.Request.Context(), tenant.ID, userID); err != nil {
		FailErr(c, err)
		return
	}
	OK(c, nil)
}
