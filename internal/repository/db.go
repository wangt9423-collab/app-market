package repository

import (
	"fmt"

	"github.com/glebarez/sqlite"
	"github.com/your-org/app-market/internal/config"
	"github.com/your-org/app-market/internal/model"
	"gorm.io/gorm"
)

// NewDB initializes the database connection and migrates the schema
func NewDB(cfg config.DatabaseConfig) (*gorm.DB, error) {
	var dialector gorm.Dialector

	switch cfg.Driver {
	case "sqlite":
		dialector = sqlite.Open(cfg.DSN)
	default:
		return nil, fmt.Errorf("unsupported database driver: %s", cfg.Driver)
	}

	db, err := gorm.Open(dialector, &gorm.Config{})
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	// Auto Migrate
	if err := db.AutoMigrate(
		&model.ChartMetadata{},
		&model.AppInstance{},
		&model.ChartRepo{},
		&model.Chart{},
		&model.ChartVersion{},
		&model.Task{},
		&model.User{},
	); err != nil {
		return nil, fmt.Errorf("failed to migrate database: %w", err)
	}

	return db, nil
}
