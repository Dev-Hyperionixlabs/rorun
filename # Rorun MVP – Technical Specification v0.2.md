# Rorun MVP – Technical Specification v0.2

Rorun is a mobile-first compliance and clarity tool for Nigerian SMEs.  
This document defines the technical scope for the MVP plus recommended refinements.

---

## 1. Purpose and Objectives

Build a production-ready MVP for Rorun that:

- Determines SME tax eligibility and obligations.
- Helps SMEs record income/expenses with minimal friction.
- Generates a year-end “filing pack” for FIRS/Accountant use.
- Delivers alerts for thresholds and deadlines.
- Provides simple tax education content.

Focus: Segments A/B (micro and small SMEs).  
Non-goal: full accounting or ERP.

---

## 2. Functional Scope (MVP)

Implement the following:

1. Onboarding + eligibility checker.
2. Obligations dashboard (“tax safety” view).
3. Income and expense tracker (manual entry + upload).
4. Document upload and linking to records.
5. Basic AI-based categorisation for transactions.
6. Year-end summary pack generation (PDF + CSV).
7. Alerts and notifications (thresholds + deadlines + completeness).
8. Education module (English + Pidgin content).

Future add-ons (explicitly out of MVP): CAC registration, payroll, loan engine, accountant marketplace, QR invoicing, bank integration, full bank feeds.

---

## 3. High-Level Architecture

### 3.1 Client

- Platform: **React Native (Expo)**  
- Targets: **Android (primary)**, **iOS (secondary)**  
- Responsibilities:
  - UI rendering and navigation.
  - Local form validation and basic input sanitisation.
  - Stateless or light-state view of server data (no core business rules in client).
  - Receiving and displaying push notifications.
  - Offline-friendly caching of recent records (simple local cache; no heavy offline-first in MVP).

### 3.2 Backend API

- Stack: **Node.js + NestJS** (or equivalent opinionated framework).
- Responsibilities:
  - Authentication and session management.
  - Authorisation and RBAC.
  - Eligibility rules engine (CIT/VAT/WHT logic).
  - CRUD for:
    - Users
    - Businesses
    - Tax profiles
    - Transactions
    - Documents
    - Obligations
    - Alerts
    - Knowledge articles
  - Reporting and year-end pack generation.
  - Notification scheduling and dispatch.
  - Integration with AI/OCR microservice.
  - Admin API for internal staff.
  - Plan/subscription logic and feature gating.

### 3.3 Data Layer

- Primary DB: **PostgreSQL**
  - Store all structured data:
    - Users, businesses, tax profiles, tax rules, transactions, categories, documents (metadata), obligations, alerts, knowledge articles, plans, subscriptions, analytics events (optional), audit logs.
  - Use migrations (e.g., Prisma/TypeORM) and strict schemas.

- File storage: **S3-compatible object store**
  - Store:
    - Images (receipts, bank screenshots).
    - PDFs (reports, invoices, packs).
  - Only paths and metadata are stored in Postgres.

### 3.4 AI/OCR Microservice

- Decoupled service with a small HTTP API.
- Responsibilities:
  - Run OCR on uploaded images (receipts, bank screenshots).
  - Classify transaction type (income/expense).
  - Suggest category and business vs personal likelihood.
- Implementation:
  - Wrap an external OCR/LLM provider or local OCR library + simple classifier.
  - Treat results as suggestions; main system remains source of truth.
- Communication:
  - Backend enqueues jobs and calls AI/OCR service asynchronously.

### 3.5 Notifications Infrastructure

- Use **Firebase Cloud Messaging (FCM)** for Android + **APNs** for iOS.
- Orchestrate remote push via:
  - Direct FCM/APNs integration in backend, or
  - Provider (e.g., OneSignal) if chosen.
- In-app notification center built on top of `alerts` data.

### 3.6 Deployment and Infrastructure

- Cloud hosting (AWS or comparable).
- Components:
  - API service (containerised; ECS/Kubernetes or similar).
  - AI/OCR service (containerised).
  - Postgres (managed DB).
  - Object storage (S3 or equivalent).
  - Message queue / job runner (e.g., Redis + BullMQ, or dedicated queue) for async tasks:
    - AI/OCR
    - PDF/CSV generation
    - Notifications
- Environments:
  - `dev`, `staging`, `prod` with separate DBs and buckets.

---

## 4. Core Modules and Responsibilities

### 4.1 Auth Module

- Features:
  - Phone-based OTP login (SMS provider integration).
  - Optional email/password or magic link later; MVP can be phone-only.
- Requirements:
  - JWT-based stateless authentication.
  - Short-lived access tokens with secure storage on device.
  - Device token registration for push notifications.
  - Integration with subscription/plan resolution (tie user → subscription → features).

### 4.2 User and Business Module

- Entities:
  - `User`: identity, contact info, preferences.
  - `Business`: legal form, sector, turnover bracket, state, CAC/TIN/VAT flags.
- Capabilities:
  - Create/update business profile during onboarding.
  - Multiple businesses per user supported by design (UI may initially limit to one).
  - Link `User` ↔ `Business` relationship.
  - Associate business with active subscription.

### 4.3 Eligibility Engine Module

- Inputs:
  - Business attributes:
    - Legal form
    - Sector
    - Turnover band
    - Registration status (CAC/TIN)
    - VAT registration flag
- Logic:
  - Evaluate CIT status (0% or >0).
  - Evaluate VAT obligations (registration and filing).
  - Provide WHT expectations as narrative (no hard “0%” unless law supports).
- Design:
  - Rule tables in DB:
    - `tax_rules` with dimensions `(year, tax_type, threshold_min, threshold_max, condition_expression, result_json)`.
  - Rule evaluator service:
    - Looks up current year rules.
    - Applies to business attributes.
    - Returns structured `TaxProfile` (CIT/VAT/WHT statuses + explanation keys).
- Output:
  - `tax_profiles` record per business/year, versioned.

### 4.4 Transaction Module

- Features:
  - Add income.
  - Add expense.
  - Edit/delete transaction (with audit log).
  - List transactions by date, type, category, and business.
- Requirements:
  - Transaction schema:
    - `id`
    - `business_id`
    - `type` (income/expense)
    - `amount`
    - `currency`
    - `date`
    - `description`
    - `source` (manual/upload/import)
    - `category_id` (final user-approved)
    - `ai_category_id` (suggested)
    - `ai_confidence`
    - `is_business_flag`
    - `invoice_id` (nullable, for future invoices linkage)
    - `created_at`, `updated_at`
  - Pagination + filtering:
    - By date range, type, category, amount min/max.
  - Category taxonomy:
    - `transaction_categories` table to enforce controlled set of categories.

### 4.5 Document Module

- Features:
  - Upload documents (images, PDFs).
  - Link to specific transactions or store standalone.
  - View document thumbnails and details.
- Requirements:
  - Document schema:
    - `id`
    - `business_id`
    - `related_transaction_id` (nullable)
    - `type` (receipt, bank_statement, other)
    - `storage_url`
    - `mime_type`
    - `size`
    - `ocr_status` (pending/success/failed)
    - `extracted_metadata_json`
    - `created_at`
  - Upload flow:
    - Option A: client requests signed URL, uploads directly to storage, then notifies backend.
    - Option B: client uploads to backend, backend streams to storage.
  - After upload:
    - Backend registers metadata.
    - Enqueues OCR job.

### 4.6 AI/OCR Integration Module

- Flow:
  - User uploads image → backend stores file and creates `documents` row → enqueue OCR/AI job.
- AI service:
  - Fetches file from storage.
  - Runs OCR + parsing to produce:
    - `extracted_text`
    - `suggested_type` (income/expense)
    - `suggested_category_id`
    - `is_business_probability`
  - Returns structured JSON.
- Backend:
  - Updates `documents.extracted_metadata_json`.
  - Updates associated `transactions` row:
    - Sets `ai_category_id`, `ai_confidence`, `is_business_flag`.
    - If confidence ≥ threshold:
      - Auto-apply `category_id` (still editable).
    - If in mid band:
      - Mark as “suggested”, require explicit confirmation.
    - If < low threshold:
      - Leave `category_id` unset (Uncategorised).

### 4.7 Reporting and Year-End Pack Module

- Features:
  - Generate yearly summary for a business:
    - Total income.
    - Total expenses by category.
    - Estimated profit (income – expenses).
    - TaxProfile snapshot.
    - List of documents.
  - Export formats:
    - Human-readable **PDF**.
    - Machine-usable **CSV/Excel**.
- Implementation:
  - Aggregation queries or materialised views.
  - Report generation service:
    - Renders PDF via HTML template engine (e.g., Puppeteer → PDF) or PDF library.
    - Stores pack in object storage.
    - Registers pack in DB with metadata (year, business_id, url).
  - API returns signed download links.

### 4.8 Obligations and Alerts Module

- Obligations:
  - Model CIT/VAT/WHT obligations as `obligations` records:
    - `id`
    - `business_id`
    - `tax_type`
    - `period_start`, `period_end`
    - `due_date`
    - `status` (upcoming/due/overdue/fulfilled)
    - `created_at`, `updated_at`
- Alerts:
  - `alerts` records:
    - `id`
    - `business_id`
    - `type` (deadline_threshold, turnover_threshold, missing_receipt, etc.)
    - `message_key`
    - `severity` (info/warn/critical)
    - `linked_obligation_id` (nullable)
    - `payload_json`
    - `created_at`, `read_at`
- Scheduler:
  - Background jobs to:
    - Generate obligations per business/year based on rules.
    - Create alerts:
      - 30/7/1 days before `due_date`.
      - When `turnover` exceeds 70% and 90% of threshold.
      - When transactions without supporting documents exceed threshold.
  - Notification dispatcher:
    - Reads new alerts.
    - Sends push notifications via FCM/APNs.
    - Logs delivery results.

### 4.9 Knowledge / Education Module

- Entity: `knowledge_articles`
  - `id`
  - `slug`
  - `language` (en, pidgin)
  - `title`
  - `content_markdown`
  - `tags`
  - `version`
  - `published_at`
  - `is_active`
- Features:
  - List articles by tag/topic.
  - Fetch article by slug + language.
  - Versioning to update content with law changes.

### 4.10 Admin Module

- Web-only internal admin interface:
  - Manage tax rules.
  - Browse businesses/users (read only / restricted actions).
  - Manage knowledge articles.
  - View alerts, delivery logs, and basic metrics.
- Requirements:
  - Strong admin authentication.
  - RBAC for different admin roles.

### 4.11 Observability Module

- Logging:
  - Structured JSON logs for all services (API, workers, AI).
- Metrics:
  - Request counts, latency, error rates.
  - Job queue sizes and processing times.
- Tracing:
  - Minimal distributed tracing for critical flows:
    - Onboarding + eligibility.
    - Add transaction (with document + AI).
    - Pack generation.

---

## 5. Data Model (Key Tables)

Outline only. Exact SQL comes later.

- `users`
  - `id`, `phone`, `email`, `name`, `language_pref`, `created_at`, `updated_at`.

- `businesses`
  - `id`, `owner_user_id`, `name`, `legal_form`, `sector`, `state`, `cac_number`,
    `tin`, `vat_registered`, `estimated_turnover_band`, `created_at`, `updated_at`.

- `tax_profiles`
  - `id`, `business_id`, `tax_year`, `cit_status`, `vat_status`, `wht_status`,
    `eligibility_detail_json`, `created_at`, `updated_at`.

- `tax_rules`
  - `id`, `tax_type`, `year`, `threshold_min`, `threshold_max`, `condition_expression`,
    `result_json`, `created_at`, `updated_at`.

- `transaction_categories`
  - `id`, `name`, `type` (income/expense), `display_order`, `created_at`.

- `transactions`
  - `id`, `business_id`, `type`, `amount`, `currency`, `date`, `description`,
    `source`, `category_id`, `ai_category_id`, `ai_confidence`,
    `is_business_flag`, `invoice_id`, `created_at`, `updated_at`.

- `documents`
  - `id`, `business_id`, `related_transaction_id`, `type`, `storage_url`,
    `mime_type`, `size`, `ocr_status`, `extracted_metadata_json`, `created_at`.

- `obligations`
  - `id`, `business_id`, `tax_type`, `period_start`, `period_end`,
    `due_date`, `status`, `created_at`, `updated_at`.

- `alerts`
  - `id`, `business_id`, `type`, `message_key`, `severity`,
    `linked_obligation_id`, `payload_json`, `created_at`, `read_at`.

- `knowledge_articles`
  - `id`, `slug`, `language`, `title`, `content_markdown`, `tags`,
    `version`, `published_at`, `is_active`.

- `devices`
  - `id`, `user_id`, `platform`, `push_token`, `last_seen_at`.

- `audit_logs`
  - `id`, `actor_user_id`, `resource_type`, `resource_id`, `action`,
    `before_json`, `after_json`, `created_at`.

- `plans`
  - `id`, `name`, `description`, `monthly_price`, `annual_price`,
    `is_active`, `created_at`, `updated_at`.

- `plan_features`
  - `id`, `plan_id`, `feature_key`, `limit_value`, `created_at`.

- `subscriptions`
  - `id`, `user_id`, `business_id`, `plan_id`, `status`,
    `started_at`, `ends_at`, `created_at`, `updated_at`.

- `invoices` (future-lite invoicing module)
  - `id`, `business_id`, `invoice_number`, `issue_date`, `due_date`,
    `customer_name`, `customer_contact`, `status`, `total_amount`,
    `currency`, `notes`, `created_at`, `updated_at`.

- `invoice_items`
  - `id`, `invoice_id`, `description`, `quantity`, `unit_price`, `amount`.

- `import_batches` (future-lite bank import)
  - `id`, `business_id`, `document_id`, `status`, `created_at`.

- `import_batch_lines`
  - `id`, `import_batch_id`, `date`, `description`, `amount`, `direction`,
    `suggested_category_id`, `ai_confidence`, `mapped_transaction_id`.

---

## 6. API Surface (High-Level)

REST endpoints (or equivalent GraphQL operations). Core groups:

### 6.1 Auth

- `POST /auth/request-otp`
- `POST /auth/verify-otp`
- `POST /auth/logout`

### 6.2 Users and Businesses

- `GET /me`
- `PUT /me`
- `POST /businesses`
- `GET /businesses`
- `GET /businesses/:id`
- `PUT /businesses/:id`

### 6.3 Eligibility

- `POST /businesses/:id/eligibility/evaluate`
- `GET /businesses/:id/eligibility/:year`

### 6.4 Transactions

- `POST /businesses/:id/transactions`
- `GET /businesses/:id/transactions`
- `GET /transactions/:id`
- `PUT /transactions/:id`
- `DELETE /transactions/:id`

### 6.5 Documents

- `POST /businesses/:id/documents` (optionally returns signed upload URL)
- `GET /businesses/:id/documents`
- `GET /documents/:id`
- `PUT /documents/:id` (link to transaction)

### 6.6 Reporting

- `GET /businesses/:id/reports/:year/summary`
- `POST /businesses/:id/reports/:year/pack` (trigger generation)
- `GET /businesses/:id/reports/:year/pack/download`

### 6.7 Obligations and Alerts

- `GET /businesses/:id/obligations`
- `GET /businesses/:id/alerts`
- `POST /alerts/:id/read`

### 6.8 Knowledge

- `GET /knowledge/articles`
- `GET /knowledge/articles/:slug`

### 6.9 Devices

- `POST /devices` (register push token)
- `DELETE /devices/:id`

### 6.10 Plans and Subscriptions

- `GET /plans`
- `GET /subscriptions/me`
- Admin-only:
  - `POST /plans`
  - `PUT /plans/:id`
  - `POST /users/:id/subscriptions`

### 6.11 Invoices (Lite Invoicing; future phase)

- `POST /businesses/:id/invoices`
- `GET /businesses/:id/invoices`
- `GET /invoices/:id`
- `PUT /invoices/:id`
- `POST /invoices/:id/send` (future email/WhatsApp sharing)

### 6.12 Lite Bank Import (Future Phase)

- `POST /businesses/:id/imports` (upload or reference statement document)
- `GET /businesses/:id/imports/:batchId`
- `POST /imports/:batchId/confirm` (map batch lines into transactions)

### 6.13 AI/OCR Internal API (Not Exposed to Client)

- `POST /ai/ocr` with document ID or URL.
- `POST /ai/classify-transaction` with text/metadata.

---

## 7. Security and Compliance Requirements

Enforce:

- Encryption:
  - TLS 1.2+ on all endpoints.
  - AES-256 at rest for DB and storage volumes.
- Authentication:
  - JWT access tokens; short-lived.
  - Secure storage of tokens on device.
- Authorisation:
  - Route-level guards ensuring users only access their businesses.
- Data protection:
  - NDPA-compliant privacy notices and consent flows.
  - No real production data in dev/staging.
- Logging and audit:
  - Audit logs for key operations:
    - Data export
    - Summary generation
    - Admin read/write on sensitive resources
  - Mask sensitive values in logs.
- Backups:
  - Automated DB backups with tested restore.
- Breach handling:
  - Incident-response playbook:
    - Detection
    - Escalation
    - Notification of regulators and users as required.

---

## 8. Performance and Scalability

Design targets:

- User/data scale at launch:
  - Up to ~10k businesses.
  - Up to ~3k transactions per business per year without performance issues.
- API:
  - P95 latency < 300ms for core operations:
    - Dashboard
    - List transactions
    - Create transaction
- Data:
  - Indexes on:
    - `business_id`, `date`, `type`, `category_id` in `transactions`.
  - Plan for partitioning or archiving older data if necessary.
- Background jobs:
  - All heavy workloads (AI/OCR, pack generation, statement parsing, notifications) handled via queues; no blocking API calls.

---

## 9. Environments, CI/CD, and Tooling

### 9.1 Environments

- `dev`:
  - Local + shared dev server.
  - Fast iteration; relaxed performance constraints.
- `staging`:
  - Mirrors prod infra.
  - Uses synthetic or anonymised data.
- `prod`:
  - Live traffic.

### 9.2 CI/CD

- Automated builds and tests on every push.
- Linting and type-checking as mandatory gates.
- Automated deploys to staging on main branch merges.
- Controlled/manual promotion from staging to prod.

### 9.3 Monitoring

- Centralised logging (CloudWatch, ELK, or equivalent).
- Alerts for:
  - Elevated error rates.
  - Job queue backlogs.
  - Notification dispatch failures.

---

## 10. Testing Strategy

- Unit tests:
  - Eligibility rules and evaluation.
  - Transaction/category logic.
  - Feature flag/plan resolution.
- Integration tests:
  - Auth flows.
  - Transaction creation with linked documents and AI updates.
  - Pack generation and downloads.
- E2E tests:
  - Onboarding + eligibility.
  - Add income/expense.
  - Generate year-end pack.
  - Notification → dashboard alert path.
- Security tests:
  - Basic penetration tests on auth and access control.
- Performance tests:
  - Load testing for:
    - Listing transactions under heavy data.
    - Report generation under realistic loads.

---

## 11. Phased Delivery Plan (Engineering View)

### Phase 1 – Foundations

- Set up repo, CI/CD, base infrastructure.
- Implement:
  - Auth module.
  - User and Business entities.
  - Tax rules schema and eligibility engine v0 (static rules).
  - Plans, plan_features, subscriptions model (basic wiring).
- Deliver initial mobile shell.

### Phase 2 – Records and Documents

- Implement:
  - Transactions module (manual input).
  - Document upload pipeline.
  - AI/OCR microservice stub or minimal viable version.
- Add initial dashboards listing basic stats (local aggregates, no pack).

### Phase 3 – Dashboard, Alerts, Education

- Implement:
  - Obligations model and dashboard API.
  - Alerts engine + push notification integration.
  - Knowledge articles and UI.
- Add feature gating at API and UI using plans.

### Phase 4 – Reporting and Year-End Pack

- Implement:
  - Aggregation queries.
  - PDF/CSV pack generation.
  - Download endpoints and links from dashboard.
- Harden:
  - Audit logs
  - Access patterns for reports.

### Phase 5 – Hardening and Refinement

- Security review.
- Load testing and optimisations.
- UX refinements:
  - Quick Add Transaction flow.
  - Obligations Dashboard clarity and performance.
- Prepare for limited beta.

### Phase 6 – Refinements and Future Features (Post-MVP)

- Lite invoice generation.
- Lite bank import.
- Web dashboard (via Expo Web or separate React app).
- Expanded analytics dashboards.

---

## 12. Pricing, Plans, and Feature Gating (Refinement)

### 12.1 Account Tiers

Config-driven tiers:

- **Free**
  - Limited features; capped usage (e.g., max transactions or no invoices).
- **Basic**
  - Core compliance features; reasonable limits.
- **Business**
  - Higher limits, advanced reports, invoicing.
- **Accountant**
  - Multi-client support, web dashboard focus.

### 12.2 Feature Flags and Behaviour

Sample feature keys:

- `feature_invoice_generation`
- `feature_multiple_businesses`
- `feature_advanced_reports`
- `feature_accountant_multi_client_view`

Backend:

- Function `hasFeature(userId, businessId, featureKey)` controls:
  - API access.
  - Quotas.

Client:

- Honor flags for:
  - Navigation visibility.
  - Upgrade prompts when limits hit.

Billing integration can be added later; architecture for plans/subscriptions must be live at MVP.

---

## 13. In-App Analytics (Refinement)

### 13.1 Tooling

- Use **PostHog** or **Mixpanel** for client-side analytics.
- Optional server-side events for critical flows.

### 13.2 Events

Key events:

- Onboarding:
  - `onboarding_started`
  - `onboarding_completed`
  - `eligibility_evaluated`
- Core usage:
  - `transaction_created` (props: `type`, `has_document`, `category_source` (ai/user))
  - `transaction_edited`
  - `document_uploaded`
  - `year_pack_generated`
- Engagement:
  - `app_opened`
  - `push_notification_opened` (props: `alert_type`)
  - `education_article_viewed` (props: `slug`)

Privacy:

- No raw PII or raw text in analytics.
- Use hashed IDs and coarse-grained properties.

### 13.3 Implementation

- Create analytics wrapper in client that:
  - Normalises event names.
  - Avoids scattering direct SDK calls.
- Backend:
  - Optional event pipeline for back-office metrics if needed.

---

## 14. Simple Web Dashboard (Refinement)

### 14.1 Approach

Option A (preferred):

- Use **Expo Web** to reuse React Native code for web.

Option B:

- Separate lightweight **React** web app that reuses APIs.

### 14.2 Initial Web Scope

- Login.
- Select business.
- View:
  - Yearly reports and download packs.
  - Transactions table with filters.
- Target:
  - Accountants and SME owners comfortable on desktop.

### 14.3 Tech Implications

- Ensure CORS for browser access.
- Ensure auth tokens are handled securely in browser.
- Extend CI/CD to build and deploy web frontend.

---

## 15. Lite Bank Import (Future Phase)

### 15.1 Scope

Not in MVP; design supports future addition.

Functionality later:

- Upload bank statement PDF or paste text.
- Parse into candidate transactions.
- Provide review UI to confirm mappings.
- Import as `transactions`.

### 15.2 Technical Pattern

- Reuse `documents` and AI infrastructure:
  - New `type = bank_statement`.
- New `import_batches` + `import_batch_lines` tables.
- Worker processes statement:
  - Extract and normalise transactions.
  - Populate `import_batch_lines`.
- Client:
  - Screen to review and confirm lines → create final `transactions`.

---

## 16. Lightweight Invoice Generation (Future Phase)

### 16.1 Scope

- Basic invoices only.
- Includes:
  - Invoice number.
  - Business + customer details.
  - Line items.
  - Totals.
  - Payment instructions.
  - Optional QR with invoice link or payment instructions.

### 16.2 Implementation

- APIs as defined in section 6.11.
- PDF rendering via same PDF pipeline as year-end packs, with separate template.
- Optionally gate by plan:
  - Free: limited invoices/month.
  - Basic/Business: higher/unlimited.
  - Accountant: view/aggregate for multiple clients.

---

## 17. Impact Summary

- Core MVP remains:
  - Eligibility.
  - Records.
  - Packs.
  - Alerts.
  - Education.
- Technical spec now includes:
  - Plans + feature gating.
  - Analytics hooks.
  - Web dashboard extension path.
  - Extensible AI/OCR for future bank import.
  - Invoicing data model and APIs for later.

Use this document as the single technical reference for Rorun MVP and near-term evolution.
