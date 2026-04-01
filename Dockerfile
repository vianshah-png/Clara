# Stage 1: Build the frontend (Next.js Standalone)
FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY frontend/package*.json ./frontend/
WORKDIR /app/frontend
RUN npm ci
COPY frontend ./
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# Stage 2: Setup the backend deps
FROM node:20-alpine AS backend-deps
WORKDIR /app
COPY backend/package*.json ./backend/
WORKDIR /app/backend
RUN npm ci --only=production
COPY backend ./

# Stage 3: Final combined production image
FROM node:20-alpine
WORKDIR /app

# Install concurrently for multi-process support
RUN npm install -g concurrently

# Copy backend
COPY --from=backend-deps /app/backend ./backend

# Copy frontend standalone files 
# Next.js standalone setup: server.js and its dependencies
COPY --from=frontend-builder /app/frontend/.next/standalone ./frontend/
COPY --from=frontend-builder /app/frontend/public ./frontend/public
COPY --from=frontend-builder /app/frontend/.next/static ./frontend/.next/static

# Set permissions and env variable
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1
EXPOSE 8080

# RUN BOTH: Next.js handles the main port ($PORT) and proxies /api to backend (3001)
# Use shell form so $PORT is evaluated at runtime (Cloud Run sets this env var)
CMD concurrently "PORT=3001 node backend/server.js" "PORT=${PORT:-8080} HOSTNAME=0.0.0.0 node frontend/server.js"
