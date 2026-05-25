# RetailOS Rapid Build Sprint

RetailOS is a mini AI-native retail execution workflow built for the 72-hour sprint. The product simulates a field sales representative visiting outlets, uploading shelf evidence, running AI shelf analysis, detecting fraud, and giving supervisors/admins a dashboard to inspect visits, compliance, fraud, jobs, and operational health.

## How To Run

### Prerequisites

- Node.js
- npm
- Docker Desktop
- Gemini API key
- Cloudinary credentials
- YOLO inference server URL

### 1. Configure Backend Environment

Create `server/.env` from `server/.env.example` and fill in the required values.

Important values:

```text
MONGODB_URI=
MONGODB_DB=
REDIS_URL=
FRONTEND_URL=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
YOLO_SERVER_URL=
YOLO_ENABLED=
GEMINI_API_KEY=
GEMINI_MODEL=
```

### 2. Start Backend Services

```powershell
cd server
npm install
docker compose up -d mongo redis prometheus grafana
npm run dev
```

Backend runs on:

```text
http://localhost:5000
```

To run the whole backend stack in Docker:

```powershell
cd server
docker compose up --build -d
```

For Render or any single-container host, do not use `localhost` for backing
services. Create/provision MongoDB and Redis separately, then set:

```text
MONGODB_URI=<external MongoDB connection string>
MONGODB_DB=retailos
REDIS_URL=<external Redis connection string>
FRONTEND_URL=<deployed frontend origin>
BETTER_AUTH_BASE_URL=<deployed backend origin>
BETTER_AUTH_TRUSTED_ORIGINS=<deployed frontend origin>
ADMIN_EMAIL=<initial admin email>
ADMIN_PASSWORD=<initial admin password>
```

### 3. Start Frontend

Open a second terminal:

```powershell
cd client/retail-os
npm install
npm run dev
```

Frontend runs on:

```text
http://localhost:5173
```

### 4. Useful URLs

```text
Rep dashboard:        http://localhost:5173/shop-dashboard
Admin console:        http://localhost:5173/admin
Jobs dashboard:       http://localhost:5173/admin/jobs
Grafana:              http://localhost:3001
Prometheus:           http://localhost:9090
Backend health:       http://localhost:5000/health
Backend metrics:      http://localhost:5000/metrics
```

Grafana local demo login:

```text
admin / pass@123
```

## Team

Team 3: Navid + Shadman

## Sprint Objective

Build a compact but end-to-end RetailOS workflow that demonstrates:

- fast execution across frontend, backend, AI, and infrastructure
- practical use of AI services in a real business flow
- clear data flow from store visit to supervisor insight
- fraud-aware processing before AI analysis
- operational visibility through dashboards, queues, and observability

The project prioritizes the business workflow over isolated demos. A rep can check in, upload an image, run analysis, and supervisors/admins can review the outcome.

## What We Built

### 1. Store Visit Workflow

Implemented a representative workflow with:

- assigned store dashboard
- store detail page
- visit check-in
- visit image upload
- visit submission
- visit history/feed
- outlet/store metadata including region, address, SKU targets, GPS radius, and store code

The frontend routes include:

- `/shop-dashboard`
- `/stores/:storeId`
- `/stores/:storeId/visit`
- `/stores/:storeId/analysis?visitId=...`
- `/visits`

The backend supports this through visit, store, and image APIs backed by MongoDB.

### 2. AI Shelf Analysis

The shelf analysis pipeline uses:

- a YOLO-compatible inference API for shelf/product detection
- Gemini for supervisor-ready natural language summaries
- persisted AI analysis records in MongoDB

The analysis output includes:

- detected Olympic Noodles products
- detected competitor products
- compliance score
- missing SKU list
- issues
- annotated shelf image
- processing time
- supervisor summary

Why this approach:

- YOLO is fast and appropriate for product/object detection.
- Gemini is useful for converting structured detections into a supervisor-friendly summary.
- Persisting analysis results lets dashboards, history pages, and admin views reuse the same truth instead of rerunning AI repeatedly.

### 3. AI Supervisor Summary

After product detection, the backend sends the structured model output to Gemini and stores a concise summary for supervisors.

Example summary intent:

> Outlet has poor Olympic visibility and missing POSM.

The actual implementation asks Gemini to produce a calm, plain-language shelf observation without exposing raw model confidence scores or ML jargon to business users.

### 4. Dashboard And Review Views

We implemented dashboards for both reps and admins.

Rep-facing views:

- assigned store cards
- store detail and target products
- visit capture flow
- AI analysis result page
- visit feed
- image history
- fraud panel

Admin-facing views:

- admin AI assistant
- visit intelligence dashboard
- fraud review
- user management
- background jobs dashboard

The admin visit view joins visit records with stores, reps, images, and AI analysis so supervisors can inspect performance and evidence in one place.

### 5. Fraud Detection

Fraud detection runs before YOLO/Gemini analysis in the background image processing job.

Implemented checks:

- blurry image detection using image sharpness/variance
- duplicate image detection using perceptual hash comparison
- fake GPS / GPS mismatch detection using haversine distance at check-in

When fraud is detected:

- the image is marked rejected
- a fraud flag is created
- the visit is marked flagged
- AI analysis is skipped for rejected images
- the analysis page now prioritizes fraud state over “processing”

Why this approach:

- Fraud checks should be cheaper and earlier than expensive AI analysis.
- Rejected evidence should not produce compliance scores.
- Supervisors need to know that the problem is evidence quality/fraud, not “AI still loading.”

### Bonus Features Implemented

We implemented several bonus items:

- role-based access for reps/admins
- async queues with BullMQ
- AI chat assistant for admin database questions
- observability with Prometheus and Grafana
- background jobs dashboard
- WhatsApp fraud alert hook

## Architecture

```text
React/Vite Client
  |
  | HTTP + cookie auth
  v
Express/TypeScript API
  |
  | MongoDB
  | Redis/BullMQ
  | Cloudinary
  | YOLO inference API
  | Gemini API
  v
Operational dashboards and persisted RetailOS data
```

### Frontend

Location: `client/retail-os`

Main stack:

- React
- Vite
- TypeScript
- CSS modules through shared `App.css` styling

Important pages:

- `ShopDashboardPage`
- `SingleShopPage`
- `VisitPage`
- `AiAnalysisPage`
- `VisitFeedPage`
- `ImageHistoryPage`
- `FraudPanelPage`
- `AdminVisitsPage`
- `AdminFraudPage`
- `AdminAssistantPage`
- `AdminJobsPage`

### Backend

Location: `server`

Main stack:

- Node.js
- Express
- TypeScript
- MongoDB
- Mongoose and native MongoDB driver
- Redis
- BullMQ
- Better Auth
- Cloudinary
- Sentry
- Prometheus metrics

Important backend areas:

- `src/api/routes`
- `src/services`
- `src/models`
- `src/queues`
- `src/gemini`
- `src/yolo`
- `src/metrics.ts`

## Core Data Flow

### Store Visit Flow

```text
Rep opens assigned stores
  -> selects outlet
  -> checks in
  -> visit record is created
  -> uploads shelf image
  -> image record is created
  -> background image job is queued
  -> rep submits visit
  -> visit enters processing state
```

### Image Processing Flow

```text
BullMQ process-image job starts
  -> upload/source image is resolved
  -> fraud checks run first
  -> if rejected:
       mark image rejected
       create fraud flag
       mark visit flagged
       skip YOLO/Gemini
  -> if accepted:
       call YOLO inference API
       upload annotated image
       generate Gemini supervisor summary
       store AI analysis
       mark visit completed
```

### Analysis Page Flow

```text
Frontend polls /api/visits/:visitId/analysis
  -> backend checks rejected image/fraud flags first
  -> returns flagged immediately if fraud exists
  -> otherwise returns completed analysis or processing/failed state
```

This prevents a fraudulent image from showing an endless AI loading state.

## Why We Took This Approach

### Business Workflow First

The sprint goal was not just to call an AI API. The workflow needed to look like a real retail execution system. That is why we built:

- store assignment
- check-in
- evidence upload
- fraud detection
- AI analysis
- dashboards
- admin review

Each module supports the next step in the business journey.

### Fraud Before AI

Fraud detection is intentionally placed before YOLO/Gemini because:

- it is cheaper
- it prevents bad evidence from generating misleading scores
- it gives supervisors a clear reason for failed analysis
- it reflects real field operations, where evidence validity comes first

### Async Queues

Image processing is too slow and failure-prone for a normal request-response flow. BullMQ lets the API accept work quickly and process heavy tasks in the background.

This improves:

- user experience
- retry behavior
- operational visibility
- separation of upload logic from AI processing

### Persisted AI Results

AI outputs are stored in MongoDB rather than only returned to the client. This allows:

- dashboards to load historical analysis
- admins to inspect visits later
- chat assistant queries to reason over stored data
- observability around completed/missing AI work

### Admin AI Assistant

The admin assistant can inspect database schema and create safe read-only MongoDB queries. We added response formatting so tabular answers render as readable tables with observations instead of raw JSON.

This demonstrates AI-native product thinking: AI is not only used for vision, but also for internal operations and analytics.

### Observability

We added Prometheus/Grafana because AI workflows fail in many places:

- model API latency
- invalid image uploads
- queue failures
- Redis/Mongo issues
- Gemini/YOLO errors

The observability stack helps answer “what is running?”, “what failed?”, and “is the API healthy?”

## Implemented API Areas

High-level API groups:

- `/api/auth/*`
- `/api/stores`
- `/api/visits`
- `/api/images`
- `/api/fraud`
- `/api/admin/*`
- `/api/yolo/*`
- `/metrics`
- `/health`

Useful operational endpoints:

- `GET /health`
- `GET /metrics`
- `GET /api/admin/jobs`
- `GET /api/visits/:visitId/analysis`

## Background Jobs

BullMQ queues:

- `process-image`
- `write-audit-log`
- `send-email`
- `generate-report`
- `cleanup-tasks`

Admin jobs dashboard:

```text
/admin/jobs
```

It shows:

- active jobs
- waiting jobs
- delayed jobs
- failed jobs
- completed jobs
- recent job payloads
- failure reasons

This was added because background AI workflows need visibility during demos and debugging.

## Observability

Prometheus and Grafana are configured under:

```text
server/prometheus
server/grafana
```

Grafana dashboard:

```text
http://localhost:3001
admin / pass@123
```

Prometheus:

```text
http://localhost:9090
```

Metrics endpoint:

```text
http://localhost:5000/metrics
```

Tracked metrics include:

- API health
- HTTP request rate
- 5xx error rate
- latency
- MongoDB connection
- Redis connection
- visits by status
- image rejections
- fraud flags
- AI analysis count
- average compliance score
- average AI processing time
- Node CPU and memory

## Environment Variables

Use `server/.env.example` as the template.

Important variables:

```text
MONGODB_URI=
MONGODB_DB=
REDIS_URL=
FRONTEND_URL=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
YOLO_SERVER_URL=
YOLO_ENABLED=
GEMINI_API_KEY=
GEMINI_MODEL=
```

Do not commit real secrets.

## Demo Path

Suggested demo sequence:

1. Open `/shop-dashboard`
2. Select a store
3. Check in
4. Upload shelf image
5. Submit visit
6. Open analysis page
7. Show AI detection/compliance/supervisor summary
8. Upload duplicate or blurry image to show fraud detection
9. Open `/fraud` or `/admin/fraud`
10. Open `/admin/jobs` to show queue state
11. Open Grafana to show observability
12. Use `/admin/assistant` to ask database questions

## Requirement Coverage

| Sprint Requirement | Implementation |
| :--- | :--- |
| Rep check-in | Store detail check-in flow and visit API |
| Image upload | Visit image upload and Cloudinary integration |
| Outlet info | Store model and store detail UI |
| Product detection | YOLO inference integration |
| Competitor presence | YOLO class output and AI analysis model |
| Compliance scoring | AI analysis compliance score persisted per visit |
| AI supervisor summary | Gemini summary generation |
| Dashboard | Rep dashboard, visit feed, admin visit intelligence |
| Image history | Image history and fraud-aware views |
| Fraud detection | Duplicate, blurry, and GPS mismatch checks |
| Role-based access | Rep/admin guards and backend auth middleware |
| Async queues | BullMQ process-image and audit-log workers |
| Observability | Prometheus, Grafana, `/metrics`, admin jobs UI |
| AI chat assistant | Admin database assistant |

## Code Structure

```text
retail_os/
  client/
    retail-os/
      src/
        pages/
        components/
        services/
        App.tsx
        App.css
  server/
    src/
      api/
      auth/
      cloudinary/
      db/
      gemini/
      logger/
      metrics.ts
      middleware/
      models/
      queues/
      services/
      utils/
      yolo/
    grafana/
    prometheus/
    docker-compose.yml
```

## Testing And Verification

Build checks:

```powershell
cd server
npm run build

cd ../client/retail-os
npm run build
```

Backend tests:

```powershell
cd server
npm test
```

During development we verified:

- TypeScript server build
- TypeScript/Vite client build
- `/health`
- `/metrics`
- Prometheus/Grafana config
- BullMQ job visibility
- fraud-first analysis status handling

## Known Tradeoffs

- The UI is optimized for demo clarity and speed, not a complete production design system.
- The AI assistant uses safe read-only query planning, but it should be further constrained and audited before production use.
- The YOLO server is external, so availability depends on the deployed inference service.
- WhatsApp alert handling is present as a hook, but production delivery depends on provider credentials and phone configuration.
- Offline sync is not implemented.

## How This Demonstrates The Rubric

### Execution Speed

The system covers the full workflow from rep action to admin review and observability. We prioritized an end-to-end vertical slice instead of isolated components.

### AI Tool Usage

AI is used in multiple layers:

- object detection for shelf analysis
- Gemini supervisor reports
- admin database assistant
- AI-assisted development workflow during the sprint

### Product Thinking

The app focuses on retail operations:

- evidence validity
- compliance scoring
- supervisor summaries
- fraud review
- visit history
- job and system visibility

### Code Structure

The backend is separated into routes, services, models, queues, and integrations. The frontend separates pages, components, and API services.

### Communication

The UI exposes status clearly:

- visits can be pending, processing, completed, or flagged
- fraud states stop AI spinners
- background jobs are visible
- dashboards summarize operational health

## Final Summary

RetailOS is a practical AI-native retail execution prototype. It demonstrates how a field rep workflow can be enhanced with AI shelf analysis, fraud detection, supervisor summaries, async processing, admin analytics, and observability. The architecture favors a real product flow: collect evidence, validate it, analyze it, persist results, and make the results visible to both reps and supervisors.
