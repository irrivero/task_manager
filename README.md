# Simple Task Manager
## Services:

- User Service: Basic auth (register/login)
- Task Service: CRUD operations for tasks
- API Gateway: Route requests

## Technology Stack:

- Node.js + Fastify
- PostgreSQL (single shared database to start)
- Docker Compose
- Simple HTML frontend

# Project structure
```
mini-microservices/
├── docker-compose.yml
├── gateway/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       └── index.js
├── services/
│   ├── user-service/
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── src/
│   │       └── index.js
│   └── task-service/
│       ├── Dockerfile
│       ├── package.json
│       └── src/
│           └── index.js
├── frontend/
│   └── index.html
└── README.md
```