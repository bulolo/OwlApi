package http

import (
	"github.com/bulolo/owlapi/internal/edition"
	"github.com/gin-gonic/gin"
)

// HealthResp 是 /health 端点的响应体，供 EE/CE 区分和健康检查。
// 不需要鉴权，前端登陆前 / 后均可读。
type HealthResp struct {
	Status     string `json:"status"      validate:"required"` // "ok"
	Edition    string `json:"edition"     validate:"required"` // "community" | "enterprise"
	IsLicensed bool   `json:"is_licensed" validate:"required"` // EE 模式下 license 是否已通过校验
}

type RHealth struct {
	Code int        `json:"code" validate:"required"`
	Msg  string     `json:"msg"  validate:"required"`
	Data HealthResp `json:"data" validate:"required"`
}

// HandleHealth godoc
// @Summary 健康检查 / 版本信息
// @Description 公开接口，返回服务状态、当前 edition (community/enterprise) 与 license 状态
// @ID health
// @Tags meta
// @Produce json
// @Success 200 {object} RHealth
// @Router /health [get]
func HandleHealth(c *gin.Context) {
	ed := edition.Current()
	OK(c, HealthResp{
		Status:  "ok",
		Edition: string(ed.Edition),
		// is_licensed 不仅要 license 有效，还要求 EE 模块确实编译进来了（注册了路由）。
		// CE 构建里 eeRouteRegistrars 恒为空 → 即便误配 OWLAPI_EDITION=enterprise + 有效 license，
		// 也报 false，前端据此永不显示无法工作的 EE UI（避免「假 EE」误配）。
		IsLicensed: ed.IsLicensed && len(eeRouteRegistrars) > 0,
	})
}
