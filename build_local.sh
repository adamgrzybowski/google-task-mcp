#!/bin/bash

image_name="google-task-mcp"
image_tag="${1:-latest}"

echo "Pulling latest changes from git repository..."

git pull 

echo "Rebuilding Docker image..."
docker build -t "$image_name:$image_tag" .