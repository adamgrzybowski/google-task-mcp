#!/bin/bash

image_name="${1:-google-task-mcp}"
image_tag="${2:-latest}"

echo "Pulling latest changes from git repository..."

git pull 

echo "Rebuilding Docker image..."
docker build -t "$image_name:$image_tag" .