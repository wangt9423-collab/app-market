package model

import (
	"time"

	"gorm.io/gorm"
)

// AppInstance represents a deployed application instance
type AppInstance struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	Name      string `gorm:"uniqueIndex:idx_ns_name;not null" json:"name"`
	Namespace string `gorm:"uniqueIndex:idx_ns_name;not null" json:"namespace"`
	UserID    string `gorm:"index" json:"user_id"`

	ChartID      string `json:"chart_id"`
	ChartVersion string `json:"chart_version"`

	Status string `json:"status"` // deployed, failed, pending

	// AppliedValues stores the final merged values used for deployment
	AppliedValues JSONMap `gorm:"type:text" json:"applied_values"`
}
