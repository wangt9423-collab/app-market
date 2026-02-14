# Frontend Build Stage
FROM node:20-alpine AS frontend-builder

WORKDIR /frontend

# Copy frontend source
COPY frontend/package*.json ./
RUN npm ci

# Copy frontend source code
COPY frontend/src ./src
COPY frontend/public ./public
COPY frontend/index.html .
COPY frontend/tsconfig*.json .
COPY frontend/vite.config.ts .
COPY frontend/eslint.config.js .

# Build frontend
RUN npm run build

# Backend Build Stage
FROM golang:1.23-alpine AS backend-builder

WORKDIR /app

# Install build dependencies (git for fetching deps if needed)
RUN apk add --no-cache git

# Copy go mod and sum files
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Generate Swagger docs (in case they are not up to date)
RUN go install github.com/swaggo/swag/cmd/swag@latest
RUN swag init -g cmd/app-market/main.go

# Build the application
# CGO_ENABLED=0 for static binary (compatible with scratch/alpine)
RUN CGO_ENABLED=0 GOOS=linux go build -o app-market ./cmd/app-market

# Final Runtime Stage
FROM alpine:latest

WORKDIR /app

# Install basic certificates, tzdata, and nginx
RUN apk --no-cache add ca-certificates tzdata nginx

# Copy backend binary from builder
COPY --from=backend-builder /app/app-market .

# Copy templates for legacy frontend
COPY --from=backend-builder /app/templates ./templates

# Copy default config (optional, can be overridden by k8s configmap)
COPY --from=backend-builder /app/config.yaml .

# Copy frontend static files
COPY --from=frontend-builder /frontend/dist /usr/share/nginx/html

# Copy nginx config
COPY frontend/nginx.conf /etc/nginx/http.d/default.conf

# Create directory for charts (mock storage)
RUN mkdir -p /tmp/charts

EXPOSE 80 8081

# Start both nginx and backend
CMD ["sh", "-c", "nginx -g 'daemon off;' & ./app-market"]
