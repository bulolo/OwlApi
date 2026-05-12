package pathutil

import "strings"

// Match reports whether requestPath matches pattern.
// Pattern segments prefixed with ":" are path parameters (e.g. /api/users/:id).
// Returns extracted path params and true on match.
func Match(pattern, requestPath string) (map[string]string, bool) {
	ps := split(pattern)
	rs := split(requestPath)
	if len(ps) != len(rs) {
		return nil, false
	}
	params := make(map[string]string)
	for i, seg := range ps {
		if strings.HasPrefix(seg, ":") {
			params[seg[1:]] = rs[i]
		} else if seg != rs[i] {
			return nil, false
		}
	}
	return params, true
}

// HasParams reports whether a path pattern contains any :param segments.
func HasParams(path string) bool {
	for _, seg := range split(path) {
		if strings.HasPrefix(seg, ":") {
			return true
		}
	}
	return false
}

// StaticCount returns the number of non-parameterized segments.
// Used to prefer more specific matches when multiple patterns match.
func StaticCount(path string) int {
	n := 0
	for _, seg := range split(path) {
		if !strings.HasPrefix(seg, ":") {
			n++
		}
	}
	return n
}

func split(path string) []string {
	return strings.Split(strings.Trim(path, "/"), "/")
}
