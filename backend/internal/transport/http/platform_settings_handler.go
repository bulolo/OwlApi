package http

import (
	"net/http"

	"github.com/bulolo/owlapi/internal/service"
	"github.com/gin-gonic/gin"
)

type PlatformSettingsHandler struct {
	settings service.PlatformSettingsService
}

// HandleGetPlatformSettings godoc
// @Summary 获取平台设置
// @ID getPlatformSettings
// @Tags platform
// @Produce json
// @Success 200 {object} RPlatformSettings
// @Router /v1/platform/settings [get]
func (h *PlatformSettingsHandler) HandleGet(c *gin.Context) {
	s, err := h.settings.Get(c.Request.Context())
	if err != nil {
		FailErr(c, err)
		return
	}
	OK(c, PlatformSettingsResp{AllowSelfRegister: s.AllowSelfRegister})
}

// HandleUpdatePlatformSettings godoc
// @Summary 更新平台设置
// @ID updatePlatformSettings
// @Tags platform
// @Accept json
// @Produce json
// @Param body body object{allow_self_register=bool} true "平台设置"
// @Success 200 {object} RPlatformSettings
// @Router /v1/platform/settings [put]
func (h *PlatformSettingsHandler) HandleUpdate(c *gin.Context) {
	var req struct {
		AllowSelfRegister bool `json:"allow_self_register"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		Fail(c, http.StatusBadRequest, err.Error())
		return
	}
	s, err := h.settings.Update(c.Request.Context(), req.AllowSelfRegister)
	if err != nil {
		FailErr(c, err)
		return
	}
	OK(c, PlatformSettingsResp{AllowSelfRegister: s.AllowSelfRegister})
}
