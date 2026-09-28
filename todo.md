# AgriConnect - Build Plan

## Phase 1: Environment Setup
- [x] Install & start MongoDB
- [x] Scaffold backend (Express + Mongoose + Socket.IO)
- [x] Scaffold frontend (React + Vite + Tailwind)

## Phase 2: Backend
- [x] Config (db, env)
- [x] Models: User, Product, Order, OrderItem, Delivery, Notification, MarketPrice, Cart
- [x] Middleware: auth, role, error, upload
- [x] Controllers + Routes: auth, users, products, orders, cart, deliveries, notifications, market-prices, admin
- [x] Socket.IO real-time layer
- [x] Seed script (admin, farmers, buyers, delivery, products, orders, market prices)

## Phase 3: Frontend
- [x] Tailwind + theme + base components
- [x] Auth context + services (axios, socket)
- [x] Landing page
- [x] Auth pages (login/register)
- [x] Farmer dashboard + product CRUD
- [x] Buyer dashboard + marketplace + product details + cart + orders + tracking
- [x] Delivery partner dashboard
- [x] Admin dashboard + charts
- [x] Market prices + price comparison
- [x] Notifications dropdown + toasts

## Phase 4: Test & Verify
- [x] Start backend + frontend
- [x] Test full workflow (register->order->delivery)
- [x] Fix errors
- [x] README + .env.example
- [ ] Package project
