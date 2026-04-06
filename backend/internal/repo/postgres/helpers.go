package postgres

import (
	"fmt"

	"github.com/bulolo/owlapi/internal/domain"
)

// appendPagination adds LIMIT/OFFSET to a query if pagination is enabled.
// Returns the updated SQL suffix and args.
func appendPagination(p domain.ListParams, argN int, args []interface{}) (string, []interface{}) {
	if !p.IsPaged() {
		return "", args
	}
	suffix := fmt.Sprintf(" LIMIT $%d OFFSET $%d", argN, argN+1)
	return suffix, append(args, p.Size, p.Offset())
}
