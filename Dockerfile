# Stage 1: Build the frontend
FROM node:14 AS frontend-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# Stage 2: Build the backend
FROM python:3.9-slim AS backend
WORKDIR /app/server

# Install Graphviz on top of the Python base image
RUN apt-get update && apt-get install -y --no-install-recommends \
    graphviz \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copy built frontend from Stage 1
COPY --from=frontend-builder /app/client/dist /app/server/static

# Copy backend source code
COPY server/ ./

# Install backend dependencies
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install waitress

# Expose the backend port
EXPOSE 8000

# Start the backend with waitress
CMD ["waitress-serve", "--port=8000", "main:app"]
