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
  --tag public.ecr.aws/c6v1i9c8/cognito-local:latest \
  --tag public.ecr.aws/c6v1i9c8/cognito-local:${major_version}-latest \
  --tag public.ecr.aws/c6v1i9c8/cognito-local:${version} \
  --push \
  .

echo "{\"name\":\"Docker\",\"url\":\"https://gallery.ecr.aws/c6v1i9c8/cognito-local\"}"