package main

import (
	"log"

	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
	_ "github.com/your-org/app-market/docs" // Import generated docs
	"github.com/your-org/app-market/internal/api"
	"github.com/your-org/app-market/internal/config"
	"github.com/your-org/app-market/pkg/logger"
	"go.uber.org/zap"
)

// @title           Kubernetes App Market API
// @version         0.1.0
// @description     Enterprise Helm Chart Management System
// @termsOfService  http://swagger.io/terms/

// @contact.name   API Support
// @contact.url    http://www.swagger.io/support
// @contact.email  support@swagger.io

// @license.name  Apache 2.0
// @license.url   http://www.apache.org/licenses/LICENSE-2.0.html

// @host      localhost:8080
// @BasePath  /

// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization
func main() {
	// 1. Load Config
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	// 2. Init Logger
	logger.Init(cfg.Log.Level)
	defer logger.Sync()
	logger.Info("Starting App Market", zap.String("version", "0.1.0"))

	// 3. Init Router (with DB connection)
	r, err := api.NewRouter(cfg)
	if err != nil {
		logger.Fatal("Failed to init router", zap.Error(err))
	}

	// 4. Swagger Route
	r.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))

	// 5. Start Server
	addr := ":" + cfg.Server.Port
	logger.Info("Server listening", zap.String("addr", addr))
	if err := r.Run(addr); err != nil {
		logger.Fatal("Server failed to start", zap.Error(err))
	}
}
