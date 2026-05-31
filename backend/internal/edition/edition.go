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
		if err != nil {
			slog.Warn("edition: enterprise mode requested but license invalid; EE features will degrade to CE behavior",
				"err", err)
		} else {
			current.IsLicensed = true
			current.License = payload
			slog.Info("edition: enterprise license verified",
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

// IsLicensed reports whether enterprise features are unlocked.
// Equivalent to: edition=enterprise AND license valid.
func IsLicensed() bool { return current.IsLicensed }
