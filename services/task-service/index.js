const fastify = require('fastify')({ logger: true });
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://admin:password@localhost:5432/task_manager'
});

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Register CORS
fastify.register(require('@fastify/cors'), {
  origin: true
});

// Authentication middleware
const authenticate = async (request, reply) => {
  try {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.status(401).send({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET);
    request.userId = decoded.userId;
  } catch (error) {
    return reply.status(401).send({ error: 'Invalid or expired token' });
  }
};

// Health check endpoint
fastify.get('/health', async (request, reply) => {
  return { status: 'healthy', service: 'task-service' };
});

// Get all tasks for user
fastify.get('/tasks', { preHandler: authenticate }, async (request, reply) => {
  try {
    const { status, priority } = request.query;
    let query = 'SELECT * FROM tasks WHERE user_id = $1';
    const params = [request.userId];
    
    if (status) {
      query += ' AND status = $2';
      params.push(status);
    }
    
    if (priority) {
      const paramIndex = params.length + 1;
      query += ` AND priority = $${paramIndex}`;
      params.push(priority);
    }
    
    query += ' ORDER BY created_at DESC';
    
    const result = await pool.query(query, params);
    return { tasks: result.rows };
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({ error: 'Internal server error' });
  }
});

// Get single task
fastify.get('/tasks/:id', { preHandler: authenticate }, async (request, reply) => {
  try {
    const { id } = request.params;
    const result = await pool.query(
      'SELECT * FROM tasks WHERE id = $1 AND user_id = $2',
      [id, request.userId]
    );

    if (result.rows.length === 0) {
      return reply.status(404).send({ error: 'Task not found' });
    }

    return { task: result.rows[0] };
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({ error: 'Internal server error' });
  }
});

// Create new task
fastify.post('/tasks', { preHandler: authenticate }, async (request, reply) => {
  try {
    const { title, description, priority = 'medium' } = request.body;
    
    if (!title) {
      return reply.status(400).send({ error: 'Title is required' });
    }

    const result = await pool.query(
      'INSERT INTO tasks (title, description, priority, user_id) VALUES ($1, $2, $3, $4) RETURNING *',
      [title, description, priority, request.userId]
    );

    return { task: result.rows[0] };
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({ error: 'Internal server error' });
  }
});

// Update task
fastify.put('/tasks/:id', { preHandler: authenticate }, async (request, reply) => {
  try {
    const { id } = request.params;
    const { title, description, status, priority } = request.body;

    // Check if task exists and belongs to user
    const existingTask = await pool.query(
      'SELECT * FROM tasks WHERE id = $1 AND user_id = $2',
      [id, request.userId]
    );

    if (existingTask.rows.length === 0) {
      return reply.status(404).send({ error: 'Task not found' });
    }

    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (title) {
      updates.push(`title = $${paramIndex++}`);
      values.push(title);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(description);
    }
    if (status) {
      updates.push(`status = $${paramIndex++}`);
      values.push(status);
    }
    if (priority) {
      updates.push(`priority = $${paramIndex++}`);
      values.push(priority);
    }

    if (updates.length === 0) {
      return reply.status(400).send({ error: 'No valid fields to update' });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id, request.userId);

    const query = `UPDATE tasks SET ${updates.join(', ')} WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1} RETURNING *`;
    
    const result = await pool.query(query, values);
    return { task: result.rows[0] };
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({ error: 'Internal server error' });
  }
});

// Delete task
fastify.delete('/tasks/:id', { preHandler: authenticate }, async (request, reply) => {
  try {
    const { id } = request.params;
    
    const result = await pool.query(
      'DELETE FROM tasks WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, request.userId]
    );

    if (result.rows.length === 0) {
      return reply.status(404).send({ error: 'Task not found' });
    }

    return { message: 'Task deleted successfully', task: result.rows[0] };
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({ error: 'Internal server error' });
  }
});

// Start server
const start = async () => {
  try {
    await fastify.listen({ port: 3000, host: '0.0.0.0' });
    console.log('Task service running on port 3000');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();