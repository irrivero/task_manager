const fastify = require('fastify')({ logger: true });
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Database connection
const pool = new Pool({
	connectionString: process.env.DATABASE_URL,
});

// Initialize database tables
const initDatabase = async () => {
	try {
		await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
		console.log('Users table initialized');
	} catch (error) {
		console.error('Database initialization error:', error);
	}
};

// Health check
fastify.get('/health', async (request, reply) => {
	return { status: 'User Service is running' };
});

// Register user
fastify.post('/register', async (request, reply) => {
	try {
		const { username, email, password } = request.body;

		if (!username || !email || !password) {
			return reply.code(400).send({ error: 'Missing required fields' });
		}

		// Check if user already exists
		const existingUser = await pool.query(
			'SELECT id FROM users WHERE username = $1 OR email = $2',
			[username, email]
		);

		if (existingUser.rows.length > 0) {
			return reply.code(409).send({ error: 'User already exists' });
		}

		// Hash password
		const saltRounds = 10;
		const passwordHash = await bcrypt.hash(password, saltRounds);

		// Create user
		const result = await pool.query(
			'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email',
			[username, email, passwordHash]
		);

		const user = result.rows[0];

		// Generate JWT token
		const token = jwt.sign(
			{ userId: user.id, username: user.username },
			'secret',
			{ expiresIn: '24h' }
		);

		return {
			message: 'User registered successfully',
			user: { id: user.id, username: user.username, email: user.email },
			token
		};
	} catch (error) {
		console.error('Registration error:', error);
		return reply.code(500).send({ error: 'Registration failed' });
	}
});

// Login user
fastify.post('/login', async (request, reply) => {
	try {
		const { username, password } = request.body;

		if (!username || !password) {
			return reply.code(400).send({ error: 'Username and password required' });
		}

		// Find user
		const result = await pool.query(
			'SELECT id, username, email, password_hash FROM users WHERE username = $1',
			[username]
		);

		if (result.rows.length === 0) {
			return reply.code(401).send({ error: 'Invalid credentials' });
		}

		const user = result.rows[0];

		// Verify password
		const isValidPassword = await bcrypt.compare(password, user.password_hash);
		if (!isValidPassword) {
			return reply.code(401).send({ error: 'Invalid credentials' });
		}

		// Generate JWT token
		const token = jwt.sign(
			{ userId: user.id, username: user.username },
			'secret',
			{ expiresIn: '24h' }
		);

		return {
			message: 'Login successful',
			user: { id: user.id, username: user.username, email: user.email },
			token
		};
	} catch (error) {
		console.error('Login error:', error);
		return reply.code(500).send({ error: 'Login failed' });
	}
});

// Verify token (for other services)
fastify.get('/verify/:userId', async (request, reply) => {
	try {
		const { userId } = request.params;

		const result = await pool.query(
			'SELECT id, username, email FROM users WHERE id = $1',
			[userId]
		);

		if (result.rows.length === 0) {
			return reply.code(404).send({ error: 'User not found' });
		}

		return { user: result.rows[0] };
	} catch (error) {
		console.error('User verification error:', error);
		return reply.code(500).send({ error: 'Verification failed' });
	}
});

// Start server
const start = async () => {
	try {
		await initDatabase();
		await fastify.listen({ port: 3001, host: '0.0.0.0' });
		console.log('User Service running on port 3001');
	} catch (err) {
		fastify.log.error(err);
		process.exit(1);
	}
};

start();