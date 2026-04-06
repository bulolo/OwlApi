package domain

import "fmt"

// Error represents a business error with an HTTP status code.
type Error struct {
	Code    int
	Message string
}

func (e *Error) Error() string { return e.Message }

func ErrNotFound(msg string) *Error      { return &Error{Code: 404, Message: msg} }
func ErrBadRequest(msg string) *Error     { return &Error{Code: 400, Message: msg} }
func ErrConflict(msg string) *Error       { return &Error{Code: 409, Message: msg} }
func ErrForbidden(msg string) *Error      { return &Error{Code: 403, Message: msg} }
func ErrUnauthorized(msg string) *Error   { return &Error{Code: 401, Message: msg} }
func ErrInternal(msg string) *Error       { return &Error{Code: 500, Message: msg} }
func ErrUnavailable(msg string) *Error    { return &Error{Code: 503, Message: msg} }

func ErrNotFoundf(format string, a ...any) *Error  { return ErrNotFound(fmt.Sprintf(format, a...)) }
func ErrBadRequestf(format string, a ...any) *Error { return ErrBadRequest(fmt.Sprintf(format, a...)) }
func ErrConflictf(format string, a ...any) *Error   { return ErrConflict(fmt.Sprintf(format, a...)) }
