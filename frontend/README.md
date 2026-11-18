# Calm Glass Frontend — Distributed URL Shortener

Modern, production-grade Single-Page Application (SPA) designed with the **"Calm Glass"** design system for the Distributed URL Shortener platform.

---

## 1. Architecture & Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Framework** | React 18 + TypeScript | UI component composition, type-safe state |
| **Build Tooling** | Vite 6 | Sub-second HMR, optimized ES modules & code-splitting |
| **Styling** | Tailwind CSS 3 | Design token system, glassmorphic utility classes |
| **Motion** | Framer Motion 11 | GPU-accelerated page transitions, count-up counters, layout spring animations |
| **Routing** | React Router v6 | Client-side routing, route-based aurora hue shifts, protected route guards |
| **Server State** | TanStack React Query v5 | Automatic background caching, query deduplication, focus refetching |
| **Data Viz** | Recharts v2 | Calm accent gradient area chart, custom glass tooltips |
| **Testing** | Vitest + RTL + MSW | 48 unit & integration tests, network layer interception |
| **E2E Testing** | Playwright | Full headless browser journey (Create $\rightarrow$ Redirect $\rightarrow$ Analytics) |

---

## 2. Design System: "Calm Glass"

The UI is built on a quiet, translucent foundation where the background aurora and glass layers carry the aesthetic personality while maintaining strict WCAG AA contrast standards ($4.5:1$ body text, $3:1$ large elements).

### 2.1 Design Tokens

- **Glass Surfaces:**
  - `glass-base`: `backdrop-filter: blur(16px) saturate(140%)`, white background at 6% (dark) / 45% (light), 1px subtle white border.
  - `glass-raised`: `backdrop-filter: blur(20px) saturate(140%)`, white background at 8% (dark) / 55% (light), top-edge highlight, soft layered shadow.
  - `glass-overlay`: `backdrop-filter: blur(24px) saturate(150%)`, white background at 12% (dark) / 70% (light), elevated z-axis depth.
  - Solid fallback provided via `@supports not (backdrop-filter: blur(1px))`.
- **Aurora Background:**
  - Full-viewport GPU-rendered canvas drifting smoothly at 60fps.
  - 3 large blurred radial blobs responding gently to pointer coordinates with parallax easing.
  - Film-grain noise SVG turbulence filter to eliminate color banding.
  - Respects `prefers-reduced-motion` and automatically pauses when the browser tab is hidden (`document.hidden`).
  - **Route-based hue shifting:**
    - Home (`/`): `0deg` (Neutral Deep Indigo)
    - Dashboard (`/dashboard`): `+25deg` (Calm Teal/Cyan)
    - Link Details (`/links/:code`): `-25deg` (Soft Violet)
    - Login (`/login`): `+45deg` (Amber/Coral Focus)
    - Expired (`/expired`): `-55deg` (Muted Warm Amber)
- **Color Grading:**
  - Dark base: Deep ink blue-violet (`#0B0B1A`).
  - Light base: Soft luminous slate (`#F8FAFC`).
  - Accent palette: Indigo (`#6366F1`) $\rightarrow$ Violet (`#8B5CF6`) $\rightarrow$ Cyan (`#06B6D4`) with Coral (`#F43F5E`) primary CTA highlight.

---

## 3. Pages & Features

### 3.1 Home (`/`)
- Centered glass card containing destination URL input with live format validation (`http/https`, max 2,048 chars).
- Collapsible options section for custom codes (`[A-Za-z0-9_-]{3,15}`) and future expiration dates.
- Instant feedback with inline alerts for `409 SHORT_CODE_TAKEN` and `429 RATE_LIMITED` showing backend trace IDs.
- Success card with ambient glow, monospace short link, quick-copy button, and QR Code modal.

### 3.2 Authentication & User Isolation (`/login`)
- Clean API Key authentication screen.
- Supports pre-configured Demo Key (`calm_live_demo_key_99x`) with a 1-click **"Fill Demo API Key"** button.
- Supports any custom developer key ($8+$ characters).
- **Strict User Isolation:** Per Rule 5, auth keys are held purely in memory (`AuthContext`). When a new user logs in, they only see links associated with their own `owner_id`. New users see a polished empty state rather than demo links.

### 3.3 Dashboard (`/dashboard`)
- Real-time KPI summary cards: Total Links, Total Tracked Clicks, Active vs Expired.
- Paginated glass table with monospace short code, truncated destination with tooltip, direct redirect test link, click counter, creation date, and expiration status badge.
- Search filter input matching short codes or destination URLs in real-time.
- Modal workflows:
  - **Edit Expiration Modal:** Update or remove link expiry dates.
  - **Delete Confirmation Modal:** Two-step permanent deletion warning.
- Empty states for zero-link accounts and zero-match search queries.

### 3.4 Link Details & Visual Analytics (`/links/:code` or `/stats/:code`)
- Animated count-up counter for total click volume.
- Recharts area chart illustrating 7-day click history with accent gradient fills and custom glass tooltips.
- Top referrers breakdown with custom icons and percentage progress bars.
- 0-click empty state handling for newly created links without chart distortion.
- Quick-copy header and QR code SVG download button.

### 3.5 Edge States & Error Recovery
- **404 Not Found (`*`):** Calm glass card guiding users back to active routes.
- **Expired Link (`/expired`):** Informative notice for links whose TTL has elapsed.
- **Offline Banner:** Global network listener showing an amber banner with ARIA live alerts when offline.
- **Error Boundary:** Catches unexpected React tree exceptions and presents the MDC `traceId` with 1-click copy for debugging.

---

## 4. Local Development

### Prerequisites
- Node.js 22+
- npm 10+

### Setup & Dev Server
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm ci

# Start Vite dev server on http://localhost:5173
npm run dev
```

*Note: Vite dev server automatically proxies `/api` and `/actuator` requests to `http://localhost:8080` (or `VITE_API_BASE_URL`).*

---

## 5. Testing Suites

### 5.1 Unit & Integration Tests (Vitest + RTL + MSW)
```bash
# Run all Vitest suites once
npm test -- --run

# Run in watch mode
npm run test:watch
```
- **48 tests passing across 7 suites:**
  - `src/test/shorten.test.tsx`: Form validation and error mapping.
  - `src/test/dashboard.test.tsx`: Table pagination, search, edit expiry, delete.
  - `src/test/details.test.tsx`: Analytics, counter, Recharts rendering.
  - `src/test/auth.test.tsx`: Login validation, demo autofill, route guards.
  - `src/test/edge-states.test.tsx`: 404, expired, offline banner, error boundary.
  - `src/test/components.test.tsx`: Glass design system primitives.
  - `src/test/msw-integration.test.tsx`: MSW network interception layer.

### 5.2 End-to-End Tests (Playwright)
```bash
# Run Playwright headless E2E suite
npx playwright test
```
Automates the full critical user journey:
1. Opens `/`.
2. Creates a short link with custom code.
3. Follows the 302 redirect.
4. Verifies recorded clicks on the analytics page.

---

## 6. Production Bundle & Docker

### Performance Budget Compliance
- **Initial JS Bundle:** **120.40 KB gzipped** (Budget: $< 200\text{ KB}$).
- **Lazy Loaded Routes:** Route-level code-splitting ensures Recharts and heavy analytics are only loaded when visiting details pages.

### Multi-Stage Dockerfile (`frontend/Dockerfile`)
```dockerfile
# Stage 1: Build SPA bundle
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Serve via Nginx
FROM nginx:1.27-alpine-slim AS runner
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```
