# Variables
APP_NAME := app-market
VERSION := 0.1.0
BUILD_DIR := bin
MAIN_FILE := cmd/app-market/main.go
DOCKER_REPO := your-org
PREFIX ?= $(HOME)/.local
BIN_DIR := $(PREFIX)/bin

# Go commands
GOCMD := go
GOBUILD := $(GOCMD) build
GOTEST := $(GOCMD) test
GOGET := $(GOCMD) get
GORUN := $(GOCMD) run

# Flags
LDFLAGS := -X main.Version=$(VERSION)

.PHONY: all init swagger build test run-dev run-prod run-frontend dev clean docker-build docker-buildx lint help install init-admin

help: ## Display this help screen
	@grep -h -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'

all: swagger build ## Generate docs and build the binary

init: ## Initialize dependencies and tools
	$(GOCMD) mod download
	$(GOCMD) install github.com/swaggo/swag/cmd/swag@latest
	$(GOCMD) install github.com/golangci/golangci-lint/cmd/golangci-lint@latest

swagger: ## Generate Swagger documentation
	$(shell go env GOPATH)/bin/swag init -g $(MAIN_FILE)

build: swagger ## Build the binary
	mkdir -p $(BUILD_DIR)
	$(GOBUILD) -ldflags "$(LDFLAGS)" -o $(BUILD_DIR)/$(APP_NAME) $(MAIN_FILE)

install: build ## Install binary to system path
	@echo "Installing $(APP_NAME) to $(BIN_DIR)..."
	mkdir -p $(BIN_DIR)
	cp $(BUILD_DIR)/$(APP_NAME) $(BIN_DIR)/$(APP_NAME)
	@echo "Install complete. Add $(BIN_DIR) to your PATH if not already present."

init-admin: ## Initialize admin user (Usage: make init-admin USERNAME=admin PASSWORD=123456)
	@echo "Initializing admin user..."
	$(GOBUILD) -o bin/init-admin ./cmd/init-admin
	./bin/init-admin $(USERNAME) $(PASSWORD)

test: ## Run tests
	$(GOTEST) -v ./...

lint: ## Run linter
	golangci-lint run

run-dev: swagger ## Run locally in development mode (backend + frontend)
	@echo "Starting backend and frontend..."
	@echo "Backend: http://localhost:8081"
	@echo "Frontend: http://localhost:5173"
	@APP_SERVER_MODE=debug APP_LOG_LEVEL=debug $(GORUN) $(MAIN_FILE) &
	@cd frontend && npm run dev

run-backend: swagger ## Run backend server only
	APP_SERVER_MODE=debug APP_LOG_LEVEL=debug $(GORUN) $(MAIN_FILE)

run-frontend: ## Run frontend dev server only
	cd frontend && npm run dev

run-prod: build ## Run locally in production mode (using built binary)
	APP_SERVER_MODE=release APP_LOG_LEVEL=info ./$(BUILD_DIR)/$(APP_NAME)

clean: ## Clean build directory
	rm -rf $(BUILD_DIR)
	rm -rf docs

# Docker
docker-build: ## Build Docker image (local)
	docker build -t $(APP_NAME):$(VERSION) .

docker-run: ## Run Docker container
	docker run -p 8081:8081 $(APP_NAME):$(VERSION)

docker-buildx: ## Build multi-arch Docker image (requires docker buildx setup)
	# Note: You might need to run 'docker buildx create --use' first if not configured
	docker buildx build --platform linux/amd64,linux/arm64 \
		-t $(DOCKER_REPO)/$(APP_NAME):$(VERSION) \
		-t $(DOCKER_REPO)/$(APP_NAME):latest \
		. --push
