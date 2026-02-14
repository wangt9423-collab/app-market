package model

import (
	"time"

	"gorm.io/gorm"
)

type ChartRepo struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	Name string `gorm:"uniqueIndex;not null" json:"name"`
	URL  string `gorm:"not null" json:"url"`
}

type Chart struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	RepoID      uint          `gorm:"index;not null" json:"repo_id"`
	Name        string        `gorm:"index;not null" json:"name"`
	Description string        `json:"description"`
	Icon        string        `json:"icon"`
	Home        string        `json:"home"`
	Published   bool          `gorm:"default:false" json:"published"`
	Versions    []ChartVersion `gorm:"foreignKey:ChartID" json:"versions"`
}

type ChartVersion struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	ChartID    uint        `gorm:"index;not null" json:"chart_id"`
	Version    string      `gorm:"not null" json:"version"`
	AppVersion string      `json:"app_version"`
	Digest     string      `json:"digest"`
	URLs       StringArray `gorm:"type:text" json:"urls"` // URLs to download the chart tarball

	// 新增字段：支持本地上传的 Chart
	ChartDefaultValues JSONMap `gorm:"type:text" json:"chart_default_values"` // Chart 原始 values.yaml
	LocalPath          string  `json:"local_path"`                            // 本地存储路径 (如 /charts/nginx/1.0.0.tgz)
}
