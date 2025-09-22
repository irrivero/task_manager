const fastify = require('fastify')({ logger: true });

const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:3001';
const TASK_SERVICE_URL = process.env.TASK_SERVICE_URL || 'http://localhost:3002';

// Register CORS
fastify.register(require('@fastify/cors'), {
  origin: true
});

// Health check endpoint
fastify.get('/health', async (request, reply) => {
  return { status: 'healthy', service: 'api-gateway' };
});

// Register HTTP proxy plugin for user service
fastify.register(require('fastify-http-proxy'), {
  upstream: USER_SERVICE_URL,
  prefix: '/api/auth',
  rewritePrefix: '/',
  http2: false
});

// Register HTTP proxy plugin for task service
fastify.register(require('fastify-http-proxy'), {
  upstream: TASK_SERVICE_URL,
  prefix: '/api',
  rewritePrefix: '/',
  http2: false
});

// Start server
const start = async () => {
  try {
    await fastify.listen({ port: 3000, host: '0.0.0.0' });
    console.log('API Gateway running on port 3000');
    console.log(`Routing /api/auth/* to ${USER_SERVICE_URL}`);
    console.log(`Routing /api/tasks* to ${TASK_SERVICE_URL}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();