# Deployment Guide

This guide covers deploying the Process Engineering Suite in both local development and AWS production environments.

## Table of Contents

1. [Local Development Deployment](#local-development-deployment)
2. [AWS Production Deployment](#aws-production-deployment)
3. [Environment Variables](#environment-variables)
4. [Verification](#verification)
5. [Troubleshooting](#troubleshooting)

---

## Local Development Deployment

### Prerequisites

- Docker & Docker Compose
- Bun (for local development)
- Git

### Setup Steps

1. **Clone the repository**

```bash
git clone <repository-url>
cd process-engineering-suite
```

2. **Configure environment**

```bash
# Copy the example environment file used by docker-compose.yml
cp infra/.env.example infra/.env

# Edit the file and set your PostgreSQL password
# Minimum required: POSTGRES_PASSWORD
```

3. **Start services**

```bash
# From the project root
docker compose -f infra/docker-compose.yml --env-file infra/.env up --build
```

This will start:
- PostgreSQL database on port 5432
- Python API on port 8000
- Web (Dashboard) on port 3000
- Network Editor on port 3002
- PSV on port 3003
- Design Agents on port 3004
- Venting Calculation on port 3005
- Vessels Calculation on port 3006
- Pump Calculation on port 3007
- Heat Transfer Calculation on port 3008
- Control Valve Sizing on port 3009

4. **Verify deployment**

```bash
# Check API health
curl http://localhost:8000/health

# Open frontends in browser
open http://localhost:3000  # Dashboard
open http://localhost:3001/docs                       # Docs
open http://localhost:3002/network-editor             # Network Editor
open http://localhost:3003/psv                        # PSV
open http://localhost:3004/design-agents/             # Design Agents
open http://localhost:3005/venting-calculation        # Venting Calculation
open http://localhost:3006/vessels-calculation        # Vessels Calculation
open http://localhost:3007/pump-calculation           # Pump Calculation
open http://localhost:3008/heat-transfer-calculation  # Heat Transfer Calculation
open http://localhost:3009/control-valve-calculation  # Control Valve Sizing
```

### Development Workflow

- **Hot Reload**: Code changes are automatically reflected (via volumes)
- **Database**: PostgreSQL data persists in Docker volume
- **Logs**: View with `docker compose -f infra/docker-compose.yml --env-file infra/.env logs -f [service]`
- **Stop**: `docker compose -f infra/docker-compose.yml --env-file infra/.env down`
- **Clean Restart**: `docker compose -f infra/docker-compose.yml --env-file infra/.env down -v && docker compose -f infra/docker-compose.yml --env-file infra/.env up --build`

For detailed Docker development procedures, see [DOCKER_DEVELOPMENT.md](./DOCKER_DEVELOPMENT.md).

---

## AWS Production Deployment

### Prerequisites

- AWS Account with appropriate permissions
- AWS CLI configured (`aws configure`)
- Docker installed locally
- Terraform (optional, for infrastructure automation)

### Architecture Overview

```
Internet → ALB (HTTPS) → ECS Fargate Services → RDS PostgreSQL
                            ├─ API (8000)
                            ├─ Web (3000)
                            ├─ Network Editor (3000)
                            ├─ PSV (3000)
                            ├─ Docs (3000)
                            ├─ Design Agents (80)
                            ├─ Venting Calculation (3000)
                            ├─ Vessels Calculation (3000)
                            ├─ Pump Calculation (3000)
                            ├─ Heat Transfer Calculation (3000)
                            └─ Control Valve Calculation (3000)
```

The local AWS-image smoke stack in `infra/docker-compose.aws-local.yml` also builds docs and calculator app images. The AWS build script, ECS task-definition templates, and ALB target-group helper now cover the full suite.

### Cost Estimate

- **RDS PostgreSQL** (db.t3.medium, Multi-AZ): ~$120/month
- **ECS Fargate** (11 services plus one-off migration task): ~$260/month
- **ALB**: ~$20/month
- **ECR**: ~$5/month
- **Secrets Manager**: ~$2/month
- **CloudWatch**: ~$10/month

**Total: ~$417/month** (can reduce to ~$220/month with single-AZ RDS and smaller instances)

### Step 1: Create AWS Infrastructure

#### 1.1 Create VPC and Networking

```bash
# Create VPC with public and private subnets in 2 AZs
aws ec2 create-vpc --cidr-block 10.0.0.0/16 --tag-specifications 'ResourceType=vpc,Tags=[{Key=Name,Value=process-engineering-vpc}]'

# Note the VPC ID and create subnets
# Public subnets: 10.0.1.0/24, 10.0.2.0/24
# Private subnets: 10.0.10.0/24, 10.0.11.0/24
```

#### 1.2 Create RDS PostgreSQL Database

```bash
# Create RDS instance
aws rds create-db-instance \
  --db-instance-identifier process-engineering-db \
  --db-instance-class db.t3.medium \
  --engine postgres \
  --engine-version 17 \
  --master-username postgres \
  --master-user-password "YOUR_SECURE_PASSWORD" \
  --allocated-storage 50 \
  --vpc-security-group-ids sg-XXXXXXXX \
  --db-subnet-group-name process-engineering-db-subnet \
  --multi-az \
  --publicly-accessible false \
  --backup-retention-period 7

# Wait for database to be available (takes 5-10 minutes)
aws rds wait db-instance-available --db-instance-identifier process-engineering-db

# Get the endpoint
aws rds describe-db-instances \
  --db-instance-identifier process-engineering-db \
  --query 'DBInstances[0].Endpoint.Address' \
  --output text
```

#### 1.3 Create Secrets in AWS Secrets Manager

```bash
# Database URL
aws secretsmanager create-secret \
  --name process-engineering/database-url \
  --secret-string "postgresql+asyncpg://postgres:YOUR_PASSWORD@RDS_ENDPOINT:5432/engsuite" \
  --region us-east-1

# Secret Key (generate with: openssl rand -hex 32)
aws secretsmanager create-secret \
  --name process-engineering/secret-key \
  --secret-string "YOUR_GENERATED_SECRET_KEY" \
  --region us-east-1

# Allowed Origins
aws secretsmanager create-secret \
  --name process-engineering/allowed-origins \
  --secret-string "https://your-alb-domain.com,https://yourdomain.com" \
  --region us-east-1
```

#### 1.4 Create ECS Cluster

```bash
aws ecs create-cluster \
  --cluster-name process-engineering-cluster \
  --region us-east-1
```

#### 1.5 Create Application Load Balancer

```bash
# Create ALB
aws elbv2 create-load-balancer \
  --name process-engineering-alb \
  --subnets subnet-XXXXXXXX subnet-YYYYYYYY \
  --security-groups sg-XXXXXXXX \
  --scheme internet-facing \
  --type application \
  --region us-east-1

# Create target groups for each service
./infra/aws/scripts/create-target-groups.sh us-east-1 vpc-XXXXXXXX

# Create listener rules (HTTPS on port 443)
# Configure path-based routing to target groups
```

### Step 2: Build and Push Docker Images

```bash
# Navigate to project root
cd process-engineering-suite

# Run the build and push script
API_URL=https://api.your-domain.com \
DOCS_URL=https://docs.your-domain.com \
NETWORK_EDITOR_URL=https://network-editor.your-domain.com \
PSV_URL=https://psv.your-domain.com \
DESIGN_AGENTS_URL=https://design-agents.your-domain.com \
VENTING_URL=https://venting.your-domain.com \
VESSELS_CALCULATION_URL=https://vessels.your-domain.com \
PUMP_URL=https://pump.your-domain.com \
HEAT_TRANSFER_URL=https://heat-transfer.your-domain.com \
CONTROL_VALVE_URL=https://control-valve.your-domain.com \
./infra/aws/scripts/build-and-push.sh us-east-1 YOUR_ACCOUNT_ID

# This will:
# - Authenticate to ECR
# - Create ECR repositories
# - Build all Docker images
# - Push to ECR with :IMAGE_TAG and :latest tags
```

### Step 3: Register Task Definitions

```bash
# Render task definitions with your account ID, region, and image tag
./infra/aws/scripts/render-task-definitions.sh us-east-1 YOUR_ACCOUNT_ID GIT_SHA

# Register each task definition
for service in api web docs network-editor psv design-agents venting-calculation vessels-calculation pump-calculation heat-transfer-calculation control-valve-calculation api-migration; do
  aws ecs register-task-definition \
    --cli-input-json file://infra/aws/task-definitions/rendered/${service}.json \
    --region us-east-1
done
```

### Step 4: Create ECS Services

```bash
# Create API service
aws ecs create-service \
  --cluster process-engineering-cluster \
  --service-name api \
  --task-definition process-engineering-api \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-XXXXXXXX],securityGroups=[sg-XXXXXXXX],assignPublicIp=DISABLED}" \
  --load-balancers "targetGroupArn=arn:aws:elasticloadbalancing:...,containerName=api,containerPort=8000" \
  --region us-east-1

# Repeat for other services (web, docs, network-editor, psv, design-agents, venting-calculation, vessels-calculation, pump-calculation, heat-transfer-calculation, control-valve-calculation)
```

### Step 5: Configure DNS (Optional)

```bash
# Point your domain to the ALB
# Create Route 53 hosted zone and A record alias to ALB
aws route53 create-hosted-zone --name yourdomain.com --caller-reference $(date +%s)

# Create A record
aws route53 change-resource-record-sets \
  --hosted-zone-id ZXXXXXXXXXX \
  --change-batch file://dns-change.json
```

### Step 6: Verify Deployment

```bash
# Check ECS service status
aws ecs describe-services \
  --cluster process-engineering-cluster \
  --services api web docs network-editor psv design-agents venting-calculation vessels-calculation pump-calculation heat-transfer-calculation control-valve-calculation \
  --region us-east-1

# Check task health
aws ecs list-tasks \
  --cluster process-engineering-cluster \
  --service-name api \
  --region us-east-1

# Test API health via ALB
curl https://your-alb-domain.com/health
```

---

## Environment Variables

See [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md) for complete reference.

### Quick Reference

**Local Development:**
- `DEPLOYMENT_ENV=local`
- `DATABASE_URL=postgresql+asyncpg://postgres:PASSWORD@postgres:5432/engsuite`
- `NEXT_PUBLIC_API_URL=http://localhost:8000`
- `NEXT_PUBLIC_AUTH_API_URL=http://localhost:8000`
- `API_PROXY_TARGET=http://api:8000`
- `VITE_API_URL=http://localhost:8000`

**AWS Production:**
- `DEPLOYMENT_ENV=aws`
- `DATABASE_URL=<from-secrets-manager>` (RDS endpoint)
- `CORS_ALLOWED_ORIGINS=https://your-alb.com,https://yourdomain.com`
- `NEXT_PUBLIC_API_URL=https://api.your-domain.com` (browser-facing API URL, baked at build time)
- `API_PROXY_TARGET=https://api.your-domain.com` (server-side rewrite target, baked at build time)

---

## Verification

### Local Development

```bash
# API health
curl http://localhost:8000/health
# Expected: {"status": "healthy", "database": "connected"}

# CORS check (from browser console)
fetch('http://localhost:8000/health')
  .then(r => r.json())
  .then(console.log)
# Expected: No CORS errors

# Database connectivity
docker compose -f infra/docker-compose.yml --env-file infra/.env exec postgres psql -U postgres -d engsuite -c "\dt"
# Expected: List of tables
```

### AWS Production

```bash
# API health via ALB
curl https://your-alb-domain.com/health

# Check ECS task logs
aws logs tail /ecs/process-engineering-api --follow --region us-east-1

# Database connectivity from ECS task
aws ecs execute-command \
  --cluster process-engineering-cluster \
  --task TASK_ID \
  --container api \
  --command "psql $DATABASE_URL -c '\dt'" \
  --interactive \
  --region us-east-1
```

---

## Troubleshooting

### Local Development

**Issue: API can't connect to database**
```bash
# Check if postgres is running
docker compose -f infra/docker-compose.yml --env-file infra/.env ps postgres

# Check logs
docker compose -f infra/docker-compose.yml --env-file infra/.env logs postgres

# Verify DATABASE_URL environment variable
docker compose -f infra/docker-compose.yml --env-file infra/.env exec api env | grep DATABASE_URL
```

**Issue: CORS errors in browser**
```bash
# Verify CORS env if you overrode it
docker compose -f infra/docker-compose.yml --env-file infra/.env exec api env | grep CORS_ALLOWED_ORIGINS

# Check API logs for CORS configuration
docker compose -f infra/docker-compose.yml --env-file infra/.env logs api | grep -i cors
```

**Issue: Frontend can't reach API**
```bash
# Verify NEXT_PUBLIC_API_URL
docker compose -f infra/docker-compose.yml --env-file infra/.env exec apps env | grep NEXT_PUBLIC_API_URL

# Check API is responding
curl http://localhost:8000/health
```

### AWS Production

**Issue: ECS tasks failing health checks**
```bash
# Check task logs
aws logs tail /ecs/process-engineering-api --follow --region us-east-1

# Check task definition health check configuration
aws ecs describe-task-definition --task-definition process-engineering-api --region us-east-1

# Execute command in running task
aws ecs execute-command --cluster process-engineering-cluster --task TASK_ID --container api --command "/bin/sh" --interactive
```

**Issue: Database connection failures**
```bash
# Verify secrets are accessible
aws secretsmanager get-secret-value --secret-id process-engineering/database-url --region us-east-1

# Check RDS security groups allow connections from ECS tasks
aws rds describe-db-instances --db-instance-identifier process-engineering-db --region us-east-1

# Test database connectivity from ECS task
aws ecs execute-command --cluster process-engineering-cluster --task TASK_ID --container api --command "curl -v telnet://RDS_ENDPOINT:5432" --interactive
```

**Issue: CORS errors from ALB domain**
```bash
# Verify CORS_ALLOWED_ORIGINS includes ALB domain
aws secretsmanager get-secret-value --secret-id process-engineering/allowed-origins --region us-east-1

# Update if needed
aws secretsmanager put-secret-value \
  --secret-id process-engineering/allowed-origins \
  --secret-string "https://your-alb-domain.com,https://yourdomain.com" \
  --region us-east-1

# Restart API service to pick up new secrets
aws ecs update-service --cluster process-engineering-cluster --service api --force-new-deployment --region us-east-1
```

---

## Updates and Maintenance

### Updating Code

**Local:**
```bash
# Code changes are reflected immediately via volumes
# Restart services if needed
docker compose -f infra/docker-compose.yml --env-file infra/.env restart
```

**AWS:**
```bash
# Rebuild and push images
./infra/aws/scripts/build-and-push.sh

# Force new deployment (pulls latest images)
aws ecs update-service \
  --cluster process-engineering-cluster \
  --service api \
  --force-new-deployment \
  --region us-east-1
```

### Database Migrations

**Local:**
```bash
# Migrations run automatically on startup
# Manual run:
docker compose -f infra/docker-compose.yml --env-file infra/.env exec api alembic upgrade head
```

**AWS:**
```bash
# Run the one-off migration task before updating the API service
./infra/aws/scripts/render-task-definitions.sh us-east-1 YOUR_ACCOUNT_ID GIT_SHA
aws ecs run-task \
  --cluster process-engineering-cluster \
  --task-definition process-engineering-api-migration \
  --launch-type FARGATE \
  --region us-east-1
```

### Scaling Services

```bash
# Scale API service
aws ecs update-service \
  --cluster process-engineering-cluster \
  --service api \
  --desired-count 3 \
  --region us-east-1

# Enable auto-scaling (optional)
aws application-autoscaling register-scalable-target \
  --service-namespace ecs \
  --resource-id service/process-engineering-cluster/api \
  --scalable-dimension ecs:service:DesiredCount \
  --min-capacity 1 \
  --max-capacity 10 \
  --region us-east-1
```

---

## Additional Resources

- [Environment Variables Reference](./ENVIRONMENT_VARIABLES.md)
- [AWS ECS Documentation](https://docs.aws.amazon.com/ecs/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Troubleshooting Guide](./TROUBLESHOOTING.md)
