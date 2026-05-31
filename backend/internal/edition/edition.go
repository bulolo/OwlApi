// Package edition exposes the current build's edition (community / enterprise)
// and license validity. Used by both the HTTP layer (/health) and any
// EE-gated feature check.
//
// Design choice:
//   - Singleton, initialized once at startup via Init(...)
//   - All reads are lock-free (the singleton is read-only after Init)
//   - License verification in v1 is intentionally simple: any non-empty key
//     that meets the length floor is treated as valid. JWS / RSA signature
//     verification can be plugged in later without changing the API surface.
package edition

import (
	"log/slog"
)

type Edition string

const (
	Community  Edition = "community"
	Enterprise Edition = "enterprise"
)

// Info is the snapshot exposed to other packages and the /health endpoint.
type Info struct {
	Edition    Edition         `json:"edition"`
	IsLicensed bool            `json:"is_licensed"`
	License    *LicensePayload `json:"-"` // 验签通过时的 license 详情；不暴露给 /health
}

var current Info = Info{Edition: Community, IsLicensed: false}

// modulesLinked 表示本二进制是否编译进了可选扩展模块。由这些模块在其 init() 中
// 调用 MarkModulesLinked() 置位；基础版构建已物理移除这些模块 → 恒为 false。
// 它是「代码是否真的存在」的唯一权威信号：即便误配环境变量 + 有效授权码，
// 缺失模块的构建也不会解锁——授权码无处可用（与 import 失败即降级同理）。
var modulesLinked bool

// MarkModulesLinked 由可选扩展模块在其 init() 中调用，声明这些模块已链接进本二进制。
// 基础版构建不含这些模块，故永不会调用。
func MarkModulesLinked() { modulesLinked = true }

// Init reads the edition + license from config, validates the license if
// applicable, and stores the result in the package-level singleton.
// installationID 是本部署的唯一标识（首次启动生成、持久化于 DB）；若 license 绑定了
// installation_id，则必须与之相等才算有效——防止 license 被复制到其它部署使用。
// 调用方需在连接 DB、取出 installationID 之后再调用本函数。
// Safe to call once at startup. Subsequent calls overwrite.
func Init(editionStr, licenseKey, installationID string) {
	ed := Edition(editionStr)
	if ed != Community && ed != Enterprise {
		slog.Warn("edition: invalid value, treating as community", "got", editionStr)
		ed = Community
	}

	current = Info{Edition: ed, IsLicensed: false}
	if ed == Enterprise {
		payload, err := verifyLicenseJWS(licenseKey, installationID)
		switch {
		case err != nil:
			slog.Warn("edition: enterprise mode requested but license invalid; features will degrade to baseline behavior",
				"err", err)
		case !modulesLinked:
			// license 有效，但本二进制未编译进可选扩展模块（基础版构建已物理移除）。
			// 此时不解锁——杜绝「仅靠环境变量 + 授权码」绕过构建边界。
			slog.Warn("edition: license valid but optional modules are not compiled into this binary; running baseline")
		default:
			current.IsLicensed = true
			current.License = payload
			slog.Info("edition: license verified",
				"customer", payload.Customer,
				"expires_at", payload.ExpiresAt,
				"features", payload.Features,
				"bound_installation", payload.InstallationID)
		}
	}
	slog.Info("edition: initialized", "edition", current.Edition, "is_licensed", current.IsLicensed, "installation_id", installationID)
}

// Current returns the current edition info snapshot.
func Current() Info { return current }

// IsLicensed reports whether licensed features are unlocked.
// 等价于：edition=enterprise 且 license 有效 且 本二进制确实编译进了可选扩展模块。
// 缺最后一个条件意味着基础版构建无论怎么配环境变量都不会解锁。
func IsLicensed() bool { return current.IsLicensed }
