# أكاديمية مستر مصطفى — Mustafa Academy

**Arabic e-learning platform** built for scale — courses, lectures, quizzes, homework, Egyptian payment gateways (Fawry, Vodafone Cash), Stripe, certificates, and a full admin panel.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, TypeScript, Vite, TanStack Query, Zustand, Tailwind CSS (RTL) |
| **Backend** | Node.js 20, Express, TypeScript, Prisma ORM |
| **Database** | PostgreSQL 16 |
| **Cache / Queue** | Redis 7, BullMQ |
| **Payments** | Fawry, Vodafone Cash, Stripe, access codes, coupons |
| **Infrastructure** | Docker, Nginx, Kubernetes, Prometheus, Grafana |
| **CI/CD** | GitHub Actions |
| **Testing** | Vitest (unit + integration), Playwright (E2E) |

---

## Project Structure

```
mustafa-academy/
├── apps/
│   ├── api/                    # Express backend
│   │   ├── src/
│   │   │   ├── config/         # Environment validation (Zod)
│   │   │   ├── lib/            # Redis, Prisma, logger, metrics
│   │   │   │   └── db/         # Repositories, transactions, cache
│   │   │   ├── middleware/      # Auth, rate limit, error handler
│   │   │   ├── modules/        # Feature modules (auth, courses, payments…)
│   │   │   └── queues/         # BullMQ workers and processors
│   │   ├── prisma/
│   │   │   ├── schema.prisma   # 28 models, full relations
│   │   │   └── seed.ts         # Dev seed data
│   │   └── tests/              # Vitest unit + integration tests
│   └── web/                    # React frontend
│       ├── src/
│       │   ├── app/            # Router, providers, guards
│       │   ├── features/       # Feature-sliced: auth, courses, admin…
│       │   └── shared/         # API client, hooks, stores, types, utils
│       └── tests/e2e/          # Playwright E2E tests
├── infra/
│   ├── docker/                 # Postgres init SQL
│   ├── nginx/                  # Reverse proxy + SPA configs
│   ├── k8s/                    # Kubernetes manifests
│   └── monitoring/             # Prometheus + Grafana dashboards
└── scripts/                    # DB backup, migration scripts
```

---

## Quick Start — Development

### Prerequisites

- Node.js ≥ 20
- Docker + Docker Compose
- Git

### 1. Clone and install

```bash
git clone https://github.com/your-org/mustafa-academy.git
cd mustafa-academy
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env — at minimum set JWT secrets and DB passwords
```

**Required secrets to set in `.env`:**

```bash
JWT_ACCESS_SECRET=<generate: openssl rand -hex 32>
JWT_REFRESH_SECRET=<generate: openssl rand -hex 32>
COOKIE_SECRET=<generate: openssl rand -hex 16>
ENCRYPTION_KEY=<generate: openssl rand -hex 32>
POSTGRES_PASSWORD=<your password>
REDIS_PASSWORD=<your password>
```

### 3. Start infrastructure

```bash
# Start PostgreSQL + Redis only (for local dev)
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d postgres redis
```

### 4. Setup database

```bash
# Generate Prisma client
npm run db:generate --workspace=apps/api

# Run migrations
npm run db:migrate --workspace=apps/api

# Seed with sample data
npm run db:seed --workspace=apps/api
```

**Default seed credentials:**

| Role | Phone | Password |
|---|---|---|
| Owner (مستر مصطفى) | `01000000000` | `Admin@1234!` |
| Admin | `01100000000` | `Admin@5678!` |
| Student | `01200000000` | `Student@123!` |

### 5. Start development servers

```bash
# Start both API and Web with hot reload
npm run dev

# Or individually:
npm run dev:api   # → http://localhost:3000
npm run dev:web   # → http://localhost:5173
```

### 6. Optional dev tools

```bash
# BullMQ dashboard → http://localhost:3002
# Adminer (DB UI) → http://localhost:8080
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d bull-board adminer

# Prisma Studio
npm run db:studio --workspace=apps/api
```

---

## Running Tests

### Unit & Integration Tests (Vitest)

```bash
# Create test database
createdb academy_test

# Copy test env
cp apps/api/.env.test apps/api/.env.test.local

# Run all tests
npm test --workspace=apps/api

# Watch mode
npm run test:watch --workspace=apps/api

# Coverage report
npm run test:coverage --workspace=apps/api
```

### E2E Tests (Playwright)

```bash
# Install browsers (once)
cd apps/web && npx playwright install chromium

# Run E2E tests (requires running dev servers)
npm run dev &
cd apps/web && npx playwright test

# With UI
cd apps/web && npx playwright test --ui
```

---

## Payment Configuration

### Fawry

1. Get credentials from [Fawry Developer Portal](https://developer.fawry.com)
2. Set in `.env`:
   ```
   FAWRY_MERCHANT_CODE=your_code
   FAWRY_SECURITY_KEY=your_key
   FAWRY_RETURN_URL=https://yourdomain.com/payment/callback/fawry
   ```
3. Configure webhook URL in Fawry dashboard: `https://api.yourdomain.com/webhooks/fawry`

### Vodafone Cash

```
VODAFONE_MERCHANT_ID=your_id
VODAFONE_API_KEY=your_key
VODAFONE_CALLBACK_URL=https://api.yourdomain.com/webhooks/vodafone
```

### Stripe

```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

Configure Stripe webhook at: `https://api.yourdomain.com/webhooks/stripe`
Events: `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`

---

## Production Deployment

### Docker Compose (single server)

```bash
# Set all secrets in .env
cp .env.example .env && vim .env

# Build and start all services
docker compose up -d --build

# Run migrations
docker compose exec api npx prisma migrate deploy

# Check health
curl http://localhost/health
```

### Kubernetes

```bash
# Create namespace
kubectl create namespace mustafa-academy

# Create secrets (from .env values)
kubectl create secret generic academy-secrets \
  --namespace=mustafa-academy \
  --from-literal=DATABASE_URL="postgresql://..." \
  --from-literal=REDIS_URL="redis://..." \
  --from-literal=JWT_ACCESS_SECRET="..." \
  --from-literal=JWT_REFRESH_SECRET="..." \
  --from-literal=COOKIE_SECRET="..." \
  --from-literal=ENCRYPTION_KEY="..." \
  # ... add all other secrets

# Create registry secret
kubectl create secret docker-registry ghcr-registry-secret \
  --namespace=mustafa-academy \
  --docker-server=ghcr.io \
  --docker-username=your-github-username \
  --docker-password=your-github-token

# Apply all manifests
kubectl apply -f infra/k8s/configmaps/
kubectl apply -f infra/k8s/deployments/
kubectl apply -f infra/k8s/services/
kubectl apply -f infra/k8s/ingress/
kubectl apply -f infra/k8s/hpa/

# Verify
kubectl get pods -n mustafa-academy
kubectl get hpa -n mustafa-academy
```

### CI/CD (GitHub Actions)

The `.github/workflows/` directory contains:

- **`ci.yml`** — runs on every PR: type-check, unit tests, integration tests, build
- **`deploy.yml`** — runs on merge to `main`: builds Docker images, pushes to GHCR, deploys via SSH

Required GitHub Secrets:

```
DEPLOY_HOST         # Server IP or hostname
DEPLOY_USER         # SSH username
DEPLOY_SSH_KEY      # Private SSH key
VITE_API_URL        # https://api.yourdomain.com/api/v1
CODECOV_TOKEN       # Optional: test coverage reporting
```

---

## API Documentation

### Base URL
- Development: `http://localhost:3000/api/v1`
- Production: `https://api.yourdomain.com/api/v1`

### Authentication
All protected endpoints require: `Authorization: Bearer <accessToken>`

Refresh tokens are stored in `HttpOnly` cookies and rotated on each use.

### Key Endpoints

| Method | Path | Description | Auth |
|---|---|---|---|
| `POST` | `/auth/register` | Register new student | — |
| `POST` | `/auth/login` | Login with phone + password | — |
| `POST` | `/auth/refresh` | Rotate refresh token | cookie |
| `POST` | `/auth/logout` | Revoke session | ✓ |
| `GET` | `/courses` | List published courses | optional |
| `GET` | `/courses/slug/:slug` | Course detail | optional |
| `POST` | `/payments` | Initiate payment | ✓ |
| `GET` | `/payments/:id/fawry-status` | Poll Fawry status | ✓ |
| `POST` | `/coupons/validate` | Validate coupon code | ✓ |
| `POST` | `/access-codes/redeem` | Redeem access code | ✓ |
| `GET` | `/notifications` | User notifications | ✓ |
| `GET` | `/certificates/my` | User certificates | ✓ |
| `GET` | `/certificates/verify/:number` | Verify certificate | — |
| `POST` | `/homework/:id/submit` | Submit homework | ✓ |
| `POST` | `/webhooks/fawry` | Fawry webhook | signature |
| `POST` | `/webhooks/stripe` | Stripe webhook | signature |
| `GET` | `/health` | Health check | — |
| `GET` | `/metrics` | Prometheus metrics | internal |

### Admin Endpoints (require ADMIN or OWNER role)

| Method | Path | Description |
|---|---|---|
| `GET` | `/admin/stats` | Platform dashboard stats |
| `GET` | `/admin/payments` | All payments with filters |
| `POST` | `/admin/payments/:id/refund` | Process refund |
| `POST` | `/admin/coupons` | Create coupon |
| `POST` | `/admin/coupons/bulk` | Bulk generate coupons |
| `POST` | `/admin/access-codes/generate` | Generate access codes |
| `GET` | `/admin/webhook-events` | Webhook event log |
| `GET` | `/admin/audit-logs` | Audit trail |
| `GET` | `/analytics/overview` | Analytics data |

---

## Monitoring

### Prometheus + Grafana

```bash
# Start monitoring stack
docker compose up -d prometheus grafana

# Grafana → http://localhost:3001
# Default: admin / admin (change in .env: GRAFANA_PASSWORD)
```

Import the dashboard: `infra/monitoring/grafana/dashboards/academy.json`

### Custom Metrics (exposed at `/metrics`)

| Metric | Type | Description |
|---|---|---|
| `http_requests_total` | Counter | Requests by method, route, status |
| `http_request_duration_seconds` | Histogram | Response time distribution |
| `payments_total` | Counter | Payments by provider and status |
| `enrollments_total` | Counter | Enrollments by source |
| `auth_failures_total` | Counter | Auth failures by reason |
| `queue_jobs_total` | Counter | Queue jobs by queue and status |

---

## Database

### Migrations

```bash
# Development — creates migration files
npm run db:migrate --workspace=apps/api

# Production — applies existing migrations only
npm run db:migrate:prod --workspace=apps/api

# Using the migration script
./scripts/migrate.sh dev
./scripts/migrate.sh prod
```

### Backup

```bash
# Manual backup
./scripts/db-backup.sh

# Automated (add to cron)
0 2 * * * /opt/academy/scripts/db-backup.sh
```

---

## Architecture Decisions

- **Atomic payments**: All payment completion + enrollment is wrapped in `atomicCompletePayment()` using PostgreSQL `SERIALIZABLE` transactions with distributed Redis locks — prevents double enrollment.
- **Refresh token rotation**: Every refresh issues a new token pair and revokes the old one. Reuse detection triggers full session revocation (compromise protection).
- **Webhook idempotency**: Every webhook event is deduplicated by `eventId` in `PaymentWebhookEvent` table — safe to retry.
- **Fawry polling**: Background BullMQ jobs poll Fawry status every 10s for up to 3 days (Fawry cash payment window).
- **RTL-first UI**: All CSS uses `direction: rtl`, Cairo Arabic font, and Tailwind RTL utilities throughout.
- **Feature-sliced frontend**: `features/auth`, `features/courses`, `features/admin`, etc. — each owns its pages, components, and hooks.

---

## Environment Variables Reference

See `.env.example` for all available configuration options with descriptions.

---

## License

Private — All rights reserved © Mustafa Academy
