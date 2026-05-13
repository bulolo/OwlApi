package http

import (
	"net/http"
	"strconv"

	"github.com/bulolo/owlapi/internal/domain"
	"github.com/gin-gonic/gin"
)

// R is the unified response: { code, msg, data }
type R struct {
	Code int    `json:"code"`
	Msg  string `json:"msg"`
	Data any    `json:"data,omitempty"`
}

type PaginationInfo struct {
	IsPager int `json:"is_pager"`
	Page    int `json:"page"`
	Size    int `json:"size"`
	Total   int `json:"total"`
}

type PaginatedData struct {
	List       any            `json:"list"`
	Pagination PaginationInfo `json:"pagination"`
}

func OK(c *gin.Context, data any) {
	c.JSON(http.StatusOK, R{Code: 0, Msg: "success", Data: data})
}

func OKPaged(c *gin.Context, list any, p domain.ListParams, total int) {
	pg := PaginationInfo{Total: total}
	if p.IsPaged() {
		pg.IsPager = 1
		pg.Page = p.Page
		pg.Size = p.Size
	}
	c.JSON(http.StatusOK, R{
		Code: 0,
		Msg:  "success",
		Data: PaginatedData{List: list, Pagination: pg},
	})
}

func Fail(c *gin.Context, httpCode int, msg string) {
	c.JSON(httpCode, R{Code: 1, Msg: msg})
}

// FailErr maps a domain.Error to the correct HTTP status; plain errors become 500.
func FailErr(c *gin.Context, err error) {
	if e, ok := err.(*domain.Error); ok {
		Fail(c, e.Code, e.Message)
		return
	}
	Fail(c, http.StatusInternalServerError, err.Error())
}

// pathInt64 parses a path parameter as int64. Returns (0, false) and writes a 400 response on failure.
func pathInt64(c *gin.Context, name string) (int64, bool) {
	v, err := strconv.ParseInt(c.Param(name), 10, 64)
	if err != nil {
		Fail(c, http.StatusBadRequest, "invalid "+name)
		return 0, false
	}
	return v, true
}

// parseListParams extracts page/size/keyword/is_pager from query string into domain.ListParams.
// When is_pager=0, Size is set to 0 (meaning no limit).
func parseListParams(c *gin.Context) domain.ListParams {
	p := domain.ListParams{Keyword: c.DefaultQuery("keyword", "")}

	if c.DefaultQuery("is_pager", "1") == "0" {
		p.Page = 1
		return p
	}

	p.Page, _ = strconv.Atoi(c.DefaultQuery("page", "1"))
	p.Size, _ = strconv.Atoi(c.DefaultQuery("size", "10"))
	if p.Page < 1 {
		p.Page = 1
	}
	if p.Size < 1 || p.Size > 100 {
		p.Size = 10
	}
	return p
}
