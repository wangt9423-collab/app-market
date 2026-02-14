package model

import (
	"database/sql/driver"
	"encoding/json"
	"errors"
	"time"

	"gorm.io/gorm"
)

// JSONMap handles JSON storage for map[string]interface{}
type JSONMap map[string]interface{}

func (m JSONMap) Value() (driver.Value, error) {
	return json.Marshal(m)
}

func (m *JSONMap) Scan(value interface{}) error {
	b, ok := value.([]byte)
	if !ok {
		return errors.New("type assertion to []byte failed")
	}
	return json.Unmarshal(b, &m)
}

// StringArray handles JSON storage for []string
type StringArray []string

func (a StringArray) Value() (driver.Value, error) {
	return json.Marshal(a)
}

func (a *StringArray) Scan(value interface{}) error {
	b, ok := value.([]byte)
	if !ok {
		return errors.New("type assertion to []byte failed")
	}
	return json.Unmarshal(b, &a)
}

// ChartMetadata stores admin configuration for charts
type ChartMetadata struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	ChartID     string `gorm:"uniqueIndex:idx_chart_version;not null" json:"chart_id"`
	Version     string `gorm:"uniqueIndex:idx_chart_version;not null" json:"version"`
	Description string `json:"description"`

	DefaultValues JSONMap `gorm:"type:text" json:"default_values"`

	RequiredKeys StringArray `gorm:"type:text" json:"required_keys"`

	VisibleKeys StringArray `gorm:"type:text" json:"visible_keys"`

	FixedKeys StringArray `gorm:"type:text" json:"fixed_keys"`
}
