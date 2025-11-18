# Production Deployment Security Checklist

Use this checklist when deploying High Wizardry to production.

## Pre-Deployment

### Environment Configuration

- [ ] **Node.js Version**: Using Node.js 16+ (check with `node --version`)
- [ ] **Dependencies**: All dependencies up to date (`npm audit`, `npm outdated`)
- [ ] **Environment Variables**: All secrets in environment variables (not in code)
- [ ] **Email Service**: Configure production email service (SendGrid, Mailgun)
  ```bash
  export EMAIL_ENABLED=true
  export EMAIL_SERVICE=your-service
  export EMAIL_USER=your-email@example.com
  export EMAIL_PASS=your-app-password
  export EMAIL_FROM=noreply@yourdomain.com
  export EMAIL_REQUIRE_VERIFICATION=true
  ```

### Network Security

- [ ] **HTTPS/TLS**: TLS certificate installed and configured
  - Use Let's Encrypt for free certificates
  - Ensure certificate auto-renewal is set up
- [ ] **WSS**: WebSocket connections use WSS (secure WebSocket)
- [ ] **Firewall**: Only ports 80 (HTTP) and 443 (HTTPS) open
- [ ] **SSH**: SSH access restricted to key-based authentication
- [ ] **IP Whitelisting**: Admin endpoints restricted to known IPs (if applicable)

### Reverse Proxy

- [ ] **Nginx/Apache**: Reverse proxy configured with rate limiting
- [ ] **Cloudflare**: Consider Cloudflare for DDoS protection
- [ ] **Rate Limits**: Reverse proxy rate limits match or exceed application limits
- [ ] **Request Buffering**: Limit request body size (10KB)
- [ ] **Timeout Settings**: Appropriate timeouts configured

Example Nginx configuration:
```nginx
# Rate limiting
limit_req_zone $binary_remote_addr zone=web:10m rate=100r/m;
limit_conn_zone $binary_remote_addr zone=addr:10m;

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # Security headers (in addition to app headers)
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Rate limiting
    limit_req zone=web burst=20 nodelay;
    limit_conn addr 10;

    # Request size limits
    client_body_buffer_size 10K;
    client_header_buffer_size 1k;
    client_max_body_size 10k;

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header Host $host;
    }
}
```

## Application Security

### Authentication & Authorization

- [ ] **Password Policy**: Minimum 6 characters enforced (consider increasing to 8-12)
- [ ] **Bcrypt Salt Rounds**: Using 10+ salt rounds (check AuthManager.js)
- [ ] **Token Expiry**: Session tokens expire after 7 days
- [ ] **Email Verification**: Required for new accounts
- [ ] **Ban/Mute System**: Admin endpoints secured

### Input Validation

- [ ] **All Inputs Validated**: InputValidator used for all user inputs
- [ ] **Payload Limits**: 10KB limit enforced on all requests
- [ ] **Rate Limiting**: Verified for all endpoints
  - HTTP: 100 req/min per IP
  - Auth: 5 attempts/min
  - Chat: 10 messages/10 sec
  - Actions: 20 actions/10 sec
  - WebSocket: 5 connections/IP/min

### Headers & CSP

- [ ] **CSP Headers**: Content Security Policy enabled
- [ ] **Security Headers**: X-Frame-Options, X-Content-Type-Options set
- [ ] **HSTS**: Strict-Transport-Security header configured (if using HTTPS)
- [ ] **Referrer Policy**: Set to `strict-origin-when-cross-origin`

### Data Protection

- [ ] **User Data**: User database backed up regularly
- [ ] **Backup Encryption**: Backups encrypted at rest
- [ ] **Backup Testing**: Restore procedure tested
- [ ] **Data Retention**: Policy defined for user data deletion
- [ ] **GDPR Compliance**: Privacy policy and data handling procedures in place

## Monitoring & Logging

### Application Monitoring

- [ ] **Error Tracking**: Error monitoring service configured (Sentry, Rollbar)
- [ ] **Uptime Monitoring**: Service health checks (UptimeRobot, Pingdom)
- [ ] **Performance Monitoring**: APM tool configured (New Relic, DataDog)
- [ ] **Log Aggregation**: Centralized logging (ELK Stack, Papertrail)

### Security Monitoring

- [ ] **Failed Login Alerts**: Alert on repeated failed login attempts
- [ ] **Rate Limit Alerts**: Alert when rate limits frequently hit
- [ ] **Security Log Review**: Regular review of security events
- [ ] **Intrusion Detection**: fail2ban or similar configured
- [ ] **File Integrity**: Monitoring for unauthorized file changes

### Logging Configuration

Log these security events:
- Failed authentication attempts
- Rate limit violations
- Banned user login attempts
- Suspicious patterns (rapid connections, large payloads)
- WebSocket disconnections with errors
- Server errors and exceptions

Example logging:
```javascript
// Log security events
logger.security('Failed login attempt', {
  username: sanitizedUsername,
  ip: req.ip,
  timestamp: new Date()
});
```

## Testing

### Security Testing

- [ ] **Security Tests**: All tests passing (`npm test`)
- [ ] **XSS Testing**: Manual testing with XSS payloads
- [ ] **CSRF Testing**: Verify CSRF tokens required
- [ ] **Rate Limit Testing**: Verify rate limits work
- [ ] **Penetration Testing**: Consider third-party security audit

### Load Testing

- [ ] **Concurrent Users**: Test with expected user load
- [ ] **WebSocket Connections**: Test connection limits
- [ ] **Rate Limiter**: Verify performance under load
- [ ] **Memory Leaks**: Monitor memory usage over time

## Incident Response

### Preparation

- [ ] **Incident Response Plan**: Documented procedure for security incidents
- [ ] **Contact List**: Security team contacts documented
- [ ] **Rollback Plan**: Procedure to rollback to previous version
- [ ] **Communication Plan**: User notification procedure for breaches

### Monitoring Alerts

Set up alerts for:
- High CPU or memory usage
- Unusual traffic patterns
- High rate of authentication failures
- Database connection errors
- Application errors or crashes

## Post-Deployment

### Initial Verification

- [ ] **Health Check**: `/api/health` endpoint responding
- [ ] **HTTPS**: Certificate valid and HTTPS working
- [ ] **WebSocket**: WSS connections working
- [ ] **Authentication**: User registration and login working
- [ ] **Rate Limiting**: Rate limits functioning
- [ ] **Email**: Verification emails sending

### Security Verification

- [ ] **Headers**: Verify security headers present
  ```bash
  curl -I https://yourdomain.com
  ```
- [ ] **CSP**: Content Security Policy active
- [ ] **SSL/TLS**: A+ rating on SSL Labs test
  ```
  https://www.ssllabs.com/ssltest/
  ```
- [ ] **Security Scan**: Run vulnerability scanner
  ```bash
  npm audit
  ```

### Regular Maintenance

Schedule these tasks:

#### Daily
- Review security logs
- Check error rates
- Monitor failed login attempts

#### Weekly
- Review rate limiter metrics
- Check backup completion
- Update dependencies if needed

#### Monthly
- Full security review
- Penetration testing (if applicable)
- Update SSL certificates (if not auto-renewed)
- Review and update firewall rules

#### Quarterly
- Third-party security audit
- Review and update security policies
- Test disaster recovery procedures
- Update security documentation

## Compliance

### OWASP Top 10

Verify protection against:
- [ ] A01 Broken Access Control
- [ ] A02 Cryptographic Failures
- [ ] A03 Injection
- [ ] A04 Insecure Design
- [ ] A05 Security Misconfiguration
- [ ] A06 Vulnerable Components
- [ ] A07 Authentication Failures
- [ ] A08 Software and Data Integrity
- [ ] A09 Logging and Monitoring Failures
- [ ] A10 Server-Side Request Forgery

### Privacy Regulations

If applicable to your deployment:
- [ ] **GDPR**: EU data protection compliance
- [ ] **CCPA**: California privacy compliance
- [ ] **COPPA**: Children's privacy (if applicable)

## Emergency Procedures

### Security Breach

If a breach is detected:

1. **Isolate**: Immediately isolate affected systems
2. **Assess**: Determine scope and impact
3. **Contain**: Stop the breach from spreading
4. **Eradicate**: Remove threat from systems
5. **Recover**: Restore from clean backups
6. **Document**: Record all actions taken
7. **Notify**: Inform affected users (if required by law)
8. **Review**: Conduct post-mortem and update procedures

### DDoS Attack

If under DDoS attack:

1. Enable "Under Attack Mode" in Cloudflare
2. Review and tighten rate limits
3. Block offending IPs at firewall level
4. Contact hosting provider if needed
5. Monitor for application-layer attacks
6. Document attack patterns for future prevention

## Resources

- [SECURITY.md](../SECURITY.md) - Complete security documentation
- [SECURITY_QUICK_REFERENCE.md](./SECURITY_QUICK_REFERENCE.md) - Developer guide
- [OWASP Top 10](https://owasp.org/Top10/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)

## Support

For security questions or to report vulnerabilities:
- Email: [SECURITY CONTACT EMAIL]
- See: [SECURITY.md](../SECURITY.md) - Reporting a Vulnerability

---

**Last Updated**: 2025-11-18

**Review Schedule**: Quarterly

**Next Review**: 2025-02-18
