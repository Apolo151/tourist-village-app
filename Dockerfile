# Stage 1: Build the React frontend
FROM node:18-alpine AS frontend-builder
WORKDIR /usr/src/frontend
COPY packages/frontend/package*.json ./
RUN npm ci
COPY packages/frontend/ ./
RUN npm run build

# Stage 2: Build the Backend
FROM node:18-alpine AS backend-builder
WORKDIR /usr/src/backend
COPY packages/backend/package*.json ./
RUN npm ci
COPY packages/backend/ ./
RUN npm run build

# Stage 3: Production image
FROM node:18-alpine AS production
WORKDIR /app

# Create directory structure
RUN mkdir -p ./packages/frontend/dist ./packages/backend/dist

# Copy static frontend build - match path in app.ts: ../../frontend/dist
COPY --from=frontend-builder /usr/src/frontend/dist ./packages/frontend/dist/

# Copy backend built files
COPY --from=backend-builder /usr/src/backend/dist ./packages/backend/
COPY --from=backend-builder /usr/src/backend/package*.json ./packages/backend/

# # Copy migrations and seeds for Knex
# COPY --from=backend-builder /usr/src/backend/src/database/migrations ./packages/backend/src/database/migrations
# COPY --from=backend-builder /usr/src/backend/src/database/seeds ./packages/backend/src/database/seeds

# Install production dependencies for backend
WORKDIR /app/packages/backend
RUN npm ci --only=production

# Remove stagnant migration
RUN rm -f ./src/database/migrations/20240716_add_next_of_kin_will_to_users.js

# Copy the entrypoint script
COPY packages/backend/entrypoint.sh ./
RUN chmod +x entrypoint.sh

# Environment configuration
ENV NODE_ENV=production
ENV PORT=3000

# Expose port
EXPOSE 3000

# Set working directory for the entrypoint
WORKDIR /app/packages/backend

# Start the app
CMD ["sh", "entrypoint.sh"]