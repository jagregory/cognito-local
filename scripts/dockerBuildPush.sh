#!/bin/bash -e

version=$1

if [ -z "$version" ]; then
  echo 'Missing version' >&2
  exit 1
fi

versionArr=(${version//./ })
major_version=${versionArr[0]}

docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --tag ${DOCKER_IMAGE:-jagregory/cognito-local}:latest \
  --tag ${DOCKER_IMAGE:-jagregory/cognito-local}:${major_version}-latest \
  --tag ${DOCKER_IMAGE:-jagregory/cognito-local}:${version} \
  --push \
  .

echo "{\"name\":\"Docker\",\"url\":\"https://hub.docker.com/r/${DOCKER_IMAGE:-jagregory/cognito-local}\"}"