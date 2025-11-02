# ===============================
# Oakline Bank Next.js Dockerfile
# Node 20, Next.js 14, Northflank-ready
# ===============================

# Use Node 20 Alpine (lightweight)
FROM node:20-alpine AS base

# Set working directory inside container
WORKDIR /app

# Copy package files first (caching dependencies)
COPY package*.json ./

# Install dependencies (npm ci ensures exact versions)
RUN npm ci --legacy-peer-deps

# Copy the rest of the project files
COPY . .

# Build stage for Next.js
FROM base AS build

# Build the Next.js app
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Copy only necessary files from build stage
COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public

# Expose the port Northflank expects
EXPOSE 5000

# Default command to run app
CMD ["npm", "run", "start"]
