// API GATEWAY - The single entry point for all client requests
// This is the core of microservices architecture - it routes requests to appropriate services
const fastify = require('fastify')({ logger: true });
const axios = require('axios');                    // For HTTP calls to other services
const jwt = require('jsonwebtoken');               // For JWT token verification
const path = require('path');

// CORS plugin - allows frontend to make requests from different origins
fastify.register(require('@fastify/cors'), {
	origin: true
});

// Static file serving - serves the frontend HTML/CSS/JS files
fastify.register(require('@fastify/static'), {
	root: path.join(__dirname, '..', 'public'),
	prefix: '/',
});

// JWT MIDDLEWARE - This is crucial for microservices security
// Instead of each service handling auth, the gateway does it once
const verifyToken = async (request, reply) => {
	try {
		// Extract token from Authorization header (Bearer token format)
		const token = request.headers.authorization?.replace('Bearer ', '');
		if (!token) {
			reply.code(401).send({ error: 'No token provided' });
			return;
		}

		// Verify the JWT token (should match what user service creates)
		const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
		request.user = decoded;  // Add user info to request for later use
	} catch (error) {
		reply.code(401).send({ error: 'Invalid token' });
	}
};

// Health check
fastify.get('/health', async (request, reply) => {
	return { status: 'Gateway is running' };
});

// Serve frontend
fastify.get('/', async (request, reply) => {
	return reply.sendFile('index.html');
});

// ROUTE HANDLERS - This is where the magic happens!
// The gateway receives requests and forwards them to the right microservice

// USER AUTHENTICATION ROUTES - Forward to User Service
// These don't need authentication since they CREATE the authentication
fastify.post('/api/auth/register', async (request, reply) => {
	try {
		// Forward the entire request body to user service
		// axios.post makes HTTP call to another service
		const response = await axios.post(
			`${process.env.USER_SERVICE_URL}/auth/register`,
			request.body
		);
		return response.data;  // Send back whatever user service returned
	} catch (error) {
		// Handle errors from the user service
		reply.code(error.response?.status || 500).send(
			error.response?.data || { error: 'User service error' }
		);
	}
});

fastify.post('/api/auth/login', async (request, reply) => {
	try {
		const response = await axios.post(
			`${process.env.USER_SERVICE_URL}/auth/login`,
			request.body
		);
		return response.data;
	} catch (error) {
		reply.code(error.response?.status || 500).send(
			error.response?.data || { error: 'User service error' }
		);
	}
});

// PROTECTED ROUTES - These require authentication first
// Notice the { preHandler: verifyToken } - this runs the JWT check first
fastify.get('/api/tasks', { preHandler: verifyToken }, async (request, reply) => {
	try {
		// Forward request to task service with user information
		const response = await axios.get(
			`${process.env.TASK_SERVICE_URL}/tasks`,
			{
				headers: {
					'user-id': request.user.userId.toString(),  // From JWT token
					'authorization': request.headers.authorization
				}
			}
		);
		return response.data;
	} catch (error) {
		reply.code(error.response?.status || 500).send(
			error.response?.data || { error: 'Task service error' }
		);
	}
});

fastify.post('/api/tasks', { preHandler: verifyToken }, async (request, reply) => {
	try {
		const response = await axios.post(
			`${process.env.TASK_SERVICE_URL}/tasks`,
			request.body,
			{
				headers: {
					'user-id': request.user.userId.toString(),
					'authorization': request.headers.authorization
				}
			}
		);
		return response.data;
	} catch (error) {
		reply.code(error.response?.status || 500).send(
			error.response?.data || { error: 'Task service error' }
		);
	}
});

fastify.delete('/api/tasks/:id', { preHandler: verifyToken }, async (request, reply) => {
	try {
		const response = await axios.delete(
			`${process.env.TASK_SERVICE_URL}/tasks/${request.params.id}`,
			{
				headers: {
					'user-id': request.user.userId.toString(),
					'authorization': request.headers.authorization
				}
			}
		);
		return response.data;
	} catch (error) {
		reply.code(error.response?.status || 500).send(
			error.response?.data || { error: 'Task service error' }
		);
	}
});

// Start server
const start = async () => {
	try {
		await fastify.listen({ port: 3000, host: '0.0.0.0' });
		console.log('API Gateway running on port 3000');
	} catch (err) {
		fastify.log.error(err);
		process.exit(1);
	}
};

start();