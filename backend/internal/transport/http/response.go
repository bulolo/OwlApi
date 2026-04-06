package http

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

// R is the unified response: { code, msg, data }
type R struct {
	Code int    `json:"code"`
	Msg  string `json:"msg"`
	Data any    `json:"data,omitempty"`
}

// Pagination info
type PaginationInfo struct {
	IsPager int `json:"is_pager"`
	Page    int `json:"page"`
	Size    int `json:"size"`
	Total   int `json:"total"`
}

// PaginatedData wraps list + pagination
type PaginatedData struct {
	List       any            `json:"list"`
	Pagination PaginationInfo `json:"pagination"`
}

func OK(c *gin.Context, data any) {
	c.JSON(http.StatusOK, R{Code: 0, Msg: "success", Data: data})
}

func OKPaged(c *gin.Context, list any, page, size, total int) {
	c.JSON(http.StatusOK, R{
		Code: 0,
		Msg:  "success",
		Data: PaginatedData{
			List: list,
			Pagination: PaginationInfo{
				IsPager: 1,
				Page:    page,
				Size:    size,
				Total:   total,
			},
		},
	})
}

func Fail(c *gin.Context, httpCode int, msg string) {
	c.JSON(httpCode, R{Code: 1, Msg: msg})
}

func parsePage(c *gin.Context) (page, size int, isPager bool) {
	isPagerStr := c.DefaultQuery("is_pager", "1")
	if isPagerStr == "0" {
		return 1, 0, false
	}
	page, err := strconv.Atoi(c.DefaultQuery("page", "1"))
	if err != nil {
		page = 1
	}
	size, err = strconv.Atoi(c.DefaultQuery("size", "10"))
	if err != nil {
		size = 10
	}
	if page < 1 {
		page = 1
	}
	if size < 1 || size > 100 {
		size = 20
	}
	return page, size, true
}
