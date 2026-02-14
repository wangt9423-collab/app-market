# AGENTS.md - Development Guide for App Market

> **IMPORTANT**: AI Agents must respond in **Chinese (中文)** unless explicitly requested otherwise.
> **重要提示**：AI Agent 必须使用 **中文** 回答所有问题，除非用户特别要求使用其他语言。

> **Project**: Kubernetes Application Market - Enterprise Helm Chart Management System  
> **Backend**: Go 1.21+  
> **Status**: Greenfield (Initial Setup Phase)

---

## Build, Test, and Lint Commands

### Project Setup
```bash
# Initialize Go module (first time)
go mod init github.com/your-org/app-market

# Download dependencies
go mod download

# Tidy dependencies
go mod tidy
```

### Build Commands
```bash
# Build the main application
go build -o bin/app-market ./cmd/app-market

# Build with version info
go build -ldflags "-X main.Version=$(git describe --tags)" -o bin/app-market ./cmd/app-market

# Build for production (optimized)
CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-w -s" -o bin/app-market ./cmd/app-market
```

### Test Commands
```bash
# Run all tests
go test ./...

# Run tests with coverage
go test -cover ./...

# Run tests with verbose output
go test -v ./...

# Run a single test
go test -v -run TestFunctionName ./path/to/package

# Run tests in a specific package
go test -v ./internal/helm/...

# Generate coverage report
go test -coverprofile=coverage.out ./...
go tool cover -html=coverage.out -o coverage.html
```

### Lint Commands
```bash
# Run golangci-lint (recommended)
golangci-lint run

# Run golangci-lint with auto-fix
golangci-lint run --fix

# Run specific linters
golangci-lint run --disable-all --enable=errcheck,gosimple,staticcheck

# Format code
gofmt -w .

# Run go vet
go vet ./...
```

---

## Project Structure

```
app-market/
├── cmd/
│   └── app-market/          # Main application entry point
│       └── main.go
├── internal/                # Private application code
│   ├── api/                 # HTTP handlers and routes
│   ├── helm/                # Helm chart operations
│   ├── config/              # Configuration management
│   ├── auth/                # Authentication/authorization
│   └── repository/          # Data access layer
├── pkg/                     # Public libraries (reusable)
├── config/                  # Configuration files
├── deployments/             # Deployment configurations (Kubernetes, Docker)
├── scripts/                 # Build and utility scripts
└── test/                    # Additional test data and helpers
```

---

## Code Style Guidelines

### Imports
```go
import (
    // Standard library (group 1)
    "context"
    "fmt"
    "time"

    // External dependencies (group 2)
    "github.com/gin-gonic/gin"
    "helm.sh/helm/v3/pkg/chart"
    "sigs.k8s.io/yaml"

    // Internal packages (group 3)
    "github.com/your-org/app-market/internal/config"
    "github.com/your-org/app-market/internal/helm"
)
```

**Rules**:
- Three groups: stdlib, external, internal
- Alphabetically sorted within each group
- Use `goimports` to auto-format

### Naming Conventions
```go
// Constants: PascalCase or SCREAMING_SNAKE_CASE
const MaxRetries = 3
const DEFAULT_TIMEOUT = 30 * time.Second

// Variables: camelCase
var userCache map[string]*User

// Exported: PascalCase
type ChartRepository struct {
    URL  string
    Name string
}

// Unexported: camelCase
type helmClient struct {
    config *rest.Config
}

// Interfaces: -er suffix when possible
type ChartParser interface {
    Parse(data []byte) (*Chart, error)
}
```

### Error Handling
```go
// ALWAYS wrap errors with context
if err != nil {
    return fmt.Errorf("failed to parse values.yaml: %w", err)
}

// Use custom error types for domain errors
type ValidationError struct {
    Field   string
    Message string
}

func (e *ValidationError) Error() string {
    return fmt.Sprintf("validation failed on %s: %s", e.Field, e.Message)
}

// Check error types
if errors.Is(err, ErrNotFound) {
    // Handle not found
}

if validationErr, ok := err.(*ValidationError); ok {
    // Handle validation error
}
```

### Function Design
```go
// Keep functions focused and small (<50 lines ideal)
// Use context.Context as first parameter for cancellable operations
func (s *ChartService) InstallChart(ctx context.Context, req *InstallRequest) (*Release, error) {
    // Validate inputs first
    if err := req.Validate(); err != nil {
        return nil, fmt.Errorf("invalid request: %w", err)
    }

    // Business logic
    // ...

    return release, nil
}

// Use functional options for complex constructors
type Option func(*ChartService)

func WithTimeout(d time.Duration) Option {
    return func(s *ChartService) {
        s.timeout = d
    }
}

func NewChartService(opts ...Option) *ChartService {
    s := &ChartService{timeout: 30 * time.Second}
    for _, opt := range opts {
        opt(s)
    }
    return s
}
```

### Type Safety
```go
// NEVER use interface{} or any without strong justification
// Use generics (Go 1.18+) when appropriate
func Keys[K comparable, V any](m map[K]V) []K {
    keys := make([]K, 0, len(m))
    for k := range m {
        keys = append(keys, k)
    }
    return keys
}

// Prefer struct embedding over inheritance
type BaseRepository struct {
    db *sql.DB
}

type ChartRepository struct {
    BaseRepository
    cache Cache
}
```

### Comments and Documentation
```go
// Package comment (required for all packages)
// Package helm provides utilities for Helm chart operations.
package helm

// Exported function/type comment (required)
// MergeValues deeply merges multiple values.yaml configurations.
// Later values override earlier ones.
func MergeValues(base, override map[string]interface{}) map[string]interface{} {
    // Implementation comments for complex logic
    // Using mergo library for deep merge...
}
```

---

## Testing Standards

### Test File Naming
- Test files: `filename_test.go`
- Table-driven tests preferred

### Test Structure
```go
func TestMergeValues(t *testing.T) {
    tests := []struct {
        name     string
        base     map[string]interface{}
        override map[string]interface{}
        want     map[string]interface{}
    }{
        {
            name:     "simple override",
            base:     map[string]interface{}{"key": "value1"},
            override: map[string]interface{}{"key": "value2"},
            want:     map[string]interface{}{"key": "value2"},
        },
        // More test cases...
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            got := MergeValues(tt.base, tt.override)
            if !reflect.DeepEqual(got, tt.want) {
                t.Errorf("got %v, want %v", got, tt.want)
            }
        })
    }
}
```

### Mocking
```go
// Use interfaces for dependencies
type KubeconfigProvider interface {
    GetKubeconfig(ctx context.Context, userID string) ([]byte, error)
}

// Create mock in test file
type mockKubeconfigProvider struct {
    config []byte
    err    error
}

func (m *mockKubeconfigProvider) GetKubeconfig(ctx context.Context, userID string) ([]byte, error) {
    return m.config, m.err
}
```

---

## Key Dependencies (Based on Requirements)

```go
// Helm operations
"helm.sh/helm/v3/pkg/action"
"helm.sh/helm/v3/pkg/chart"
"helm.sh/helm/v3/pkg/chart/loader"

// YAML processing
"sigs.k8s.io/yaml"
"gopkg.in/yaml.v3"

// Deep merge (for values.yaml)
"github.com/imdario/mergo"

// Kubernetes client
"k8s.io/client-go/kubernetes"
"k8s.io/client-go/rest"

// Web framework (suggested)
"github.com/gin-gonic/gin"

// Database (suggested)
"gorm.io/gorm"
```

---

## Special Conventions for This Project

### Values.yaml Handling
- Always validate YAML structure before merging
- Use three-layer merge: Chart defaults → Admin defaults → User input
- Store required keys in database metadata table

### Multi-tenancy
- Every API must include user context
- Namespace isolation enforced at Helm install time
- User can only see/manage their own chart instances

### Configuration Validation
```go
// Required keys validation
type RequiredKeysValidator struct {
    keys []string
}

func (v *RequiredKeysValidator) Validate(values map[string]interface{}) error {
    for _, key := range v.keys {
        if _, exists := values[key]; !exists {
            return &ValidationError{Field: key, Message: "required field missing"}
        }
    }
    return nil
}
```

### Kubeconfig Integration
```go
// Always call external provider before deployment
kubeconfig, err := kubeconfigProvider.GetKubeconfig(ctx, userID)
if err != nil {
    return fmt.Errorf("failed to get kubeconfig: %w", err)
}
```

---

## Git Workflow

- **Branch naming**: `feature/chart-parsing`, `fix/merge-bug`, `refactor/helm-client`
- **Commit messages**: Conventional Commits format
  - `feat: add values.yaml parser`
  - `fix: resolve deep merge panic`
  - `docs: update API documentation`
- **PR requirements**: All tests pass, coverage ≥80%, golangci-lint clean

---

## When in Doubt

1. **Consult Go proverbs**: Simple, clear, idiomatic Go
2. **Error handling**: Explicit, wrapped, never silenced
3. **Testing**: Table-driven, clear test names
4. **Dependencies**: Prefer stdlib, justify external deps
5. **Performance**: Measure before optimizing

---

**Last Updated**: 2026-02-07  
**Target Go Version**: 1.21+
