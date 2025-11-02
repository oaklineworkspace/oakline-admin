# Use Node 20
FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy all project files
COPY . .

# Build Next.js
RUN npm run build

# Expose the port
EXPOSE 5000

# Start the app
CMD ["npm", "run", "start"]
