package config

import (
	"fmt"
	"strings"

	"github.com/spf13/viper"
)

type Config struct {
	Server   ServerConfig   `mapstructure:"server"`
	Log      LogConfig      `mapstructure:"log"`
	Database DatabaseConfig `mapstructure:"database"`
	Helm     HelmConfig     `mapstructure:"helm"`
	Chart    ChartConfig    `mapstructure:"chart"`
}

type ServerConfig struct {
	Port string `mapstructure:"port"`
	Mode string `mapstructure:"mode"` // debug, release
}

type LogConfig struct {
	Level string `mapstructure:"level"` // debug, info, warn, error
}

type DatabaseConfig struct {
	Driver string `mapstructure:"driver"` // sqlite, mysql
	DSN    string `mapstructure:"dsn"`
}

type HelmConfig struct {
	RepoURL string `mapstructure:"repo_url"`
}

type ChartConfig struct {
	StoragePath   string `mapstructure:"storage_path"`
	MaxUploadSize int64  `mapstructure:"max_upload_size"`
}

// Load reads configuration from config file and environment variables
func Load() (*Config, error) {
	viper.SetConfigName("config")
	viper.SetConfigType("yaml")
	viper.AddConfigPath(".")
	viper.AddConfigPath("./config")

	viper.SetEnvPrefix("APP")
	viper.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))
	viper.AutomaticEnv()

	// Set defaults
	setDefaults()

	if err := viper.ReadInConfig(); err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); !ok {
			return nil, fmt.Errorf("failed to read config file: %w", err)
		}
		// It's okay if config file is missing, we can rely on env or defaults
	}

	var cfg Config
	if err := viper.Unmarshal(&cfg); err != nil {
		return nil, fmt.Errorf("failed to unmarshal config: %w", err)
	}

	return &cfg, nil
}

func setDefaults() {
	viper.SetDefault("server.port", "8080")
	viper.SetDefault("server.mode", "debug")
	viper.SetDefault("log.level", "info")
	viper.SetDefault("database.driver", "sqlite")
	viper.SetDefault("database.dsn", "app-market.db")
	viper.SetDefault("helm.repo_url", "https://charts.bitnami.com/bitnami")
}
