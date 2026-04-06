package main

import (
	"github.com/bulolo/owlapi/internal/gateway"
)

func main() {
	app := gateway.New()
	app.Run()
}
