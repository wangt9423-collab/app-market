# Kubernetes App Market (Backend)

[![Go Report Card](https://goreportcard.com/badge/github.com/your-org/app-market)](https://goreportcard.com/report/github.com/your-org/app-market)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

一个基于 Go 语言构建的 Kubernetes 应用市场后端系统。该系统允许管理员通过标准 Helm Chart 仓库（如 Bitnami）同步应用，并提供经过简化的、可视化的“快捷部署”流程，降低业务人员在 Kubernetes 集群上部署复杂应用的门槛。

## 🚀 功能特性

- **应用同步引擎**: 自动同步标准 Helm Chart 仓库的 `index.yaml`，解析并存储 Chart 元数据。
- **配置管理中心**: 管理员可预设 `values.yaml` 的默认值，并标记特定字段为“必填项”（Required Keys）。
- **三层参数合并**: 支持 `Chart Default` -> `Admin Default` -> `User Input` 的深度参数合并策略。
- **异步部署任务**: 内置任务队列与 Worker Pool，处理耗时的 Helm Install/Upgrade 操作。
- **JWT 鉴权**: 基于 JWT 的用户认证与上下文传递。
- **可视化界面**: 内置轻量级 SPA 前端，提供应用浏览、详情查看与部署表单。
- **Swagger 文档**: 自动生成的 API 文档与调试界面。

## 🏗 系统架构

```mermaid
graph TD
    User[用户/前端] -->|HTTP/REST| API[API Server (Gin)]
    API -->|Auth| JWT[JWT Middleware]
    API -->|Async| Queue[Task Queue (Channel)]
    
    subgraph Core Services
        Sync[Sync Service] -->|Fetch| HelmRepo[Helm Repository]
        Deploy[Deploy Service] -->|Install| K8s[Kubernetes Cluster]
        Task[Task Worker] -->|Execute| Deploy
    end
    
    API --> Sync
    Queue --> Task
    
    subgraph Data Persistence
        DB[(SQLite/MySQL)]
    end
    
    Sync -->|Write| DB
    Deploy -->|Read/Write| DB
    Task -->|Update Status| DB
```

## 🛠 快速开始

### 前置要求

*   Go 1.23+
*   Docker (可选)
*   Kubernetes 集群 (或 Minikube/K3s)

### 本地运行

1.  **克隆代码**
    ```bash
    git clone https://github.com/your-org/app-market.git
    cd app-market
    ```

2.  **初始化依赖**
    ```bash
    make init
    ```

3.  **运行服务**
    ```bash
    make run-dev
    ```
    服务将启动在 `http://localhost:8081`。

4.  **访问前端**
    打开浏览器访问 `http://localhost:8081`。

5.  **查看 API 文档**
    访问 `http://localhost:8081/swagger/index.html`。

### Docker 运行

```bash
make docker-build
make docker-run
```

## 📚 API 接口概览

### 认证 (Auth)
*   `POST /login`: 获取 JWT Token。

### 仓库管理 (Admin)
*   `GET /admin/repos`: 列出已纳管的 Chart 仓库。
*   `POST /admin/repos`: 添加新仓库。
*   `POST /admin/repos/:id/sync`: 触发仓库同步任务。

### 应用部署 (User)
*   `POST /api/deploy`: 提交部署请求（异步）。
*   `GET /api/tasks/:id`: 查询部署任务状态。
*   `GET /api/instances`: 查询我的应用实例。

## 📂 项目结构

```
.
├── cmd/
│   └── app-market/       # 程序入口
├── internal/
│   ├── api/              # HTTP 接口层 (Handler, Router, Middleware)
│   ├── config/           # 配置加载 (Viper)
│   ├── helm/             # Helm SDK 封装与配置合并逻辑
│   ├── model/            # GORM 数据模型
│   ├── repository/       # 数据库初始化
│   └── service/          # 核心业务逻辑 (Sync, Deploy, Task)
├── pkg/                  # 公共库 (Logger)
├── templates/            # 前端 HTML 模板
├── Dockerfile            # 容器构建文件
├── Makefile              # 构建与测试脚本
└── config.yaml           # 默认配置文件
```

## 🧪 测试

运行所有单元测试与集成测试：

```bash
make test
```

## 📜 License

Apache 2.0
