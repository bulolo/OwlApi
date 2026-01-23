package main

import "github.com/hongjunyao/owlapi/internal/app/server"

func main() {
	app := server.New()
	app.Run()
}
