# Use Node.js LTS as base image
FROM node:20

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including devDependencies for building)
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the frontend
RUN npm run build

# Set environment to production
ENV NODE_ENV=production

# Hugging Face Spaces uses port 7860 by default
# But we also listen to the PORT env var provided by the platform
ENV PORT=7860
EXPOSE 7860

# Start the server using tsx (which is in dependencies)
CMD ["npx", "tsx", "server.ts"]
