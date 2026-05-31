package gateway

import (
	"testing"
	"time"
)

func TestRunPreScriptValidationError(t *testing.T) {
	const timeout = time.Second

	tests := []struct {
		name     string
		code     string
		wantErr  string
		wantCode int32
	}{
		{
			name: "string error defaults to 400",
			code: `function main(params) {
				if (!params.keyword) { return { error: "keyword 不能为空" }; }
				return params;
			}`,
			wantErr:  "keyword 不能为空",
			wantCode: 400,
		},
		{
			name: "object error with custom status",
			code: `function main(params) {
				return { error: { status: 422, message: "page 必须为正整数" } };
			}`,
			wantErr:  "page 必须为正整数",
			wantCode: 422,
		},
		{
			name: "object error without status defaults to 400",
			code: `function main(params) {
				return { error: { message: "缺少 id" } };
			}`,
			wantErr:  "缺少 id",
			wantCode: 400,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			out, err := runPreScript(tt.code, map[string]string{}, "SELECT 1", timeout)
			if err != nil {
				t.Fatalf("unexpected runtime error: %v", err)
			}
			if out.Err != tt.wantErr {
				t.Errorf("Err = %q, want %q", out.Err, tt.wantErr)
			}
			if out.ErrCode != tt.wantCode {
				t.Errorf("ErrCode = %d, want %d", out.ErrCode, tt.wantCode)
			}
		})
	}
}

func TestRunPreScriptNoErrorPassthrough(t *testing.T) {
	code := `function main(params) {
		params.limit = "10";
		return params;
	}`
	out, err := runPreScript(code, map[string]string{"page": "1"}, "SELECT 1", time.Second)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if out.Err != "" || out.ErrCode != 0 {
		t.Fatalf("expected no validation error, got Err=%q ErrCode=%d", out.Err, out.ErrCode)
	}
	if out.Params["limit"] != "10" {
		t.Errorf("Params[limit] = %q, want 10", out.Params["limit"])
	}
}

// An empty/falsy error must not reject — a caller param named "error" passed
// through the flat-return form should be treated as a normal param.
func TestRunPreScriptFalsyErrorPassthrough(t *testing.T) {
	code := `function main(params) { return params; }`
	out, err := runPreScript(code, map[string]string{"error": ""}, "SELECT 1", time.Second)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if out.Err != "" || out.ErrCode != 0 {
		t.Fatalf("empty error should not reject, got Err=%q ErrCode=%d", out.Err, out.ErrCode)
	}
	if _, ok := out.Params["error"]; !ok {
		t.Errorf("expected 'error' to pass through as a param")
	}
}

// A post-script chain flows data through: stage 1 transforms rows, stage 2 wraps.
func TestRunPostScriptChain(t *testing.T) {
	rows := []map[string]interface{}{
		{"id": int64(1), "name": "a"},
		{"id": int64(2), "name": "b"},
	}
	params := map[string]string{"_total": "2"}

	// stage 1: keep only names → ["a","b"]
	stage1 := `function main(data, params) { return data.map(function(r){ return r.name; }); }`
	// stage 2: wrap into a response envelope using stage1 output as data
	stage2 := `function main(data, params) { return { code: 0, list: data, total: Number(params._total||0) }; }`

	var data interface{} = rows
	for _, code := range []string{stage1, stage2} {
		out, err := runPostScript(code, data, params, time.Second)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		data = out
	}

	m, ok := data.(map[string]interface{})
	if !ok {
		t.Fatalf("final output not an object: %#v", data)
	}
	if m["total"].(int64) != 2 {
		t.Errorf("total = %v, want 2", m["total"])
	}
	list, ok := m["list"].([]interface{})
	if !ok || len(list) != 2 || list[0].(string) != "a" {
		t.Errorf("list = %#v, want [a b]", m["list"])
	}
}
