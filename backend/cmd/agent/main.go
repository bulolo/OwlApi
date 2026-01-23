package main

import "github.com/hongjunyao/owlapi/internal/app/agent"

func main() {
	app := agent.New()
	app.Run()
}
