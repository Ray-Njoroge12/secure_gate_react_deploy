# Vault Disaster Recovery Playbook
**Secure Gate Access Control System**  
**Document Version:** 1.0  
**Last Updated:** December 19, 2024  
**Classification:** Confidential  

---

## 🎯 **PLAYBOOK OVERVIEW**

This playbook provides step-by-step procedures for recovering Vault services during disaster scenarios. It covers Raft cluster failover, manual recovery, and secrets restoration procedures.

**RTO Target:** 20 minutes  
**RPO Target:** 5 minutes  
**Recovery Method:** Raft cluster failover  
**Validation:** Monthly DR drills  

---

## 📋 **PRE-RECOVERY CHECKLIST**

### **Immediate Actions (0-5 minutes)**
- [ ] Confirm incident and assess impact
- [ ] Notify DRP team and stakeholders
- [ ] Document incident details and timeline
- [ ] Check Vault cluster status
- [ ] Verify Raft cluster health

### **Assessment Phase (5-10 minutes)**
- [ ] Determine root cause of failure
- [ ] Assess secrets integrity
- [ ] Check cluster consensus
- [ ] Verify backup availability
- [ ] Confirm recovery strategy

---

## 🔄 **RAFT CLUSTER FAILOVER PROCEDURE**

### **Step 1: Verify Vault Cluster Status**
```bash
# Check Vault cluster status
curl -s http://vault-1:8200/v1/sys/health
curl -s http://vault-2:8200/v1/sys/health
curl -s http://vault-3:8200/v1/sys/health

# Check cluster leader
curl -s http://vault-1:8200/v1/sys/leader
curl -s http://vault-2:8200/v1/sys/leader
curl -s http://vault-3:8200/v1/sys/leader
```

### **Step 2: Monitor Automatic Failover**
```bash
# Monitor Vault logs for failover
docker logs -f secure-gate-vault-1
docker logs -f secure-gate-vault-2
docker logs -f secure-gate-vault-3

# Check cluster health
curl -s http://vault-1:8200/v1/sys/health | jq '.cluster_name'
curl -s http://vault-2:8200/v1/sys/health | jq '.cluster_name'
curl -s http://vault-3:8200/v1/sys/health | jq '.cluster_name'
```

### **Step 3: Verify Failover Success**
```bash
# Check new leader status
curl -s http://vault-1:8200/v1/sys/leader | jq '.leader_address'
curl -s http://vault-2:8200/v1/sys/leader | jq '.leader_address'
curl -s http://vault-3:8200/v1/sys/leader | jq '.leader_address'

# Test Vault connectivity
vault status -address=http://vault-1:8200
```

### **Step 4: Update Application Configuration**
```bash
# Update HAProxy configuration to point to new leader
# Update application Vault connection strings
# Verify application connectivity
```

---

## 🔧 **MANUAL RECOVERY PROCEDURE**

### **Scenario 1: Leader Node Failure**

#### **Step 1: Assess Leader Node**
```bash
# Check if leader node is completely down
ping vault-1
telnet vault-1 8200

# Check Vault process
docker exec secure-gate-vault-1 vault status
```

#### **Step 2: Promote New Leader**
```bash
# Check cluster status
curl -s http://vault-2:8200/v1/sys/health
curl -s http://vault-3:8200/v1/sys/health

# Wait for automatic leader election
sleep 30

# Check new leader
curl -s http://vault-2:8200/v1/sys/leader
curl -s http://vault-3:8200/v1/sys/leader
```

#### **Step 3: Verify New Leader**
```bash
# Check new leader status
vault status -address=http://vault-2:8200
vault status -address=http://vault-3:8200

# Test Vault connectivity
vault auth -method=token -address=http://vault-2:8200
```

### **Scenario 2: Cluster Sealing**

#### **Step 1: Check Cluster Status**
```bash
# Check if cluster is sealed
curl -s http://vault-1:8200/v1/sys/health | jq '.sealed'
curl -s http://vault-2:8200/v1/sys/health | jq '.sealed'
curl -s http://vault-3:8200/v1/sys/health | jq '.sealed'
```

#### **Step 2: Unseal Cluster**
```bash
# Unseal Vault cluster
vault operator unseal -address=http://vault-1:8200
vault operator unseal -address=http://vault-2:8200
vault operator unseal -address=http://vault-3:8200

# Check unseal status
vault status -address=http://vault-1:8200
```

#### **Step 3: Verify Cluster Health**
```bash
# Check cluster health
curl -s http://vault-1:8200/v1/sys/health | jq '.initialized'
curl -s http://vault-1:8200/v1/sys/health | jq '.sealed'
curl -s http://vault-1:8200/v1/sys/health | jq '.standby'
```

### **Scenario 3: Complete Cluster Failure**

#### **Step 1: Restore from Backup**
```bash
# Identify latest clean backup
ls -la /backups/vault/

# Restore from backup
cp -r /backups/vault/vault-latest/* /var/lib/vault/
```

#### **Step 2: Rebuild Cluster**
```bash
# Start Vault nodes
docker start secure-gate-vault-1
docker start secure-gate-vault-2
docker start secure-gate-vault-3

# Wait for cluster to stabilize
sleep 60
```

#### **Step 3: Verify Cluster Health**
```bash
# Check cluster status
curl -s http://vault-1:8200/v1/sys/health
curl -s http://vault-2:8200/v1/sys/health
curl -s http://vault-3:8200/v1/sys/health

# Check leader election
curl -s http://vault-1:8200/v1/sys/leader
```

---

## 🔍 **SECRETS RESTORATION PROCEDURE**

### **Step 1: Identify Recovery Point**
```bash
# Check available backups
ls -la /backups/vault/

# Check backup metadata
cat /backups/vault/vault-latest-manifest.json | jq '.timestamp'
cat /backups/vault/vault-latest-manifest.json | jq '.services.vault'
```

### **Step 2: Restore Vault Data**
```bash
# Stop Vault services
docker stop secure-gate-vault-1 secure-gate-vault-2 secure-gate-vault-3

# Remove corrupted data
rm -rf /var/lib/vault/*

# Restore from backup
cp -r /backups/vault/vault-latest/* /var/lib/vault/

# Set proper permissions
chown -R vault:vault /var/lib/vault
chmod -R 755 /var/lib/vault
```

### **Step 3: Verify Restoration**
```bash
# Start Vault services
docker start secure-gate-vault-1 secure-gate-vault-2 secure-gate-vault-3

# Wait for cluster to stabilize
sleep 60

# Test Vault connectivity
vault status -address=http://vault-1:8200

# Check secrets
vault kv list -address=http://vault-1:8200 secure-gate/
```

---

## 📊 **POST-RECOVERY VALIDATION**

### **Step 1: Service Health Checks**
```bash
# Check Vault cluster status
curl -s http://vault-1:8200/v1/sys/health
curl -s http://vault-1:8200/v1/sys/leader

# Test Vault connectivity
vault status -address=http://vault-1:8200
```

### **Step 2: Application Connectivity**
```bash
# Test application Vault connection
curl -X GET http://server:3000/api/health

# Check application logs
docker logs secure-gate-server | grep -i vault
```

### **Step 3: Secrets Integrity Verification**
```bash
# Verify secrets availability
vault kv list -address=http://vault-1:8200 secure-gate/

# Check critical secrets
vault kv get -address=http://vault-1:8200 secure-gate/database
vault kv get -address=http://vault-1:8200 secure-gate/jwt
vault kv get -address=http://vault-1:8200 secure-gate/api
```

---

## 🚨 **EMERGENCY PROCEDURES**

### **Critical Secrets Loss**
1. **Immediate Actions:**
   - Stop all applications
   - Isolate affected systems
   - Notify stakeholders immediately

2. **Recovery Steps:**
   - Restore from latest clean backup
   - Verify secrets integrity
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
   - Sync secrets from secondary
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
- [ ] Vault cluster status checked
- [ ] Failover procedure executed
- [ ] New leader verified
- [ ] Application connectivity tested
- [ ] Secrets integrity verified

### **Post-Recovery**
- [ ] Service health confirmed
- [ ] Application functionality tested
- [ ] Secrets integrity verified
- [ ] Stakeholders notified
- [ ] Incident documented

---

## 📊 **RECOVERY METRICS**

### **RTO Compliance**
- **Target:** 20 minutes
- **Actual:** [To be filled during recovery]
- **Compliance:** [To be calculated]

### **RPO Compliance**
- **Target:** 5 minutes
- **Actual:** [To be filled during recovery]
- **Compliance:** [To be calculated]

### **Recovery Success**
- **Service Restored:** [Yes/No]
- **Secrets Integrity:** [Verified/Not Verified]
- **Application Functionality:** [Working/Not Working]

---

## 📞 **ESCALATION PROCEDURES**

### **Level 1: Vault Administrator**
- **Contact:** [Vault Admin Contact]
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
**Distribution:** DRP Team, Vault Team, IT Operations
