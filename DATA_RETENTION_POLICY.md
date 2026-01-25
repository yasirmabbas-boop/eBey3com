# DATA RETENTION AND DELETION POLICY

**Ebey3 LLC**  
**Website:** ebey3.com  
**Effective Date:** January 25, 2026  
**Last Updated:** January 25, 2026

---

## 1. POLICY OVERVIEW

This Data Retention and Deletion Policy ("Policy") outlines how Ebey3 LLC ("Ebey3," "we," "us," or "our") collects, retains, and deletes user data in connection with our marketplace platform located at ebey3.com (the "Service"). This Policy applies to all users of the Service, including buyers, sellers, and visitors.

Ebey3 operates as an Iraqi marketplace platform providing social commerce services. We utilize Meta Platform Data (Facebook Login) to authenticate users and facilitate secure access to our marketplace services.

This Policy is designed to ensure compliance with applicable data protection laws and regulations, including but not limited to the General Data Protection Regulation (GDPR), California Consumer Privacy Act (CCPA), and Iraqi data protection requirements, as well as Meta Platform Policies.

---

## 2. RETENTION PURPOSE

Ebey3 collects and retains user data **solely for the purpose of providing and improving our marketplace services**. Specifically, data is retained to:

- Enable user authentication and account management
- Facilitate auction creation, management, and participation
- Enable communication between buyers and sellers
- Process and record transactions and payment information
- Maintain transaction history for dispute resolution and customer support
- Comply with legal, regulatory, and financial obligations
- Prevent fraud, abuse, and security threats
- Improve and optimize our platform services

We do not retain user data for any purpose beyond what is necessary to provide the Service and fulfill our legal obligations.

---

## 3. RETENTION PERIODS

Ebey3 maintains different retention periods for various categories of data based on the necessity of the data for service provision and legal compliance requirements.

### 3.1 Personal Identity Data

Personal identity data includes, but is not limited to:
- Name and profile information
- Email address and phone number
- Facebook User ID and associated Meta Platform Data
- Profile photographs and biographical information
- Account preferences and settings

**Retention Period:** Personal identity data is retained **for as long as the user's account remains active** and in good standing.

### 3.2 Inactive Accounts

An account is considered "inactive" when:
- No login activity has occurred for a continuous period of 24 months (2 years)
- No active auctions (as buyer or seller) exist on the account
- No pending transactions or unresolved disputes are associated with the account

**Retention Period and Deletion:** Accounts that have been inactive for **2 years or more** will be automatically flagged for deletion. Users will receive notification via email 30 days prior to the scheduled deletion. If no action is taken within this 30-day notice period, the account and all associated personal identity data will be permanently deleted.

### 3.3 Transaction Logs and Financial Records

Transaction logs and financial records include:
- Purchase and sale records
- Payment transaction details
- Invoices and receipts
- Auction bid history
- Wallet transactions and balances
- Refund and dispute records
- Financial reconciliation data

**Retention Period:** Transaction logs and financial records are retained for a minimum of **7 years** from the date of the transaction to comply with financial recordkeeping obligations under Iraqi law and United States Internal Revenue Service (IRS) regulations.

**Note:** Even if a user account is deleted, anonymized or de-identified transaction records may be retained for the full 7-year period to satisfy legal and regulatory requirements. Such retained records will not contain personally identifiable information beyond what is legally required.

### 3.4 Communication Records

Communication records between buyers and sellers, including messages exchanged through the platform, are retained:

**Retention Period:** **90 days** from the date of the last communication in a conversation thread, unless the communication relates to an active transaction or dispute, in which case it will be retained according to the transaction log retention schedule (7 years).

### 3.5 System Logs and Technical Data

System logs, IP addresses, device information, and technical usage data are retained for security, debugging, and service improvement purposes.

**Retention Period:** **12 months** from the date of collection, unless required for an ongoing security investigation or legal matter.

---

## 4. DELETION PROCESS

Ebey3 provides multiple mechanisms for users to request deletion of their personal data and account information.

### 4.1 User-Initiated Deletion

Users may request deletion of their account and associated personal data through the following methods:

#### 4.1.1 In-App Deletion Request
- Users can initiate a deletion request directly from their account dashboard
- Navigate to: **Account Settings → Privacy & Security → Delete My Account**
- Follow the on-screen prompts to confirm the deletion request

#### 4.1.2 Email Deletion Request
- Users can send a deletion request via email to: **support@ebey3.com**
- The email must include:
  - Full name associated with the account
  - Email address or phone number used for registration
  - Facebook User ID (if available)
  - Statement: "I request deletion of my Ebey3 account and all associated personal data"

### 4.2 Verification and Processing

Upon receipt of a deletion request, Ebey3 will:

1. **Verify the identity** of the requesting user through one or more of the following methods:
   - Email verification link
   - SMS verification code
   - Security questions
   - Matching Facebook authentication

2. **Review for pending obligations:**
   - Active auctions or ongoing transactions will be completed or canceled
   - Outstanding financial obligations must be resolved
   - Active disputes will be addressed according to our dispute resolution policy

3. **Notify the user** of the verification result and expected deletion timeline

### 4.3 Technical Execution of Deletion

Once a deletion request is verified and approved, Ebey3 will execute the following technical deletion process:

#### 4.3.1 Timeline
- **Hard deletion** of all personal data from the production database will occur within **30 days** of request verification

#### 4.3.2 Scope of Deletion
Data deletion includes:
- All personal identity information (name, email, phone number, profile data)
- Facebook User ID and associated Meta Platform Data
- Account credentials and authentication tokens
- Profile photographs and uploaded media (excluding media required for transaction records)
- Communication history (subject to transaction log requirements)
- User preferences and settings

#### 4.3.3 Database and Backup Deletion
- **Production Database:** Personal data is immediately hard-deleted from the primary PostgreSQL database
- **Database Backups:** All backup systems will purge the deleted user's personal data within 30 days
- **Replication Systems:** Data will be removed from all replicated and cached systems
- **Third-Party Services:** Deletion requests will be forwarded to applicable third-party service providers (e.g., cloud storage, CDN providers)

#### 4.3.4 Exceptions to Deletion
The following data may be retained beyond the 30-day deletion period:
- **Transaction logs** required for financial/legal compliance (retained for 7 years, but anonymized to remove personally identifiable information)
- **Data required for legal proceedings** or regulatory investigations
- **Aggregated and anonymized data** used for statistical analysis and service improvement (no personally identifiable information retained)

### 4.4 Confirmation of Deletion

Upon completion of the deletion process, users will receive a confirmation email to the address on file (if still accessible) or through alternative contact methods confirming that their data has been permanently deleted.

---

## 5. META PLATFORM DATA POLICIES

As Ebey3 utilizes Facebook Login for user authentication, we are subject to Meta Platform Policies regarding the collection, use, and deletion of Platform Data.

### 5.1 Data Deletion Callback

Ebey3 implements Meta's **Data Deletion Callback URL** as required by Meta Platform Policies. This ensures that when a user removes the Ebey3 app from their Facebook account settings, we are automatically notified and initiate the data deletion process.

### 5.2 User Removal of App from Facebook

**If a user removes the Ebey3 app from their Facebook account settings**, the following process will occur:

1. **Automatic Notification:** Meta will send a deletion request callback to Ebey3's registered endpoint
2. **Deletion Initiation:** Ebey3 will immediately initiate the data deletion process for the user's account and all associated Meta Platform Data
3. **Compliance Timeline:** All Meta Platform Data (including Facebook User ID, profile information obtained from Facebook, and authentication tokens) will be permanently deleted from our systems within **30 days** of receiving the deletion callback from Meta
4. **Deletion Scope:** The deletion will include:
   - Facebook User ID
   - Profile information obtained through Facebook Graph API (name, email, profile picture)
   - Facebook authentication tokens and refresh tokens
   - Any other data obtained from Meta Platform services

### 5.3 Meta Data Retention Compliance

Ebey3 will not retain Meta Platform Data beyond the periods specified in this Policy or as required by Meta Platform Policies, whichever is more restrictive. Meta Platform Data is used exclusively for authentication and user profile management and is subject to the same retention and deletion procedures as outlined in Section 3 and Section 4 of this Policy.

### 5.4 User Rights Regarding Meta Data

Users have the right to:
- Access their Meta Platform Data that Ebey3 has collected
- Request correction of inaccurate Meta Platform Data
- Request deletion of their Meta Platform Data at any time through the methods described in Section 4
- Revoke Ebey3's access to their Facebook account by removing the app from Facebook settings

---

## 6. USER RIGHTS AND CONTROL

In accordance with applicable data protection laws, Ebey3 users have the following rights regarding their personal data:

### 6.1 Right to Access
Users may request a copy of all personal data Ebey3 holds about them by contacting support@ebey3.com.

### 6.2 Right to Rectification
Users may request correction of inaccurate or incomplete personal data through their account settings or by contacting support@ebey3.com.

### 6.3 Right to Deletion
As described in Section 4, users may request deletion of their personal data at any time, subject to legal retention obligations.

### 6.4 Right to Data Portability
Users may request their personal data in a structured, commonly used, and machine-readable format by contacting support@ebey3.com.

### 6.5 Right to Object
Users may object to certain processing of their personal data, including for marketing purposes, by updating their account preferences or contacting support@ebey3.com.

---

## 7. LEGAL AND REGULATORY COMPLIANCE

### 7.1 Iraqi Law Compliance
This Policy is designed to comply with applicable Iraqi data protection and privacy regulations, including financial recordkeeping requirements.

### 7.2 US Law Compliance
As Ebey3's infrastructure is hosted in the United States (Google Cloud Platform, US-Central region via Replit), this Policy complies with applicable US federal and state privacy laws, including CCPA.

### 7.3 GDPR Compliance
For users located in the European Economic Area (EEA), this Policy complies with the General Data Protection Regulation (GDPR).

### 7.4 Meta Platform Policies
This Policy complies with Meta Platform Terms and Developer Policies, including data deletion requirements.

---

## 8. DATA SECURITY

All user data retained by Ebey3 is protected using industry-standard security measures:

- **Encryption in Transit:** All data transmissions use SSL/TLS encryption
- **Encryption at Rest:** Database storage utilizes AES-256 encryption
- **Access Controls:** Restricted access to data limited to authorized personnel only
- **Regular Security Audits:** Periodic reviews of security practices and infrastructure

For detailed information about our security infrastructure, please refer to our Security Configuration documentation.

---

## 9. POLICY UPDATES

Ebey3 reserves the right to update this Data Retention and Deletion Policy at any time to reflect changes in our practices, legal requirements, or Meta Platform Policies. Users will be notified of material changes via email and/or prominent notice on the Service at least 30 days prior to the effective date of any changes.

The "Last Updated" date at the top of this Policy indicates when the most recent revisions were made.

---

## 10. CONTACT INFORMATION

For questions, concerns, or requests related to this Data Retention and Deletion Policy, please contact us:

**Ebey3 LLC**  
**Email:** support@ebey3.com  
**Website:** https://ebey3.com

For data deletion requests specifically, please use the methods outlined in Section 4 of this Policy.

---

## 11. ACKNOWLEDGMENT

By using the Ebey3 Service, you acknowledge that you have read, understood, and agree to be bound by this Data Retention and Deletion Policy.

---

**END OF POLICY**

---

**Document Version:** 1.0  
**Document Owner:** Ebey3 LLC Legal & Compliance Team  
**Next Review Date:** January 25, 2027
