package domain

// PlatformSettings stores global platform configuration (single row, id=1).
type PlatformSettings struct {
	AllowSelfRegister bool `json:"allow_self_register"`
}
