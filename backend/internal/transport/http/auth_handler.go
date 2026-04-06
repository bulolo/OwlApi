package http

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/bulolo/owlapi/internal/service"
)

type AuthHandler struct {
	auth service.AuthService
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
