package api

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/your-org/app-market/internal/api/handler"
	"github.com/your-org/app-market/internal/api/middleware"
	"github.com/your-org/app-market/internal/config"
	"github.com/your-org/app-market/internal/repository"
	"github.com/your-org/app-market/internal/service"
)

func NewRouter(cfg *config.Config) (*gin.Engine, error) {
	// 1. Initialize Dependencies
	db, err := repository.NewDB(cfg.Database)
	if err != nil {
		return nil, err
	}

	chartService := service.NewChartService(db)
	deployService := service.NewDeployService(db, chartService)
	syncService := service.NewSyncService(db)
	taskService := service.NewTaskService(db, deployService)
	userService := service.NewUserService(db)

	chartHandler := handler.NewChartHandler(chartService)
	deployHandler := handler.NewDeployHandler(deployService, taskService)
	repoHandler := handler.NewRepoHandler(syncService)
	authHandler := handler.NewAuthHandler(db)
	userHandler := handler.NewUserHandler(userService)

	// 2. Setup Router
	if cfg.Server.Mode == "release" {
		gin.SetMode(gin.ReleaseMode)
	}
	r := gin.Default()

	// 2.5 Apply Global Middleware
	r.Use(middleware.CORSMiddleware())

	// Load Templates
	r.LoadHTMLGlob("templates/*")

	// 3. Register Routes
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	// Frontend
	r.GET("/", func(c *gin.Context) {
		c.HTML(http.StatusOK, "index.html", gin.H{})
	})

	// Public Routes
	r.POST("/login", authHandler.Login)

	// Admin Routes
	admin := r.Group("/admin")
	admin.Use(middleware.AuthMiddleware())
	admin.Use(middleware.AdminMiddleware())
	{
		// User Management
		admin.GET("/users", userHandler.ListUsers)
		admin.POST("/users", userHandler.CreateUser)
		admin.GET("/users/:id", userHandler.GetUser)
		admin.PUT("/users/:id", userHandler.UpdateUser)
		admin.DELETE("/users/:id", userHandler.DeleteUser)
		admin.POST("/users/:id/reset-password", userHandler.ResetPassword)

		admin.POST("/charts/:id/versions/:version/config", chartHandler.UpdateConfig)
		admin.GET("/charts/:id/versions/:version/config", chartHandler.GetConfig)
		admin.GET("/charts", chartHandler.ListCharts)
		admin.POST("/charts", chartHandler.CreateChart)
		admin.POST("/charts/:id/versions", chartHandler.CreateChartVersion)
		admin.PUT("/charts/:id/publish", chartHandler.UpdatePublishStatus)
		admin.PUT("/charts/:id", chartHandler.UpdateChart)
		admin.DELETE("/charts/:id", chartHandler.DeleteChart)

		admin.GET("/repos", repoHandler.ListRepos)
		admin.POST("/repos", repoHandler.AddRepo)
		admin.POST("/repos/:id/sync", repoHandler.SyncRepo)

		// Chart Upload & Onboarding
		admin.POST("/charts/upload", chartHandler.UploadChart)
		admin.POST("/charts/parse", chartHandler.ParseChart)
		admin.POST("/charts/onboard", chartHandler.OnboardChart)
	}

	// User Routes (Protected)
	api := r.Group("/api")
	api.Use(middleware.AuthMiddleware())
	{
		api.GET("/charts", chartHandler.ListPublishedCharts)
		api.POST("/deploy", deployHandler.Deploy)
		api.GET("/instances", deployHandler.ListInstances)
		api.DELETE("/instances/:id", deployHandler.DeleteInstance)
		api.GET("/tasks/:id", deployHandler.GetTaskStatus)
	}

	// SPA Fallback: Serve index.html for all non-API routes (supports direct browser access to SPA routes)
	r.NoRoute(func(c *gin.Context) {
		// Only serve index.html for non-API routes
		if len(c.Request.URL.Path) > 0 && c.Request.URL.Path[:1] != "/" {
			c.Request.URL.Path = "/" + c.Request.URL.Path
		}
		if c.Request.URL.Path != "/login" && c.Request.URL.Path != "/market" && 
		   c.Request.URL.Path != "/deploy" && c.Request.URL.Path != "/myapps" &&
		   c.Request.URL.Path != "/admin" && c.Request.URL.Path != "/admin/charts" &&
		   c.Request.URL.Path != "/admin/users" && c.Request.URL.Path != "/tasks" {
			// Only redirect if it's clearly a frontend route
			if c.Request.URL.Path != "/" && c.Request.URL.Path != "/index.html" &&
			   c.Request.URL.Path != "/api" && c.Request.URL.Path != "/admin" {
				// Let it return 404 for unknown paths, but try index.html for common SPA routes
			}
		}
		c.HTML(http.StatusOK, "index.html", gin.H{})
	})

	return r, nil
}
