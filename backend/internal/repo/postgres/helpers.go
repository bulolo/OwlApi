package postgres

import (
	"errors"
	"fmt"

	"github.com/bulolo/owlapi/internal/domain"
	"github.com/jackc/pgx/v5"
)

// nfErr maps pgx.ErrNoRows to a clean domain 404 ("<entity> not found"), so a
// missing single-row lookup never leaks the raw "no rows in result set" string
// to the client. Any other error passes through unchanged. Single source of
// truth for not-found translation across all repos.
func nfErr(err error, entity string) error {
	if errors.Is(err, pgx.ErrNoRows) {
		return domain.ErrNotFound(entity + " not found")
	}
	return err
}

// likeWrap wraps a keyword with SQL LIKE wildcard characters.
func likeWrap(keyword string) string {
	return "%" + keyword + "%"
}

// appendPagination adds LIMIT/OFFSET to a query if pagination is enabled.
// Returns the updated SQL suffix and args.
func appendPagination(p domain.ListParams, argN int, args []interface{}) (string, []interface{}) {
	if !p.IsPaged() {
		return "", args
	}
	suffix := fmt.Sprintf(" LIMIT $%d OFFSET $%d", argN, argN+1)
	return suffix, append(args, p.Size, p.Offset())
}
