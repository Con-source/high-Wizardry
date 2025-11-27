# High Wizardry Deployment Guide

This guide covers deploying High Wizardry to cloud/VPS environments with Docker, scaling strategies, and operational best practices.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Docker Deployment](#docker-deployment)
- [Cloud Provider Guides](#cloud-provider-guides)
- [SSL/TLS Configuration](#ssltls-configuration)
- [CDN and DNS Setup](#cdn-and-dns-setup)
- [Scaling and Load Testing](#scaling-and-load-testing)
- [Monitoring and Alerting](#monitoring-and-alerting)
- [Backup and Recovery](#backup-and-recovery)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

- Docker 20.10+ and Docker Compose 2.0+
- Domain name (for SSL/production deployment)
- VPS/Cloud server with:
  - 1+ GB RAM (recommended: 2+ GB)
  - 1+ vCPU (recommended: 2+ vCPU)
  - 20+ GB storage
  - Ubuntu 22.04 LTS or similar

---

## Quick Start

### Development (Local)

```bash
# Clone repository
git clone https://github.com/Con-source/high-Wizardry.git
cd high-Wizardry

# Start with Docker Compose
docker compose up -d game-server

# View logs
docker compose logs -f game-server

# Access game
open http://localhost:8080
```

### Production (With Nginx + SSL)

```bash
# Configure SSL certificates first (see SSL section)
docker compose --profile production up -d

# Verify health
curl http://localhost:8080/api/health
```

---

## Docker Deployment

### Docker Compose Services

| Service | Description | Port | Profile |
|---------|-------------|------|---------|
| `game-server` | Main Node.js game server | 8080 | default |
| `nginx` | Reverse proxy with SSL | 80, 443 | production |
| `certbot` | SSL certificate renewal | - | production |

### Environment Variables

Create a `.env` file in the project root:

```bash
# Server Configuration
NODE_ENV=production
PORT=8080

# Email Configuration (optional)
EMAIL_ENABLED=true
EMAIL_SERVICE=gmail
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=noreply@yourdomain.com
EMAIL_REQUIRE_VERIFICATION=true
```

### Volumes and Data Persistence

Docker Compose creates named volumes for data persistence:

- `game-data`: Player data, authentication records
- `game-backups`: Automated backups

```bash
# List volumes
docker volume ls | grep high-wizardry

# Backup data
docker run --rm -v high-wizardry_game-data:/data -v $(pwd)/backup:/backup alpine tar czf /backup/game-data-$(date +%Y%m%d).tar.gz -C /data .

# Restore data
docker run --rm -v high-wizardry_game-data:/data -v $(pwd)/backup:/backup alpine tar xzf /backup/game-data-YYYYMMDD.tar.gz -C /data
```

---

## Cloud Provider Guides

### DigitalOcean

**Recommended for**: Small to medium deployments, cost-effective

```bash
# 1. Create Droplet (Ubuntu 22.04, 2GB RAM)
# Via DigitalOcean Console or CLI

# 2. SSH into server
ssh root@your-droplet-ip

# 3. Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# 4. Clone and deploy
git clone https://github.com/Con-source/high-Wizardry.git
cd high-Wizardry

# 5. Configure environment
cp .env.example .env
nano .env  # Edit configuration

# 6. Deploy
docker compose up -d
```

**Scaling**: Use DigitalOcean Load Balancers with multiple Droplets.

---

### AWS (EC2 + Elastic Load Balancer)

**Recommended for**: Large scale, enterprise deployments

```bash
# 1. Launch EC2 Instance
# - AMI: Ubuntu 22.04
# - Instance Type: t3.small or larger
# - Security Group: Allow ports 22, 80, 443, 8080

# 2. SSH and install Docker
ssh -i your-key.pem ubuntu@your-ec2-ip
sudo apt update && sudo apt install -y docker.io docker-compose-plugin
sudo usermod -aG docker ubuntu

# 3. Clone and deploy
git clone https://github.com/Con-source/high-Wizardry.git
cd high-Wizardry
docker compose up -d
```

**AWS Architecture for Scale**:
```
                   ┌─────────────────┐
                   │  CloudFront CDN │
                   └────────┬────────┘
                            │
                   ┌────────▼────────┐
                   │ Application LB  │
                   └────────┬────────┘
                            │
         ┌──────────────────┼──────────────────┐
         │                  │                  │
   ┌─────▼─────┐     ┌─────▼─────┐     ┌─────▼─────┐
   │ EC2 (AZ1) │     │ EC2 (AZ2) │     │ EC2 (AZ3) │
   └───────────┘     └───────────┘     └───────────┘
```

---

### Google Cloud Platform (GCP)

**Recommended for**: Auto-scaling, Kubernetes deployments

```bash
# 1. Create Compute Engine VM
gcloud compute instances create high-wizardry \
    --machine-type=e2-small \
    --image-family=ubuntu-2204-lts \
    --image-project=ubuntu-os-cloud \
    --boot-disk-size=20GB

# 2. SSH and setup
gcloud compute ssh high-wizardry
# Follow standard Docker installation

# 3. Deploy
docker compose up -d
```

**GKE Deployment** (for larger scale):
```yaml
# kubernetes/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: high-wizardry
spec:
  replicas: 3
  selector:
    matchLabels:
      app: high-wizardry
  template:
    metadata:
      labels:
        app: high-wizardry
    spec:
      containers:
      - name: game-server
        image: gcr.io/your-project/high-wizardry:latest
        ports:
        - containerPort: 8080
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
```

---

### Microsoft Azure

**Recommended for**: Enterprise integrations, hybrid cloud

```bash
# 1. Create VM via Azure Portal or CLI
az vm create \
    --resource-group high-wizardry-rg \
    --name high-wizardry-vm \
    --image Ubuntu2204 \
    --size Standard_B2s \
    --admin-username azureuser \
    --generate-ssh-keys

# 2. Open ports
az vm open-port --resource-group high-wizardry-rg --name high-wizardry-vm --port 80,443,8080

# 3. SSH and deploy
ssh azureuser@your-azure-ip
# Follow standard deployment steps
```

---

## SSL/TLS Configuration

### Using Let's Encrypt (Recommended)

```bash
# 1. Update domain in nginx config
sed -i 's/yourdomain.com/your-actual-domain.com/g' nginx/conf.d/game.conf

# 2. Create certificate directories
mkdir -p nginx/ssl nginx/certbot-webroot

# 3. Start nginx without SSL for initial certificate
docker compose up -d nginx

# 4. Obtain certificate
docker run --rm \
    -v $(pwd)/nginx/ssl:/etc/letsencrypt \
    -v $(pwd)/nginx/certbot-webroot:/var/www/certbot \
    certbot/certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    -d your-domain.com \
    --email your-email@example.com \
    --agree-tos \
    --no-eff-email

# 5. Restart with full production profile
docker compose --profile production down
docker compose --profile production up -d
```

### SSL Best Practices

- Use TLS 1.2+ only (configured in nginx)
- Enable HSTS after confirming SSL works
- Set up automatic certificate renewal
- Use A+ SSL configuration (test at ssllabs.com)

---

## CDN and DNS Setup

### CloudFlare (Recommended)

1. **Add domain to CloudFlare**
2. **Update nameservers** at your registrar
3. **Configure DNS records**:
   ```
   A     @     your-server-ip     Proxied
   A     www   your-server-ip     Proxied
   ```
4. **Enable security features**:
   - SSL/TLS: Full (Strict)
   - Auto Minify: JavaScript, CSS, HTML
   - Brotli Compression: On
   - WebSocket: Enabled (important for game!)

### DNS Configuration

```
# Required DNS Records
A       @           YOUR_SERVER_IP      (300 TTL)
A       www         YOUR_SERVER_IP      (300 TTL)
CNAME   api         @                   (300 TTL)

# Optional: Email records
MX      @           mail.yourdomain.com (300 TTL)
TXT     @           "v=spf1 include:_spf.google.com ~all"
```

---

## Scaling and Load Testing

### Vertical Scaling (Single Server)

| Players | RAM | CPU | Instance Type (AWS) |
|---------|-----|-----|-------------------|
| 1-50 | 1GB | 1 vCPU | t3.micro |
| 50-200 | 2GB | 2 vCPU | t3.small |
| 200-500 | 4GB | 2 vCPU | t3.medium |
| 500-1000 | 8GB | 4 vCPU | t3.large |

### Horizontal Scaling (Multiple Servers)

For high availability and scale:

```yaml
# docker-compose.scale.yml
services:
  game-server:
    deploy:
      replicas: 3
      update_config:
        parallelism: 1
        delay: 10s
      restart_policy:
        condition: on-failure
```

**Note**: Horizontal scaling requires shared session storage (Redis) which is not yet implemented.

### Load Testing

Using [Artillery](https://artillery.io/):

```bash
# Install Artillery
npm install -g artillery

# Create test script
cat > load-test.yml << 'EOF'
config:
  target: "http://localhost:8080"
  phases:
    - duration: 60
      arrivalRate: 10
      name: "Warm up"
    - duration: 120
      arrivalRate: 50
      name: "Sustained load"
    - duration: 60
      arrivalRate: 100
      name: "Peak load"
scenarios:
  - name: "Health check"
    flow:
      - get:
          url: "/api/health"
  - name: "Homepage"
    flow:
      - get:
          url: "/"
EOF

# Run test
artillery run load-test.yml --output report.json
artillery report report.json
```

**Target Metrics**:
- Response time: < 100ms (p95)
- Error rate: < 0.1%
- Concurrent connections: 1000+

---

## Monitoring and Alerting

### Health Checks

```bash
# Basic health check
curl http://localhost:8080/api/health

# Expected response:
# {"status":"ok","players":5,"uptime":1234.567}
```

### Monitoring Stack (Prometheus + Grafana)

```yaml
# monitoring/docker-compose.monitoring.yml
services:
  prometheus:
    image: prom/prometheus
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - "9090:9090"

  grafana:
    image: grafana/grafana
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
```

### Key Metrics to Monitor

| Metric | Warning | Critical |
|--------|---------|----------|
| CPU Usage | > 70% | > 90% |
| Memory Usage | > 80% | > 95% |
| Disk Usage | > 80% | > 90% |
| Response Time (p95) | > 200ms | > 500ms |
| Error Rate | > 1% | > 5% |
| Active Connections | > 800 | > 950 |

### External Monitoring Services

- **UptimeRobot**: Free uptime monitoring
- **Datadog**: Full-stack monitoring
- **New Relic**: APM and error tracking
- **Sentry**: Error tracking

---

## Backup and Recovery

### Automated Backups

```bash
# Create backup script
cat > /opt/high-wizardry/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/high-wizardry/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Backup game data
docker run --rm \
    -v high-wizardry_game-data:/data:ro \
    -v $BACKUP_DIR:/backup \
    alpine tar czf /backup/game-data-$DATE.tar.gz -C /data .

# Keep only last 7 days of backups
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: game-data-$DATE.tar.gz"
EOF

chmod +x /opt/high-wizardry/backup.sh

# Add to crontab (daily at 2 AM)
echo "0 2 * * * /opt/high-wizardry/backup.sh >> /var/log/backup.log 2>&1" | crontab -
```

### Recovery Procedure

```bash
# 1. Stop the server
docker compose down

# 2. Restore data
docker run --rm \
    -v high-wizardry_game-data:/data \
    -v /opt/high-wizardry/backups:/backup \
    alpine sh -c "rm -rf /data/* && tar xzf /backup/game-data-YYYYMMDD.tar.gz -C /data"

# 3. Restart server
docker compose up -d

# 4. Verify
curl http://localhost:8080/api/health
```

---

## Troubleshooting

### Common Issues

#### Container won't start

```bash
# Check logs
docker compose logs game-server

# Common fixes:
# - Check .env file exists and is valid
# - Ensure port 8080 is not in use
# - Verify Docker has enough resources
```

#### WebSocket connection fails

```bash
# Check nginx WebSocket configuration
docker compose logs nginx

# Verify upgrade headers in nginx config
grep -r "Upgrade" nginx/conf.d/
```

#### SSL certificate errors

```bash
# Check certificate validity
docker compose exec nginx nginx -t

# Renew certificate
docker run --rm \
    -v $(pwd)/nginx/ssl:/etc/letsencrypt \
    certbot/certbot renew
```

#### High memory usage

```bash
# Check container stats
docker stats

# Restart with memory limits
docker compose down
docker compose up -d --scale game-server=1 --force-recreate
```

### Log Locations

| Service | Log Location |
|---------|-------------|
| Game Server | `docker compose logs game-server` |
| Nginx | `./nginx/logs/` or `docker compose logs nginx` |
| System | `/var/log/syslog` |

### Getting Help

- **GitHub Issues**: Report bugs and request features
- **Documentation**: Check `docs/` directory
- **API Reference**: See `docs/API.md`

---

## Security Checklist

Before going live, complete the [Deployment Security Checklist](./DEPLOYMENT_SECURITY_CHECKLIST.md).

Key items:
- [ ] SSL/TLS configured with A+ rating
- [ ] Firewall configured (only 80, 443 open)
- [ ] Environment variables secured (not in code)
- [ ] Backups configured and tested
- [ ] Monitoring and alerting active
- [ ] Rate limiting verified
- [ ] Admin endpoints secured
