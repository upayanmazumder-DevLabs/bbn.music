# Use official Bun image
FROM oven/bun:1 AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json bun.lock* ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN bun run build

# Production stage
FROM oven/bun:1-slim

WORKDIR /app

# Copy built app
COPY --from=builder /app/build ./build
COPY --from=builder /app/package.json ./

# Expose port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# Start the application
CMD ["bun", "run", "build/index.js"]