#!/bin/bash

# Wait for database to be ready
echo "Waiting for database to be ready..."
until nc -z ${DB_HOST:-localhost} ${DB_PORT:-5432}; do
  echo "Database not ready yet, waiting..."
  sleep 2
done

echo "Database is ready, running migrations..."
npm run migrate:latest

echo "Starting application..."
npm start
