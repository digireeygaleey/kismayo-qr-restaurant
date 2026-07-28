# QR Code Restaurant Ordering System

## Step-by-Step Project Plan

**Kismayo, Jubaland, Somalia**

*Scan. Order. Pay. - From Table to Kitchen in Seconds*

July 2026

---

## Table of Contents

1. Project Overview & Vision
2. Market Analysis - Kismayo Restaurants
3. System Architecture Overview
4. Tech Stack & Tools
5. Database Design (Schema)
6. API Endpoints
7. Customer-Facing App (QR Menu)
8. Restaurant Admin Dashboard
9. Kitchen Display System (KDS)
10. Payment Integration (SOMQR / EVC Plus / eDahab)
11. PWA & Offline Strategy
12. Deployment & Infrastructure
13. Development Timeline (12 Weeks)
14. Budget & Cost Breakdown
15. Testing Strategy
16. Launch & Marketing Plan
17. Revenue Model & Projections
18. Post-Launch Maintenance
19. Risk Assessment & Mitigation
20. Appendix - File Structure & Code Samples

---

## 1. PROJECT OVERVIEW & VISION

### 1.1 Problem Statement

Restaurants in Kismayo operate with paper menus and manual order taking. This causes:

- Long wait times for customers to place orders
- Order errors - wrong items, wrong quantities, missed special requests
- Slow service during peak hours (lunch 12-2pm, dinner 7-10pm)
- No sales data or analytics for restaurant owners
- Cash-only operations with no digital payment trail
- Staff overwhelmed during rush hours

### 1.2 Solution

A QR code-based ordering system where:

- Each table has a unique QR code
- Customer scans QR with phone camera -> opens menu instantly (no app download)
- Customer browses menu, adds items to cart, places order
- Order appears on Kitchen Display System in real-time (audio alert)
- Customer pays via mobile money (EVC Plus, eDahab, Sahal) or cash
- Restaurant tracks all orders, revenue, and popular items on dashboard

### 1.3 Target Users

- **Customers:** Diners at restaurants, cafes, and hotels in Kismayo
- **Restaurant Staff:** Waiters, kitchen staff, managers
- **Restaurant Owners:** Decision makers who pay for the system
- **Hotel Restaurants:** Camp Kismayo, Mecca Hotel, Harwanaag

### 1.4 Key Value Proposition

- **For Customers:** Fast ordering, no waiting, digital payment, order tracking
- **For Restaurant Owners:** 30% faster service, 20% fewer errors, full sales analytics
- **For You:** $5-30/month per restaurant, recurring revenue, first-mover in Kismayo

---

## 2. MARKET ANALYSIS - KISMAYO RESTAURANTS

### 2.1 Target Restaurants in Kismayo

Primary targets (high-traffic, willing to pay):

| Restaurant | Type | Tables | Why Them |
|---|---|---|---|
| Camp Kismayo | Hotel/Conference | 20+ | 100+ rooms, UN guests, needs modern system |
| Mecca Hotel | Hotel/Restaurant | 10+ | 42 rooms, 5 conference rooms |
| Harwanaag Hotel | Hotel/Restaurant | 8+ | Restaurant + accommodation |
| Tawakal Hotel | Daily Dining | 10+ | High foot traffic, daily diners |
| Kismayo Business Ctr | Premium | 12+ | Corporate clients, events |
| Kaafi Restaurant | Local | 8+ | Popular local spot |
| Dahabshiil Cafe | Cafe | 6+ | Near mobile money agents |
| Various local cafes | Cafe/Fast Food | 4-8 | High volume, quick service |

### 2.2 Market Size

- Estimated 50+ restaurants/cafes in Kismayo
- 15-20 restaurants likely to adopt in first year
- Average willingness to pay: $10-20/month
- Year 1 potential: 15 restaurants x $15/month = $225/month = $2,700/year
- Year 2 potential: 30 restaurants x $15/month = $450/month = $5,400/year

### 2.3 Competitor Gap

Existing platforms (EATUP, Maqayad, EatPay) are Mogadishu-focused:

- None have physical presence in Kismayo
- None visit restaurants in person for setup
- None provide Somali-language support on the ground
- None understand Kismayo-specific challenges (connectivity, power)

**Your advantage:** You ARE in Kismayo. You can walk into restaurants tomorrow.

---

## 3. SYSTEM ARCHITECTURE OVERVIEW

### 3.1 High-Level Architecture

The system has 3 main components:

#### Component 1: Customer App (PWA)

- Progressive Web App - no download needed
- Scanned via QR code -> opens in browser
- Menu browsing, cart, checkout, payment
- Works offline (cached menu)
- Somali/Arabic/English language toggle

#### Component 2: Restaurant Admin Dashboard

- Web app accessible via browser
- Menu management (add/edit/remove items, photos, prices)
- Table management (add tables, generate QR codes)
- Order management (view all orders, status updates)
- Analytics dashboard (revenue, popular items, peak hours)
- WhatsApp notifications (optional)

#### Component 3: Kitchen Display System (KDS)

- Web app on wall-mounted tablet/monitor
- Real-time order display via Socket.io
- Audio alert on new order
- Order pipeline: New -> Preparing -> Ready -> Served
- Works offline with local sync

### 3.2 Data Flow

Customer scans QR -> Browser loads PWA -> Fetches menu from API -> Customer adds items to cart -> Customer taps "Place Order" -> Order sent to POST /api/orders -> Backend saves to PostgreSQL -> Socket.io broadcasts to Kitchen Display -> Kitchen staff sees order with audio alert -> Kitchen marks "Preparing" -> Kitchen marks "Ready" -> Waiter serves -> Customer pays via mobile money -> Payment confirmed -> Order marked "Paid"

### 3.3 Communication Flow

- Customer -> Backend: REST API (HTTPS)
- Backend -> Kitchen: WebSocket (Socket.io)
- Backend -> Admin: REST API + WebSocket
- Backend -> Payment Gateway: HTTPS API calls
- Admin -> Backend: REST API (HTTPS)

---

## 4. TECH STACK & TOOLS

### 4.1 Frontend

| Tool | Purpose | Why This Choice |
|---|---|---|
| Next.js 15 | React framework | SSR, API routes, file-based routing, PWA support |
| TypeScript | Type safety | Catches bugs at compile time, better DX |
| Tailwind CSS | Styling | Fast UI development, responsive, small bundle |
| Framer Motion | Animations | Smooth transitions, cart animations |
| Socket.io Client | Real-time | Live order updates, kitchen alerts |
| React QR Scanner | QR code scanning | Camera-based QR detection |
| next-pwa | PWA support | Offline caching, install prompt |

### 4.2 Backend

| Tool | Purpose | Why This Choice |
|---|---|---|
| Node.js | Runtime | Fast, huge ecosystem, JS shared with frontend |
| Express.js | HTTP framework | Simple, flexible, well-documented |
| PostgreSQL | Database | Reliable, JSON support, free (Supabase) |
| Prisma | ORM | Type-safe DB queries, migrations, schema |
| Socket.io | WebSockets | Real-time order push to kitchen/admin |
| JWT + bcrypt | Authentication | Secure login for restaurant admins |
| Sharp | Image processing | Compress menu photos for fast loading |
| node-cron | Scheduled tasks | Daily reports, cleanup jobs |

### 4.3 Infrastructure

| Service | Purpose | Cost |
|---|---|---|
| Vercel | Frontend hosting | Free tier (generous) |
| Railway / Render | Backend hosting | Free tier -> $5/mo |
| Supabase | PostgreSQL DB | Free tier (500MB) |
| Cloudflare R2 | Image storage | Free tier (10GB) |
| Cloudflare CDN | Global caching | Free |
| GitHub | Code repository | Free |
| Cloudflare DNS | Domain + SSL | Free |

---

## 5. DATABASE DESIGN (SCHEMA)

### 5.1 Core Tables

The database has 8 core tables:

#### Table: restaurants

- id: UUID (primary key)
- name: VARCHAR(100) - Restaurant name
- slug: VARCHAR(50) - URL-friendly name (e.g., "mecca-hotel")
- description: TEXT
- phone: VARCHAR(20)
- address: TEXT
- logo_url: TEXT
- currency: VARCHAR(3) DEFAULT "USD"
- language: VARCHAR(5) DEFAULT "so" (Somali)
- is_active: BOOLEAN DEFAULT true
- created_at: TIMESTAMP

#### Table: tables

- id: UUID (primary key)
- restaurant_id: UUID (FK -> restaurants)
- table_number: INTEGER
- qr_code: TEXT (generated QR image URL)
- capacity: INTEGER
- is_active: BOOLEAN DEFAULT true

#### Table: categories

- id: UUID (primary key)
- restaurant_id: UUID (FK -> restaurants)
- name: VARCHAR(100)
- sort_order: INTEGER
- is_active: BOOLEAN DEFAULT true

#### Table: menu_items

- id: UUID (primary key)
- restaurant_id: UUID (FK -> restaurants)
- category_id: UUID (FK -> categories)
- name: VARCHAR(100)
- description: TEXT
- price: DECIMAL(10,2)
- image_url: TEXT
- is_available: BOOLEAN DEFAULT true
- sort_order: INTEGER

#### Table: orders

- id: UUID (primary key)
- restaurant_id: UUID (FK -> restaurants)
- table_id: UUID (FK -> tables)
- customer_name: VARCHAR(100)
- customer_phone: VARCHAR(20)
- status: ENUM("pending", "confirmed", "preparing", "ready", "served", "paid", "cancelled")
- total_amount: DECIMAL(10,2)
- payment_method: ENUM("evc_plus", "edahab", "sahal", "cash", "bank")
- payment_status: ENUM("unpaid", "paid", "refunded")
- notes: TEXT
- created_at: TIMESTAMP
- updated_at: TIMESTAMP

#### Table: order_items

- id: UUID (primary key)
- order_id: UUID (FK -> orders)
- menu_item_id: UUID (FK -> menu_items)
- quantity: INTEGER
- unit_price: DECIMAL(10,2)
- subtotal: DECIMAL(10,2)
- special_instructions: TEXT

#### Table: users

- id: UUID (primary key)
- restaurant_id: UUID (FK -> restaurants)
- name: VARCHAR(100)
- email: VARCHAR(100)
- password_hash: TEXT
- role: ENUM("owner", "manager", "staff")
- created_at: TIMESTAMP

#### Table: analytics_events

- id: UUID (primary key)
- restaurant_id: UUID (FK -> restaurants)
- event_type: VARCHAR(50)
- event_data: JSONB
- created_at: TIMESTAMP

---

## 6. API ENDPOINTS

### 6.1 Authentication

- `POST /api/auth/register` - Register restaurant owner
- `POST /api/auth/login` - Login (returns JWT token)
- `POST /api/auth/refresh` - Refresh JWT token

### 6.2 Restaurant Management

- `GET /api/restaurants/:slug` - Get restaurant public info
- `PUT /api/restaurants/:id` - Update restaurant settings
- `GET /api/restaurants/:id/dashboard` - Get dashboard stats

### 6.3 Menu Management

- `GET /api/restaurants/:id/menu` - Get full menu (public)
- `POST /api/restaurants/:id/categories` - Create category
- `PUT /api/categories/:id` - Update category
- `DELETE /api/categories/:id` - Delete category
- `POST /api/restaurants/:id/items` - Create menu item
- `PUT /api/items/:id` - Update menu item
- `DELETE /api/items/:id` - Delete menu item
- `PUT /api/items/:id/availability` - Toggle availability

### 6.4 Table Management

- `GET /api/restaurants/:id/tables` - List all tables
- `POST /api/restaurants/:id/tables` - Add new table
- `PUT /api/tables/:id` - Update table
- `DELETE /api/tables/:id` - Delete table
- `GET /api/tables/:id/qr` - Get QR code image

### 6.5 Orders

- `POST /api/orders` - Place new order (customer)
- `GET /api/restaurants/:id/orders` - List orders (admin)
- `GET /api/orders/:id` - Get order details
- `PUT /api/orders/:id/status` - Update order status
- `GET /api/restaurants/:id/orders/active` - Get active orders (KDS)

### 6.6 Payments

- `POST /api/payments/evc-plus` - Initiate EVC Plus payment
- `POST /api/payments/edahab` - Initiate eDahab payment
- `POST /api/payments/callback` - Payment webhook callback
- `GET /api/payments/:id/status` - Check payment status

### 6.7 Analytics

- `GET /api/restaurants/:id/analytics/revenue` - Revenue data
- `GET /api/restaurants/:id/analytics/popular` - Popular items
- `GET /api/restaurants/:id/analytics/peak` - Peak hours

---

## 7. CUSTOMER-FACING APP (QR MENU)

### 7.1 Customer Journey

1. Customer sits at table, scans QR code with phone camera
2. Browser opens -> "restaurant-name.vercel.app/menu?table=5"
3. PWA loads menu (cached if offline) - shows categories
4. Customer taps category (e.g., "Food", "Drinks")
5. Customer taps item -> sees photo, description, price
6. Customer taps "Add to Cart" -> item added with quantity
7. Customer reviews cart -> adds special instructions
8. Customer taps "Place Order" -> enters name + phone
9. Order confirmed -> "Order #47 sent to kitchen!"
10. Customer sees live order status (Preparing -> Ready)
11. When ready, customer picks up food or waiter serves
12. Customer taps "Pay" -> selects EVC Plus/eDahab/cash
13. If mobile money -> enters phone number -> receives PIN
14. Payment confirmed -> "Thank you!" receipt

### 7.2 Screen Designs

#### Screen 1: Welcome / Landing

- Restaurant logo + name
- Table number display: "Table 5"
- Language selector: So | AR | EN
- Button: "View Menu"

#### Screen 2: Menu Browser

- Horizontal category tabs at top
- Grid/list of items per category
- Each item: photo (lazy loaded), name, price, "Add" button
- Search bar at top
- Floating cart icon with item count

#### Screen 3: Item Detail

- Large photo
- Item name, description, price
- Quantity selector (+/-)
- Special instructions textarea
- Add to Cart button

#### Screen 4: Cart / Checkout

- List of items with quantities and subtotals
- Customer name + phone input
- Total amount
- Payment method selector (EVC Plus, eDahab, Cash)
- "Place Order" button

#### Screen 5: Order Tracking

- Order number + status indicator
- Progress bar: Confirmed -> Preparing -> Ready
- Estimated wait time
- "Pay Now" button (when order is served)

#### Screen 6: Payment

- Payment method display
- Phone number input
- "Pay $X.XX" button
- Processing spinner
- Success confirmation

---

## 8. RESTAURANT ADMIN DASHBOARD

### 8.1 Dashboard Features

#### Main Dashboard View

- Today's stats: orders, revenue, average order value
- Live order feed (newest first)
- Quick actions: View Menu, Manage Tables, View Analytics

#### Menu Management

- List all categories with drag-and-drop reordering
- Add/edit/delete categories
- List all items per category with photos, prices
- Add/edit/delete items
- Toggle item availability (86 item)
- Upload photos (compressed automatically)

#### Table Management

- List all tables with status (occupied/free)
- Add new table (auto-generates QR code)
- Download/print QR codes per table
- Set table capacity
- Bulk generate QR codes for all tables

#### Order Management

- Filter orders by status, date, table
- View order details (items, customer info, total)
- Update order status manually
- Export orders to CSV

#### Analytics Dashboard

- Revenue chart (daily/weekly/monthly)
- Popular items (top 10 by order count)
- Peak hours chart (orders per hour)
- Revenue by category
- Average order value trend
- Customer return rate

#### Settings

- Restaurant info (name, phone, address, logo)
- Currency settings
- Operating hours
- Tax settings
- Notification preferences

---

## 9. KITCHEN DISPLAY SYSTEM (KDS)

### 9.1 Purpose

A dedicated screen (tablet or monitor) in the kitchen that shows incoming orders in real-time. Replaces paper tickets and verbal order calling.

### 9.2 KDS Layout

Three-column layout:

#### Column 1: NEW (Red header)

- New orders appear here with audio beep
- Each card shows: Table #, Customer name, Items list
- Kitchen staff taps "Accept" to move to Preparing

#### Column 2: PREPARING (Yellow header)

- Orders being cooked/prepared
- Shows time elapsed since order was accepted
- Each item can be marked "Done" individually
- When all items done -> taps "Ready" -> moves to Column 3

#### Column 3: READY (Green header)

- Completed orders waiting to be served
- Waiter picks up and taps "Served"
- Order disappears from KDS

### 9.3 KDS Features

- Auto-refresh via Socket.io (no manual refresh)
- Audio alerts on new orders (configurable volume)
- Color-coded status indicators
- Time tracking (how long each order takes)
- Works offline (orders queued locally)
- Full-screen mode (no browser chrome)
- Auto-reset after 8 hours (daily restart)

### 9.4 Hardware Requirements

- Old tablet (Android 8+ or iPad) - $30-50 used
- Or any computer with browser + monitor
- Wall mount or stand ($5-10)
- Speaker for audio alerts ($5)
- Total per restaurant: ~$50-70

---

## 10. PAYMENT INTEGRATION

### 10.1 SOMQR Overview

SOMQR is Somalia's national QR payment standard launched by the Central Bank of Somalia in June 2023:

- EMVCo international standard (same as Kenya, South Africa)
- Interoperable across 13 banks + 3 mobile money operators
- Works with EVC Plus, eDahab, Sahal, ZAAD, Premier Wallet
- Powered by SIPS (Somalia Instant Payment System) - 24/7 real-time

### 10.2 eDahab API Integration

eDahab (Somtel/Dahabshil) has the most accessible developer API:

#### Step 1: Register as Merchant

- Contact eDahab at edahab.net
- Get merchant account approved
- Receive: API Key, Agent Code, Merchant ID

#### Step 2: API Integration

- Endpoint: `https://edahab.net/api/api/IssueInvoice`
- Method: POST
- Auth: SHA-256 hash of (merchant_key + amount + timestamp)
- Request: merchant_id, amount, phone, description, callback_url
- Response: invoice_id, redirect_url

#### Step 3: Payment Flow

1. Customer enters phone number (e.g., 61xxxxxxx)
2. Backend calls eDahab API with amount + phone
3. eDahab sends PIN prompt to customer phone
4. Customer enters PIN on phone
5. eDahab calls webhook callback with success/failure
6. Backend updates order status to "paid"
7. Customer sees confirmation on screen

#### Step 4: Webhook Handler

- `POST /api/payments/callback`
- Verify hash signature
- Update order payment_status
- Broadcast to KDS: "Table X - PAID"
- Return 200 OK

### 10.3 EVC Plus Integration

EVC Plus (Hormuud) is the most widely used mobile money:

- Contact Hormuud for merchant API access
- Similar flow: customer enters phone -> PIN prompt -> confirm
- Webhook callback for payment confirmation
- Supports both USSD and app-based payments

### 10.4 Cash Payment

Always support cash as fallback:

- Customer selects "Cash" at checkout
- Order is placed with payment_status = "unpaid"
- Receipt shown with order total
- Waiter collects cash, marks order as "paid" on KDS

---

## 11. PWA & OFFLINE STRATEGY

### 11.1 Why PWA is Critical for Kismayo

- Internet is intermittent - PWA works offline
- No app download - customers scan and use immediately
- Low data usage - menu cached after first load
- Installable - customers can add to home screen
- Fast loading - assets served from cache

### 11.2 PWA Configuration

#### Service Worker Strategy

- Cache menu data on first load
- Cache static assets (CSS, JS, images)
- Network-first for order placement (must be online)
- Cache-first for menu browsing
- Background sync for failed orders

#### Manifest Configuration

- name: "Restaurant Name - Menu"
- short_name: "Menu"
- start_url: "/menu?table=1"
- display: "standalone"
- background_color: "#ffffff"
- theme_color: "#00a86b"
- icons: restaurant logo (192x192, 512x512)

### 11.3 Image Optimization

Kismayo has expensive data. Optimize every image:

- Menu item photos: WebP format, max 80KB each
- Lazy loading: load images only when visible
- Blur-up placeholder: show blurred preview first
- Responsive images: serve 300px on mobile, 600px on desktop
- CDN: Cloudflare R2 for fast delivery in Africa

### 11.4 Offline Menu Experience

- First visit: download full menu + images -> store in Cache API
- Return visits: load from cache instantly (< 1 second)
- If offline: show cached menu, queue orders for when online
- Visual indicator: "You are offline - orders will be sent when connected"

---

## 12. DEPLOYMENT & INFRASTRUCTURE

### 12.1 Deployment Architecture

Three-tier deployment for reliability and low cost:

#### Frontend (Customer App + Admin Dashboard)

- Platform: Vercel (free tier)
- Domain: yourapp.vercel.app (or custom domain)
- Auto-deploy on git push to main branch
- Edge functions for API routes
- Global CDN for fast loading

#### Backend (API + Socket.io)

- Platform: Railway or Render
- Free tier for development, $5/month for production
- Auto-deploy on git push
- Environment variables for secrets
- Health check endpoint

#### Database

- Platform: Supabase (free tier)
- PostgreSQL 15 with 500MB storage
- Built-in auth, real-time subscriptions
- Daily automated backups
- Upgrade to $25/month when needed (8GB storage)

#### Image Storage

- Platform: Cloudflare R2
- 10GB free storage
- Free egress (no bandwidth charges)
- CDN for fast delivery

### 12.2 Domain & SSL

- Register domain: $10-15/year (e.g., kismayomenu.com)
- SSL: Free via Cloudflare or Vercel
- DNS: Cloudflare (free, fast in Africa)

### 12.3 Environment Variables

Backend (.env):

```
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-key
EDAHAB_API_KEY=your-api-key
EDAHAB_MERCHANT_ID=your-merchant-id
EDAHAB_AGENT_CODE=your-agent-code
EVC_PLUS_API_KEY=your-api-key
CLOUDFLARE_R2_BUCKET=your-bucket
CLOUDFLARE_R2_ACCESS_KEY=your-key
CLOUDFLARE_R2_SECRET_KEY=your-secret
```

---

## 13. DEVELOPMENT TIMELINE (12 WEEKS)

### Phase 1: Foundation (Weeks 1-3)

#### Week 1: Setup & Database

- Initialize Next.js project with TypeScript + Tailwind
- Set up PostgreSQL database on Supabase
- Create Prisma schema with all 8 tables
- Run initial migration
- Set up Express.js backend with authentication
- Create JWT auth middleware
- Deploy frontend to Vercel, backend to Railway

#### Week 2: Menu CRUD

- Build admin login page
- Build restaurant settings page
- Build category management (add/edit/delete/reorder)
- Build menu item management (add/edit/delete/toggle)
- Build image upload with compression (Sharp)
- API: All menu endpoints

#### Week 3: Table & QR

- Build table management page
- Implement QR code generation (qrcode library)
- Build QR download/print page
- Build customer menu page (public, no auth)
- API: Table and QR endpoints

### Phase 2: Core Features (Weeks 4-6)

#### Week 4: Ordering Flow

- Build customer cart (add/remove/update quantities)
- Build checkout page (name, phone, payment method)
- Build order placement API
- Build order confirmation page with order number
- API: Order endpoints

#### Week 5: Kitchen Display System

- Build KDS interface (3-column layout)
- Set up Socket.io server
- Implement real-time order push to KDS
- Add audio alerts for new orders
- Build order status update flow

#### Week 6: Payment Integration

- Register for eDahab merchant account
- Implement eDahab API integration
- Implement EVC Plus integration
- Build payment webhook handler
- Build payment status page
- Test payment flow end-to-end

### Phase 3: Polish (Weeks 7-9)

#### Week 7: PWA & Offline

- Configure next-pwa
- Implement service worker caching
- Add offline menu browsing
- Add background sync for orders
- Optimize all images (WebP, lazy loading)

#### Week 8: Analytics Dashboard

- Build revenue charts (Chart.js or Recharts)
- Build popular items report
- Build peak hours analysis
- Build daily/weekly/monthly views
- Implement CSV export

#### Week 9: Multi-language & UX

- Add Somali language (default)
- Add Arabic language
- Add English language
- Language toggle component
- Responsive design pass (mobile, tablet, desktop)
- Accessibility pass

### Phase 4: Testing & Launch (Weeks 10-12)

#### Week 10: Testing

- Unit tests for API endpoints
- Integration tests for order flow
- E2E tests for customer journey
- Load testing (simulate 50 concurrent users)
- Security audit (SQL injection, XSS, CSRF)
- Fix all bugs

#### Week 11: Beta Launch

- Deploy to production
- Set up 1 restaurant (beta partner)
- Print QR codes for all tables
- Train restaurant staff on KDS
- Monitor for 5 days, fix issues

#### Week 12: Public Launch

- Onboard 3-5 restaurants
- Marketing campaign launch
- Set up support WhatsApp number
- Monitor system health
- Gather feedback, plan v1.1

---

## 14. BUDGET & COST BREAKDOWN

### 14.1 Development Costs (First 3 Months)

| Item | Cost | Notes |
|---|---|---|
| Domain name | $12/year | kismayomenu.com or similar |
| Vercel (frontend) | Free | Free tier is generous |
| Railway/Render (backend) | $0 -> $5/mo | Free tier first, then $5/mo |
| Supabase (database) | Free | Free tier: 500MB, 50K monthly users |
| Cloudflare R2 (images) | Free | Free tier: 10GB storage |
| Cloudflare DNS | Free | Fast DNS + free SSL |
| eDahab API | Free | No setup fee, transaction fees apply |
| GitHub | Free | Free for public repos |
| **TOTAL MONTHLY** | **$5-10** | After free tiers are exhausted |

### 14.2 Per-Restaurant Setup Costs

| Item | Cost | Notes |
|---|---|---|
| QR code printing | $2-5 | Laminated QR codes for tables |
| Tablet for KDS | $30-50 | Used Android tablet |
| Tablet stand | $5-10 | Wall mount or desk stand |
| Speaker | $5 | For kitchen audio alerts |
| **TOTAL PER RESTAURANT** | **$42-70** | One-time setup |

### 14.3 Payment Processing Fees

| Provider | Fee | Notes |
|---|---|---|
| eDahab | 1-2% | Standard mobile money fee |
| EVC Plus | 1-2% | Standard mobile money fee |
| Sahal | 1-2% | Standard mobile money fee |
| Cash | 0% | No fees |

### 14.4 Total Year 1 Budget

| Category | Monthly | Yearly |
|---|---|---|
| Infrastructure | $10 | $120 |
| Domain | - | $12 |
| QR printing (10 restaurants) | - | $50 |
| KDS tablets (10 restaurants) | - | $400 |
| **TOTAL** | **$10** | **$582** |

---

## 15. TESTING STRATEGY

### 15.1 Unit Tests

- Test each API endpoint independently
- Test database queries (Prisma)
- Test payment hash generation
- Test QR code generation
- Framework: Jest + Supertest

### 15.2 Integration Tests

- Test full order flow: create order -> payment -> status update
- Test menu CRUD: create category -> add items -> update -> delete
- Test table management: add table -> generate QR -> delete
- Test real-time: Socket.io connection -> order push -> KDS receives

### 15.3 End-to-End Tests

- Customer journey: scan QR -> browse menu -> add to cart -> checkout
- Payment flow: select EVC Plus -> enter phone -> confirm payment
- Admin flow: login -> manage menu -> view orders -> update status
- Framework: Playwright or Cypress

### 15.4 Performance Tests

- Load test: 50 concurrent customers browsing menu
- Stress test: 100 orders in 5 minutes
- Database test: query performance with 10K orders
- Image test: 50 menu items with photos loading simultaneously

### 15.5 Security Tests

- SQL injection prevention (Prisma parameterized queries)
- XSS prevention (sanitize user input)
- CSRF protection (SameSite cookies)
- Authentication bypass attempts
- Payment webhook signature verification
- Rate limiting on API endpoints

---

## 16. LAUNCH & MARKETING PLAN

### 16.1 Beta Launch (Week 11)

- Partner with 1 friendly restaurant (offer free for 1 month)
- Set up their menu, tables, QR codes, KDS
- Train their staff (30-minute session)
- Monitor for issues daily
- Gather feedback from staff and customers
- Fix critical issues within 24 hours

### 16.2 Public Launch (Week 12)

- Onboard 3-5 restaurants (offer 50% off first month)
- Print QR codes for all tables
- Create demo video (1-minute walkthrough)
- Post on Facebook (primary marketing in Kismayo)
- Visit restaurants in person (your biggest advantage)
- Ask satisfied restaurants for testimonials

### 16.3 Marketing Channels

#### Facebook (Primary)

- Create business page: "Kismayo QR Menu"
- Post demo videos of customers scanning and ordering
- Target: restaurant owners in Kismayo Facebook groups
- Cost: $0 organic, $10-20/month for ads

#### Word of Mouth

- Every satisfied restaurant tells their customers
- Customers see the QR code and ask about it
- Restaurant owners talk to other restaurant owners
- Cost: $0

#### In-Person Visits

- Visit every restaurant in Kismayo
- Bring tablet with demo running
- Show how it works in 5 minutes
- Leave QR code sample + your phone number
- Cost: $0 (just your time)

#### WhatsApp

- WhatsApp status updates with demo screenshots
- Share in restaurant owner groups
- Direct messages to potential clients
- Cost: $0

### 16.4 Launch Offers

- Free for first month (no credit card required)
- 50% off for first 3 months for early adopters
- Free QR code printing for first 10 restaurants
- Free KDS tablet setup assistance

---

## 17. REVENUE MODEL & PROJECTIONS

### 17.1 Pricing Tiers

| Tier | Price | Features | Target |
|---|---|---|---|
| Free | $0/mo | 10 items, 5 tables, basic analytics | New cafes, try before buy |
| Pro | $10/mo | Unlimited items/tables, WhatsApp, advanced analytics | Most restaurants |
| Premium | $25/mo | Multi-branch, API, custom branding, priority support | Hotel chains, franchises |

### 17.2 Revenue Projections

#### Year 1 (Months 1-12)

| Month | Restaurants | Avg Price | Monthly Revenue |
|---|---|---|---|
| 1-2 | 1-2 | $0 (free trial) | $0 |
| 3-4 | 3-5 | $10 | $30-50 |
| 5-6 | 5-8 | $10 | $50-80 |
| 7-9 | 8-12 | $12 | $96-144 |
| 10-12 | 12-18 | $12 | $144-216 |
| **Year 1 Total** | | | **$500-1,000** |

#### Year 2 (Months 13-24)

| Quarter | Restaurants | Avg Price | Quarterly Revenue |
|---|---|---|---|
| Q1 | 18-25 | $13 | $700-975 |
| Q2 | 25-35 | $13 | $975-1,365 |
| Q3 | 35-50 | $14 | $1,470-2,100 |
| Q4 | 50-70 | $14 | $2,100-2,940 |
| **Year 2 Total** | | | **$5,245-7,380** |

### 17.3 Additional Revenue Streams

- Premium QR code design: $5-10 one-time per restaurant
- Custom menu photography: $20-50 per restaurant
- Training workshops: $10-20 per restaurant
- Consulting for other Somali cities: $50-100 per project
- White-label licensing: $100-200/month to other developers

### 17.4 Break-Even Analysis

- Monthly fixed costs: ~$10 (hosting) + $10 (domain amortized) = $20/month
- Need 2 Pro-tier restaurants ($20/month) to break even
- Expected break-even: Month 3-4
- After break-even: $10-200/month pure profit

---

## 18. POST-LAUNCH MAINTENANCE

### 18.1 Weekly Tasks

- Monitor server health and error logs (15 min)
- Check payment webhook success rate (5 min)
- Review and respond to support messages (30 min)
- Push bug fixes if any issues found (30-60 min)

### 18.2 Monthly Tasks

- Update dependencies (npm audit fix) (30 min)
- Review analytics for each restaurant (1 hour)
- Onboard new restaurants if any sign up (1-2 hours)
- Backup database (automated via Supabase)
- Review costs and optimize if needed

### 18.3 Quarterly Tasks

- Major feature updates (new capabilities)
- Performance optimization pass
- Security audit (check for vulnerabilities)
- User feedback review and roadmap planning
- Update documentation

### 18.4 Support Plan

- WhatsApp support number for restaurant owners
- Response time: within 2 hours during business hours
- Issue tracking: simple spreadsheet or GitHub Issues
- Escalation: critical bugs fixed within 4 hours

### 18.5 Backup Strategy

- Database: daily automated backups via Supabase (retained 7 days)
- Code: GitHub repository (auto-backed up)
- Images: Cloudflare R2 (versioned)
- Environment variables: stored in Vercel/Railway secrets
- Manual backup: export database weekly to local storage

---

## 19. RISK ASSESSMENT & MITIGATION

### 19.1 Technical Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Internet outage | High | PWA offline mode, cached menu, order queue |
| Power outage | High | Solar for KDS tablet, battery backup, mobile data |
| Payment API downtime | Medium | Cash fallback, retry logic, queue payments |
| Database failure | Medium | Daily backups, Supabase automated recovery |
| Security breach | High | JWT auth, input validation, rate limiting, HTTPS |
| Slow loading | Medium | Image compression, CDN, lazy loading, caching |

### 19.2 Business Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Restaurants refuse to adopt | High | Free trial, in-person demos, show ROI |
| Competitor enters Kismayo | Medium | First-mover advantage, local relationships |
| Low digital literacy | Medium | Simple UI, training sessions, Somali language |
| Customers prefer paper menus | Medium | Hybrid approach (QR + paper), gradual transition |
| Mobile money fees too high | Low | Cash option always available, negotiate rates |
| Regulatory changes | Low | Monitor CBS announcements, adapt quickly |

### 19.3 Contingency Plans

- If < 5 restaurants in 6 months: pivot to delivery ordering (Geeye model)
- If payment APIs fail: focus on cash-only QR ordering
- If hosting costs exceed revenue: migrate to self-hosted on local server
- If competitor launches in Kismayo: differentiate on price and support

---

## 20. APPENDIX - FILE STRUCTURE & CODE SAMPLES

### 20.1 Project File Structure

```
kismayo-qr-menu/
  apps/
    customer/          # Customer PWA (Next.js)
      app/
        menu/          # Menu page (/?table=X)
        order/         # Order tracking
        payment/       # Payment page
      components/
        MenuGrid.tsx   # Menu item grid
        Cart.tsx       # Shopping cart
        Checkout.tsx   # Checkout form
        QRScanner.tsx  # QR code scanner
    admin/             # Admin dashboard (Next.js)
      app/
        dashboard/     # Main dashboard
        menu/          # Menu management
        tables/        # Table management
        orders/        # Order management
        analytics/     # Analytics dashboard
        settings/      # Restaurant settings
      components/
        OrderCard.tsx  # Order display card
        MenuEditor.tsx # Menu item editor
        QRGenerator.tsx# QR code generator
    kitchen/           # Kitchen Display System
      app/
        page.tsx       # KDS main screen
      components/
        OrderColumn.tsx# New/Preparing/Ready columns
        OrderTicket.tsx# Individual order card
  packages/
    api/               # Express.js backend
      routes/
        auth.ts        # Authentication routes
        menu.ts        # Menu CRUD routes
        orders.ts      # Order management routes
        payments.ts    # Payment routes
        analytics.ts   # Analytics routes
      middleware/
        auth.ts        # JWT verification
        rateLimit.ts   # Rate limiting
      services/
        payment.ts     # Payment API integration
        socket.ts      # Socket.io setup
        storage.ts     # Image storage
    shared/            # Shared types and utilities
      types.ts         # TypeScript interfaces
      constants.ts     # App constants
      utils.ts         # Helper functions
  prisma/
    schema.prisma      # Database schema
    migrations/        # Database migrations
  docker/              # Docker configs
    docker-compose.yml # Local dev setup
```

### 20.2 Key Code Snippets

#### Prisma Schema (prisma/schema.prisma)

```prisma
model Restaurant {
  id          String    @id @default(uuid())
  name        String
  slug        String    @unique
  description String?
  phone       String?
  address     String?
  logoUrl     String?
  currency    String    @default("USD")
  language    String    @default("so")
  isActive    Boolean   @default(true)
  createdAt   DateTime  @default(now())
  tables      Table[]
  categories  Category[]
  menuItems   MenuItem[]
  orders      Order[]
  users       User[]
  events      AnalyticsEvent[]
}

model Table {
  id           String     @id @default(uuid())
  restaurantId String
  restaurant   Restaurant @relation(fields: [restaurantId], references: [id])
  tableNumber  Int
  qrCode       String?
  capacity     Int        @default(4)
  isActive     Boolean    @default(true)
  orders       Order[]
}

model MenuItem {
  id           String     @id @default(uuid())
  restaurantId String
  restaurant   Restaurant @relation(fields: [restaurantId], references: [id])
  categoryId   String
  category     Category   @relation(fields: [categoryId], references: [id])
  name         String
  description  String?
  price        Decimal    @db.Decimal(10, 2)
  imageUrl     String?
  isAvailable  Boolean    @default(true)
  sortOrder    Int        @default(0)
  orderItems   OrderItem[]
}

model Order {
  id            String      @id @default(uuid())
  restaurantId  String
  restaurant    Restaurant  @relation(fields: [restaurantId], references: [id])
  tableId       String
  table         Table       @relation(fields: [tableId], references: [id])
  customerName  String
  customerPhone String?
  status        OrderStatus @default(PENDING)
  totalAmount   Decimal     @db.Decimal(10, 2)
  paymentMethod PaymentMethod?
  paymentStatus PaymentStatus @default(UNPAID)
  notes         String?
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt
  items         OrderItem[]
}

enum OrderStatus {
  PENDING
  CONFIRMED
  PREPARING
  READY
  SERVED
  PAID
  CANCELLED
}

enum PaymentMethod {
  EVC_PLUS
  EDAHAB
  SAHAL
  CASH
  BANK
}

enum PaymentStatus {
  UNPAID
  PAID
  REFUNDED
}
```

#### Payment Integration (packages/api/services/payment.ts)

```typescript
import crypto from 'crypto';

const EDAHAB_API = 'https://edahab.net/api/api';
const MERCHANT_ID = process.env.EDAHAB_MERCHANT_ID;
const API_KEY = process.env.EDAHAB_API_KEY;

function generateHash(amount: string, timestamp: string): string {
  const data = MERCHANT_ID + amount + timestamp + API_KEY;
  return crypto.createHash('sha256').update(data).digest('hex');
}

export async function initiateEdahabPayment(
  phone: string,
  amount: number,
  orderId: string
) {
  const timestamp = Date.now().toString();
  const hash = generateHash(amount.toString(), timestamp);

  const response = await fetch(`${EDAHAB_API}/IssueInvoice`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      merchantid: MERCHANT_ID,
      amount: amount,
      phone: phone,
      description: `Order #${orderId}`,
      hash: hash,
      timestamp: timestamp,
      callbackurl: `${process.env.API_URL}/api/payments/callback`,
    }),
  });

  const data = await response.json();
  return data;
}

export function verifyPaymentCallback(body: any): boolean {
  const hash = generateHash(body.amount, body.timestamp);
  return hash === body.hash;
}
```

#### Socket.io Setup (packages/api/services/socket.ts)

```typescript
import { Server } from 'socket.io';

let io: Server;

export function initSocket(server: any) {
  io = new Server(server, {
    cors: {
      origin: ['http://localhost:3000', 'http://localhost:3001'],
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('join-restaurant', (restaurantId: string) => {
      socket.join(`restaurant:${restaurantId}`);
    });

    socket.on('join-kitchen', (restaurantId: string) => {
      socket.join(`kitchen:${restaurantId}`);
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  return io;
}

export function emitNewOrder(restaurantId: string, order: any) {
  io?.to(`kitchen:${restaurantId}`).emit('new-order', order);
}

export function emitOrderUpdate(restaurantId: string, order: any) {
  io?.to(`restaurant:${restaurantId}`).emit('order-update', order);
  io?.to(`kitchen:${restaurantId}`).emit('order-update', order);
}
```

---

## Summary

You have everything you need to start building.

The code, the plan, the market, the payments.

The only thing left is to execute.

- **Week 1:** Set up the project and database
- **Week 2-3:** Build menu management and QR codes
- **Week 4-6:** Build ordering flow and payments
- **Week 7-9:** Polish, PWA, analytics
- **Week 10-12:** Test, beta launch, public launch

**Start building today. Your first restaurant client is waiting.**

---

*Project Plan - July 2026*

*QR Code Restaurant Ordering System - Kismayo, Somalia*
