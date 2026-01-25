# DATA SECURITY CONFIGURATION
# App: Ebey3
# Date: 2026-01-25

[INFRASTRUCTURE]
Hosting Provider: Replit
Underlying Cloud: Google Cloud Platform (GCP)
Region: US-Central

[DATABASE SECURITY]
Type: Managed PostgreSQL
Connection: SSL/TLS (Encrypted in Transit)
Storage: AES-256 Encryption (Encrypted at Rest)
Status: ACTIVE - Default Provider Policy

[KEY MANAGEMENT]
Credentials: Stored in Environment Variables (Secrets)
Access Control: Restricted to Admin & App Instance
