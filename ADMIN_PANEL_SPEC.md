# ADMIN PANEL BUILD SPEC (Instructions for the AI)

> Give this file to your AI coding assistant at the start of the task.
> Keep `project context.md` in the same folder. The AI must read it first to learn about the business and tech stack.

---

## 0. How the AI Must Work

1. **Read `project context.md` first, then read this entire file, before writing code.**
2. **Inspect the existing website first** (folder structure, database, auth, API style) and reuse it. Do not rebuild what already exists.
3. **Plan before coding.** Reply with: (a) a short architecture plan, (b) the list of files you will create or change, (c) any questions. Wait for approval.
4. **Build in phases** (Section 9). Finish, test and summarize one phase before starting the next.
5. **Never invent secrets, API keys or credentials.** Use environment variables and a `.env.example`.
6. **Security rules in Section 4 are mandatory.** If a feature request conflicts with them, stop and explain.
7. After each phase, give: what was built, how to run it, how to test it, and known limitations.
8. Keep code clean, commented where logic is non-obvious, and consistent with the existing code style.

---

## 1. Project Context (READ FROM `project context.md`)

All project details live in the file **`project context.md`**. Do not guess them and do not expect them in this file.

Before anything else, the AI must:

1. Open and read `project context.md` completely.
2. Pull out the key facts: business name and what is sold, tech stack, database, hosting, payment gateway, shipping partners, currency and region, tax rules, languages, number and types of admin users, and the location of the existing code.
3. Reply with a **short summary** of what it understood (a few lines) so the owner can confirm it is correct.
4. If `project context.md` is missing, empty, or lacks any of the facts above, **stop and ask the owner** for the missing items. Never assume a stack, gateway or database.
5. If `project context.md` ever conflicts with this spec, point out the conflict and ask which one to follow. For security rules in Section 4, this spec wins unless the owner explicitly approves a change.
6. Treat `project context.md` as the source of truth for project facts, and re-read it at the start of each new phase in case the owner updated it.

---

## 2. Goal

Build a **secure, separate Admin Panel** that lets authorized staff manage the entire store from behind the scenes: products, orders, customers, content, payments, shipping, and reports. Changes made in the admin must **appear on the live website automatically** because both use the **same database and backend logic**.

---

## 3. How the Admin Links to the Website

```
 ┌──────────────┐        ┌───────────────────┐        ┌────────────┐
 │ Customer Site│ ─────▶ │  Backend / API    │ ◀───── │ Admin Panel│
 │ (public)     │        │ (business logic,  │        │ (private)  │
 └──────────────┘        │  validation, auth)│        └────────────┘
                         └─────────┬─────────┘
                                   ▼
                            ┌────────────┐
                            │  Database  │
                            └────────────┘
```

Rules:
- Admin and website talk to **one shared backend and database**. No duplicated data.
- Admin lives on a **separate route or subdomain** (e.g. `admin.yourdomain.com` or `/admin`), never linked from the public navigation.
- Admin-only API endpoints live under their own prefix (e.g. `/api/admin/*`) and are protected by middleware that checks authentication **and** role on every request.
- The public site must only read what is published/active. Drafts, hidden products and internal notes must never be exposed by public APIs.
- Any admin action that changes catalog data (price, stock, visibility) should refresh or invalidate the website cache so changes show quickly.

---

## 4. Security Requirements (MANDATORY)

### 4.1 Authentication
- Passwords hashed with **bcrypt or argon2** (never plain text, never MD5/SHA1).
- Minimum password length 12, block common passwords.
- **Two-factor authentication (2FA)** for all admin accounts (authenticator app/TOTP; email OTP as fallback). Mandatory for the Owner/Super Admin role.
- Rate limit login attempts; lock the account temporarily after repeated failures (e.g. 5 attempts, 15 minute lock).
- Secure sessions or short-lived JWTs (e.g. 15 min access token + refresh token), stored in **HttpOnly, Secure, SameSite** cookies. Never store tokens in localStorage.
- Auto-logout after inactivity (e.g. 30 minutes).
- Secure "forgot password" flow with single-use, expiring tokens (e.g. 15 minutes).
- Admin accounts are **created by invitation only**. No public admin sign-up page.

### 4.2 Authorization (Role-Based Access Control)
Enforce permissions **on the server**, not just by hiding buttons.

| Role | Access |
|---|---|
| Super Admin / Owner | Everything, including staff management, settings, payments, backups |
| Manager | Products, orders, customers, coupons, content, reports (no staff or payment settings) |
| Order/Support Staff | View and update orders, refunds (with limit), customer messages |
| Inventory Staff | Products and stock only |
| Content Editor | Banners, blogs, pages only |
| Read-Only/Accountant | View orders, payments and reports; export only |

- Deny by default. Every endpoint declares the permission it needs.
- Dangerous actions (delete, refund, export all data, change roles) require extra confirmation or re-entering the password.

### 4.3 Data and Input Protection
- Validate and sanitize **all** input on the server (use a schema validator such as Zod, Joi, Pydantic or similar).
- Use parameterized queries or an ORM. No string-built SQL or queries (prevents injection).
- Escape output to prevent XSS; sanitize any rich-text or HTML fields.
- CSRF protection on all state-changing requests.
- File uploads: allow only image types you expect, check real MIME type, limit size (e.g. 5 MB), rename files, store outside the web root or in cloud storage, never execute uploaded files.
- Encrypt sensitive fields at rest where needed; always use **HTTPS** with HSTS.
- Set security headers (CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy).
- CORS restricted to your own domains only.
- Never log passwords, tokens, full card data or secrets.

### 4.4 Payments
- **Never store card numbers, CVV or UPI PINs.** Let the payment gateway handle them (tokenization/hosted checkout).
- Verify payment status via the gateway's **signed webhooks**, not by trusting the browser.
- Make webhooks idempotent (the same event processed twice must not double-update an order).
- Refunds go through the gateway API and are logged.

### 4.5 Audit Logging
Record who did what, when, from which IP, and the before/after values for:
- logins (success and failure), logouts, 2FA changes
- product, price and stock changes
- order status changes, refunds, cancellations
- role/permission changes, staff creation or removal
- settings and payment configuration changes
- data exports and deletions

Logs must be **append-only** (admins cannot edit or delete them) and viewable by Super Admin.

### 4.6 Infrastructure and Operations
- Secrets only in environment variables or a secrets manager. Never commit `.env`.
- Automated daily database backups, stored separately, with a tested restore procedure.
- Keep dependencies updated; run `npm audit` / `pip audit` or equivalent.
- Optional but recommended: restrict admin access by IP allow-list or VPN, and add a CAPTCHA on login.
- Soft-delete (flag as deleted) for products, orders and customers so mistakes can be recovered.
- Show friendly error messages to users; keep detailed errors in server logs only.

---

## 5. Admin Modules (What the Panel Must Include)

### 5.1 Dashboard
- Today/week/month sales, order count, average order value
- Pending orders, low-stock alerts, failed payments, new customers
- Sales chart, top products, recent orders
- Quick links to common actions

### 5.2 Product Management
- Create, edit, duplicate, hide/show, soft-delete products
- Name, slug, description (rich text), images (multiple, reorderable), SKU, brand
- Price, sale price, cost price, tax/GST class
- Variants (size, color, etc.) each with own SKU, price and stock
- Categories and subcategories, tags, collections
- Stock quantity, low-stock threshold, backorder on/off
- SEO fields (meta title, description, URL slug)
- **Bulk actions:** CSV import/export, bulk price or stock update, bulk publish/unpublish
- Draft vs Published status and scheduled publishing

### 5.3 Category and Catalog Management
- Category tree, images, ordering, visibility
- Brands, attributes (size, color, material), filters shown on the site

### 5.4 Order Management
- Order list with search and filters (status, date, payment method, customer, amount)
- Order detail: items, customer, addresses, payment status, timeline
- Status flow: `Pending → Paid → Processing → Packed → Shipped → Delivered`, plus `Cancelled`, `Returned`, `Refunded`
- Print invoice, packing slip and shipping label
- Add internal notes (never visible to customers)
- Cancel, partial or full refund, return/exchange handling
- Automatic customer email/SMS/WhatsApp notification on each status change
- Manual order creation (for phone or offline orders)

### 5.5 Inventory
- Live stock per product/variant, stock history (who changed what and why)
- Automatic stock deduction on paid order, restock on cancellation/return
- Low-stock and out-of-stock alerts
- Prevent overselling (use database transactions or row locking)

### 5.6 Customer Management
- Customer list, profile, order history, lifetime value
- Block/unblock customers, add notes
- Export customers (permission-gated and logged)
- Handle data deletion requests (privacy compliance)

### 5.7 Payments and Finance
- Payment list with gateway transaction IDs and status
- Refund management, failed/pending payment follow-up
- Settlement and reconciliation view
- Tax/GST reports and invoice numbering

### 5.8 Shipping and Delivery
- Shipping zones, rates (flat, weight-based, free above amount)
- Courier integration, tracking number entry, tracking link sent to customer
- Pincode serviceability, COD availability and COD charges

### 5.9 Marketing and Promotions
- Coupons (percentage/fixed, minimum cart value, usage limit, per-customer limit, expiry)
- Automatic discounts and sales, flash sales with timers
- Banners, homepage sections, popups
- Abandoned cart list and recovery emails
- Email/SMS campaign hooks (optional)

### 5.10 Content Management
- Static pages (About, Contact, Policies, FAQ), blog posts
- Navigation menus and footer links
- Homepage layout and featured products
- Media library for images

### 5.11 Reviews and Support
- Moderate product reviews (approve, hide, reply)
- Contact form messages and support tickets with status

### 5.12 Reports and Analytics
- Sales by date, product, category, region, payment method
- Customer acquisition, repeat customers, refunds and returns
- Inventory valuation
- Export to CSV/Excel/PDF (permission-gated)

### 5.13 Settings
- Store details, logo, contact info, currency, timezone
- Tax settings, shipping settings, payment gateway keys (Super Admin only, masked on screen)
- Email/SMS templates, notification preferences
- Maintenance mode toggle
- Staff management (invite, assign role, deactivate, force logout)

### 5.14 Security Center (Super Admin)
- Active sessions with remote logout
- Login history and failed attempts
- Audit log viewer with filters
- 2FA status per user

---

## 6. Data Model Guidance

The AI should reuse existing tables/collections and add only what is missing. Expected entities:

`users (customers)`, `admin_users`, `roles`, `permissions`, `products`, `product_variants`, `categories`, `brands`, `attributes`, `inventory_movements`, `carts`, `orders`, `order_items`, `payments`, `refunds`, `shipments`, `coupons`, `banners`, `pages`, `blog_posts`, `reviews`, `support_tickets`, `settings`, `audit_logs`, `login_attempts`.

Requirements:
- Timestamps (`created_at`, `updated_at`) and `deleted_at` for soft deletes
- Indexes on fields used for search and filters (SKU, order number, email, status, date)
- Money stored as integers (smallest unit, e.g. paise/cents), never floating point
- Order records keep a **snapshot** of price, name and address at purchase time

---

## 7. UI / UX Requirements

- Clean, responsive layout that works on desktop, tablet and mobile
- Sidebar navigation grouped by module; hide items the user has no permission for
- Data tables with search, filters, sorting, pagination and bulk select
- Clear confirmation dialogs for destructive actions
- Loading, empty and error states everywhere
- Form validation with clear messages
- Light and dark mode (optional)
- Fast: pages should load in under 2 seconds with typical data; paginate on the server

---

## 8. Quality, Testing and Performance

- Unit tests for business logic (pricing, stock, coupons, refunds, permissions)
- Integration tests for admin APIs, including **tests proving unauthorized roles are rejected**
- Test payment webhooks including duplicate and forged requests
- Test concurrent orders on the last item in stock
- Basic security checks: SQL injection, XSS, CSRF, broken access control, file upload abuse
- Pagination and indexes for large tables; cache read-heavy public data
- Provide seed data and a short README for setup, running and testing

---

## 9. Build Phases (Do in This Order)

**Phase 1: Foundation**
Project setup, admin authentication, 2FA, roles and permissions, audit logging, layout and navigation, security headers and rate limiting.

**Phase 2: Catalog**
Categories, products, variants, images, inventory, bulk import/export.

**Phase 3: Orders and Payments**
Order list/detail, status flow, notifications, invoices, payment records, refunds, webhooks.

**Phase 4: Customers and Shipping**
Customer management, shipping rules, courier and tracking integration.

**Phase 5: Marketing and Content**
Coupons, banners, pages, blog, reviews, abandoned carts.

**Phase 6: Reports, Settings, Security Center**
Dashboard, analytics, settings, staff management, session and log viewers.

**Phase 7: Hardening and Launch**
Full security review, backups, monitoring/error tracking (e.g. Sentry), performance tuning, documentation, deployment checklist.

---

## 10. Deliverables

1. Working admin panel code integrated with the existing website
2. `.env.example` listing every required variable (no real values)
3. Database migrations and seed data
4. `README.md` with setup, run, test and deploy steps
5. `SECURITY.md` summarizing the protections implemented and how to rotate secrets
6. Admin user guide (short, non-technical) for staff
7. Test report showing passed tests

---

## 11. Final Acceptance Checklist

The work is **not finished** until every item is true:

- [ ] No admin page or API works without login and the correct role
- [ ] 2FA works and is enforced for the Owner role
- [ ] A lower role cannot access higher-role data even by calling the API directly
- [ ] Passwords are hashed; no secrets are in the code or repository
- [ ] All inputs are validated server-side; file uploads are restricted
- [ ] Payments are confirmed only through verified webhooks
- [ ] Stock cannot go negative or oversell under simultaneous orders
- [ ] Every sensitive action appears in the audit log
- [ ] Changes in admin appear on the live website
- [ ] Backups run automatically and a restore has been tested
- [ ] HTTPS and security headers are active
- [ ] Mobile layout works
- [ ] Documentation and tests are delivered

---

## 12. Things the AI Must Ask the Owner Before Starting

Only ask what `project context.md` does not already answer:

1. Is the existing website built from scratch or on a platform (Shopify, WooCommerce, etc.)?
2. Which payment gateway and shipping partner are in use?
3. How many products and orders per month are expected?
4. Which staff roles are needed and who gets which permissions?
5. Are there legal or tax requirements (GST invoicing, privacy rules) to follow?
6. Should the admin work in multiple languages or currencies?
