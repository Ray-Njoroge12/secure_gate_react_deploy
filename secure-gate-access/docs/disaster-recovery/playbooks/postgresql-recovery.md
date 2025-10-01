# PostgreSQL Disaster Recovery Playbook
**Secure Gate Access Control System**  
**Document Version:** 1.0  
**Last Updated:** December 19, 2024  
**Classification:** Confidential  

---

## 🎯 **PLAYBOOK OVERVIEW**

This playbook provides step-by-step procedures for recovering PostgreSQL services during disaster scenarios. It covers automated failover, manual recovery, and data restoration procedures.

**RTO Target:** 15 minutes  
**RPO Target:** 2 minutes  
**Recovery Method:** Automated failover to replica  
**Validation:** Quarterly DR drills  

---

## 📋 **PRE-RECOVERY CHECKLIST**

### **Immediate Actions (0-5 minutes)**
- [ ] Confirm incident and assess impact
- [ ] Notify DRP team and stakeholders
- [ ] Document incident details and timeline
- [ ] Check Patroni cluster status
- [ ] Verify replica availability

### **Assessment Phase (5-10 minutes)**
- [ ] Determine root cause of failure
- [ ] Assess data integrity
- [ ] Check replication lag
- [ ] Verify backup availability
- [ ] Confirm recovery strategy

---

## 🔄 **AUTOMATED FAILOVER PROCEDURE**

### **Step 1: Verify Patroni Cluster Status**
```bash
# Check Patroni cluster status
curl -s http://postgres-primary:8008/patroni | jq '.'
curl -s http://postgres-replica1:8008/patroni | jq '.'
curl -s http://postgres-replica2:8008/patroni | jq '.'

# Check etcd cluster status
etcdctl --endpoints=http://etcd1:2379,http://etcd2:2379,http://etcd3:2379 cluster-health
```

### **Step 2: Monitor Automatic Failover**
```bash
# Monitor Patroni logs for failover
docker logs -f secure-gate-postgres-primary
docker logs -f secure-gate-postgres-replica1
docker logs -f secure-gate-postgres-replica2

# Check cluster leader election
curl -s http://postgres-replica1:8008/patroni | jq '.role'
curl -s http://postgres-replica2:8008/patroni | jq '.role'
```

### **Step 3: Verify Failover Success**
```bash
# Check new primary status
curl -s http://postgres-replica1:8008/patroni | jq '.state'
curl -s http://postgres-replica1:8008/patroni | jq '.role'

# Test database connectivity
psql -h postgres-replica1 -p 5432 -U postgres -d secure_gate_db -c "SELECT 1;"
```

### **Step 4: Update Application Configuration**
```bash
# Update HAProxy configuration to point to new primary
# Update application database connection strings
# Verify application connectivity
```

---

## 🔧 **MANUAL RECOVERY PROCEDURE**

### **Scenario 1: Primary Node Failure**

#### **Step 1: Assess Primary Node**
```bash
# Check if primary node is completely down
ping postgres-primary
telnet postgres-primary 5432
telnet postgres-primary 8008

# Check Patroni status
curl -s http://postgres-primary:8008/patroni
```

#### **Step 2: Promote Replica to Primary**
```bash
# Connect to etcd and check cluster state
etcdctl --endpoints=http://etcd1:2379,http://etcd2:2379,http://etcd3:2379 get /patroni/postgres/leader

# Manually promote replica (if automatic failover fails)
curl -X POST http://postgres-replica1:8008/patroni/failover
```

#### **Step 3: Verify New Primary**
```bash
# Check new primary status
curl -s http://postgres-replica1:8008/patroni | jq '.role'
curl -s http://postgres-replica1:8008/patroni | jq '.state'

# Test database connectivity
psql -h postgres-replica1 -p 5432 -U postgres -d secure_gate_db -c "SELECT 1;"
```

### **Scenario 2: Data Corruption**

#### **Step 1: Stop Primary Node**
```bash
# Stop Patroni service
docker stop secure-gate-postgres-primary

# Stop PostgreSQL process
docker exec secure-gate-postgres-primary pg_ctl stop
```

#### **Step 2: Restore from Backup**
```bash
# Identify latest clean backup
ls -la /backups/postgres/

# Restore from backup
pg_restore -h postgres-replica1 -p 5432 -U postgres -d secure_gate_db /backups/postgres/postgres-latest.sql
```

#### **Step 3: Verify Data Integrity**
```bash
# Check database integrity
psql -h postgres-replica1 -p 5432 -U postgres -d secure_gate_db -c "SELECT pg_database_size('secure_gate_db');"

# Verify critical tables
psql -h postgres-replica1 -p 5432 -U postgres -d secure_gate_db -c "SELECT COUNT(*) FROM users;"
psql -h postgres-replica1 -p 5432 -U postgres -d secure_gate_db -c "SELECT COUNT(*) FROM visitors;"
```

### **Scenario 3: Complete Cluster Failure**

#### **Step 1: Restore from Backup**
```bash
# Create new database
createdb -h postgres-replica1 -p 5432 -U postgres secure_gate_db

# Restore from backup
pg_restore -h postgres-replica1 -p 5432 -U postgres -d secure_gate_db /backups/postgres/postgres-latest.sql
```

#### **Step 2: Rebuild Cluster**
```bash
# Start Patroni on replica1
docker start secure-gate-postgres-replica1

# Wait for cluster to stabilize
sleep 30

# Start Patroni on replica2
docker start secure-gate-postgres-replica2
```

#### **Step 3: Verify Cluster Health**
```bash
# Check cluster status
curl -s http://postgres-replica1:8008/patroni | jq '.'
curl -s http://postgres-replica2:8008/patroni | jq '.'

# Test database connectivity
psql -h postgres-replica1 -p 5432 -U postgres -d secure_gate_db -c "SELECT 1;"
```

---

## 🔍 **DATA RESTORATION PROCEDURE**

### **Step 1: Identify Recovery Point**
```bash
# Check available backups
ls -la /backups/postgres/

# Check backup metadata
cat /backups/postgres/postgres-latest-manifest.json | jq '.timestamp'
cat /backups/postgres/postgres-latest-manifest.json | jq '.services.postgres'
```

### **Step 2: Restore Database**
```bash
# Stop Patroni services
docker stop secure-gate-postgres-primary secure-gate-postgres-replica1 secure-gate-postgres-replica2

# Remove corrupted data
rm -rf /var/lib/postgresql/data/pgdata/*

# Restore from backup
pg_restore -h postgres-replica1 -p 5432 -U postgres -d secure_gate_db /backups/postgres/postgres-latest.sql
```

### **Step 3: Verify Restoration**
```bash
# Check database size
psql -h postgres-replica1 -p 5432 -U postgres -d secure_gate_db -c "SELECT pg_database_size('secure_gate_db');"

# Verify critical data
psql -h postgres-replica1 -p 5432 -U postgres -d secure_gate_db -c "SELECT COUNT(*) FROM users;"
psql -h postgres-replica1 -p 5432 -U postgres -d secure_gate_db -c "SELECT COUNT(*) FROM visitors;"
psql -h postgres-replica1 -p 5432 -U postgres -d secure_gate_db -c "SELECT COUNT(*) FROM access_logs;"
```

---

## 📊 **POST-RECOVERY VALIDATION**

### **Step 1: Service Health Checks**
```bash
# Check Patroni cluster status
curl -s http://postgres-replica1:8008/patroni | jq '.role'
curl -s http://postgres-replica1:8008/patroni | jq '.state'

# Check database connectivity
psql -h postgres-replica1 -p 5432 -U postgres -d secure_gate_db -c "SELECT 1;"
```

### **Step 2: Application Connectivity**
```bash
# Test application database connection
curl -X GET http://server:3000/api/health

# Check application logs
docker logs secure-gate-server | grep -i database
```

### **Step 3: Data Integrity Verification**
```bash
# Verify critical tables
psql -h postgres-replica1 -p 5432 -U postgres -d secure_gate_db -c "SELECT COUNT(*) FROM users;"
psql -h postgres-replica1 -p 5432 -U postgres -d secure_gate_db -c "SELECT COUNT(*) FROM visitors;"
psql -h postgres-replica1 -p 5432 -U postgres -d secure_gate_db -c "SELECT COUNT(*) FROM access_logs;"

# Check data consistency
psql -h postgres-replica1 -p 5432 -U postgres -d secure_gate_db -c "SELECT MAX(created_at) FROM access_logs;"
```

---

## 🚨 **EMERGENCY PROCEDURES**

### **Critical Data Loss**
1. **Immediate Actions:**
   - Stop all write operations
   - Isolate affected systems
   - Notify stakeholders immediately

2. **Recovery Steps:**
   - Restore from latest clean backup
   - Verify data integrity
   - Test application functionality

3. **Communication:**
   - Notify management
   - Update stakeholders
   - Document incident

### **Extended Outage**
1. **Immediate Actions:**
   - Activate secondary region
   - Redirect traffic to secondary
   - Notify stakeholders

2. **Recovery Steps:**
   - Restore primary region
   - Sync data from secondary
   - Test failback procedures

3. **Communication:**
   - Regular status updates
   - Stakeholder notifications
   - Post-incident review

---

## 📋 **RECOVERY CHECKLIST**

### **Pre-Recovery**
- [ ] Incident assessment completed
- [ ] Stakeholders notified
- [ ] Recovery strategy confirmed
- [ ] Backup availability verified
- [ ] Team assembled

### **During Recovery**
- [ ] Patroni cluster status checked
- [ ] Failover procedure executed
- [ ] New primary verified
- [ ] Application connectivity tested
- [ ] Data integrity verified

### **Post-Recovery**
- [ ] Service health confirmed
- [ ] Application functionality tested
- [ ] Data integrity verified
- [ ] Stakeholders notified
- [ ] Incident documented

---

## 📊 **RECOVERY METRICS**

### **RTO Compliance**
- **Target:** 15 minutes
- **Actual:** [To be filled during recovery]
- **Compliance:** [To be calculated]

### **RPO Compliance**
- **Target:** 2 minutes
- **Actual:** [To be filled during recovery]
- **Compliance:** [To be calculated]

### **Recovery Success**
- **Service Restored:** [Yes/No]
- **Data Integrity:** [Verified/Not Verified]
- **Application Functionality:** [Working/Not Working]

---

## 📞 **ESCALATION PROCEDURES**

### **Level 1: Database Administrator**
- **Contact:** [DBA Contact]
- **Response Time:** 5 minutes
- **Actions:** Initial assessment and recovery

### **Level 2: DRP Team Lead**
- **Contact:** [DRP Lead Contact]
- **Response Time:** 15 minutes
- **Actions:** Recovery coordination and management

### **Level 3: IT Management**
- **Contact:** [IT Management Contact]
- **Response Time:** 30 minutes
- **Actions:** Strategic decisions and stakeholder communication

---

**Document Status:** ✅ **APPROVED**  
**Next Review Date:** March 19, 2025  
**Approved By:** DRP Team Lead  
**Distribution:** DRP Team, Database Team, IT Operations
