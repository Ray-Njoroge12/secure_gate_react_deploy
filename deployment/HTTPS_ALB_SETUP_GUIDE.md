# 🔐 HTTPS & ALB Configuration Guide

**Priority**: 🔴 CRITICAL - Blocking Production Deployment  
**Estimated Time**: 2-4 hours  
**Risk**: HTTP traffic exposes all credentials & PII

---

## Current Status

- ❌ **ALB is HTTP only**: `http://secure-gate-alb-148297441.af-south-1.elb.amazonaws.com`
- ❌ **No SSL/TLS certificate configured**
- ❌ **Violates Kenya DPA Article 44** (Security of Processing)
- ❌ **Frontend will not send secure cookies**

---

## Prerequisites

- [ ] AWS Console access with ALB/EC2 permissions
- [ ] Domain name for API (e.g., `api.securegate.com`)
- [ ] Access to domain DNS settings (Route 53 or external)
- [ ] AWS CLI configured

---

## Step 1: Request/Import SSL Certificate

### Option A: AWS Certificate Manager (ACM) - Recommended

```bash
# Request new certificate
aws acm request-certificate \
  --domain-name api.securegate.com \
  --validation-method DNS \
  --region af-south-1 \
  --subject-alternative-names "*.securegate.com" \
  --tags Key=Project,Value=SecureGate

# Get certificate ARN (save this)
aws acm list-certificates --region af-south-1
```

### Option B: Import Existing Certificate

```bash
aws acm import-certificate \
  --certificate fileb://cert.pem \
  --private-key fileb://privkey.pem \
  --certificate-chain fileb://chain.pem \
  --region af-south-1
```

### Validate DNS (if using ACM)

1. AWS will provide CNAME records
2. Add to your DNS (Route 53 or external provider)
3. Wait for validation (5-30 minutes)

```bash
# Check validation status
aws acm describe-certificate \
  --certificate-arn <ARN> \
  --region af-south-1
```

---

## Step 2: Configure ALB HTTPS Listener

### AWS Console Method

1. Go to **EC2 → Load Balancers**
2. Select your ALB: `secure-gate-alb-148297441`
3. Click **Listeners** tab
4. Click **Add listener**:
   - **Protocol**: HTTPS
   - **Port**: 443
   - **Default SSL certificate**: Select your ACM certificate
   - **Default actions**: Forward to → your target group
5. Click **Save**

### Add HTTP→HTTPS Redirect

1. Edit the **HTTP:80** listener
2. Change **Default actions**:
   - Type: **Redirect**
   - Protocol: **HTTPS**
   - Port: **443**
   - Status code: **301 - Permanently moved**
3. Save

### AWS CLI Method

```bash
# Add HTTPS listener
aws elbv2 create-listener \
  --load-balancer-arn <ALB-ARN> \
  --protocol HTTPS \
  --port 443 \
  --certificates CertificateArn=<CERT-ARN> \
  --default-actions Type=forward,TargetGroupArn=<TG-ARN> \
  --region af-south-1

# Modify HTTP listener to redirect
aws elbv2 modify-listener \
  --listener-arn <HTTP-LISTENER-ARN> \
  --default-actions Type=redirect,RedirectConfig="{Protocol=HTTPS,Port=443,StatusCode=HTTP_301}" \
  --region af-south-1
```

---

## Step 3: Configure Security Group

Ensure ALB security group allows HTTPS:

```bash
# Add HTTPS rule
aws ec2 authorize-security-group-ingress \
  --group-id <ALB-SG-ID> \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0 \
  --region af-south-1
```

---

## Step 4: Update DNS

Point your domain to the ALB:

### Route 53

```bash
aws route53 change-resource-record-sets \
  --hosted-zone-id <ZONE-ID> \
  --change-batch '{
    "Changes": [{
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "api.securegate.com",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "<ALB-HOSTED-ZONE-ID>",
          "DNSName": "<ALB-DNS-NAME>",
          "EvaluateTargetHealth": true
        }
      }
    }]
  }'
```

### External DNS Provider

Create an **A record** or **CNAME**:
- **Name**: `api.securegate.com`
- **Type**: CNAME
- **Value**: `secure-gate-alb-148297441.af-south-1.elb.amazonaws.com`

---

## Step 5: Update Application Configuration

### Backend (.env.production)

```env
# No changes needed - ENFORCE_HTTPS=true is already set
ENFORCE_HTTPS=true
SECURE_COOKIES=true
TRUST_PROXY=true
```

### Frontend (client/.env.production)

```env
# Update to HTTPS domain
REACT_APP_API_URL=https://api.securegate.com
REACT_APP_ENVIRONMENT=production
```

---

## Step 6: Verify HTTPS Configuration

```bash
# Test HTTPS endpoint
curl -I https://api.securegate.com/health

# Should return:
# HTTP/2 200
# strict-transport-security: max-age=31536000
# set-cookie: ...; Secure; HttpOnly; SameSite=Strict

# Test HTTP redirect
curl -I http://api.securegate.com/health

# Should return:
# HTTP/1.1 301 Moved Permanently
# location: https://api.securegate.com/health
```

### Browser Test

1. Open `https://api.securegate.com/health`
2. Check certificate (should show valid, trusted)
3. Check browser console for no mixed content warnings

---

## Step 7: Update CORS Origins

Ensure frontend origin is whitelisted:

```env
# In .env.production
CLIENT_ORIGIN=https://secure-gate.netlify.app
ADDITIONAL_ORIGINS=https://www.securegate.com
```

---

## Rollback Plan

If issues occur:

1. **Keep HTTP listener active** during transition
2. **Test staging first** with staging ALB
3. **Monitor error rates** for 24 hours
4. **Rollback**: Remove HTTPS listener, restore HTTP

```bash
# Remove HTTPS listener
aws elbv2 delete-listener \
  --listener-arn <HTTPS-LISTENER-ARN> \
  --region af-south-1
```

---

## Post-Deployment Checklist

- [ ] HTTPS endpoint returns 200 OK
- [ ] HTTP redirects to HTTPS (301)
- [ ] SSL certificate is valid and trusted
- [ ] HSTS header present
- [ ] Cookies have `Secure` flag
- [ ] No mixed content warnings
- [ ] Login/logout works from frontend
- [ ] All API calls succeed over HTTPS

---

## Troubleshooting

### Issue: Certificate validation pending

**Solution**: Check DNS records match ACM requirements exactly

```bash
aws acm describe-certificate --certificate-arn <ARN> --region af-south-1
```

### Issue: 502 Bad Gateway

**Solution**: Check target group health

```bash
aws elbv2 describe-target-health \
  --target-group-arn <TG-ARN> \
  --region af-south-1
```

### Issue: Cookies not being sent

**Solution**: Verify `TRUST_PROXY=true` and `SECURE_COOKIES=true`

```bash
# Check backend logs for:
# ✓ TRUST_PROXY enabled
# ✓ SECURE_COOKIES enabled
```

### Issue: CORS errors after HTTPS

**Solution**: Update CLIENT_ORIGIN to https:// URL

---

## Infrastructure as Code

See `HTTPS_ALB_CLOUDFORMATION.yaml` and `HTTPS_ALB_TERRAFORM.tf` for automated setup.

---

**Status After Completion**: ✅ HTTPS Enabled, Production Ready
