package helm

import (
	"fmt"
	"strings"

	"dario.cat/mergo"
)

// MergeValues merges configuration from three sources:
// 1. Chart Defaults (Base)
// 2. Admin Defaults (Override Base)
// 3. User Values (Override Admin)
// Returns the final map to be used for deployment.
func MergeValues(chartDefaults, adminDefaults, userValues map[string]interface{}) (map[string]interface{}, error) {
	// 1. Start with Chart Defaults
	final := make(map[string]interface{})
	if err := mergo.Merge(&final, chartDefaults); err != nil {
		return nil, fmt.Errorf("failed to merge chart defaults: %w", err)
	}

	// 2. Apply Admin Defaults (Override)
	if err := mergo.Merge(&final, adminDefaults, mergo.WithOverride); err != nil {
		return nil, fmt.Errorf("failed to merge admin defaults: %w", err)
	}

	// 3. Apply User Values (Override)
	if err := mergo.Merge(&final, userValues, mergo.WithOverride); err != nil {
		return nil, fmt.Errorf("failed to merge user values: %w", err)
	}

	return final, nil
}

// ValidateRequiredKeys checks if specific keys exist in the values map.
// Keys can be dot-separated for nested lookup (e.g., "image.repository").
func ValidateRequiredKeys(values map[string]interface{}, requiredKeys []string) error {
	var missing []string

	for _, key := range requiredKeys {
		if !hasKey(values, key) {
			missing = append(missing, key)
		}
	}

	if len(missing) > 0 {
		return fmt.Errorf("missing required keys: %s", strings.Join(missing, ", "))
	}
	return nil
}

func hasKey(m map[string]interface{}, key string) bool {
	parts := strings.Split(key, ".")
	current := m

	for i, part := range parts {
		val, ok := current[part]
		if !ok {
			return false
		}

		// If it's the last part, we found it
		if i == len(parts)-1 {
			return true
		}

		// Otherwise, drill down
		nextMap, ok := val.(map[string]interface{})
		if !ok {
			// Path exists but is not a map, so we can't go deeper
			return false
		}
		current = nextMap
	}
	return false
}
