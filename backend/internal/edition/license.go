package edition

import (
	"crypto/rsa"
	"crypto/x509"
	"encoding/pem"
	"errors"
	"fmt"

	"github.com/golang-jwt/jwt/v5"
)

// LicensePayload 是 license token 里编码的业务字段。
// 用 jwt.RegisteredClaims 提供 standard claims (exp / iat / iss / sub)，
// 业务自己加 customer / features。
type LicensePayload struct {
	Customer       string   `json:"customer"`        // 客户名（用于审计 / 展示）
	Edition        string   `json:"edition"`         // 通常恒为 "enterprise"
	Features       []string `json:"features"`        // 解锁的功能 flag 列表（保留扩展位）
	InstallationID string   `json:"installation_id"` // 绑定的部署 ID；空=不绑定（浮动授权）
	jwt.RegisteredClaims
}

// owlapiLicensePublicKey 是 OwlAPI 用来验签 license token 的 RSA 公钥（PEM 编码）。
// 对应的私钥由 OwlAPI 发行方持有，签发 license 后下发给客户。
// 客户端只持有公钥 → 单向验证，无法自己伪造。
//
//   - 生产环境替换为正式的 2048 位 RSA 公钥
//   - 泄漏只会让攻击者能验证 license（不能签发新 license）
const owlapiLicensePublicKey = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAz1Tafd9W7ctROD16FySf
yNUrG3/7ZmQSnTG0ad5em03aHhmfU39HBAhMbJr7veWkA3MsZrOpEmgOg2ZYVgjK
psq5oWDWOTc9fo5tpqYwRWWdhPOBIijUzWYxNtRRP10tcZrzF3uQjsAUwZ1avOY/
XAA0LjxoExlvpTtYld8Pz7OaJDTI0FLw3nfjV38QWpW+ita4flJlT1DlDi6SFqp9
1jUM5o1RkfODp9be8pSFlKivX97EIDNJ9gR+ikTyCdfovQFfhUORzkoiCXBZGGcc
KCqsM81Ttton8H76S+47+i0hGfNTv7DPcdggj49z0YAmzsK2mGqnpeRcK7JPJCkJ
cQIDAQAB
-----END PUBLIC KEY-----`

// parsedPublicKey 在包级一次性解析，避免每次校验都重新 PEM decode。
var parsedPublicKey *rsa.PublicKey

func init() {
	block, _ := pem.Decode([]byte(owlapiLicensePublicKey))
	if block == nil {
		panic("edition: failed to decode public key PEM")
	}
	pk, err := x509.ParsePKIXPublicKey(block.Bytes)
	if err != nil {
		panic(fmt.Sprintf("edition: failed to parse public key: %v", err))
	}
	rsaKey, ok := pk.(*rsa.PublicKey)
	if !ok {
		panic("edition: public key is not RSA")
	}
	parsedPublicKey = rsaKey
}

// verifyLicenseJWS 解析并验证一个 RS256 签名的 license token。
// 返回 payload 让调用方可以做更细粒度的判断（features、customer 展示等）。
//
// 检查项：
//  1. 签名正确（用 parsedPublicKey 验证）
//  2. exp 未过期（jwt.WithExpirationRequired 强制 token 必须带过期时间）
//  3. edition 字段必须是 "enterprise"
func verifyLicenseJWS(token, installationID string) (*LicensePayload, error) {
	if token == "" {
		return nil, errors.New("empty license token")
	}
	parsed, err := jwt.ParseWithClaims(token, &LicensePayload{}, func(t *jwt.Token) (interface{}, error) {
		// 强制使用 RS256，避免 alg=none 攻击
		if _, ok := t.Method.(*jwt.SigningMethodRSA); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		return parsedPublicKey, nil
	}, jwt.WithExpirationRequired())
	if err != nil {
		return nil, fmt.Errorf("token verification failed: %w", err)
	}

	claims, ok := parsed.Claims.(*LicensePayload)
	if !ok || !parsed.Valid {
		return nil, errors.New("token claims invalid")
	}
	if claims.Edition != "enterprise" {
		return nil, fmt.Errorf("license edition must be enterprise, got %q", claims.Edition)
	}
	// 安装绑定：license 若绑了 installation_id，必须与本部署一致；空则视为浮动授权（不绑定）。
	if claims.InstallationID != "" && claims.InstallationID != installationID {
		return nil, fmt.Errorf("license bound to installation %q, but this deployment is %q", claims.InstallationID, installationID)
	}
	return claims, nil
}
