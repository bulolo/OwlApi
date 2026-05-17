package http

import (
	"net/http"

	"github.com/bulolo/owlapi/internal/service"
	"github.com/gin-gonic/gin"
)

type AuthHandler struct {
	auth             service.AuthService
	platformSettings service.PlatformSettingsService
}

// HandleRegister godoc
// @Summary 注册用户
// @ID register
// @Tags auth
// @Accept json
// @Produce json
// @Param body body object{email=string,name=string,password=string,tenant_name=string,tenant_slug=string} true "注册信息"
// @Success 200 {object} RAuth
// @Router /v1/auth/register [post]
func (h *AuthHandler) HandleRegister(c *gin.Context) {
	var req struct {
		Email      string `json:"email" binding:"required"`
		Name       string `json:"name" binding:"required"`
		Password   string `json:"password" binding:"required"`
		TenantName string `json:"tenant_name"`
		TenantSlug string `json:"tenant_slug"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		Fail(c, http.StatusBadRequest, err.Error())
		return
	}
	if ps, err := h.platformSettings.Get(c.Request.Context()); err == nil && !ps.AllowSelfRegister {
		Fail(c, http.StatusForbidden, "self-registration is disabled")
		return
	}
	resp, err := h.auth.Register(c.Request.Context(), service.RegisterRequest{
		Email: req.Email, Name: req.Name, Password: req.Password,
		TenantName: req.TenantName, TenantSlug: req.TenantSlug,
	})
	if err != nil {
		FailErr(c, err)
		return
	}
	OK(c, resp)
}

type changePasswordReq struct {
	OldPassword string `json:"old_password" binding:"required"`
	NewPassword string `json:"new_password" binding:"required,min=6"`
}

// HandleChangePassword godoc
// @Summary 修改当前用户密码
// @ID changePassword
// @Tags auth
// @Accept json
// @Produce json
// @Param body body changePasswordReq true "密码信息"
// @Success 200 {object} map[string]string
// @Security BearerAuth
// @Router /v1/auth/change-password [put]
func (h *AuthHandler) HandleChangePassword(c *gin.Context) {
	claims := GetClaims(c)
	if claims == nil {
		Fail(c, http.StatusUnauthorized, "unauthorized")
		return
	}
	var req changePasswordReq
	if err := c.ShouldBindJSON(&req); err != nil {
		Fail(c, http.StatusBadRequest, err.Error())
		return
	}
	if err := h.auth.ChangePassword(c.Request.Context(), claims.UserID, req.OldPassword, req.NewPassword); err != nil {
		FailErr(c, err)
		return
	}
	OK(c, gin.H{"message": "password updated"})
}

// HandleLogin godoc
// @Summary 用户登录
// @ID login
// @Tags auth
// @Accept json
// @Produce json
// @Param body body object{email=string,password=string} true "登录信息"
// @Success 200 {object} RAuth
// @Router /v1/auth/login [post]
func (h *AuthHandler) HandleLogin(c *gin.Context) {
	var req struct {
		Email    string `json:"email" binding:"required"`
		Password string `json:"password" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		Fail(c, http.StatusBadRequest, err.Error())
		return
	}
	resp, err := h.auth.Login(c.Request.Context(), req.Email, req.Password)
	if err != nil {
		FailErr(c, err)
		return
	}
	OK(c, resp)
}
