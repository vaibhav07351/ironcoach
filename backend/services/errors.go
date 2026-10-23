package services

import "errors"

// ErrorKind classifies a service failure so the HTTP layer can pick a status code without
// string-matching messages.
type ErrorKind int

const (
	KindValidation ErrorKind = iota + 1
	KindNotFound
	KindForbidden
	KindConflict
	KindUnauthorized
)

// Error is a typed, client-safe service error. Message is safe to show to the user.
type Error struct {
	Kind    ErrorKind
	Code    string
	Message string
}

func (e *Error) Error() string { return e.Message }

func newErr(kind ErrorKind, code, msg string) *Error {
	return &Error{Kind: kind, Code: code, Message: msg}
}

func ErrValidation(msg string) error { return newErr(KindValidation, "validation_error", msg) }
func ErrNotFound(what string) error  { return newErr(KindNotFound, "not_found", what+" not found") }
func ErrForbidden(msg string) error  { return newErr(KindForbidden, "forbidden", msg) }
func ErrConflict(code, msg string) error {
	return newErr(KindConflict, code, msg)
}
func ErrUnauthorized(code, msg string) error { return newErr(KindUnauthorized, code, msg) }

// AsError extracts a typed service error, if err is one.
func AsError(err error) (*Error, bool) {
	var e *Error
	if errors.As(err, &e) {
		return e, true
	}
	return nil, false
}

// IsKind reports whether err is a typed service error of the given kind.
func IsKind(err error, kind ErrorKind) bool {
	e, ok := AsError(err)
	return ok && e.Kind == kind
}
