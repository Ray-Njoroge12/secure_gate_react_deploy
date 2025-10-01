# Redis Disaster Recovery Playbook
**Secure Gate Access Control System**  
**Document Version:** 1.0  
**Last Updated:** December 19, 2024  
**Classification:** Confidential  

---

## 🎯 **PLAYBOOK OVERVIEW**

This playbook provides step-by-step procedures for recovering Redis services during disaster scenarios. It covers Sentinel failover, manual recovery, and data restoration procedures.

**RTO Target:** 30 minutes  
**RPO Target:** 15 minutes  
**Recovery Method:** Sentinel failover to replica  
**Validation:** Monthly DR drills  

---

## 📋 **PRE-RECOVERY CHECKLIST**

### **Immediate Actions (0-5 minutes)**
- [ ] Confirm incident and assess impact
- [ ] Notify DRP team and stakeholders
- [ ] Document incident details and timeline
- [ ] Check Redis cluster status
- [ ] Verify Sentinel status

### **Assessment Phase (5-10 minutes)**
- [ ] Determine root cause of failure
- [ ] Assess data integrity
- [ ] Check replication status
- [ ] Verify backup availability
- [ ] Confirm recovery strategy

---

## 🔄 **SENTINEL FAILOVER PROCEDURE**

### **Step 1: Verify Sentinel Status**
```bash
# Check Sentinel status
redis-cli -h redis-sentinel1 -p 26379 sentinel masters
redis-cli -h redis-sentinel2 -p 26379 sentinel masters
redis-cli -h redis-sentinel3 -p 26379 sentinel masters

# Check master status
redis-cli -h redis-sentinel1 -p 26379 sentinel master mymaster
```

### **Step 2: Monitor Automatic Failover**
```bash
# Monitor Sentinel logs for failover
docker logs -f secure-gate-redis-sentinel1
docker logs -f secure-gate-redis-sentinel2
docker logs -f secure-gate-redis-sentinel3

# Check master changes
redis-cli -h redis-sentinel1 -p 26379 sentinel masters
```

### **Step 3: Verify Failover Success**
```bash
# Check new master status
redis-cli -h redis-sentinel1 -p 26379 sentinel master mymaster

# Test Redis connectivity
redis-cli -h redis-replica1 -p 6379 -a SecureGate2024!RedisPassword ping
```

### **Step 4: Update Application Configuration**
```bash
# Update HAProxy configuration to point to new master
# Update application Redis connection strings
# Verify application connectivity
```

---

## 🔧 **MANUAL RECOVERY PROCEDURE**

### **Scenario 1: Master Node Failure**

#### **Step 1: Assess Master Node**
```bash
# Check if master node is completely down
ping redis-master
telnet redis-master 6379

# Check Redis process
docker exec secure-gate-redis-master redis-cli ping
```

#### **Step 2: Promote Replica to Master**
```bash
# Connect to replica and promote to master
redis-cli -h redis-replica1 -p 6379 -a SecureGate2024!RedisPassword
> SLAVEOF NO ONE

# Verify new master status
redis-cli -h redis-replica1 -p 6379 -a SecureGate2024!RedisPassword info replication
```

#### **Step 3: Update Sentinel Configuration**
```bash
# Update Sentinel to recognize new master
redis-cli -h redis-sentinel1 -p 26379 sentinel failover mymaster
redis-cli -h redis-sentinel2 -p 26379 sentinel failover mymaster
redis-cli -h redis-sentinel3 -p 26379 sentinel failover mymaster
```

### **Scenario 2: Data Corruption**

#### **Step 1: Stop Redis Services**
```bash
# Stop Redis services
docker stop secure-gate-redis-master secure-gate-redis-replica1 secure-gate-redis-replica2

# Stop Sentinel services
docker stop secure-gate-redis-sentinel1 secure-gate-redis-sentinel2 secure-gate-redis-sentinel3
```

#### **Step 2: Restore from Backup**
```bash
# Identify latest clean backup
ls -la /backups/redis/

# Restore from backup
cp /backups/redis/redis-latest.rdb /var/lib/redis/dump.rdb
```

#### **Step 3: Restart Services**
```bash
# Start Redis services
docker start secure-gate-redis-master
docker start secure-gate-redis-replica1
docker start secure-gate-redis-replica2

# Start Sentinel services
docker start secure-gate-redis-sentinel1
docker start secure-gate-redis-sentinel2
docker start secure-gate-redis-sentinel3
```

### **Scenario 3: Complete Cluster Failure**

#### **Step 1: Restore from Backup**
```bash
# Create Redis data directory
mkdir -p /var/lib/redis

# Restore from backup
cp /backups/redis/redis-latest.rdb /var/lib/redis/dump.rdb
```

#### **Step 2: Rebuild Cluster**
```bash
# Start master
docker start secure-gate-redis-master

# Wait for master to stabilize
sleep 10

# Start replicas
docker start secure-gate-redis-replica1
docker start secure-gate-redis-replica2

# Start Sentinels
docker start secure-gate-redis-sentinel1
docker start secure-gate-redis-sentinel2
docker start secure-gate-redis-sentinel3
```

#### **Step 3: Verify Cluster Health**
```bash
# Check master status
redis-cli -h redis-master -p 6379 -a SecureGate2024!RedisPassword info replication

# Check replica status
redis-cli -h redis-replica1 -p 6379 -a SecureGate2024!RedisPassword info replication
redis-cli -h redis-replica2 -p 6379 -a SecureGate2024!RedisPassword info replication

# Check Sentinel status
redis-cli -h redis-sentinel1 -p 26379 sentinel masters
```

---

## 🔍 **DATA RESTORATION PROCEDURE**

### **Step 1: Identify Recovery Point**
```bash
# Check available backups
ls -la /backups/redis/

# Check backup metadata
cat /backups/redis/redis-latest-manifest.json | jq '.timestamp'
cat /backups/redis/redis-latest-manifest.json | jq '.services.redis'
```

### **Step 2: Restore Redis Data**
```bash
# Stop Redis services
docker stop secure-gate-redis-master secure-gate-redis-replica1 secure-gate-redis-replica2

# Remove corrupted data
rm -rf /var/lib/redis/*

# Restore from backup
cp /backups/redis/redis-latest.rdb /var/lib/redis/dump.rdb

# Set proper permissions
chown -R redis:redis /var/lib/redis
chmod 640 /var/lib/redis/dump.rdb
```

### **Step 3: Verify Restoration**
```bash
# Start Redis master
docker start secure-gate-redis-master

# Test Redis connectivity
redis-cli -h redis-master -p 6379 -a SecureGate2024!RedisPassword ping

# Check data integrity
redis-cli -h redis-master -p 6379 -a SecureGate2024!RedisPassword dbsize
redis-cli -h redis-master -p 6379 -a SecureGate2024!RedisPassword keys "*"
```

---

## 📊 **POST-RECOVERY VALIDATION**

### **Step 1: Service Health Checks**
```bash
# Check Redis master status
redis-cli -h redis-master -p 6379 -a SecureGate2024!RedisPassword info replication

# Check Sentinel status
redis-cli -h redis-sentinel1 -p 26379 sentinel masters
redis-cli -h redis-sentinel1 -p 26379 sentinel master mymaster
```

### **Step 2: Application Connectivity**
```bash
# Test application Redis connection
curl -X GET http://server:3000/api/health

# Check application logs
docker logs secure-gate-server | grep -i redis
```

### **Step 3: Data Integrity Verification**
```bash
# Verify key count
redis-cli -h redis-master -p 6379 -a SecureGate2024!RedisPassword dbsize

# Check critical keys
redis-cli -h redis-master -p 6379 -a SecureGate2024!RedisPassword keys "session:*"
redis-cli -h redis-master -p 6379 -a SecureGate2024!RedisPassword keys "cache:*"
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
- [ ] Sentinel cluster status checked
- [ ] Failover procedure executed
- [ ] New master verified
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
- **Target:** 30 minutes
- **Actual:** [To be filled during recovery]
- **Compliance:** [To be calculated]

### **RPO Compliance**
- **Target:** 15 minutes
- **Actual:** [To be filled during recovery]
- **Compliance:** [To be calculated]

### **Recovery Success**
- **Service Restored:** [Yes/No]
- **Data Integrity:** [Verified/Not Verified]
- **Application Functionality:** [Working/Not Working]

---

## 📞 **ESCALATION PROCEDURES**

### **Level 1: Redis Administrator**
- **Contact:** [Redis Admin Contact]
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
**Distribution:** DRP Team, Redis Team, IT Operations
