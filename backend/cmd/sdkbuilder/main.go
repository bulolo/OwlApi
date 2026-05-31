// sdkbuilder 是一个无状态 HTTP 服务，封装 openapi-generator-cli。
//
// 单一端点 POST /generate：
//
//	请求 body  : JSON，见 GenerateRequest
//	响应 body  : application/gzip 的 tar 归档，包含各 generator 的输出目录
//
// 设计取舍：
//   - 不依赖业务包（domain / service），主代码 CE/EE 都可以拉它做生成
//   - 输出走流式，避免 tar 全量进内存
//   - 没有持久化，每次请求一个独立 tmpdir，请求结束即清理
package main

import (
	"archive/tar"
	"compress/gzip"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strings"
	"time"
)

// GenerateRequest 是 sidecar 的唯一入参。
type GenerateRequest struct {
	// OpenAPI 3.x 规范，原样写到 spec.json
	Spec json.RawMessage `json:"spec"`
	// 要生成的目标语言列表（顺序保留）
	Generators []GeneratorConfig `json:"generators"`
}

type GeneratorConfig struct {
	// openapi-generator 内置 generator id，例如 "typescript-axios"、"python"、"go"
	Lang string `json:"lang"`
	// tar 中的目录名（默认 = Lang）
	OutDir string `json:"outDir,omitempty"`
	// --additional-properties 传给生成器，例如 npmName / npmVersion / npmRepository
	Properties map[string]string `json:"properties,omitempty"`
}

func main() {
	port := envOr("SDKBUILDER_PORT", "7100")
	addr := ":" + port

	mux := http.NewServeMux()
	mux.HandleFunc("/healthz", handleHealthz)
	mux.HandleFunc("/generate", handleGenerate)

	srv := &http.Server{
		Addr:              addr,
		Handler:           mux,
		ReadHeaderTimeout: 30 * time.Second,
		// 生成可能耗 30s+，写超时给足余量
		WriteTimeout: 10 * time.Minute,
		ReadTimeout:  2 * time.Minute,
		IdleTimeout:  120 * time.Second,
	}

	slog.Info("sdkbuilder starting", "addr", addr)
	if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		slog.Error("server crashed", "err", err)
		os.Exit(1)
	}
}

func handleHealthz(w http.ResponseWriter, _ *http.Request) {
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte(`{"ok":true}`))
}

func handleGenerate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req GenerateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid json: "+err.Error(), http.StatusBadRequest)
		return
	}
	if len(req.Spec) == 0 {
		http.Error(w, "spec is required", http.StatusBadRequest)
		return
	}
	if len(req.Generators) == 0 {
		http.Error(w, "generators is required", http.StatusBadRequest)
		return
	}

	work, err := os.MkdirTemp("", "sdkbuilder-*")
	if err != nil {
		http.Error(w, "tmpdir: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer os.RemoveAll(work)

	specFile := filepath.Join(work, "spec.json")
	if err := os.WriteFile(specFile, req.Spec, 0o644); err != nil {
		http.Error(w, "write spec: "+err.Error(), http.StatusInternalServerError)
		return
	}

	outDirs := make([]string, 0, len(req.Generators))
	for _, g := range req.Generators {
		dirName := g.OutDir
		if dirName == "" {
			dirName = g.Lang
		}
		outDir := filepath.Join(work, dirName)
		if err := runGenerator(r.Context(), specFile, outDir, g); err != nil {
			http.Error(w, fmt.Sprintf("generate %q: %v", g.Lang, err), http.StatusBadGateway)
			return
		}
		outDirs = append(outDirs, dirName)
	}

	w.Header().Set("Content-Type", "application/gzip")
	w.Header().Set("Content-Disposition", `attachment; filename="sdk.tar.gz"`)
	if err := writeTarGz(w, work, outDirs); err != nil {
		// header 已发出，只能记日志
		slog.Error("write tar.gz", "err", err)
	}
}

func runGenerator(ctx context.Context, specFile, outDir string, g GeneratorConfig) error {
	if err := os.MkdirAll(outDir, 0o755); err != nil {
		return err
	}

	args := []string{
		"generate",
		"-i", specFile,
		"-g", g.Lang,
		"-o", outDir,
		"--skip-validate-spec",
	}
	if len(g.Properties) > 0 {
		// 稳定排序 → 日志/复现友好
		keys := make([]string, 0, len(g.Properties))
		for k := range g.Properties {
			keys = append(keys, k)
		}
		sort.Strings(keys)
		parts := make([]string, 0, len(keys))
		for _, k := range keys {
			parts = append(parts, k+"="+g.Properties[k])
		}
		args = append(args, "--additional-properties="+strings.Join(parts, ","))
	}

	// openapi-generator-cli 是 npm 装的 wrapper，PATH 里要有它
	cmd := exec.CommandContext(ctx, "openapi-generator-cli", args...)
	var stderr strings.Builder
	cmd.Stderr = &stderr
	cmd.Stdout = io.Discard
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("%w: %s", err, strings.TrimSpace(stderr.String()))
	}
	return nil
}

// writeTarGz 把 work 下的 outDirs 全部打包成 tar.gz 写到 w。
func writeTarGz(w io.Writer, work string, outDirs []string) error {
	gzw := gzip.NewWriter(w)
	defer gzw.Close()
	tw := tar.NewWriter(gzw)
	defer tw.Close()

	for _, dir := range outDirs {
		root := filepath.Join(work, dir)
		err := filepath.Walk(root, func(path string, info os.FileInfo, walkErr error) error {
			if walkErr != nil {
				return walkErr
			}
			rel, err := filepath.Rel(work, path)
			if err != nil {
				return err
			}
			hdr, err := tar.FileInfoHeader(info, "")
			if err != nil {
				return err
			}
			hdr.Name = filepath.ToSlash(rel)
			if err := tw.WriteHeader(hdr); err != nil {
				return err
			}
			if !info.Mode().IsRegular() {
				return nil
			}
			f, err := os.Open(path)
			if err != nil {
				return err
			}
			defer f.Close()
			_, err = io.Copy(tw, f)
			return err
		})
		if err != nil {
			return err
		}
	}
	return nil
}

func envOr(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return def
}
