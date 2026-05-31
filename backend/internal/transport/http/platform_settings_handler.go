package http

import (
	"context"

	"github.com/gin-gonic/gin"
)

// 平台设置（品牌 + 自助注册）核心不存储，通过下面的 provider 钩子读取：
//   - 已注册（由可选扩展模块在启动时注入）→ 用其返回值；
//   - 未注册 → 返回内置默认值（品牌 OwlAPI、自助注册关闭）。
var platformSettingsProvider func(ctx context.Context) PlatformSettingsResp

// RegisterPlatformSettingsProvider 由扩展模块在启动时注入平台设置来源。
func RegisterPlatformSettingsProvider(fn func(ctx context.Context) PlatformSettingsResp) {
	platformSettingsProvider = fn
}

// DefaultPlatformSettings 是未注册 provider 时的内置默认平台设置（不可定制）。
func DefaultPlatformSettings() PlatformSettingsResp {
	return PlatformSettingsResp{
		AllowSelfRegister: false,
		PlatformName:      "OwlAPI",
		PlatformTagline:   "API网关平台",
		LogoURL:           "",
	}
}

// currentPlatformSettings 统一取值：有 provider 用 provider，否则默认。
func currentPlatformSettings(ctx context.Context) PlatformSettingsResp {
	if platformSettingsProvider != nil {
		return platformSettingsProvider(ctx)
	}
	return DefaultPlatformSettings()
}

type PlatformSettingsHandler struct{}

// HandleGetPlatformSettings godoc
// @Summary 获取平台设置
// @ID getPlatformSettings
// @Tags platform
// @Produce json
// @Success 200 {object} RPlatformSettings
// @Router /v1/platform/settings [get]
func (h *PlatformSettingsHandler) HandleGet(c *gin.Context) {
	OK(c, currentPlatformSettings(c.Request.Context()))
}
