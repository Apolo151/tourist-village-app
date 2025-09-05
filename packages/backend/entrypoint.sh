#!/bin/bash

# # Wait for database to be ready
# echo "Waiting for database to be ready..."
# until nc -z ${DB_HOST:-localhost} ${DB_PORT:-5432}; do
#   echo "Database not ready yet, waiting..."
#   sleep 2
# done

rm -f ./src/database/migrations/20240716_add_next_of_kin_will_to_users.js

echo "Database is ready, running migrations..."
npm run migrate:latest

echo "Seeding database..."
npm run seed:run

echo "Starting application..."
npm start
