package http

import (
	"context"

	"github.com/gin-gonic/gin"
)

// 平台设置(品牌 + 自助注册)整体属 EE 能力，存于 EE 的 platform_ee_config。
// 核心不再存储，仅通过下面的 provider 钩子读取：
//   - EE 授权：EE 模块注册 provider，返回 platform_ee_config 的值；
//   - CE / 未注册：返回内置默认值（品牌 OwlAPI、自助注册关闭）。
//
// 这是 Go 版的「核心委托 EE」，与 demoChecker 同模式。
var platformSettingsProvider func(ctx context.Context) PlatformSettingsResp

// RegisterPlatformSettingsProvider 由 EE 平台模块注入，提供平台设置读取。
func RegisterPlatformSettingsProvider(fn func(ctx context.Context) PlatformSettingsResp) {
	platformSettingsProvider = fn
}

// DefaultPlatformSettings 是 CE / 未授权下的内置默认平台设置（不可定制）。
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
