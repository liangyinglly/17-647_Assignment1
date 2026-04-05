#!/usr/bin/env bash
set -euo pipefail

AWS_ACCOUNT_ID="502612814580"
AWS_REGION="us-east-1"
ECR_BASE="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

SERVICES=(
  "web-bff"
  "mobile-bff"
  "book-service"
  "customer-service"
  "crm-service"
)

get_context_dir() {
  case "$1" in
    web-bff) echo "book-store-web-bff" ;;
    mobile-bff) echo "book-store-mobile-bff" ;;
    book-service) echo "book-service" ;;
    customer-service) echo "customer-service" ;;
    crm-service) echo "crm-service" ;;
    *)
      echo "Unknown service: $1" >&2
      exit 1
      ;;
  esac
}

echo "==> Verifying AWS identity"
aws sts get-caller-identity --query Account --output text

echo "==> Logging in to ECR"
aws ecr get-login-password --region "${AWS_REGION}" | \
docker login --username AWS --password-stdin "${ECR_BASE}"

echo "==> Ensuring ECR repos exist"
for svc in "${SERVICES[@]}"; do
  aws ecr describe-repositories \
    --region "${AWS_REGION}" \
    --repository-names "${svc}" >/dev/null 2>&1 || \
  aws ecr create-repository \
    --region "${AWS_REGION}" \
    --repository-name "${svc}" >/dev/null
done

echo "==> Building and pushing images"
for svc in "${SERVICES[@]}"; do
  ctx_dir="$(get_context_dir "${svc}")"
  image="${ECR_BASE}/${svc}:latest"
  docker build -t "${svc}:latest" "${ctx_dir}"
  docker tag "${svc}:latest" "${image}"
  docker push "${image}"
done

echo "==> Applying Kubernetes manifests"
kubectl apply -f infrastructure/k8s/bookstore-namespace.yaml
kubectl apply -f infrastructure/k8s/

echo "==> Checking rollout and runtime state"
kubectl get pods -n bookstore-ns -o wide
kubectl get svc -n bookstore-ns
kubectl logs -n bookstore-ns deploy/book-service --tail=50
kubectl logs -n bookstore-ns deploy/customer-service --tail=50
kubectl logs -n bookstore-ns deploy/crm-service --tail=50

echo "Deployment commands completed."
