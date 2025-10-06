# Docker Architecture Diagrams
## Secure Gate Access Control System

---

## 1. Production Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           SECURE GATE PRODUCTION STACK                          │
└─────────────────────────────────────────────────────────────────────────────────┘

                    ┌─────────────────────────────────────┐
                    │         Load Balancer               │
                    │         (Nginx:80/443)             │
                    │     - Rate limiting                 │
                    │     - SSL termination              │
                    │     - Health checks                │
                    └─────────────────┬───────────────────┘
                                      │
                    ┌─────────────────┴───────────────────┐
                    │         secure-gate-network         │
                    │         (172.20.0.0/16)            │
                    └─────────────────┬───────────────────┘
                                      │
            ┌─────────────────────────┼─────────────────────────┐
            │                         │                         │
            ▼                         ▼                         ▼
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│   Frontend       │    │    Backend       │    │   Database       │
│   (React/Nginx)  │    │   (Node.js)      │    │  (PostgreSQL)    │
│                  │    │                  │    │                  │
│ - Port: 3000     │    │ - Port: 5000     │    │ - Port: 5432     │
│ - Health: /health│    │ - Health: /health│    │ - Health: pg_    │
│ - Memory: 256M   │    │ - Memory: 512M   │    │   isready        │
│ - CPU: 0.25      │    │ - CPU: 0.5       │    │ - Memory: 1G     │
└──────────────────┘    └──────────────────┘    └──────────────────┘
            │                         │                         │
            │                         │                         │
            └─────────────────────────┼─────────────────────────┘
                                      │
                                      ▼
                            ┌──────────────────┐
                            │     Redis        │
                            │    (Cache)       │
                            │                  │
                            │ - Port: 6379     │
                            │ - Health: ping   │
                            │ - Memory: 256M   │
                            │ - CPU: 0.25      │
                            └──────────────────┘
```

---

## 2. Blue-Green Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        BLUE-GREEN DEPLOYMENT STRATEGY                           │
└─────────────────────────────────────────────────────────────────────────────────┘

                    ┌─────────────────────────────────────┐
                    │         Traffic Router              │
                    │     (Manual DNS/LB Update)          │
                    └─────────────────┬───────────────────┘
                                      │
                    ┌─────────────────┴───────────────────┐
                    │         Current: BLUE               │
                    │         Next: GREEN                 │
                    └─────────────────┬───────────────────┘
                                      │
            ┌─────────────────────────┼─────────────────────────┐
            │                         │                         │
            ▼                         ▼                         ▼
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│   BLUE ENVIRONMENT  │    │  GREEN ENVIRONMENT  │    │   HEALTH MONITOR    │
│                     │    │                     │    │                     │
│ ┌─────────────────┐ │    │ ┌─────────────────┐ │    │ - Container health  │
│ │ Frontend Blue   │ │    │ │ Frontend Green  │ │    │ - Restart policies  │
│ │ Port: 3001      │ │    │ │ Port: 3002      │ │    │ - Failure analysis  │
│ └─────────────────┘ │    │ └─────────────────┘ │    │ - Health reports    │
│ ┌─────────────────┐ │    │ ┌─────────────────┐ │    └─────────────────────┘
│ │ Backend Blue    │ │    │ │ Backend Green   │ │
│ │ Port: 5001      │ │    │ │ Port: 5002      │ │
│ └─────────────────┘ │    │ └─────────────────┘ │
│ ┌─────────────────┐ │    │ ┌─────────────────┐ │
│ │ Postgres Blue   │ │    │ │ Postgres Green  │ │
│ │ Port: 5433      │ │    │ │ Port: 5434      │ │
│ └─────────────────┘ │    │ └─────────────────┘ │
│ ┌─────────────────┐ │    │ ┌─────────────────┐ │
│ │ Redis Blue      │ │    │ │ Redis Green     │ │
│ │ Port: 6380      │ │    │ │ Port: 6381      │ │
│ └─────────────────┘ │    │ └─────────────────┘ │
└─────────────────────┘    └─────────────────────┘
```

---

## 3. High Availability Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          HIGH AVAILABILITY SETUP                                │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                              HAProxy Load Balancer                              │
│                           (Ports: 80, 443, 8080)                               │
└─────────────────────────────┬───────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │   ha-network      │
                    │ (172.23.0.0/16)   │
                    └─────────┬─────────┘
                              │
            ┌─────────────────┼─────────────────┐
            │                 │                 │
            ▼                 ▼                 ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│  PostgreSQL HA   │ │    Redis HA      │ │   Vault HA       │
│                  │ │                  │ │                  │
│ ┌──────────────┐ │ │ ┌──────────────┐ │ │ ┌──────────────┐ │
│ │ Primary      │ │ │ │ Master       │ │ │ │ Vault Node 1 │ │
│ │ (Patroni)    │ │ │ │ (Redis)      │ │ │ │ (8200)       │ │
│ └──────────────┘ │ │ └──────────────┘ │ │ └──────────────┘ │
│ ┌──────────────┐ │ │ ┌──────────────┐ │ │ ┌──────────────┐ │
│ │ Replica 1    │ │ │ │ Replica 1    │ │ │ │ Vault Node 2 │ │
│ │ (Patroni)    │ │ │ │ (Redis)      │ │ │ │ (8202)       │ │
│ └──────────────┘ │ │ └──────────────┘ │ │ └──────────────┘ │
│ ┌──────────────┐ │ │ ┌──────────────┐ │ │ ┌──────────────┐ │
│ │ Replica 2    │ │ │ │ Replica 2    │ │ │ │ Vault Node 3 │ │
│ │ (Patroni)    │ │ │ │ (Redis)      │ │ │ │ (8204)       │ │
│ └──────────────┘ │ │ └──────────────┘ │ │ └──────────────┘ │
└──────────────────┘ └──────────────────┘ └──────────────────┘
            │                 │                 │
            │                 │                 │
            ▼                 ▼                 ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│   etcd Cluster   │ │ Redis Sentinels  │ │   Consul         │
│                  │ │                  │ │                  │
│ ┌──────────────┐ │ │ ┌──────────────┐ │ │ - Service        │
│ │ etcd Node 1  │ │ │ │ Sentinel 1   │ │ │   Discovery      │
│ │ (2379)       │ │ │ │ (26379)      │ │ │ - Vault Backend  │
│ └──────────────┘ │ │ └──────────────┘ │ │ - Health Checks  │
│ ┌──────────────┐ │ │ ┌──────────────┐ │ └──────────────────┘
│ │ etcd Node 2  │ │ │ │ Sentinel 2   │ │
│ │ (2479)       │ │ │ │ (26380)      │ │
│ └──────────────┘ │ │ └──────────────┘ │
│ ┌──────────────┐ │ │ ┌──────────────┐ │
│ │ etcd Node 3  │ │ │ │ Sentinel 3   │ │
│ │ (2579)       │ │ │ │ (26381)      │ │
│ └──────────────┘ │ │ └──────────────┘ │
└──────────────────┘ └──────────────────┘
```

---

## 4. Monitoring Stack Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            MONITORING STACK                                     │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                           monitoring-network                                    │
│                           (172.22.0.0/16)                                      │
└─────────────────────────────────────────────────────────────────────────────────┘

            ┌─────────────────────────────────────────────────────────────┐
            │                   Prometheus                                 │
            │                (Port: 9090)                                 │
            │              - Metrics Collection                           │
            │              - 30-day Retention                             │
            │              - Alert Rules                                  │
            └─────────────────────┬───────────────────────────────────────┘
                                  │
            ┌─────────────────────┼───────────────────────────────────────┐
            │                     │                                       │
            ▼                     ▼                                       ▼
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│    Grafana       │    │  Alertmanager    │    │  Node Exporter   │
│  (Port: 3000)    │    │  (Port: 9093)    │    │  (Port: 9100)    │
│                  │    │                  │    │                  │
│ - Dashboards     │    │ - Alert Routing  │    │ - System Metrics │
│ - Visualization  │    │ - Notifications  │    │ - CPU/Memory     │
│ - Custom Charts  │    │ - Escalation     │    │ - Disk I/O       │
└──────────────────┘    └──────────────────┘    └──────────────────┘
            │                     │
            │                     │
            ▼                     ▼
┌──────────────────┐    ┌──────────────────┐
│    cAdvisor      │    │   Exporters      │
│  (Port: 8080)    │    │                  │
│                  │    │ - Redis Exporter │
│ - Container      │    │   (Port: 9121)   │
│   Metrics        │    │ - Postgres       │
│ - Resource       │    │   Exporter       │
│   Usage          │    │   (Port: 9187)   │
│ - Performance    │    │ - Backup Metrics │
│   Stats          │    │   (Port: 9091)   │
└──────────────────┘    └──────────────────┘
```

---

## 5. Network Topology

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            NETWORK TOPOLOGY                                     │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                              Host Network                                       │
│                           (Docker Host)                                        │
└─────────────────────────────────────────────────────────────────────────────────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    │                 │                 │
                    ▼                 ▼                 ▼
┌──────────────────────┐ ┌──────────────────────┐ ┌──────────────────────┐
│ secure-gate-network  │ │    blue-network      │ │   green-network      │
│   (172.20.0.0/16)   │ │                      │ │                      │
│                      │ │ - Blue Backend       │ │ - Green Backend      │
│ - Production Stack   │ │ - Blue Frontend      │ │ - Green Frontend     │
│ - Main Services      │ │ - Blue Database      │ │ - Green Database     │
│ - Load Balancer      │ │ - Blue Redis         │ │ - Green Redis        │
└──────────────────────┘ └──────────────────────┘ └──────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            Specialized Networks                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
                    │
            ┌───────┼───────┐
            │       │       │
            ▼       ▼       ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│  ha-network      │ │monitoring-network│ │  vault-network   │
│(172.23.0.0/16)   │ │(172.22.0.0/16)   │ │(172.21.0.0/16)   │
│                  │ │                  │ │                  │
│ - HA PostgreSQL  │ │ - Prometheus     │ │ - Vault HA       │
│ - HA Redis       │ │ - Grafana        │ │ - Consul         │
│ - etcd Cluster   │ │ - Alertmanager   │ │ - Secret Mgmt    │
│ - HAProxy        │ │ - Exporters      │ │ - Key Rotation   │
└──────────────────┘ └──────────────────┘ └──────────────────┘
```

---

## 6. Security Architecture (Current vs Recommended)

### Current Security Model (Issues)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           CURRENT SECURITY MODEL                                │
└─────────────────────────────────────────────────────────────────────────────────┘

❌ CRITICAL ISSUES:
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                                                                 │
│  Hardcoded Secrets:              TLS Disabled:                Exposed Ports:   │
│  ┌─────────────────────────┐     ┌─────────────────────────┐   ┌───────────────┐│
│  │ JWT_SECRET=hardcoded    │     │ tls_disable = true      │   │ 5432:5432     ││
│  │ DB_PASSWORD=postgres    │     │ No encryption           │   │ 6379:6379     ││
│  │ VAULT_TOKEN=plaintext   │     │ Insecure communication  │   │ 9090:9090     ││
│  └─────────────────────────┘     └─────────────────────────┘   └───────────────┘│
│                                                                                 │
│  Privileged Containers:          No Resource Limits:          Root Users:       │
│  ┌─────────────────────────┐     ┌─────────────────────────┐   ┌───────────────┐│
│  │ privileged: true        │     │ Missing in prod.yml     │   │ nginx: root   ││
│  │ Docker socket mount     │     │ Resource exhaustion     │   │ redis: root   ││
│  │ Container escape risk   │     │ No isolation            │   │ Security risk ││
│  └─────────────────────────┘     └─────────────────────────┘   └───────────────┘│
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Recommended Security Model

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        RECOMMENDED SECURITY MODEL                               │
└─────────────────────────────────────────────────────────────────────────────────┘

✅ SECURITY IMPROVEMENTS:
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                                                                 │
│  Secret Management:             TLS Enabled:                   Port Isolation:  │
│  ┌─────────────────────────┐     ┌─────────────────────────┐   ┌───────────────┐│
│  │ Vault Integration       │     │ tls_disable = false     │   │ Internal only ││
│  │ Environment Variables   │     │ Certificate management  │   │ Firewall rules││
│  │ Secret Rotation         │     │ Encrypted communication │   │ No host ports ││
│  └─────────────────────────┘     └─────────────────────────┘   └───────────────┘│
│                                                                                 │
│  Non-Privileged:               Resource Limits:              User Isolation:    │
│  ┌─────────────────────────┐     ┌─────────────────────────┐   ┌───────────────┐│
│  │ privileged: false       │     │ Memory/CPU limits       │   │ nodejs:1001   ││
│  │ Read-only filesystems   │     │ Resource reservations   │   │ nginx:nginx   ││
│  │ No socket mounts        │     │ Isolation enforced      │   │ postgres:user││
│  └─────────────────────────┘     └─────────────────────────┘   └───────────────┘│
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Development vs Production Comparison

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                     DEVELOPMENT vs PRODUCTION COMPARISON                        │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────┐    ┌─────────────────────────────────────┐
│         DEVELOPMENT                 │    │         PRODUCTION                  │
│      (MISSING - NEEDS WORK)         │    │      (EXISTS - NEEDS SECURITY)      │
└─────────────────────────────────────┘    └─────────────────────────────────────┘

❌ MISSING:                    ✅ EXISTS:
┌─────────────────────────┐    ┌─────────────────────────┐
│ docker-compose.dev.yml  │    │ docker-compose.prod.yml │
│                         │    │                         │
│ - Hot reload            │    │ - Resource limits       │
│ - Debug tools           │    │ - Health checks         │
│ - Development DB        │    │ - Production config     │
│ - Source code mounting  │    │ - Optimized builds      │
│ - Fast rebuilds         │    │ - Security hardening    │
│ - Local secrets         │    │ - Monitoring            │
└─────────────────────────┘    └─────────────────────────┘

NEEDS IMPLEMENTATION:           NEEDS SECURITY FIXES:
- Development environment      - Remove hardcoded secrets
- Local debugging setup        - Enable TLS encryption
- Fast iteration workflow      - Add resource limits
- Developer onboarding         - Remove privileged containers
- Testing integration          - Close exposed ports
- Documentation               - Implement secret management
```

---

## 8. Container Lifecycle Management

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         CONTAINER LIFECYCLE MANAGEMENT                          │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                           container-health-monitor.sh                           │
└─────────────────────────────────────────────────────────────────────────────────┘

    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
    │   MONITORING    │    │   RESTART       │    │   REPORTING     │
    │                 │    │                 │    │                 │
    │ - Health checks │    │ - Auto restart  │    │ - JSON reports  │
    │ - Status track  │    │ - Cooldown 300s │    │ - Log analysis  │
    │ - Pattern anal  │    │ - Max 5 attempts│    │ - Failure stats │
    └─────────────────┘    └─────────────────┘    └─────────────────┘
            │                       │                       │
            ▼                       ▼                       ▼
    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
    │ HEALTH STATES   │    │ RESTART POLICY  │    │ ALERT TRIGGERS  │
    │                 │    │                 │    │                 │
    │ - Running       │    │ - unless-stopped│    │ - Port conflict │
    │ - Unhealthy     │    │ - on-failure    │    │ - File not found│
    │ - Restarting    │    │ - always        │    │ - Connection    │
    │ - Exited        │    │ - no            │    │   refused       │
    │ - Dead          │    │                 │    │ - Syntax errors │
    └─────────────────┘    └─────────────────┘    └─────────────────┘
```

---

## 9. Volume and Data Persistence

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        VOLUME AND DATA PERSISTENCE                              │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                              NAMED VOLUMES                                     │
└─────────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────┐ ┌──────────────────────┐ ┌──────────────────────┐
│   PostgreSQL Data    │ │     Redis Data       │ │    Vault Data        │
│                      │ │                      │ │                      │
│ postgres_data        │ │ redis_data           │ │ vault_data           │
│ ├─ User data         │ │ ├─ Cache data        │ │ ├─ Secret storage    │
│ ├─ Indexes           │ │ ├─ Session data      │ │ ├─ Policies          │
│ ├─ Logs              │ │ ├─ AOF files         │ │ ├─ Audit logs        │
│ └─ Configuration     │ │ └─ Configuration     │ │ └─ Configuration     │
└──────────────────────┘ └──────────────────────┘ └──────────────────────┘

┌──────────────────────┐ ┌──────────────────────┐ ┌──────────────────────┐
│   Monitoring Data    │ │   Consul Data        │ │   etcd Data          │
│                      │ │                      │ │                      │
│ prometheus_data      │ │ consul_data          │ │ etcd1_data           │
│ ├─ Metrics storage   │ │ ├─ Service registry  │ │ ├─ Cluster state     │
│ ├─ Alert rules       │ │ ├─ Health checks     │ │ ├─ Leader election   │
│ └─ Configuration     │ │ └─ Key-value store   │ │ └─ Configuration     │
│                      │ │                      │ │                      │
│ grafana_data         │ │                      │ │ etcd2_data           │
│ ├─ Dashboards        │ │                      │ │ ├─ Cluster state     │
│ ├─ Users             │ │                      │ │ ├─ Leader election   │
│ └─ Configuration     │ │                      │ │ └─ Configuration     │
└──────────────────────┘ └──────────────────────┘ └──────────────────────┘

❌ MISSING FEATURES:
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                                                                 │
│  No Backup Strategy:            No Volume Replication:         No Distributed:  │
│  ┌─────────────────────────┐    ┌─────────────────────────┐    ┌───────────────┐│
│  │ No automated backups    │    │ Single point failure    │    │ Local driver  ││
│  │ No snapshot config      │    │ No redundancy           │    │ only          ││
│  │ Manual backup only      │    │ Data loss risk          │    │ No clustering ││
│  └─────────────────────────┘    └─────────────────────────┘    └───────────────┘│
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 10. CI/CD Integration Gaps

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            CI/CD INTEGRATION GAPS                               │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                           CURRENT CI PIPELINE                                   │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│   Source Code       │    │   Unit Tests        │    │   Database Setup    │
│                     │    │                     │    │                     │
│ - Git checkout      │    │ - Jest tests        │    │ - PostgreSQL        │
│ - Node.js setup     │    │ - Coverage reports  │    │ - Schema init       │
│ - Dependencies      │    │ - Linting           │    │ - Test data         │
└─────────────────────┘    └─────────────────────┘    └─────────────────────┘
            │                       │                       │
            ▼                       ▼                       ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              ❌ MISSING STEPS                                   │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│   Docker Build      │    │   Image Scanning    │    │   Registry Push     │
│                     │    │                     │    │                     │
│ ❌ No Docker build  │    │ ❌ No Trivy scan     │    │ ❌ No registry      │
│ ❌ No layer cache   │    │ ❌ No vulnerability  │    │ ❌ No tagging       │
│ ❌ No optimization  │    │   checks            │    │ ❌ No versioning    │
└─────────────────────┘    └─────────────────────┘    └─────────────────────┘

┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│   Integration Test  │    │   Deployment        │    │   Rollback          │
│                     │    │                     │    │                     │
│ ❌ No compose test  │    │ ❌ No blue-green     │    │ ❌ No rollback      │
│ ❌ No smoke tests   │    │ ❌ No health checks  │    │   strategy          │
│ ❌ No load tests    │    │ ❌ No monitoring     │    │ ❌ No version       │
└─────────────────────┘    └─────────────────────┘    └─────────────────────┘
```

---

This comprehensive diagram set provides a visual representation of the Docker architecture, highlighting both the sophisticated features and the areas that need improvement in the Secure Gate Access Control System.
