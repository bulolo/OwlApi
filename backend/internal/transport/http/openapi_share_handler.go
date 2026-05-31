package http

import (
	"net/http"

	"github.com/bulolo/owlapi/internal/repo/postgres"
	"github.com/gin-gonic/gin"
)

type OpenAPIShareHandler struct {
	repo    *postgres.OpenAPIShareTokenRepo
	openAPI *OpenAPIHandler
}

// HandleGetShareToken returns the current share token for a project+env, or 404 if none.
func (h *OpenAPIShareHandler) HandleGetShareToken(c *gin.Context) {
	tenant := GetTenant(c)
	pid, ok := pathInt64(c, "projectId")
	if !ok {
		return
	}
	env := c.Query("env")
	if env == "" {
		Fail(c, http.StatusBadRequest, "env is required")
		return
	}
	t, err := h.repo.GetByProjectEnv(c.Request.Context(), tenant.ID, pid, env)
	if err != nil {
		FailErr(c, err)
		return
	}
	if t == nil {
		Fail(c, http.StatusNotFound, "no share link")
		return
	}
	OK(c, gin.H{"token": t.Token, "env": t.Env, "createdAt": t.CreatedAt})
}

// HandleCreateShareToken upserts a share token (returns existing if already created).
func (h *OpenAPIShareHandler) HandleCreateShareToken(c *gin.Context) {
	tenant := GetTenant(c)
	pid, ok := pathInt64(c, "projectId")
	if !ok {
		return
	}
	env := c.Query("env")
	if env == "" {
		Fail(c, http.StatusBadRequest, "env is required")
		return
	}
	t, err := h.repo.Upsert(c.Request.Context(), tenant.ID, pid, env)
	if err != nil {
		FailErr(c, err)
		return
	}
	OK(c, gin.H{"token": t.Token, "env": t.Env, "createdAt": t.CreatedAt})
}

// HandleRevokeShareToken deletes the share token for a project+env.
func (h *OpenAPIShareHandler) HandleRevokeShareToken(c *gin.Context) {
	tenant := GetTenant(c)
	pid, ok := pathInt64(c, "projectId")
	if !ok {
		return
	}
	env := c.Query("env")
	if env == "" {
		Fail(c, http.StatusBadRequest, "env is required")
		return
	}
	if err := h.repo.DeleteByProjectEnv(c.Request.Context(), tenant.ID, pid, env); err != nil {
		FailErr(c, err)
		return
	}
	OK(c, nil)
}

// HandlePublicOpenAPI serves the OpenAPI spec for a share token without auth.
func (h *OpenAPIShareHandler) HandlePublicOpenAPI(c *gin.Context) {
	token := c.Param("token")
	t, err := h.repo.GetByToken(c.Request.Context(), token)
	if err != nil {
		Fail(c, http.StatusNotFound, "share link not found")
		return
	}
	_, _, spec, err := h.openAPI.BuildSpec(c.Request.Context(), t.TenantID, t.ProjectID, t.Env)
	if err != nil {
		FailErr(c, err)
		return
	}
	OK(c, spec)
}
