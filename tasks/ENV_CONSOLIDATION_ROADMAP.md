# 🔐 ENVIRONMENT FILES CONSOLIDATION & SECURITY HARDENING ROADMAP

**Project**: Secure Gate Access Control System  
**Focus**: Environment Configuration Cleanup & Security Enhancement  
**Date Started**: November 21, 2025  
**Status**: 🟡 IN PROGRESS  
**Priority**: 🔴 CRITICAL (Blocks Production Deployment)

---

## 📋 EXECUTIVE SUMMARY

This roadmap consolidates 20+ environment files into a minimal, secure set while:
- ✅ Preserving all necessary secrets (DB, Redis, JWT, Mailgun, Africa's Talking)
- ✅ Eliminating secret exposure in git
- ✅ Aligning with auth/CORS/services security model
- ✅ Enabling AWS Secrets Manager for production/staging

---

## 🎯 TARGET ENV FILE STRUCTURE

### Backend (`secure-gate-access/server`)
**KEEP (Canonical)**
- `env.example` - Master schema (no secrets)
- `.env.local` - Local dev secrets (gitignored)
- `.env.test` - Test environment
- `.env.staging` - Staging config (secrets via AWS SM)
- `.env.production` - Production config (secrets via AWS SM)
- `.env.test.example` - Test template
- `.env.production.example` - Production template (sanitized)

**REMOVE (Legacy/Duplicate)**
- `.env` - Dev env with real secrets → migrate to `.env.local`
- `.env.development` - Alternate dev schema
- `.env.africastalking` - Provider-specific overlay
- `.env.mailgun` - Provider-specific overlay
- Duplicate `env.example` or `.env.example`

### Frontend (`secure-gate-access/client`)
**KEEP**
- `env.example` - Template
- `.env` - Dev config
- `.env.production` - Production config
- `.env.local` - Dev overrides (gitignored)

### Project Root / Infra
**KEEP (Sanitized Examples)**
- `secure-gate-access/env.production.example`
- `secure-gate-access/.env.docker.example`

**REMOVE (Legacy)**
- `secure-gate-access/.env`
- `secure-gate-access/.env.production`
- `secure-gate-access/.env.docker`

---

## 📅 IMPLEMENTATION PHASES

### ✅ PHASE A: BACKUP & SECRET EXTRACTION
**Goal**: Document all secrets safely before any file changes

- [ ] A1: Create secure offline backup of all env files
- [ ] A2: Build secrets inventory (DB, Redis, JWT, SMTP, SMS, Encryption)
- [ ] A3: Document rotation strategy per environment

**Files Backed Up**: 15 env files containing secrets
**Safety Check**: No file deletions until Phase A complete

---

### 🔄 PHASE B: BACKEND CANONICALIZATION
**Goal**: Single source of truth for backend env schema

#### B1: Choose Canonical Schema
- [ ] Merge `env.example` and `.env.example` into one
- [ ] Align with `EnvironmentConfig.js` variables
- [ ] Verify: PG*, JWT_*, CLIENT_ORIGIN, ADDITIONAL_ORIGINS

#### B2: Dev Env Migration
- [ ] Create `server/.env.local` with current secrets
- [ ] Sanitize or remove tracked `server/.env`
- [ ] Update CORS to use CLIENT_ORIGIN + ADDITIONAL_ORIGINS
- [ ] Test: Backend starts with `.env.local`

#### B3: Test Env Alignment
- [ ] Align `.env.test` keys with canonical schema
- [ ] Sanitize `.env.test.example` (remove provider keys)
- [ ] Verify: Jest loads `.env.test` correctly

#### B4: Staging & Production
- [ ] Update `.env.staging` with non-secret config only
- [ ] Update `.env.production` with non-secret config only
- [ ] Sanitize `.env.production.example`
- [ ] Set security flags (ENFORCE_HTTPS, SECURE_COOKIES, etc.)
- [ ] Reconcile AWS Secrets Manager integration

#### B5: Remove Legacy Files
- [ ] Verify no references to legacy env files
- [ ] Delete `.env.development`
- [ ] Delete `.env.africastalking`
- [ ] Delete `.env.mailgun`
- [ ] Archive or delete duplicate env.example

**Key Files Modified**: `server/env.example`, `server/.env.local`, `server/.env.*`
**Safety Check**: Secrets preserved in `.env.local` and AWS SM

---

### 🎨 PHASE C: FRONTEND CANONICALIZATION
**Goal**: Clean, consistent frontend env config

#### C1: Template Verification
- [ ] Verify `client/env.example` completeness
- [ ] Ensure only REACT_APP_* variables (no secrets)

#### C2: Dev vs Prod Alignment
- [ ] Confirm `client/.env` → `http://localhost:3001/api`
- [ ] Set `client/.env.production` → production API URL
- [ ] Update root `/.env` → production API URL
- [ ] Verify: No secrets in any REACT_APP_* var

**Key Files Modified**: `client/.env`, `client/.env.production`, `/.env`
**Safety Check**: All frontend env vars are public-safe

---

### 🏗️ PHASE D: INFRA & DOCKER CLEANUP
**Goal**: Clean infra-level env files

#### D1: Infra Examples
- [ ] Map infra-only settings from backup
- [ ] Create `.env.docker.example` (sanitized)
- [ ] Create `infra.env.example` if needed
- [ ] Document CI/CD secret injection points

#### D2: Remove Infra Legacy
- [ ] Delete `secure-gate-access/.env`
- [ ] Delete `secure-gate-access/.env.production`
- [ ] Delete `secure-gate-access/.env.docker`
- [ ] Keep only sanitized `*.example` files

**Key Files Modified**: Project root env files
**Safety Check**: Deployment scripts updated for new paths

---

### 🔐 PHASE E: AUTH/CORS/SERVICES INTEGRATION
**Goal**: Tie env cleanup to security hardening

#### E1: Auth & JWT Configuration
- [ ] Verify JWT secrets loaded from `.env.local` (dev)
- [ ] Verify JWT secrets loaded from AWS SM (staging/prod)
- [ ] Test token generation and verification
- [ ] Update `EnvironmentConfig.validateEnvironment()`

#### E2: CORS Hardening
- [ ] Set CLIENT_ORIGIN per environment
- [ ] Set ADDITIONAL_ORIGINS for dev (127.0.0.1, etc.)
- [ ] Update `app.js` CORS middleware
- [ ] Test: Login from each allowed origin

#### E3: Services Feature Flags
- [ ] Add ENABLE_WEBHOOKS flag to schema
- [ ] Add ENABLE_AUTOMATIONS flag to schema
- [ ] Add ENABLE_EXTERNAL_NOTIFICATIONS flag to schema
- [ ] Update services to check flags before execution
- [ ] Default: OFF in dev/test, ON in staging/prod

#### E4: Validation & Testing
- [ ] Run backend with new env structure (dev)
- [ ] Run integration tests with `.env.test`
- [ ] Verify environment validation catches missing vars
- [ ] Test CORS from frontend to backend
- [ ] Document new env setup process

**Key Files Modified**: `environment.js`, `app.js`, services, middleware
**Safety Check**: All auth flows working, CORS permissive in dev, strict in prod

---

## 📊 SECRETS INVENTORY

### Database (PostgreSQL)
- `PGUSER`: secure_gate_user
- `PGPASSWORD`: [BACKED_UP] → Rotate in RDS
- `PGHOST`: localhost (dev), RDS endpoint (prod)
- `PGDATABASE`: secure_gate / secure_gate_test

### Redis
- `REDIS_PASSWORD`: [BACKED_UP] → Rotate in ElastiCache
- `REDIS_HOST`: localhost (dev), ElastiCache endpoint (prod)

### JWT & Sessions
- `JWT_SECRET`: [BACKED_UP] → Store in AWS SM
- `JWT_REFRESH_SECRET`: [BACKED_UP] → Store in AWS SM
- `SESSION_SECRET`: [BACKED_UP] → Store in AWS SM

### Email (Mailgun)
- `MAILGUN_API_KEY`: [BACKED_UP]
- `MAILGUN_DOMAIN`: sandboxcd6106b9f4d54da78846462008c1678b.mailgun.org
- `SMTP_USER`: postmaster@...
- `SMTP_PASS`: [BACKED_UP]

### SMS (Africa's Talking)
- `AT_USERNAME`: securelabstest
- `AT_API_KEY`: [BACKED_UP]

### Encryption
- `ENCRYPTION_KEY`: [BACKED_UP] → Use AWS KMS in prod

---

## ✅ COMPLETION CHECKLIST

### Phase A: Backup & Extraction
- [ ] All env files backed up offline
- [ ] Secrets inventory complete
- [ ] Rotation strategy documented

### Phase B: Backend Canon
- [ ] Single canonical `env.example`
- [ ] `.env.local` created with secrets
- [ ] Staging/prod using AWS SM
- [ ] Legacy files removed

### Phase C: Frontend Canon
- [ ] API URLs aligned per environment
- [ ] No secrets in frontend env

### Phase D: Infra Cleanup
- [ ] Infra examples sanitized
- [ ] Legacy infra env files removed

### Phase E: Integration
- [ ] Auth/JWT working with new env
- [ ] CORS configured per environment
- [ ] Services gated by feature flags
- [ ] Full integration tests passing

---

## 🚨 SAFETY PROTOCOLS

1. **No secrets in git**: All real credentials in `.env.local` or AWS SM
2. **Backup before delete**: Every env file backed up before removal
3. **Test after each phase**: Backend starts, tests pass, auth works
4. **Incremental changes**: One phase at a time, verify before proceeding
5. **Rollback ready**: Original env files preserved until final verification

---

## 📈 SUCCESS METRICS

- ✅ Environment files reduced from 20+ to ~10 canonical files
- ✅ Zero secrets committed to git
- ✅ Consistent CORS configuration across environments
- ✅ Auth flows working in dev, test, staging, prod
- ✅ AWS Secrets Manager integration verified
- ✅ All integration tests passing with new env structure

---

**Last Updated**: November 21, 2025  
**Next Review**: After Phase E completion
