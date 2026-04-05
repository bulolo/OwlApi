package http

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/hongjunyao/owlapi/internal/service"
)

type AuthHandler struct {
	auth service.AuthService
}

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
		Fail(c, http.StatusConflict, err.Error())
		return
	}
	OK(c, resp)
}

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
		Fail(c, http.StatusUnauthorized, err.Error())
		return
	}
	OK(c, resp)
}
