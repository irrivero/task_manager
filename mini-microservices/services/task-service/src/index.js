const fastify = require('fastify')({ logger: true });
const axios = require('axios');
const { Client } = require('pg');

// Database connection
const client = new Client({
	connectionString: process.env.DATABASE_URL
});

const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:3001';

client.connect().catch(console.error);

// Middleware to verify JWT with User Service
async function verifyToken(request, reply) {
	try {
		const authHeader = request.headers.authorization;

		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			return reply.code(401).send({ error: 'No token provided' });
		}

		const token = authHeader.substring(7);

		// Verify token with User Service
		const response = await axios.post(`${USER_SERVICE_URL}/auth/verify`, { token });

		if (!response.data.valid) {
			return reply.code(401).send({ error: 'Invalid token' });
		}

		request.user = response.data.user;
	} catch (error) {
		console.error('Token verification error:', error.message);
		return reply.code(401).send({ error: 'Token verification failed' });
	}
}

// Health check
fastify.get('/health', async (request, reply) => {
	return { service: 'task-service', status: 'healthy' };
});

// Get all tasks for user
fastify.get('/tasks', { preValidation: [verifyToken] }, async (request, reply) => {
	try {
		const result = await client.query(
			'SELECT * FROM tasks WHERE user_id = $1 ORDER BY created_at DESC',
			[request.user.userId]
		);

		return { tasks: result.rows };
	} catch (error) {
		console.error('Get tasks error:', error);
		return reply.code(500).send({ error: 'Internal server error' });
	}
});

// Create new task
fastify.post('/tasks', { preValidation: [verifyToken] }, async (request, reply) => {
	try {
		const { title, description } = request.body;

		if (!title) {
			return reply.code(400).send({ error: 'Title is required' });
		}

		const result = await client.query(
			'INSERT INTO tasks (user_id, title, description) VALUES ($1, $2, $3) RETURNING *',
			[request.user.userId, title, description || '']
		);

		return {
			success: true,
			task: result.rows[0]
		};
	} catch (error) {
		console.error('Create task error:', error);
		return reply.code(500).send({ error: 'Internal server error' });
	}
});

// Update task
fastify.put('/tasks/:id', { preValidation: [verifyToken] }, async (request, reply) => {
	try {
		const taskId = parseInt(request.params.id);
		const { title, description, completed } = request.body;

		// Check if task belongs to user
		const checkResult = await client.query(
			'SELECT id FROM tasks WHERE id = $1 AND user_id = $2',
			[taskId, request.user.userId]
		);

		if (checkResult.rows.length === 0) {
			return reply.code(404).send({ error: 'Task not found' });
		}

		// Update task
		const result = await client.query(
			'UPDATE tasks SET title = COALESCE($1, title), description = COALESCE($2, description), completed = COALESCE($3, completed), updated_at = CURRENT_TIMESTAMP WHERE id = $4 AND user_id = $5 RETURNING *',
			[title, description, completed, taskId, request.user.userId]
		);

		return {
			success: true,
			task: result.rows[0]
		};
	} catch (error) {
		console.error('Update task error:', error);
		return reply.code(500).send({ error: 'Internal server error' });
	}
});

// Delete task
fastify.delete('/tasks/:id', { preValidation: [verifyToken] }, async (request, reply) => {
	try {
		const taskId = parseInt(request.params.id);

		const result = await client.query(
			'DELETE FROM tasks WHERE id = $1 AND user_id = $2 RETURNING id',
			[taskId, request.user.userId]
		);

		if (result.rows.length === 0) {
			return reply.code(404).send({ error: 'Task not found' });
		}

		return { success: true, message: 'Task deleted' };
	} catch (error) {
		console.error('Delete task error:', error);
		return reply.code(500).send({ error: 'Internal server error' });
	}
});

// Start server
const start = async () => {
	try {
		await fastify.listen({ port: 3002, host: '0.0.0.0' });
		console.log('Task Service running on port 3002');
	} catch (err) {
		fastify.log.error(err);
		process.exit(1);
	}
};

start();