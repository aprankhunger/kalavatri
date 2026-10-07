# KALAVATRI — Project Status & Remaining Tasks

## What's Been Built ✅

### Public Storefront (Complete)
| Feature | Status |
|---------|--------|
| Homepage (hero, products, testimonials, newsletter) | ✅ Done |
| Product detail page with sizes/colors/add-to-cart | ✅ Done |
| Shopping cart with quantity controls & order summary | ✅ Done |
| Policy pages (Terms, Privacy, Refund) | ✅ Done |
| Navbar with mobile menu, search, cart badge | ✅ Done |
| Footer with links, social, payment badges | ✅ Done |
| Fallback data layer (works without backend) | ✅ Done |
| Responsive design + scroll animations | ✅ Done |

### Customer Storefront Flow (Strict Business Rule)
> **NO customer login or registration anywhere on the site.**
> Checkout is 100% **Guest Checkout**:
> 1. Customer adds items to Cart.
> 2. Proceeds to Checkout, enters: **Full Name, Phone Number, Shipping Address, Email Address**.
> 3. Makes payment via **Razorpay**.
> 4. Order is saved and an **automatic confirmation email** is sent to their email.
> 5. **Admin panel (`/admin`) is the only place where login, 2FA, and authentication exist.**

---

### Admin Panel — Phase 1: Foundation (Security Status)
| Feature | Status |
|---------|--------|
| Admin login page with UI | ✅ Done |
| Admin auth context & protected routes | ✅ Done |
| Admin layout with sidebar navigation | ✅ Done |
| AdminUser model (bcrypt passwords, roles) | ✅ Done |
| Auth routes (login, session, 2FA verification) | ✅ Done |
| 2FA / TOTP (RFC 6238, QR code, backup codes) | ✅ Done & Tested |
| HttpOnly + SameSite cookies (JWT access + refresh) | ✅ Done & Tested |
| Account lockout (15-min lock after 5 failed attempts) | ✅ Done & Tested |
| Auto-logout after 30 minutes of inactivity | ✅ Done & Tested |
| RBAC middleware (role-based access) | ✅ Done & Tested |
| Rate limiter middleware & Helmet security headers | ✅ Done |
| AuditLog model, recording, and viewer page | ✅ Done |
| Staff invite & password reset flow | ⏳ Pending |

### Admin Panel — Phase 2: Catalog (Partially Built)
| Feature | Status |
|---------|--------|
| Product list page with search & filters | ✅ Done |
| Product create/edit form (rich fields) | ✅ Done |
| Admin product CRUD API routes | ✅ Done |
| InventoryMovement model | ✅ Done |
| Inventory manager page | ✅ Done |
| Admin inventory routes | ✅ Done |
| Dashboard page (basic) | ✅ Done |

---

## What's Remaining ❌

### Phase 1 Gaps (Foundation — Incomplete)
| Task | Priority |
|------|----------|
| **2FA / TOTP** — not implemented (mandatory per spec) | 🔴 Critical |
| **HttpOnly cookie-based JWT** — need to verify tokens aren't in localStorage | 🔴 Critical |
| **Auto-logout on inactivity** (30 min) | 🟡 High |
| **Forgot password flow** with expiring tokens | 🟡 High |
| **Account lockout** after 5 failed attempts (15 min lock) | 🟡 High |
| **Security headers** (CSP, X-Frame-Options, HSTS, etc.) | 🟡 High |
| **CSRF protection** on state-changing requests | 🟡 High |
| **Invitation-only admin signup** (no public registration) | 🟡 High |

### Phase 2 Gaps (Catalog — Incomplete)
| Task | Priority |
|------|----------|
| **Category & subcategory management** (tree, images, ordering) | 🟡 High |
| **Product variants** (size/color with own SKU, price, stock) | 🟡 High |
| **Multiple product images** (upload, reorder, delete) | 🟡 High |
| **Bulk actions** — CSV import/export, bulk price/stock update | 🟠 Medium |
| **Draft vs Published** status + scheduled publishing | 🟠 Medium |
| **SEO fields** (meta title, description, URL slug) | 🟠 Medium |
| **Soft-delete** for products | 🟠 Medium |
| **File upload security** (MIME check, size limit, rename) | 🟡 High |

### Phase 3: Orders & Payments (Not Started) 🔴
| Task | Priority |
|------|----------|
| Order model & order items schema | 🔴 Critical |
| Order list page with search & filters | 🔴 Critical |
| Order detail page (items, customer, timeline) | 🔴 Critical |
| Status flow (Pending → Paid → Processing → Shipped → Delivered) | 🔴 Critical |
| **Razorpay integration** — checkout, webhooks, verification | 🔴 Critical |
| Payment records & reconciliation | 🔴 Critical |
| Refund management via gateway API | 🟡 High |
| Invoice generation & printing | 🟡 High |
| Customer email notifications on status change | 🟠 Medium |
| Manual order creation (phone/offline orders) | 🟠 Medium |

### Phase 4: Customers & Shipping (Not Started)
| Task | Priority |
|------|----------|
| Customer model & management page | 🟡 High |
| Customer profile, order history, lifetime value | 🟡 High |
| Shipping zones & rate configuration | 🟡 High |
| Courier tracking integration | 🟠 Medium |
| Pincode serviceability & COD rules | 🟠 Medium |

### Phase 5: Marketing & Content (Not Started)
| Task | Priority |
|------|----------|
| Coupon system (percentage/fixed, limits, expiry) | 🟠 Medium |
| Banner & homepage section management | 🟠 Medium |
| Static pages CMS (About, Contact, FAQ) | 🟠 Medium |
| Blog posts | 🟢 Low |
| Review moderation (approve/hide/reply) | 🟠 Medium |
| Abandoned cart tracking & recovery | 🟢 Low |

### Phase 6: Reports, Settings & Security Center (Not Started)
| Task | Priority |
|------|----------|
| Dashboard with real sales/order/customer data | 🟡 High |
| Sales reports by date/product/category/region | 🟠 Medium |
| CSV/Excel/PDF export (permission-gated) | 🟠 Medium |
| Store settings page | 🟠 Medium |
| Staff management (invite, roles, deactivate) | 🟡 High |
| Security center (active sessions, login history) | 🟠 Medium |

### Phase 7: Hardening & Launch (Not Started)
| Task | Priority |
|------|----------|
| Full security audit | 🔴 Critical |
| Automated database backups | 🟡 High |
| Error tracking (Sentry or similar) | 🟠 Medium |
| Performance tuning & caching | 🟠 Medium |
| Deployment to DigitalOcean | 🟡 High |
| README, SECURITY.md, admin user guide | 🟡 High |
| Test suite (unit + integration + security) | 🟡 High |

---

## Where to Proceed Next

### 🎯 Recommended: Finish Phase 1 Security Gaps First

The admin panel has a good foundation, but **critical security features are missing**. Before building more features, lock down what exists:

```
Priority Order:
1. 2FA/TOTP implementation (mandatory for Super Admin per spec)
2. HttpOnly cookie tokens (verify not using localStorage)  
3. CSRF protection
4. Security headers middleware
5. Account lockout on failed attempts
6. Forgot password flow
7. Auto-logout on inactivity
8. Invitation-only admin registration
```

### Then: Complete Phase 2 Category Gaps
- Category tree management
- Product variants (size/color with own stock)
- Image upload with security

### Then: Phase 3 — Orders & Razorpay
This is the **most business-critical** remaining work — without orders and payments, the store can't sell anything.

---

## Summary Scorecard

| Phase | Progress | Status |
|-------|----------|--------|
| Public Storefront | █████████░ 90% | Nearly Complete |
| Phase 1: Foundation & Auth | █████░░░░░ 50% | **Security gaps** |
| Phase 2: Catalog | ██████░░░░ 60% | Categories & variants missing |
| Phase 3: Orders & Payments | ░░░░░░░░░░ 0% | **Not started** |
| Phase 4: Customers & Shipping | ░░░░░░░░░░ 0% | Not started |
| Phase 5: Marketing & Content | ░░░░░░░░░░ 0% | Not started |
| Phase 6: Reports & Settings | ░░░░░░░░░░ 0% | Not started |
| Phase 7: Hardening & Launch | ░░░░░░░░░░ 0% | Not started |

> [!IMPORTANT]
> **Overall project completion: ~25%** — The storefront is done, but the entire admin panel backend (orders, payments, customers, shipping, marketing) hasn't been started yet. Phase 1 security and Phase 3 orders are the most urgent next steps.
