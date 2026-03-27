#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TARGET_DIR="$ROOT_DIR/secure-gate-access/infrastructure/aws"

if [[ ! -d "$TARGET_DIR" ]]; then
  echo "Boundary check skipped: directory not found: $TARGET_DIR"
  exit 0
fi

# Core infra resources must be Terraform-managed under infra/ and must not
# be reintroduced into supplemental AWS template directory.
#
# Allowed in supplemental directory:
# - AWS::WAFv2::*
# - AWS::CloudFront::ResponseHeadersPolicy
# - narrowly-scoped IAM policies/roles for CI and app runtime baselines
PATTERN='AWS::EC2::VPC|AWS::EC2::Subnet|AWS::EC2::RouteTable|AWS::EC2::InternetGateway|AWS::EC2::NatGateway|AWS::EC2::SecurityGroup|AWS::ECS::Cluster|AWS::ECS::Service|AWS::ECS::TaskDefinition|AWS::RDS::DBInstance|AWS::RDS::DBSubnetGroup|AWS::ElastiCache::CacheCluster|AWS::ElastiCache::ReplicationGroup|AWS::ElastiCache::SubnetGroup|AWS::SQS::Queue|AWS::CloudFront::Distribution'

MATCHES="$(grep -RInE "$PATTERN" "$TARGET_DIR" --include='*.yml' --include='*.yaml' --include='*.json' || true)"

if [[ -n "$MATCHES" ]]; then
  echo "ERROR: Infrastructure boundary violation detected."
  echo "Core network/security-group resources were found in supplemental directory:"
  echo
  echo "$MATCHES"
  echo
  echo "Action required: move core resources to infra/ Terraform and keep this directory for supplemental security/IAM templates only."
  exit 1
fi

echo "Infra boundary check passed: no core Terraform-owned resources found in supplemental directory."
