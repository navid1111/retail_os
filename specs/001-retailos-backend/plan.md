# Implementation Plan: RetailOS Backend

**Branch**: `001-retailos-backend` | **Date**: 2026-05-21 | **Spec**: `specs/001-retailos-mvp/spec.md`

**Input**: Feature specification from `specs/001-retailos-mvp/spec.md`

---

## Summary

Build the RetailOS backend: a REST API that powers store visit workflow, AI shelf analysis (YOLO inference + Gemini report generation via LangChain), fraud detection (pHash, blur, GPS, EXIF), and a supervisor dashboard feed. Images are stored on Cloudinary. Async jobs (image upload post-processing, AI analysis) are queued and consumed via Redis + BullMQ. Auth is role-based (rep / supervisor / admin) via BetterAuth with JWT claims driving access control on all routes. All data is persisted in MongoDB via Mongoose.

---

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 22 LTS

**Primary Dependencies**:
- `express` + `zod` (routing + request validation)
- `better-auth` (authentication, session management, role-based access)
- `mongoose` (MongoDB ODM — schema definitions, typed models, queries)
- `bullmq` + `ioredis` (async job queues: upload post-processing, AI analysis)
- `langchain` + `@langchain/google-genai` (Gemini vision chain for compliance scoring + supervisor summary)
- `axios` (YOLO inference HTTP call to model server)
- `cloudinary` (image upload, signed URL storage)
- `sharp` + `jpeg-exif` (blur detection via Laplacian variance, EXIF extraction)
- `sharp`-based pHash (perceptual hash for duplicate detection)
- `winston` (structured logging)
- `vitest` + `supertest` (unit + integration tests)

**Storage**:
- MongoDB via Mongoose (primary data store — all collections below)
- Redis (BullMQ queue state and job metadata only — no application data)
- Cloudinary (binary image storage; `imageUrl` field stores the Cloudinary signed delivery URL)

**Testing**: `vitest` for unit tests; `supertest` for route integration tests; `mongodb-memory-server` for in-process test database (no external Mongo needed in CI)

**Target Platform**: Linux server (Docker container); deployable to Railway, Render, or any VPS

**Project Type**: REST API web service

**Performance Goals**:
- Check-in + image upload endpoint: < 500 ms p95 (excluding Cloudinary upload time)
- AI analysis job completion: < 30 s p95 end-to-end (YOLO inference + Gemini chain)
- Dashboard visit feed query: < 200 ms p95 (covered by compound indexes on `visits`)

**Constraints**:
- Image binary never touches the Express process memory beyond the multipart buffer — stream directly to Cloudinary
- YOLO inference is a remote HTTP call to a separately deployed model server; this backend does not load or run the model
- No hard delete anywhere — all deletes are soft (`deletedAt` timestamp on every document), matching the audit requirement
- All timestamps stored and returned in UTC
- Mongoose schemas are the source of truth for data shape; the PostgreSQL DDL in the spec is treated as a reference for field names and relationships only

**Scale/Scope**: ~50–200 concurrent reps during demo; designed for correctness over horizontal scale at this stage

---

## Constitution Check

| Gate | Status | Notes |
|------|--------|-------|
| Soft deletes enforced everywhere | PASS | `deletedAt` field on Visit, FraudFlag, VisitImage schemas; queries always include `deletedAt: null` filter |
| No binary model weights in this repo | PASS | YOLO inference is a remote HTTP call only |
| Secrets never in source | PASS | All API keys via environment variables; `.env.example` committed, `.env` gitignored |
| Auth on every non-public route | PASS | BetterAuth middleware applied globally; public routes whitelisted explicitly |
| Audit log written for all mutating actions | PASS | `auditLog()` helper called in every service method that mutates data |
| MongoDB indexes defined in schema | PASS | All query-critical indexes declared in Mongoose schema definitions, not ad-hoc |

---

## Project Structure

### Documentation (this feature)

```text
specs/001-retailos-backend/
├── plan.md              # This file
├── research.md          # Dependency versions, YOLO inference API contract
├── data-model.md        # Mongoose schema reference + index rationale
├── quickstart.md        # Local dev setup: MongoDB, Redis, Cloudinary, YOLO server env vars
├── contracts/
│   ├── visit.ts         # Zod schemas for visit request/response
│   ├── image.ts         # Zod schemas for image upload
│   ├── analysis.ts      # Zod schemas for AI analysis result
│   └── fraud.ts         # Zod schemas for fraud flag payloads
└── tasks.md             # Sprint task breakdown (separate step)
```

### Source Code

```text
backend/
├── src/
│   ├── config/
│   │   ├── env.ts              # Zod-validated env vars (throws on startup if missing)
│   │   ├── cloudinary.ts       # Cloudinary SDK init
│   │   ├── redis.ts            # ioredis client singleton
│   │   └── db.ts               # Mongoose connect() — called once in server.ts
│   │
│   ├── auth/
│   │   ├── better-auth.ts      # BetterAuth instance: roles rep/supervisor/admin
│   │   └── middleware.ts       # requireAuth(), requireRole() Express middleware
│   │
│   ├── models/                 # Mongoose schemas + model exports
│   │   ├── User.model.ts
│   │   ├── Store.model.ts
│   │   ├── StoreSku.model.ts
│   │   ├── Visit.model.ts
│   │   ├── VisitImage.model.ts
│   │   ├── AiAnalysis.model.ts
│   │   ├── Job.model.ts
│   │   ├── FraudFlag.model.ts
│   │   ├── Notification.model.ts
│   │   └── AuditLog.model.ts
│   │
│   ├── services/
│   │   ├── visit.service.ts        # check-in, submit, fetch
│   │   ├── image.service.ts        # upload to Cloudinary, pHash, blur, EXIF checks
│   │   ├── fraud.service.ts        # GPS haversine, duplicate, blur, timestamp logic
│   │   ├── analysis.service.ts     # orchestrates YOLO call + LangChain Gemini chain
│   │   ├── yolo.service.ts         # HTTP client to YOLO inference server
│   │   ├── gemini.service.ts       # LangChain chain: system prompt + Gemini vision
│   │   ├── notification.service.ts # writes Notification doc + dispatches (email/WhatsApp)
│   │   └── audit.service.ts        # auditLog() helper used across all services
│   │
│   ├── queues/
│   │   ├── queues.ts               # BullMQ queue definitions: uploadQueue, analysisQueue
│   │   ├── workers/
│   │   │   ├── upload.worker.ts    # consumes uploadQueue: pHash, blur, EXIF, fraud checks
│   │   │   └── analysis.worker.ts  # consumes analysisQueue: YOLO → Gemini → write AiAnalysis
│   │   └── scheduler.ts            # starts workers on process boot
│   │
│   ├── api/
│   │   ├── routes/
│   │   │   ├── auth.routes.ts      # POST /auth/login, /auth/logout (BetterAuth handler)
│   │   │   ├── visit.routes.ts     # POST /visits, GET /visits, GET /visits/:id
│   │   │   ├── image.routes.ts     # POST /visits/:id/images (multipart)
│   │   │   ├── analysis.routes.ts  # GET /visits/:id/analysis
│   │   │   ├── fraud.routes.ts     # GET /fraud-flags, PATCH /fraud-flags/:id/resolve
│   │   │   ├── dashboard.routes.ts # GET /dashboard/feed, GET /dashboard/chart
│   │   │   └── store.routes.ts     # GET /stores/:id (outlet info for rep)
│   │   ├── validators/             # Zod middleware per route (parse req.body/params)
│   │   └── router.ts               # mounts all route files under /api/v1
│   │
│   ├── utils/
│   │   ├── haversine.ts        # GPS distance calculation
│   │   ├── phash.ts            # perceptual hash computation via sharp
│   │   ├── blur.ts             # Laplacian variance blur score via sharp
│   │   └── exif.ts             # EXIF DateTimeOriginal extraction
│   │
│   ├── app.ts                  # Express app factory (no listen() — keeps testable)
│   └── server.ts               # entry point: calls app.ts + scheduler.ts + listen()
│
├── tests/
│   ├── unit/
│   │   ├── haversine.test.ts
│   │   ├── phash.test.ts
│   │   ├── blur.test.ts
│   │   └── fraud.service.test.ts
│   └── integration/
│       ├── visit.routes.test.ts
│       ├── image.routes.test.ts
│       └── analysis.routes.test.ts
│
├── .env.example
├── Dockerfile
├── docker-compose.yml          # MongoDB + Redis for local dev
├── package.json
└── tsconfig.json
```

**Structure Decision**: Web service layout with models (Mongoose schemas), services (business logic), queues (async workers), and api (HTTP layer) as distinct layers. The `models/` directory is the single source of truth for data shape — Zod validators in `api/validators/` handle only HTTP boundary validation and delegate persistence shape to Mongoose schemas.

---

## Phase 0 — Research Outputs

### YOLO Inference Contract (assumed — confirm with model team)

```
POST http://YOLO_SERVER_URL/predict
Content-Type: multipart/form-data
Body: image file

Response 200:
{
  "detections": [
    { "label": "Olympic Soyabean 1L", "confidence": 0.91, "bbox": [x,y,w,h] },
    ...
  ]
}
```

`yolo.service.ts` maps `detections` to the `productsDetected` array shape on `AiAnalysis`. Brand is derived by matching `label` against `store.skus[].brand`.

### LangChain Gemini Chain Design

```
Chain: image (base64 from Cloudinary URL) + structured context → Gemini vision → structured JSON

System prompt inputs:
  - storeName, region
  - expectedSkus: [{skuName, brand, isRequired, minFacing}]
  - yoloDetections: [{label, confidence}]   ← injected from YOLO step

Chain outputs (enforced via LangChain output parser):
  {
    complianceScore: number,          // 0–100
    competitorsDetected: [{brand, count}],
    posmPresent: boolean,
    missingSkus: string[],
    issues: string[],
    supervisorSummary: string         // 1 paragraph plain English
  }
```

If the YOLO server is unavailable, the chain falls back to Gemini-only detection — controlled by `YOLO_ENABLED=true/false` in `env.ts`.

### Fraud Thresholds (configurable via env)

| Check | Env var | Default |
|---|---|---|
| pHash max Hamming distance | `PHASH_THRESHOLD` | `10` |
| Blur min Laplacian variance | `BLUR_THRESHOLD` | `100.0` |
| GPS max distance | per-store `gpsRadiusM` field | `300 m` |
| EXIF max age delta | `EXIF_MAX_DELTA_HOURS` | `24` |

---

## Phase 1 — Design Decisions

### Queue Architecture

Two queues, two workers, one Redis instance:

```
uploadQueue   → upload.worker.ts
  payload: { imageId, visitId, cloudinaryUrl }
  steps:   download image → pHash check → blur check → EXIF check
           → write FraudFlag docs → if not rejected → enqueue analysisQueue

analysisQueue → analysis.worker.ts
  payload: { imageId, visitId, storeId }
  steps:   fetch store.skus → call YOLO → call Gemini chain
           → write AiAnalysis doc → update Visit.overallScore
           → if score < 50 → write Notification doc
```

The upload worker gates the analysis worker. Rejected images (blur/duplicate) never proceed to AI analysis — enforced by checking `VisitImage.isRejected` before calling `analysisQueue.add()`.

### Auth Flow (BetterAuth + Mongoose)

- BetterAuth handles session creation, JWT signing, and role attachment; it uses the `User` Mongoose model as its user store via a custom adapter
- `requireAuth()` middleware extracts the session and attaches `req.user` (`_id`, `role`, `region`) to the request
- `requireRole('supervisor', 'admin')` is a factory returning middleware that checks `req.user.role`
- Rep-scoped queries add `{ repId: req.user._id }` to the Mongoose query filter; supervisor/admin queries omit this filter

### Error Handling

All route handlers are wrapped in `asyncHandler()`. The Express error middleware maps error types to structured responses:

```json
{ "error": "VALIDATION_ERROR", "details": [...] }
```

Mongoose `CastError` (invalid ObjectId) → 400. `ValidationError` → 422. `11000` duplicate key → 409.

### Audit Log Pattern

Fire-and-forget, never blocks the response:

```typescript
await auditLog({
  actorId: req.user._id,
  action: 'visit_create',
  entityType: 'visit',
  entityId: visit._id,
  meta: { storeId, gpsLat, gpsLng }
})
```

`AuditLog` documents are append-only — the collection has no update or delete operations anywhere in the codebase.

---

## Complexity Tracking

| Decision | Why Needed | Simpler Alternative Rejected Because |
|----------|------------|--------------------------------------|
| Two-step YOLO + Gemini chain | YOLO gives fast bbox detections; Gemini produces narrative and scoring from structured context | Gemini-only is slower and less accurate for object counting; YOLO-only cannot produce natural language summaries |
| BullMQ over simple async/await | Image processing + AI calls take 10–30 s; blocking the HTTP response would time out mobile clients | Simple background promise does not survive process restarts and has no retry logic |
| Embed SKUs in Store document | SKUs are always fetched with the store; embedding avoids a join on the hot path (every AI analysis job needs the SKU list) | Separate collection would require a `populate()` call on every analysis job |
| Reference VisitImages from Visit | Images have independent lifecycle (rejection, fraud flags, history view) and are queried standalone | Embedding images would bloat Visit documents and make the image history query a full collection scan |
| Denormalize `visitId` on AiAnalysis | Dashboard feed and detail panel query analyses by visitId directly; avoids going through VisitImage to reach AiAnalysis | Without denormalization, fetching all analyses for a visit requires a two-hop lookup through VisitImage |