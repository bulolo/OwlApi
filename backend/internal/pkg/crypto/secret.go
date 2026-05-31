// Package crypto 提供对称加密原语，用于在数据库里存敏感凭据
// （目前仅 EE 的 GitLab token，未来其他外部系统的 token 也走这里）。
//
// 设计选择：
//   - 算法 AES-256-GCM，密文格式 base64(nonce || ciphertext || authTag)
//   - 派生密钥 = SHA-256("owlapi-secrets-v1|" + JWT_SECRET)
//     -- 复用现有 JWT_SECRET（>=32 字符强制约束）避免引入新 env var
//     -- 加固定 salt "owlapi-secrets-v1" 让密钥派生域跟 JWT 签名域隔离
//   - 必须在使用前 Init() 一次；未 Init 调用 Encrypt/Decrypt 会返回错误而非 panic
//
// 安全提醒：JWT_SECRET 一旦轮换，所有历史密文都将无法解密。
//
//	生产环境改 secret 前要先 re-encrypt 全表。
package crypto

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"io"
	"sync/atomic"
)

const saltContext = "owlapi-secrets-v1|"

// 用 atomic.Pointer 保证 Init 并发安全 + 读路径无锁
var derivedKey atomic.Pointer[[32]byte]

// Init 用 master secret 派生 AES-256 密钥。调用方一般传 cfg.JWTSecret。
// 反复调用允许（用于热轮换），最后一次胜出。
func Init(masterSecret string) {
	h := sha256.Sum256([]byte(saltContext + masterSecret))
	derivedKey.Store(&h)
}

// Encrypt 把 plaintext 加密为 base64(nonce || ciphertext+tag) 字符串。
func Encrypt(plaintext string) (string, error) {
	key := derivedKey.Load()
	if key == nil {
		return "", errors.New("crypto: Init not called")
	}
	block, err := aes.NewCipher(key[:])
	if err != nil {
		return "", err
	}
	aesgcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}
	nonce := make([]byte, aesgcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", err
	}
	sealed := aesgcm.Seal(nonce, nonce, []byte(plaintext), nil)
	return base64.RawStdEncoding.EncodeToString(sealed), nil
}

// Decrypt 是 Encrypt 的逆运算。
func Decrypt(s string) (string, error) {
	key := derivedKey.Load()
	if key == nil {
		return "", errors.New("crypto: Init not called")
	}
	data, err := base64.RawStdEncoding.DecodeString(s)
	if err != nil {
		return "", err
	}
	block, err := aes.NewCipher(key[:])
	if err != nil {
		return "", err
	}
	aesgcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}
	ns := aesgcm.NonceSize()
	if len(data) < ns {
		return "", errors.New("crypto: ciphertext too short")
	}
	nonce, ct := data[:ns], data[ns:]
	pt, err := aesgcm.Open(nil, nonce, ct, nil)
	if err != nil {
		return "", err
	}
	return string(pt), nil
}
