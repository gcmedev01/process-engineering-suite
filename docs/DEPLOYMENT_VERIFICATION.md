# Deployment Verification Checklist

This document provides verification steps for both local and AWS deployments.

## Local Development Verification

### Pre-Start Checklist

- [ ] `.env.local` file exists in `infra/` directory
- [ ] `POSTGRES_PASSWORD` is set in `.env.local`
- [ ] `DATABASE_URL` is configured in `.env.local`
- [ ] Docker and Docker Compose are installed

### Startup Verification

```bash
# Start services
docker-compose -f infra/docker-compose.yml up

# Expected output:
# ✓ postgres container starts
# ✓ api container starts (runs migrations)
# ✓ apps container starts (runs bun dev)
```

### Service Health Checks

**API Health:**
```bash
curl http://localhost:8000/health

# Expected response:
# {"status": "healthy", "database": "connected"}
```

**Database Connectivity:**
```bash
docker-compose -f infra/docker-compose.yml exec postgres psql -U postgres -d engsuite -c "\dt"

# Expected: List of tables (projects, networks, etc.)
```

**Frontend Access:**
```bash
# Open in browser:
open http://localhost:3000  # Dashboard
open http://localhost:3001/docs  # Docs
open http://localhost:3002/network-editor  # Network Editor
open http://localhost:3003/psv  # PSV
open http://localhost:3004/design-agents/  # Design Agents
open http://localhost:3005/venting-calculation  # Venting Calculation
open http://localhost:3006/vessels-calculation  # Vessels Calculation
open http://localhost:3007/pump-calculation  # Pump Calculation
open http://localhost:3008/heat-transfer-calculation  # Heat Transfer Calculation
open http://localhost:3009/control-valve-calculation  # Control Valve Calculation

# All should load without errors
```

### Configuration Verification

**Backend Config:**
```bash
docker-compose -f infra/docker-compose.yml exec api python -c "
from apps.api.app.config import get_settings
s = get_settings()
print(f'DEPLOYMENT_ENV: {s.DEPLOYMENT_ENV}')
print(f'Allowed Origins: {s.allowed_origins}')
assert s.DEPLOYMENT_ENV == 'local', 'Should be local'
assert 'http://localhost:3000' in s.allowed_origins, 'Dashboard origin should be allowed'
print('✓ Backend config correct')
"
```

**CORS Verification:**
```bash
# From browser console (http://localhost:3000)
fetch('http://localhost:8000/health')
  .then(r => r.json())
  .then(d => console.log('✓ CORS working:', d))
  .catch(e => console.error('✗ CORS error:', e))

# Should see: ✓ CORS working: {status: "healthy", ...}
# No CORS errors in console
```

**Environment Variables:**
```bash
docker-compose -f infra/docker-compose.yml exec api env | grep -E "DEPLOYMENT_ENV|DATABASE_URL"

# Expected:
# DEPLOYMENT_ENV=local
# DATABASE_URL=postgresql+asyncpg://postgres:...
```

### Functional Tests

- [ ] Can create a new project via API
- [ ] Dashboard loads project list
- [ ] Network Editor can create nodes and edges
- [ ] PSV app loads and can perform calculations
- [ ] Design Agents interface is responsive
- [ ] Venting Calculation app loads and can perform calculations
- [ ] Vessels Calculation app loads and can perform calculations
- [ ] Pump Calculation app loads and can perform calculations
- [ ] Heat Transfer Calculation app loads and can perform calculations
- [ ] Control Valve Calculation app loads and can perform calculations
- [ ] API documentation accessible at http://localhost:8000/docs

### Cleanup

```bash
# Stop services
docker-compose -f infra/docker-compose.yml down

# Clean restart (removes volumes)
docker-compose -f infra/docker-compose.yml down -v
docker-compose -f infra/docker-compose.yml up
```

---

## AWS Production Verification

### Pre-Deployment Checklist

- [ ] AWS CLI configured with appropriate credentials
- [ ] Docker installed locally
- [ ] ECR repositories created
- [ ] RDS PostgreSQL instance running and accessible
- [ ] Secrets stored in AWS Secrets Manager:
  - [ ] `process-engineering/database-url`
  - [ ] `process-engineering/secret-key`
  - [ ] `process-engineering/allowed-origins`
- [ ] VPC with public and private subnets configured
- [ ] Security groups configured (ALB, ECS, RDS)
- [ ] ECS cluster created
- [ ] Application Load Balancer created with target groups

### Image Build Verification

```bash
# Build and push images
./infra/aws/scripts/build-and-push.sh us-east-1 YOUR_ACCOUNT_ID

# Expected output:
# ✓ Authentication successful
# ✓ Repositories created
# ✓ API image built and pushed
# ✓ Web image built and pushed
# ✓ Network Editor image built and pushed
# ✓ PSV image built and pushed
# ✓ Design Agents image built and pushed
```

**Verify images in ECR:**
```bash
aws ecr describe-images \
  --repository-name process-engineering/api \
  --region us-east-1

# Should show images with :latest tag
```

### Task Definition Registration

```bash
# Update placeholders
sed -i '' 's/ACCOUNT_ID/YOUR_ACCOUNT_ID/g' infra/aws/task-definitions/*.json
sed -i '' 's/REGION/us-east-1/g' infra/aws/task-definitions/*.json

# Register all task definitions
for service in api web network-editor psv design-agents; do
  aws ecs register-task-definition \
    --cli-input-json file://infra/aws/task-definitions/${service}.json \
    --region us-east-1
done

# Verify registration
aws ecs list-task-definitions --region us-east-1 | grep process-engineering
```

### ECS Service Health

**Check service status:**
```bash
aws ecs describe-services \
  --cluster process-engineering-cluster \
  --services api web network-editor psv design-agents \
  --region us-east-1 \
  --query 'services[*].[serviceName,status,desiredCount,runningCount]' \
  --output table

# Expected: All services ACTIVE with runningCount == desiredCount
```

**Check task health:**
```bash
aws ecs list-tasks \
  --cluster process-engineering-cluster \
  --service-name api \
  --desired-status RUNNING \
  --region us-east-1

# Get task details
aws ecs describe-tasks \
  --cluster process-engineering-cluster \
  --tasks TASK_ARN \
  --region us-east-1 \
  --query 'tasks[0].healthStatus'

# Expected: HEALTHY
```

### Service Health Checks

**API Health via ALB:**
```bash
curl https://your-alb-domain.com/health

# Expected:
# {"status": "healthy", "database": "connected"}
```

**Check logs for errors:**
```bash
# API logs
aws logs tail /ecs/process-engineering-api --follow --region us-east-1

# Look for:
# ✓ "DEPLOYMENT_ENV: aws"
# ✓ Successful database connections
# ✓ No error messages
# ✓ "Uvicorn running on..."
```

**Test database connectivity:**
```bash
aws ecs execute-command \
  --cluster process-engineering-cluster \
  --task TASK_ID \
  --container api \
  --command "curl http://localhost:8000/health" \
  --interactive \
  --region us-east-1

# Should return healthy status
```

### Configuration Verification

**Verify secrets are accessible:**
```bash
# List secrets
aws secretsmanager list-secrets \
  --filters Key=name,Values=process-engineering \
  --region us-east-1

# Get secret value (test)
aws secretsmanager get-secret-value \
  --secret-id process-engineering/allowed-origins \
  --region us-east-1 \
  --query 'SecretString' \
  --output text
```

**Verify environment variables in tasks:**
```bash
aws ecs describe-tasks \
  --cluster process-engineering-cluster \
  --tasks TASK_ARN \
  --region us-east-1 \
  --query 'tasks[0].containers[0].environment'

# Should include:
# - DEPLOYMENT_ENV=aws
# - AWS_REGION=us-east-1
# - NEXT_PUBLIC_API_URL=http://api:8000 (for frontends)
```

### ALB and Routing Verification

**Check ALB health:**
```bash
aws elbv2 describe-load-balancers \
  --names process-engineering-alb \
  --region us-east-1 \
  --query 'LoadBalancers[0].State'

# Expected: {"Code": "active"}
```

**Check target group health:**
```bash
aws elbv2 describe-target-health \
  --target-group-arn TARGET_GROUP_ARN \
  --region us-east-1

# Expected: All targets show "healthy" state
```

**Test routing:**
```bash
# Test each service via ALB
curl -I https://your-alb-domain.com/health          # API
curl -I https://your-alb-domain.com/                # Web
curl -I https://your-alb-domain.com/network-editor/ # Network Editor
curl -I https://your-alb-domain.com/psv/            # PSV
curl -I https://your-alb-domain.com/design-agents/  # Design Agents

# All should return 200 OK
```

### CORS Verification

**Test CORS from allowed origin:**
```bash
curl -H "Origin: https://your-alb-domain.com" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     https://your-alb-domain.com/health \
     -v

# Should see Access-Control-Allow-Origin header
```

**Update origins if needed:**
```bash
aws secretsmanager put-secret-value \
  --secret-id process-engineering/allowed-origins \
  --secret-string "https://your-alb-domain.com,https://yourdomain.com" \
  --region us-east-1

# Restart API service to pick up changes
aws ecs update-service \
  --cluster process-engineering-cluster \
  --service api \
  --force-new-deployment \
  --region us-east-1
```

### Database Verification
Reference: [Engineering Objects Unification (2026-03-06)](./ENGINEERING_OBJECTS_MIGRATION_20260306.md) for equipment-to-object migration details.


**Test RDS connectivity:**
```bash
# From your local machine (if RDS is publicly accessible)
psql "postgresql://postgres:PASSWORD@rds-endpoint:5432/engsuite" -c "SELECT version();"

# From ECS task
aws ecs execute-command \
  --cluster process-engineering-cluster \
  --task TASK_ID \
  --container api \
  --command "psql \$DATABASE_URL -c '\\dt'" \
  --interactive \
  --region us-east-1
```

**Check migrations applied:**
```bash
# View API startup logs for migration messages
aws logs filter-log-events \
  --log-group-name /ecs/process-engineering-api \
  --filter-pattern "alembic" \
  --region us-east-1 \
  --max-items 10

# Should see: "Running upgrade ... -> ..."
```

### Functional Tests

- [ ] Can access all frontends via ALB
- [ ] API responds to requests
- [ ] Database operations work (create, read, update, delete)
- [ ] Authentication works (if implemented)
- [ ] No CORS errors in browser console
- [ ] All ECS tasks remain healthy over time
- [ ] CloudWatch logs are flowing

### Monitoring Setup

**Create CloudWatch alarms:**
```bash
# Example: API task count alarm
aws cloudwatch put-metric-alarm \
  --alarm-name process-engineering-api-task-count \
  --alarm-description "Alert if API tasks drop below desired count" \
  --metric-name RunningTaskCount \
  --namespace AWS/ECS \
  --statistic Average \
  --period 300 \
  --threshold 1 \
  --comparison-operator LessThanThreshold \
  --dimensions Name=ClusterName,Value=process-engineering-cluster Name=ServiceName,Value=api \
  --evaluation-periods 2 \
  --region us-east-1
```

**Check metrics:**
```bash
# View ECS service metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/ECS \
  --metric-name CPUUtilization \
  --dimensions Name=ClusterName,Value=process-engineering-cluster Name=ServiceName,Value=api \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average \
  --region us-east-1
```

### Security Verification

- [ ] RDS is in private subnet (not publicly accessible in production)
- [ ] ECS tasks in private subnet with NAT gateway
- [ ] Security groups follow least privilege
- [ ] Secrets stored in Secrets Manager (not in task definitions)
- [ ] IAM roles have minimal required permissions
- [ ] ALB uses HTTPS (certificate configured)
- [ ] Security scanning enabled on ECR images

### Cost Monitoring

```bash
# Check AWS Cost Explorer for resource costs
aws ce get-cost-and-usage \
  --time-period Start=2026-01-01,End=2026-01-31 \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --filter file://cost-filter.json \
  --region us-east-1

# Expected costs: ~$337/month (see DEPLOYMENT.md)
```

---

## Troubleshooting

See [DEPLOYMENT.md](./DEPLOYMENT.md#troubleshooting) for common issues and solutions.

### Quick Diagnostics

**Local:**
```bash
docker-compose -f infra/docker-compose.yml logs --tail=100
```

**AWS:**
```bash
# Recent logs from all services
for service in api web network-editor psv design-agents; do
  echo "=== $service ==="
  aws logs tail /ecs/process-engineering-${service} --since 1h --region us-east-1
done
```

---

## Success Criteria

### Local Development
- ✅ All services start without errors
- ✅ API health endpoint returns 200
- ✅ Database is connected
- ✅ All frontends accessible on localhost
- ✅ CORS works (no browser errors)
- ✅ Hot reload works for code changes

### AWS Production
- ✅ All ECS services running with desired count
- ✅ All tasks pass health checks
- ✅ API accessible via ALB
- ✅ Frontends load through ALB
- ✅ Database migrations applied
- ✅ CORS configured correctly
- ✅ CloudWatch logs flowing
- ✅ No errors in application logs
- ✅ Secrets accessible from tasks
- ✅ Cost within expected range

---

## Rollback Procedures

### Local Development
```bash
# Rollback to previous version
git checkout <previous-commit>
docker-compose -f infra/docker-compose.yml down
docker-compose -f infra/docker-compose.yml up --build
```

### AWS Production
```bash
# Rollback to previous task definition
aws ecs update-service \
  --cluster process-engineering-cluster \
  --service api \
  --task-definition process-engineering-api:PREVIOUS_REVISION \
  --region us-east-1

# Monitor rollback
aws ecs describe-services \
  --cluster process-engineering-cluster \
  --services api \
  --region us-east-1
```
