# Use Node.js LTS
FROM node:20-slim

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY . .

# Build the frontend
RUN npm run build

# Expose the port (Hugging Face uses 7860 by default)
ENV PORT=7860
EXPOSE 7860

# Start the server
CMD ["npm", "start"]
