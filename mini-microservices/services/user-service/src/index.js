const fastify = require('fastify')({ logger: true });
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Client } = require('pg');

// Database connection
const client = new Client({
	connectionString: process.env.DATABASE_URL
});

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Connect to database
client.connect().catch(console.error);

// JWT authentication middleware
fastify.register(require('@fastify/jwt'), {
	secret: JWT_SECRET
});

// Health check
fastify.get('/health', async (request, reply) => {
	return { service: 'user-service', status: 'healthy' };
});

// Register new user
fastify.post('/auth/register', async (request, reply) => {
	try {
		const { username, email, password } = request.body;

		if (!username || !email || !password) {
			return reply.code(400).send({ error: 'Missing required fields' });
		}

		// Check if user exists
		const existingUser = await client.query(
			'SELECT id FROM users WHERE username = $1 OR email = $2',
			[username, email]
		);

		if (existingUser.rows.length > 0) {
			return reply.code(400).send({ error: 'User already exists' });
		}

		// Hash password
		const hashedPassword = await bcrypt.hash(password, 10);

		// Create user
		const result = await client.query(
			'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email',
			[username, email, hashedPassword]
		);

		const user = result.rows[0];
		const token = fastify.jwt.sign({ userId: user.id, username: user.username });

		return {
			success: true,
			user: { id: user.id, username: user.username, email: user.email },
			token
		};
	} catch (error) {
		console.error('Register error:', error);
		return reply.code(500).send({ error: 'Internal server error' });
	}
});

// Login user
fastify.post('/auth/login', async (request, reply) => {
	try {
		const { username, password } = request.body;

		if (!username || !password) {
			return reply.code(400).send({ error: 'Missing username or password' });
		}

		// Find user
		const result = await client.query(
			'SELECT id, username, email, password_hash FROM users WHERE username = $1',
			[username]
		);

		if (result.rows.length === 0) {
			return reply.code(401).send({ error: 'Invalid credentials' });
		}

		const user = result.rows[0];

		// Check password
		const validPassword = await bcrypt.compare(password, user.password_hash);
		if (!validPassword) {
			return reply.code(401).send({ error: 'Invalid credentials' });
		}

		// Generate token
		const token = fastify.jwt.sign({ userId: user.id, username: user.username });

		return {
			success: true,
			user: { id: user.id, username: user.username, email: user.email },
			token
		};
	} catch (error) {
		console.error('Login error:', error);
		return reply.code(500).send({ error: 'Internal server error' });
	}
});

// Middleware to verify JWT
async function authenticate(request, reply) {
	try {
		const authHeader = request.headers.authorization;

		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			return reply.code(401).send({ error: 'No token provided' });
		}

		const token = authHeader.substring(7);
		const decoded = fastify.jwt.verify(token);
		request.user = decoded;
	} catch (error) {
		return reply.code(401).send({ error: 'Invalid token' });
	}
}

// Get user profile (protected route)
fastify.get('/auth/profile', {
	preValidation: [authenticate]
}, async (request, reply) => {
	try {
		const result = await client.query(
			'SELECT id, username, email, created_at FROM users WHERE id = $1',
			[request.user.userId]
		);

		if (result.rows.length === 0) {
			return reply.code(404).send({ error: 'User not found' });
		}

		return { user: result.rows[0] };
	} catch (error) {
		console.error('Profile error:', error);
		return reply.code(500).send({ error: 'Internal server error' });
	}
});

// Verify token (for other services)
fastify.post('/auth/verify', async (request, reply) => {
	try {
		const { token } = request.body;

		if (!token) {
			return reply.code(400).send({ error: 'Token required' });
		}

		const decoded = fastify.jwt.verify(token);
		return { valid: true, user: decoded };
	} catch (error) {
		return reply.code(401).send({ valid: false, error: 'Invalid token' });
	}
});

// Start server
const start = async () => {
	try {
		await fastify.listen({ port: 3001, host: '0.0.0.0' });
		console.log('User Service running on port 3001');
	} catch (err) {
		fastify.log.error(err);
		process.exit(1);
	}
};

start();