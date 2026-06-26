#!/bin/bash

# Start docker services
docker-compose up -d db redis

# Wait for db to be ready
echo "Waiting for PostgreSQL to be ready..."
sleep 5

# Seed the database
npm run db:push
npm run db:seed

# Start the campaign worker in the background
npm run worker &
WORKER_PID=$!

# Start the dev server in the background
npm run dev &
SERVER_PID=$!

echo "Waiting for server to start..."
sleep 5

# Start the pilot campaign
npx tsx scripts/start-campaign.ts

# Simulate a CRM lead incoming via webhook
npm run simulate:crm

# Cleanup processes
kill $WORKER_PID
kill $SERVER_PID
docker-compose down
