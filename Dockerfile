# Use Node.js 20
FROM node:20

# Set working directory
WORKDIR /app

# Copy package files first to leverage Docker cache
COPY package*.json ./

# Install dependencies
# We use --legacy-peer-deps to avoid common dependency conflicts
RUN npm install --include=dev --legacy-peer-deps

# Copy the rest of the application code
COPY . .

# Build the frontend
RUN npm run build

# Set environment to production
ENV NODE_ENV=production
ENV PORT=7860

# Expose the port Hugging Face expects
EXPOSE 7860

# Start the server
# Using the direct path to tsx is more reliable in some Docker environments
CMD ["./node_modules/.bin/tsx", "server.ts"]
