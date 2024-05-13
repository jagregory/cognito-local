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
  --tag michaelruocco/cognito-local:latest \
  --tag michaelruocco/cognito-local:${major_version}-latest \
  --tag michaelruocco/cognito-local:${version} \
  --push \
  .

echo "{\"name\":\"Docker\",\"url\":\"https://hub.docker.com/r/michaelruocco/cognito-local\"}"