# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Kubernetes Application Market - An enterprise Helm Chart management system built with Go backend and React frontend. The system allows administrators to sync applications from standard Helm Chart repositories (like Bitnami) and provides a simplified visual deployment workflow for business users to deploy complex applications to Kubernetes clusters.

## Common Commands

### Backend Development

```bash
# Initialize dependencies and tools
make init

# Generate Swagger documentation
make swagger

# Build the backend binary
make build

# Run backend only (development mode)
make run-backend

# Run backend and frontend together (development mode)
make run-dev

# Run tests
make test

# Run linter
make lint

# Initialize admin user
make init-admin USERNAME=admin PASSWORD=123456

# Run in production mode
make run-prod
```

#### Frontend Development

```bash
# Run frontend dev server only
make run-frontend

# Or directly in frontend directory:
cd frontend
npm run dev      # Development server (runs on port 5173)
npm run build    # Production build
npm run lint     # Run ESLint
```

**Note**: Frontend development server runs on port 5173, but proxies API requests to backend on port 8081.

### Docker

```bash
# Build Docker image
make docker-build

# Run Docker container
make docker-run

# Build multi-arch image
make docker-buildx
```

### Testing

```bash
# Run all unit tests
go test ./...

# Run tests with coverage
go test -cover ./...

# Run specific package tests
go test -v ./internal/helm/...

# Run single test
go test -v -run TestFunctionName ./path/to/package

# End-to-end test
./e2e_test.sh
```

## Architecture Overview

### Request Flow

```
User → Gin Router → Auth Middleware → Handler → Service → Repository/DB
                                                    ↓
                                              Helm Client → Kubernetes
```

### Core Components

1. **API Layer** (`internal/api/`)
   - `router.go`: Route registration and dependency injection
   - `handler/`: HTTP request handlers (auth, chart, deploy, repo)
   - `middleware/auth.go`: JWT authentication middleware

2. **Service Layer** (`internal/service/`)
   - `sync.go`: Fetches `index.yaml` from Helm repositories, parses chart metadata
   - `deploy.go`: Orchestrates deployment (values merge, validation, Helm install)
   - `chart.go`: Chart metadata management (admin defaults, required keys)
   - `task.go`: Asynchronous task queue with worker pool for long-running Helm operations

3. **Helm Integration** (`internal/helm/`)
   - `client.go`: Wrapper around Helm SDK for install/upgrade operations
   - `values.go`: Three-layer values merging (Chart Default → Admin Default → User Input)
   - `ValidateRequiredKeys()`: Validates required fields marked by admin

4. **Data Models** (`internal/model/`)
   - `repo.go`: Chart repositories
   - `chart.go`: Chart metadata with versions
   - `instance.go`: Deployed application instances
   - `task.go`: Async deployment tasks
   - `user.go`: User authentication

### Key Design Patterns

**Three-Layer Configuration Merge**:
- Chart defaults (from values.yaml) → Admin defaults (pre-configured) → User input (form submission)
- Implemented using `dario.cat/mergo` with override strategy

**Asynchronous Deployment**:
- Deployment requests create tasks in DB with status "pending"
- Worker pool (goroutines + channels) processes tasks asynchronously
- Frontend polls `/api/tasks/:id` for status updates

**Multi-tenancy**:
- User context stored in JWT and passed through middleware
- Namespace isolation enforced at Helm install time
- Users can only see/manage their own instances

**Repository Sync Engine**:
- Fetches `index.yaml` from configured Helm repositories
- Parses chart entries and versions using Helm SDK types
- Stores in normalized DB schema (ChartRepo → Chart → ChartVersion)

## Configuration

Configuration is managed via `config.yaml` and environment variables:

```yaml
server:
  port: "8081"          # Can override with APP_SERVER_PORT
  mode: "debug"         # Can override with APP_SERVER_MODE (debug/release)

log:
  level: "debug"        # Can override with APP_LOG_LEVEL

database:
  driver: "sqlite"      # sqlite or mysql
  dsn: "app-market.db"  # Connection string

helm:
  repo_url: "https://charts.bitnami.com/bitnami"
```

Environment variables follow pattern: `APP_<SECTION>_<KEY>` (e.g., `APP_SERVER_PORT=8081`)

**Backend Port**: 8081
**Frontend Dev Port**: 5173 (proxies to backend on 8081)

## Critical Implementation Details

### Kubeconfig Integration

When deploying applications, the system needs user-specific Kubernetes credentials:

```go
// Expected pattern (not fully implemented yet):
// 1. Call external provider to get user's kubeconfig
kubeconfig, err := kubeconfigProvider.GetKubeconfig(ctx, userID)

// 2. Create Helm client with user's kubeconfig
helmClient, err := helm.NewClientWithConfig(namespace, kubeconfig)
```

### Values Validation

Required keys can be nested using dot notation:

```go
requiredKeys := []string{"image.repository", "image.tag", "service.type"}
err := helm.ValidateRequiredKeys(userValues, requiredKeys)
```

### Error Handling

Always wrap errors with context:

```go
if err != nil {
    return fmt.Errorf("failed to parse values.yaml: %w", err)
}
```

### Database Transactions

Repository sync uses transactions to ensure consistency:

```go
return s.db.Transaction(func(tx *gorm.DB) error {
    // All DB operations here
    return nil
})
```

## Project Structure Notes

- **Language Requirement**: AI Agents must respond in **Chinese (中文)** unless explicitly requested otherwise (per AGENTS.md)
- **Authentication**: All `/api/*` routes require JWT token; `/admin/*` routes also require admin role
- **Frontend** is a React SPA with Vite, Ant Design, TanStack Query, and Monaco Editor
- **Frontend Structure** (`frontend/src/`):
  - `pages/`: 页面组件 (LoginPage, ChartMarket, DeployPage, AdminCharts, AdminUsers, MyApps, TasksPage)
  - `components/`: 可复用组件
  - `services/api.ts`: API 调用服务
  - `stores/`: Zustand 状态管理 (authStore)
  - `types/`: TypeScript 类型定义
- **Swagger docs** auto-generated at `/swagger/index.html` after running `make swagger`
- **Database migrations** handled automatically by GORM auto-migrate on startup
- **Frontend dev server** runs on port 5173, backend on 8081 (configured in vite.config.ts)

## SPA History Mode Routing

The frontend runs as a single-page application with client-side routing. Both development and production environments are configured to support page refresh and direct URL navigation:

**Development**:
- `vite.config.ts` has `historyApiFallback: true` which sends all non-API routes back to `index.html`
- `/api` and `/admin` routes are proxied to backend at `http://localhost:8081`
- Frontend routes like `/login`, `/my-apps`, `/tasks` are handled by React Router

**Production**:
- Nginx container serves frontend with SPA fallback via `try_files $uri $uri/ /index.html`
- Static assets in `/assets/` are served with long-term cache headers
- `index.html` is served with no-cache headers to ensure fresh app bootstrap
- API requests to `/api` and `/admin` are proxied to backend

Users can now:
- Refresh the page at any route (e.g., `http://localhost:5173/login`) - no 404
- Directly navigate to any URL in the browser without needing to go through the home page first
- Visit the app through production Nginx without routing issues

## Common Development Tasks

### Adding a New API Endpoint

1. Define handler in `internal/api/handler/`
2. Register route in `internal/api/router.go`
3. Add Swagger comments using `@` annotations
4. Run `make swagger` to update docs
5. Implement service logic in `internal/service/`

### Adding a New Helm Repository

```bash
curl -X POST -H "Content-Type: application/json" \
  -d '{"name":"bitnami", "url":"https://charts.bitnami.com/bitnami"}' \
  http://localhost:8080/admin/repos

# Then sync it:
curl -X POST http://localhost:8080/admin/repos/1/sync
```

### Testing Deployment Flow

1. Ensure admin user exists: `make init-admin USERNAME=admin PASSWORD=123456`
2. Login to get JWT token
3. Submit deployment request with token in Authorization header
4. Poll task status endpoint until completion
5. Check instances list

Refer to `e2e_test.sh` for complete example.
