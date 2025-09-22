const fastify = require('fastify')({ logger: true });
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
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

// Health check endpoint
fastify.get('/health', async (request, reply) => {
  return { status: 'healthy', service: 'user-service' };
});

// Register endpoint
fastify.post('/register', async (request, reply) => {
  try {
    const { username, email, password } = request.body;
    
    if (!username || !email || !password) {
      return reply.status(400).send({ error: 'Username, email and password are required' });
    }

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT * FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );

    if (existingUser.rows.length > 0) {
      return reply.status(409).send({ error: 'User already exists' });
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Insert user
    const result = await pool.query(
      'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email, created_at',
      [username, email, passwordHash]
    );

    const user = result.rows[0];
    const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });

    return { user, token };
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({ error: 'Internal server error' });
  }
});

// Login endpoint
fastify.post('/login', async (request, reply) => {
  try {
    const { username, password } = request.body;
    
    if (!username || !password) {
      return reply.status(400).send({ error: 'Username and password are required' });
    }

    // Find user
    const result = await pool.query(
      'SELECT * FROM users WHERE username = $1 OR email = $1',
      [username]
    );

    if (result.rows.length === 0) {
      return reply.status(401).send({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return reply.status(401).send({ error: 'Invalid credentials' });
    }

    // Generate token
    const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });

    return { 
      user: { 
        id: user.id, 
        username: user.username, 
        email: user.email, 
        created_at: user.created_at 
      }, 
      token 
    };
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({ error: 'Internal server error' });
  }
});

// Verify token endpoint
fastify.post('/verify', async (request, reply) => {
  try {
    const { token } = request.body;
    
    if (!token) {
      return reply.status(400).send({ error: 'Token is required' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Get user details
    const result = await pool.query(
      'SELECT id, username, email, created_at FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return reply.status(401).send({ error: 'User not found' });
    }

    return { user: result.rows[0], valid: true };
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return reply.status(401).send({ error: 'Invalid or expired token' });
    }
    request.log.error(error);
    return reply.status(500).send({ error: 'Internal server error' });
  }
});

// Start server
const start = async () => {
  try {
    await fastify.listen({ port: 3000, host: '0.0.0.0' });
    console.log('User service running on port 3000');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();