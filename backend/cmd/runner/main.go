package main

import (
	"github.com/hongjunyao/owlapi/internal/gateway"
)

func main() {
	app := gateway.New()
	app.Run()
}
