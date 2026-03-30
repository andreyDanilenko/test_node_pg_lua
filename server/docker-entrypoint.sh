#!/bin/sh
set -e

echo "Running database migrations..."
npm run migrate

echo "Starting server..."
exec node dist/server.js
