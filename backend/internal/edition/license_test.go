package edition

import (
	"os"
	"testing"
)

// 已知有效的 license token 不再硬编码进源码（避免 git tracked 文件泄漏）。
// 改为从环境变量读取：
//
//	export OWLAPI_TEST_LICENSE_KEY=<EE license JWT token>
//	go test ./internal/edition/...
//
// 未设置环境变量时跳过该用例，CE 分支/开源贡献者拿到本文件也不会编译失败、
// 不会暴露 token，所以这个测试文件可以跟着 ee → ce 同步走。
// 负向用例（空、垃圾、篡改）不依赖真实 token，CE 中也能跑。

const testLicenseEnvKey = "OWLAPI_TEST_LICENSE_KEY"

func TestVerifyLicenseJWS_KnownGood(t *testing.T) {
	token := os.Getenv(testLicenseEnvKey)
	if token == "" {
		t.Skipf("%s not set; skipping positive-path license test (set the env var with a real EE license to enable)", testLicenseEnvKey)
	}

	p, err := verifyLicenseJWS(token, "")
	if err != nil {
		t.Fatalf("license failed to verify: %v", err)
	}
	if p.Edition != "enterprise" {
		t.Errorf("edition mismatch: got %q", p.Edition)
	}
	if p.Customer == "" {
		t.Error("expected non-empty customer")
	}
}

func TestVerifyLicenseJWS_Empty(t *testing.T) {
	if _, err := verifyLicenseJWS("", ""); err == nil {
		t.Error("empty token should fail")
	}
}

func TestVerifyLicenseJWS_Garbage(t *testing.T) {
	if _, err := verifyLicenseJWS("not.a.real.token", ""); err == nil {
		t.Error("garbage token should fail")
	}
}

// 拼接错误签名（payload 真，但签名是别人的）
func TestVerifyLicenseJWS_TamperedSignature(t *testing.T) {
	token := os.Getenv(testLicenseEnvKey)
	if token == "" {
		t.Skipf("%s not set; skipping tampered-signature test", testLicenseEnvKey)
	}
	tampered := token[:len(token)-10] + "XXXXXXXXXX"
	if _, err := verifyLicenseJWS(tampered, ""); err == nil {
		t.Error("tampered signature should fail")
	}
}
