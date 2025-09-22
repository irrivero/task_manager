# Simple Task Manager

A microservices-based task management application built with Node.js, Fastify, PostgreSQL, and Docker.

## Architecture

This application consists of the following services:

- **User Service** (Port 3001): Handles user authentication (register/login)
- **Task Service** (Port 3002): Manages CRUD operations for tasks
- **API Gateway** (Port 3000): Routes requests to appropriate services
- **Frontend** (Port 8080): Simple HTML interface
- **PostgreSQL Database** (Port 5432): Data persistence

## Technology Stack

- **Backend**: Node.js + Fastify
- **Database**: PostgreSQL
- **Frontend**: HTML/CSS/JavaScript
- **Containerization**: Docker + Docker Compose
- **Authentication**: JWT tokens

## Quick Start

### Prerequisites

- Docker and Docker Compose installed
- Git (to clone the repository)

### Setup and Run

1. **Clone the repository** (if not already done):
   ```bash
   git clone <repository-url>
   cd task_manager
   ```

2. **Start the application**:
   ```bash
   # Build and start all services
   npm run dev
   
   # Or using docker compose directly
   docker compose up --build
   ```

3. **Access the application**:
   - Frontend: http://localhost:8080
   - API Gateway: http://localhost:3000
   - User Service: http://localhost:3001
   - Task Service: http://localhost:3002

### Available Scripts

```bash
npm start        # Start all services
npm run dev      # Build and start all services
npm run stop     # Stop all services
npm run clean    # Stop and remove all containers and volumes
```

## API Endpoints

### Authentication (via API Gateway)

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/verify` - Verify JWT token

### Tasks (via API Gateway)

- `GET /api/tasks` - Get all tasks for authenticated user
- `GET /api/tasks/:id` - Get specific task
- `POST /api/tasks` - Create new task
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task

### Health Checks

- `GET /health` - Check service health (available on all services)

## Database Schema

### Users Table
```sql
- id (SERIAL PRIMARY KEY)
- username (VARCHAR UNIQUE)
- email (VARCHAR UNIQUE)
- password_hash (VARCHAR)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### Tasks Table
```sql
- id (SERIAL PRIMARY KEY)
- title (VARCHAR)
- description (TEXT)
- status (VARCHAR) - 'pending', 'in-progress', 'completed'
- priority (VARCHAR) - 'low', 'medium', 'high'
- user_id (INTEGER, FOREIGN KEY)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

## Usage

1. **Register a new account** or **login** with existing credentials
2. **Add new tasks** with title, description, and priority
3. **Filter tasks** by status or priority
4. **Update task status** (pending → in-progress → completed)
5. **Delete tasks** when no longer needed

## Development

### Running Individual Services

Each service can be run independently for development:

```bash
# User Service
cd services/user-service
npm install
npm start

# Task Service
cd services/task-service
npm install
npm start

# API Gateway
cd api-gateway
npm install
npm start
```

### Environment Variables

- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Secret key for JWT token signing
- `USER_SERVICE_URL`: URL for user service (API Gateway)
- `TASK_SERVICE_URL`: URL for task service (API Gateway)

## Security Notes

- Passwords are hashed using bcryptjs
- JWT tokens expire after 24 hours
- All task operations require valid authentication
- Users can only access their own tasks

## Troubleshooting

1. **Port conflicts**: Ensure ports 3000, 3001, 3002, 5432, and 8080 are available
2. **Database connection issues**: Wait for PostgreSQL to fully initialize
3. **Service startup order**: Docker Compose handles dependencies automatically
4. **Clear data**: Use `npm run clean` to reset all data and containers