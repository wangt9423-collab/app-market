package model

import (
	"time"

	"gorm.io/gorm"
)

type Task struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	Type    string  `json:"type"`   // deploy, uninstall
	Status  string  `json:"status"` // pending, running, completed, failed
	Payload JSONMap `gorm:"type:text" json:"payload"`
	Result  string  `json:"result"` // Error message or success details
	UserID  string  `gorm:"index" json:"user_id"`
}
