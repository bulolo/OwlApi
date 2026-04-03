package http

import (
	"embed"
	"net/http"

	"github.com/gin-gonic/gin"
)

//go:embed openapi.yaml
var specFile embed.FS

const swaggerHTML = `<!DOCTYPE html>
<html><head>
<title>OwlApi - Swagger UI</title>
<link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
</head><body>
<div id="swagger-ui"></div>
<script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
<script>SwaggerUIBundle({url:"/swagger/openapi.yaml",dom_id:"#swagger-ui"})</script>
</body></html>`

func RegisterSwagger(r *gin.Engine) {
	r.GET("/swagger", func(c *gin.Context) {
		c.Data(http.StatusOK, "text/html; charset=utf-8", []byte(swaggerHTML))
	})
	r.GET("/swagger/openapi.yaml", func(c *gin.Context) {
		data, _ := specFile.ReadFile("openapi.yaml")
		c.Data(http.StatusOK, "application/yaml", data)
	})
}
