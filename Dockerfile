# Use Node.js LTS as base image
FROM node:20-slim

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the frontend
RUN npm run build

# Set environment to production
ENV NODE_ENV=production

# Hugging Face Spaces uses port 7860 by default
ENV PORT=7860

# Expose the port
EXPOSE 7860

# Start the server
CMD ["npm", "start"]
