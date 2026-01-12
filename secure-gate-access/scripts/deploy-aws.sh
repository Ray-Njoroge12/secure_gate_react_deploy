#!/usr/bin/env bash
set -euo pipefail

DEPLOY_TARGET="${DEPLOY_TARGET:-}"

require_var() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    echo "Missing required env var: ${name}" >&2
    exit 1
  fi
}

if [[ -z "$DEPLOY_TARGET" ]]; then
  echo "DEPLOY_TARGET must be set to ecs or eb" >&2
  exit 1
fi

if [[ "$DEPLOY_TARGET" == "ecs" ]]; then
  require_var ECS_CLUSTER
  require_var ECS_SERVICE

  if [[ -n "${ECS_TASK_DEFINITION:-}" ]]; then
    echo "Deploying to ECS with task definition ${ECS_TASK_DEFINITION}..."
    aws ecs update-service \
      --cluster "$ECS_CLUSTER" \
      --service "$ECS_SERVICE" \
      --task-definition "$ECS_TASK_DEFINITION" \
      --force-new-deployment
  else
    echo "Deploying to ECS with force-new-deployment (task definition unchanged)..."
    aws ecs update-service \
      --cluster "$ECS_CLUSTER" \
      --service "$ECS_SERVICE" \
      --force-new-deployment
  fi

  echo "Waiting for ECS service to stabilize..."
  aws ecs wait services-stable --cluster "$ECS_CLUSTER" --services "$ECS_SERVICE"
  echo "ECS deployment complete."
  exit 0
fi

if [[ "$DEPLOY_TARGET" == "eb" ]]; then
  require_var EB_APP
  require_var EB_ENV
  require_var EB_VERSION_LABEL

  echo "Deploying to Elastic Beanstalk env ${EB_ENV} with version ${EB_VERSION_LABEL}..."
  aws elasticbeanstalk update-environment \
    --application-name "$EB_APP" \
    --environment-name "$EB_ENV" \
    --version-label "$EB_VERSION_LABEL"

  echo "Waiting for Elastic Beanstalk environment to update..."
  aws elasticbeanstalk wait environment-updated --environment-name "$EB_ENV"
  echo "Elastic Beanstalk deployment complete."
  exit 0
fi

echo "Unsupported DEPLOY_TARGET: ${DEPLOY_TARGET} (expected ecs or eb)" >&2
exit 1
