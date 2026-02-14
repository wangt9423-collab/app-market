package main

import (
	"log"
	"os"

	"github.com/your-org/app-market/internal/config"
	"github.com/your-org/app-market/internal/model"
	"github.com/your-org/app-market/internal/repository"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	db, err := repository.NewDB(cfg.Database)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	// Auto migrate
	db.AutoMigrate(&model.User{})

	username := "admin"
	password := "admin123" // 默认密码，生产环境请务必修改

	if len(os.Args) > 1 {
		username = os.Args[1]
	}
	if len(os.Args) > 2 {
		password = os.Args[2]
	}

	// Check if user exists
	var user model.User
	result := db.Where("username = ?", username).First(&user)
	if result.Error == nil {
		log.Printf("User '%s' already exists, updating password...", username)
		user.Password = password
		user.Role = "admin"
		user.HashPassword()
		db.Save(&user)
	} else {
		log.Printf("Creating user '%s'...", username)
		user = model.User{
			Username: username,
			Password: password,
			Role:     "admin",
		}
		user.HashPassword()
		if err := db.Create(&user).Error; err != nil {
			log.Fatalf("Failed to create user: %v", err)
		}
	}

	log.Println("Admin user initialized successfully!")
	log.Printf("Username: %s", username)
	log.Printf("Password: %s", password)
}
