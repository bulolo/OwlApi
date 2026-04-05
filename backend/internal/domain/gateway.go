package domain

import "time"

type GatewayStatus string

const (
	GatewayOnline  GatewayStatus = "online"
	GatewayOffline GatewayStatus = "offline"
)

type Gateway struct {
	ID       int64         `json:"id"`
	TenantID int64         `json:"tenant_id"`
	Name     string        `json:"name"`
	Token    string        `json:"-"`
	Status   GatewayStatus `json:"status"`
	IP       string        `json:"ip"`
	LastSeen time.Time     `json:"last_seen"`
	Version  string        `json:"version"`
}
