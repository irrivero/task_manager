FROM node:18-alpine

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies
RUN npm install --only=production

# Copy source code
COPY src/ ./src/

# Expose the port the service runs on
EXPOSE 3002

# Start the application
CMD ["npm", "start"]