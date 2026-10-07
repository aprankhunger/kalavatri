# KALAVATRI — Project Context & Knowledge Base

> **Purpose**: This document gives any AI agent (or developer) a complete understanding of the KALAVATRI project in one read. It covers brand identity, design system, tech stack, architecture, data models, file structure, and development instructions.

---

## 1. What Is Kalavatri?

**Kalavatri** is a premium e-commerce brand specialising in **handcrafted Indian leather juttis** (traditional embroidered footwear). The brand emphasises artisan craftsmanship — zardozi, kundan, mirror work, phulkari, and thread art embroidery.

| Detail           | Value                                               |
|------------------|-----------------------------------------------------|
| **Brand Name**   | KALAVATRI                                           |
| **Domain**       | kalavatri.in                                        |
| **Product**      | Handcrafted Leather Juttis                          |
| **Market**       | India (prices in INR ₹)                             |
| **Target**       | Women & Men — bridal, festive, everyday, designer   |
| **Currency**     | Indian Rupees (₹)                                   |
| **Contact**      | support@kalavatri.in                                |
| **Customer Auth** | **NONE**. No customer login or signup anywhere on the site. 100% Guest Checkout (Name, Phone, Email, Shipping Address) + Order confirmation email. |
| **Admin Auth**    | Isolated to `/admin` panel only (2FA, roles, HttpOnly session cookies) |
| **Tax / GST**    | No GST                                              |
| **Payment Gateway** | Razorpay                                         |
| **Shipping**     | Self-shipping (manual courier dispatch & AWB)       |
| **Super Admin**  | kalavatri01@gmail.com                               |
| **Hosting Target** | DigitalOcean (Droplet/App Platform) + GoDaddy DNS  |
| **Database**     | MongoDB                                             |

### Product Categories
- **Bridal** — Heavy embellishment, zardozi-kundan work
- **Festive** — Rich colours, celebration-ready
- **Everyday** — Comfortable, subtle embroidery
- **Designer** — Statement pieces, unique artistry

### Product Badges
- `new` — New Arrivals section
- `bestseller` — Top Selling section
- `sale` — Discounted items
- `""` (empty) — Regular products

---

## 2. Design System & Theme

The design is inspired by a **warm, premium, ethnic-luxury** aesthetic.

### Colour Palette
```
Primary Dark    → #731F26  (Deep maroon/burgundy)     --maroon
Primary Darker  → #59181E  (Darker maroon)            --maroon-dark
Accent          → #D9AE79  (Warm gold/tan)            --gold
Subtle BG       → #D9CEC1  (Warm beige/light gray)    --beige
Light BG        → #F2E8DC  (Cream/off-white)          --cream
Main BG         → #FFFFFF  (White)                     --white
```

### Text Colours
```
--text-dark   → #2A2220   (warm near-black for headings)
--text-body   → rgba(42, 34, 32, 0.7)
--text-muted  → rgba(42, 34, 32, 0.5)
```

### Typography
| Role      | Font               | Source        |
|-----------|--------------------|---------------|
| Headings  | **Playfair Display** (serif) | Google Fonts |
| Body      | **Poppins** (sans-serif)     | Google Fonts |

- Headings are `uppercase`, `font-weight: 700`
- Body is `16px`, `line-height: 1.5`

### Spacing & Radii
```
--radius-sm    → 8px
--radius-md    → 16px
--radius-lg    → 20px
--radius-xl    → 40px
--radius-full  → 9999px  (pill buttons)
--container    → 1240px  (max content width)
```

### Shadows
```
--shadow-sm  → 0 1px 3px rgba(89,24,30,0.05)
--shadow-md  → 0 4px 14px rgba(89,24,30,0.05)
--shadow-lg  → 0 20px 40px rgba(89,24,30,0.08)
```

### Button Styles
- `.btn-primary` — Maroon background, white text (main CTA)
- `.btn-outline` — Transparent, border only
- `.btn-gold` — White background, dark text
- All buttons use `border-radius: 9999px` (pill shape)

### Animation
- Scroll-triggered `fadeInUp` via IntersectionObserver (`.animate-on-scroll` → `.visible`)
- Transition speed: `250ms ease` (`--transition`)

---

## 3. Tech Stack

### Frontend
| Technology         | Version   | Purpose                    |
|--------------------|-----------|----------------------------|
| **React**          | 19.x      | UI framework               |
| **Vite**           | 6.4.x     | Build tool & dev server    |
| **React Router**   | 7.x       | Client-side routing        |
| **Axios**          | 1.x       | HTTP client                |
| **React Icons**    | 5.x       | Icon library (Feather set) |
| **Vanilla CSS**    | —         | Styling (no Tailwind)      |
| **OxLint**         | 1.x       | Linting                    |

### Backend
| Technology     | Version | Purpose              |
|----------------|---------|----------------------|
| **Node.js**    | —       | Runtime              |
| **Express**    | 5.x     | API framework        |
| **Mongoose**   | 9.x     | MongoDB ODM          |
| **MongoDB**    | —       | Database             |
| **CORS**       | 2.x     | Cross-origin support |
| **dotenv**     | 18.x    | Env var management   |

### Dev Ports
| Service   | Default Port |
|-----------|-------------|
| Frontend  | `3000`      |
| Backend   | `5000`      |

The Vite dev server proxies `/api` requests to the backend at `http://localhost:5000`.

---

## 4. Architecture Overview

```
┌──────────────────────────────────────────────┐
│                   Browser                    │
│  React SPA (Vite dev server @ :3000)         │
│  ┌─────────────────────────────────────────┐ │
│  │  BrowserRouter                          │ │
│  │  ├── Navbar (always visible)            │ │
│  │  ├── <Routes>                           │ │
│  │  │   ├── /              → Home          │ │
│  │  │   ├── /product/:slug → ProductDetail │ │
│  │  │   ├── /cart          → Cart          │ │
│  │  │   ├── /terms-and-conditions          │ │
│  │  │   ├── /privacy-policy                │ │
│  │  │   └── /refund-policy                 │ │
│  │  └── Footer (always visible)            │ │
│  └─────────────────────────────────────────┘ │
│              │  Axios (/api/*)               │
│              ▼                               │
│  ┌─────────────────────────────────────────┐ │
│  │  Express API Server @ :5000             │ │
│  │  ├── /api/products     (CRUD)           │ │
│  │  ├── /api/reviews      (GET)            │ │
│  │  └── /api/health       (health check)   │ │
│  └─────────────────────────────────────────┘ │
│              │                               │
│              ▼                               │
│  ┌─────────────────────────────────────────┐ │
│  │  MongoDB (localhost:27017/kalavatri)     │ │
│  │  Collections: products, reviews          │ │
│  └─────────────────────────────────────────┘ │
└──────────────────────────────────────────────┘
```

### Offline / No-Backend Fallback
The frontend includes a **fallback data layer** (`services/fallbackData.js`) with 8 hardcoded products and 6 reviews. If the backend API is unreachable (5s timeout), the app gracefully degrades to this static data — the UI still works fully.

---

## 5. File Structure

```
KALAVATRI/
├── backend/
│   ├── .env                        # MONGO_URI, PORT, NODE_ENV
│   ├── server.js                   # Express entry — CORS, routes, MongoDB connect
│   ├── package.json                # Backend dependencies
│   ├── models/
│   │   ├── Product.js              # Mongoose schema: name, slug, price, image, category, badge, sizes, colors...
│   │   └── Review.js               # Mongoose schema: name, rating, comment, verified
│   ├── routes/
│   │   ├── productRoutes.js        # GET /api/products, GET /api/products/:slug
│   │   └── reviewRoutes.js         # GET /api/reviews
│   └── seed/
│       └── seedData.js             # Database seeder script
│
├── frontend/
│   ├── index.html                  # HTML shell — Google Fonts loaded here
│   ├── vite.config.js              # Vite config — port 3000, proxy /api → :5000
│   ├── package.json                # Frontend dependencies
│   ├── public/
│   │   ├── favicon.svg
│   │   ├── icons.svg
│   │   └── images/                 # Product images (JPG, ~550-975KB each)
│   │       ├── hero_banner.jpg
│   │       ├── jutti_maroon_gold.jpg
│   │       ├── jutti_pink_floral.jpg
│   │       ├── jutti_blue_silver.jpg
│   │       ├── jutti_green_paisley.jpg
│   │       ├── jutti_red_bridal.jpg
│   │       ├── jutti_white_pearl.jpg
│   │       ├── jutti_yellow_mirror.jpg
│   │       └── jutti_black_leaf.jpg
│   └── src/
│       ├── main.jsx                # React entry — CartProvider wraps App
│       ├── App.jsx                 # Router & route definitions
│       ├── App.css                 # App-level styles
│       ├── index.css               # DESIGN SYSTEM — all CSS variables, reset, buttons, sections
│       ├── assets/
│       │   └── hero.png            # (unused/alt hero asset)
│       ├── components/
│       │   ├── Navbar.jsx / .css   # Top nav — announcement bar, search, cart badge, mobile menu
│       │   ├── Hero.jsx / .css     # Hero banner — headline, stats, hero image
│       │   ├── ProductCard.jsx/.css# Product card — image, name, rating, price/discount
│       │   ├── TestimonialCard.jsx/.css  # Review card — name, rating, comment
│       │   ├── Newsletter.jsx/.css # Email subscribe section
│       │   └── Footer.jsx / .css   # Site footer — brand, links, social, payment badges
│       ├── context/
│       │   └── CartContext.jsx     # React Context — cart state, localStorage persistence
│       ├── pages/
│       │   ├── Home.jsx / .css     # Homepage — Hero, brands, new arrivals, top selling, categories, testimonials, newsletter
│       │   ├── ProductDetail.jsx/.css  # Single product page — image, sizes, colors, add to cart, reviews
│       │   ├── Cart.jsx / .css     # Shopping cart — item list, quantity controls, order summary
│       │   ├── TermsAndConditions.jsx  # Terms & Conditions page
│       │   ├── PrivacyPolicy.jsx       # Privacy Policy page
│       │   ├── RefundPolicy.jsx        # Refund & Cancellation Policy page
│       │   └── PolicyPage.css          # Shared styles for all policy pages
│       └── services/
│           ├── api.js              # Axios instance — getProducts, getProductBySlug, getReviews
│           └── fallbackData.js     # Static fallback: 8 products + 6 reviews
│
├── PROJECT_CONTEXT.md              # ← This file
├── PROJECT_RULES.md                # Dev rules & conventions
├── GSD-STYLE.md                    # GSD workflow style guide
└── .gitignore
```

---

## 6. Data Models

### Product Schema
```js
{
  name:          String,       // "Maharani Maroon — Zardozi"
  slug:          String,       // "maharani-maroon-zardozi" (unique, used in URL)
  description:   String,
  price:         Number,       // Current price in INR (e.g. 2499)
  originalPrice: Number|null,  // Original price before discount (null if no discount)
  discount:      Number,       // Discount percentage (0 if none)
  image:         String,       // Path like "/images/jutti_maroon_gold.jpg"
  category:      Enum,         // "bridal" | "festive" | "everyday" | "designer"
  badge:         Enum,         // "new" | "bestseller" | "sale" | ""
  rating:        Number,       // 0–5
  reviewCount:   Number,
  sizes:         [Number],     // e.g. [5, 6, 7, 8, 9, 10]
  colors:        [String],     // e.g. ["Maroon", "Gold"]
  inStock:       Boolean,
  featured:      Boolean,
  timestamps:    true          // createdAt, updatedAt
}
```

### Review Schema
```js
{
  name:       String,     // "Priya M."
  rating:     Number,     // 1–5
  comment:    String,
  verified:   Boolean,    // default true
  timestamps: true
}
```

### Cart Item (Frontend State)
```js
{
  ...product,              // Spread of full product object
  quantity:  Number,       // Selected quantity
  size:      Number,       // Selected size
  color:     String,       // Selected color
}
```
Cart is managed via React Context (`CartContext`) and persisted to `localStorage` under key `kalavatri_cart`.

---

## 7. API Endpoints

| Method | Endpoint              | Description                    |
|--------|-----------------------|--------------------------------|
| GET    | `/api/products`       | List all products (with query params) |
| GET    | `/api/products/:slug` | Get single product by slug     |
| GET    | `/api/reviews`        | List all reviews               |
| GET    | `/api/health`         | Health check                   |

---

## 8. Pages & Routes

| Route                    | Component            | Description                          |
|--------------------------|----------------------|--------------------------------------|
| `/`                      | `Home`               | Landing page — hero, products, testimonials |
| `/product/:slug`         | `ProductDetail`      | Single product view with add-to-cart |
| `/cart`                  | `Cart`               | Shopping cart & order summary        |
| `/terms-and-conditions`  | `TermsAndConditions` | Terms & Conditions policy page       |
| `/privacy-policy`        | `PrivacyPolicy`      | Privacy Policy page                  |
| `/refund-policy`         | `RefundPolicy`       | Refund & Cancellation Policy page    |

---

## 9. Business Policies (Important!)

### Refund & Cancellation
- **No refunds** — all sales are final
- **No cancellations** — orders cannot be cancelled after confirmation
- **Replacement only** — for **defective/damaged items** only
- **7-day window** — claim must be raised within 7 days of delivery
- **Proof required** — photos or video of the defect
- **Not covered** — wrong size ordered, change of mind, normal wear & tear, colour variation from images

### Shipping
- Dispatch within 2–4 business days
- Replacement shipping is free (covered by the company)

---

## 10. Key Patterns & Conventions

### CSS
- **No CSS framework** — all styling is vanilla CSS with CSS custom properties
- Design tokens are defined in `index.css` under `:root`
- Each component has its own co-located `.css` file
- Responsive breakpoints: `640px` (mobile), `768px` (tablet), `1024px` (desktop)

### React
- **Functional components** only (no class components)
- **React Router v7** with `BrowserRouter`
- **Context API** for global state (cart) — no Redux
- Icons from `react-icons/fi` (Feather Icons set)
- Components use `Link` from react-router-dom for internal navigation

### Backend
- **ES Modules** (`"type": "module"` in package.json)
- Express 5.x
- Mongoose with `bufferCommands: false` and `serverSelectionTimeoutMS: 5000`
- Server starts even if MongoDB connection fails (graceful degradation)

---

## 11. Running the Project

### Prerequisites
- Node.js (v18+)
- MongoDB (optional — falls back to static data)

### Start Backend
```bash
cd backend
npm install
npm run dev        # Starts on http://localhost:5000 with --watch
```

### Start Frontend
```bash
cd frontend
npm install
npm run dev        # Starts on http://localhost:3000
```

### Environment Variables (`backend/.env`)
```
MONGO_URI=mongodb://localhost:27017/kalavatri
PORT=5000
NODE_ENV=development
```

### Build for Production
```bash
cd frontend
npm run build      # Output → frontend/dist/
```

---

## 12. Current Product Catalogue (Fallback Data)

| # | Name                          | Slug                          | Price  | Category  | Badge      |
|---|-------------------------------|-------------------------------|--------|-----------|------------|
| 1 | Maharani Maroon — Zardozi     | maharani-maroon-zardozi       | ₹2,499 | Festive   | new        |
| 2 | Rose Garden — Floral Pearl    | rose-garden-floral-pearl      | ₹1,999 | Everyday  | new        |
| 3 | Royal Neel — Silver Mirror    | royal-neel-silver-mirror      | ₹2,799 | Festive   | —          |
| 4 | Emerald Paisley — Golden Thread| emerald-paisley-golden-thread | ₹2,199 | Everyday  | new        |
| 5 | Bridal Red — Zardozi Kundan   | bridal-red-zardozi-kundan     | ₹3,499 | Bridal    | bestseller |
| 6 | Ivory Dream — Pearl Bridal    | ivory-dream-pearl-bridal      | ₹3,999 | Bridal    | bestseller |
| 7 | Sunshine Sheesha — Mirror Work| sunshine-sheesha-mirror-work  | ₹1,499 | Everyday  | sale       |
| 8 | Midnight Leaf — Thread Embroidery| midnight-leaf-thread-embroidery| ₹2,299 | Designer | bestseller |

---

## 13. Homepage Sections (in order)

1. **Announcement Bar** — "Sign up and get 20% off" (dismissible)
2. **Navbar** — Brand logo, nav links (Shop, On Sale, New Arrivals, Brands), search, cart, account
3. **Hero** — Headline "FIND JUTTIS THAT MATCHES YOUR STYLE", stats (200+ brands, 2000+ products, 30000+ customers), hero image
4. **Brand Strip** — ZARDOZI, KUNDAN, MIRROR WORK, PHULKARI, THREAD ART
5. **New Arrivals** — Products with `badge: "new"`, 4 cards
6. **Divider**
7. **Top Selling** — Products with `badge: "bestseller"` or `"sale"`, 4 cards
8. **Browse by Jutti Style** — Asymmetric category grid (Bridal, Festive, Everyday, Designer)
9. **Our Happy Customers** — Testimonial cards with slider nav
10. **Newsletter** — Email subscription CTA
11. **Footer** — Brand, links (Company, Help, FAQ, Resources), social icons, payment badges

---

*Last updated: October 2026*
