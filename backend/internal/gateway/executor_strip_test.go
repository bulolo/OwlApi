package gateway

import "testing"

func TestStripUnresolvedConditions(t *testing.T) {
	tests := []struct {
		name  string
		input string
		want  string
	}{
		{
			name:  "no placeholders — unchanged",
			input: "SELECT * FROM products WHERE category = 'electronics'",
			want:  "SELECT * FROM products WHERE category = 'electronics'",
		},
		{
			name:  "all resolved — unchanged",
			input: "SELECT * FROM products WHERE category = 'electronics' AND price >= 100 AND price <= 999",
			want:  "SELECT * FROM products WHERE category = 'electronics' AND price >= 100 AND price <= 999",
		},
		{
			name:  "strip trailing AND conditions with unresolved params",
			input: "SELECT id, name, price, stock, category FROM products WHERE category = 'electronics' AND price >= :min_price AND price <= :max_price",
			want:  "SELECT id, name, price, stock, category FROM products WHERE category = 'electronics'",
		},
		{
			name:  "strip middle AND condition",
			input: "SELECT * FROM products WHERE category = 'electronics' AND price >= :min_price AND stock > 0",
			want:  "SELECT * FROM products WHERE category = 'electronics' AND stock > 0",
		},
		{
			name:  "strip first condition — keep rest",
			input: "SELECT * FROM products WHERE name LIKE :keyword AND category = 'electronics'",
			want:  "SELECT * FROM products WHERE category = 'electronics'",
		},
		{
			name:  "all conditions unresolved — drop WHERE",
			input: "SELECT * FROM products WHERE name LIKE :keyword AND category = :cat",
			want:  "SELECT * FROM products",
		},
		{
			name:  "with ORDER BY after WHERE",
			input: "SELECT * FROM products WHERE category = 'electronics' AND price >= :min_price ORDER BY id",
			want:  "SELECT * FROM products WHERE category = 'electronics' ORDER BY id",
		},
		{
			name:  "with GROUP BY after WHERE",
			input: "SELECT category, COUNT(*) FROM products WHERE price >= :min_price GROUP BY category",
			want:  "SELECT category, COUNT(*) FROM products GROUP BY category",
		},
		{
			name:  "no WHERE clause — unchanged",
			input: "SELECT * FROM products ORDER BY id",
			want:  "SELECT * FROM products ORDER BY id",
		},
		{
			name:  "OR condition with unresolved",
			input: "SELECT * FROM products WHERE category = 'electronics' OR name LIKE :keyword",
			want:  "SELECT * FROM products WHERE category = 'electronics'",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := stripUnresolvedConditions(tt.input, map[string]string{})
			if got != tt.want {
				t.Errorf("\n got: %s\nwant: %s", got, tt.want)
			}
		})
	}
}
