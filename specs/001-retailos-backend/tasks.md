# Tasks: RetailOS Backend

**Input**: Design documents from `specs/001-retailos-backend/`

**Prerequisites**: plan.md (required), spec.md (required for user stories)

**Tests**: Unit and integration tests are required for every feature.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [ ] T001 Navid: Create backend/src/ and backend/tests/ directories in backend/
- [ ] T002 Shadman: Add backend/package.json with dependencies per plan
- [ ] T003 [P] Navid: Add TypeScript config in backend/tsconfig.json
- [ ] T004 [P] Shadman: Add backend/.env.example, backend/Dockerfile, backend/docker-compose.yml

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

- [ ] T005 Navid: Implement env validation in backend/src/config/env.ts
- [ ] T006 [P] Shadman: Implement MongoDB connection in backend/src/config/db.ts
- [ ] T007 [P] Shadman: Implement Redis and Cloudinary clients in backend/src/config/redis.ts and backend/src/config/cloudinary.ts
- [ ] T008 [P] Navid: Implement structured logger in backend/src/config/logger.ts
- [ ] T009 Navid: Implement Express app and router base in backend/src/app.ts and backend/src/api/router.ts
- [ ] T010 [P] Navid: Implement BetterAuth integration in backend/src/auth/better-auth.ts and backend/src/auth/middleware.ts
- [ ] T011 [P] Shadman: Define User/Store schemas in backend/src/models/User.model.ts, backend/src/models/Store.model.ts, backend/src/models/StoreSku.model.ts
- [ ] T012 [P] Shadman: Define Visit/Image/Analysis schemas in backend/src/models/Visit.model.ts, backend/src/models/VisitImage.model.ts, backend/src/models/AiAnalysis.model.ts
- [ ] T013 [P] Shadman: Define Fraud/Notification/Audit/Job schemas in backend/src/models/FraudFlag.model.ts, backend/src/models/Notification.model.ts, backend/src/models/AuditLog.model.ts, backend/src/models/Job.model.ts
- [ ] T014 Navid: Implement audit helper in backend/src/services/audit.service.ts
- [ ] T015 Navid: Implement BullMQ setup in backend/src/queues/queues.ts and backend/src/queues/scheduler.ts
- [ ] T016 Navid: Implement server bootstrap in backend/src/server.ts

---

## Phase 3: User Story 1 — Field Rep Completes a Store Visit (Priority: P1) 🎯 MVP

**Goal**: Enable reps to check in, upload a shelf image, and submit a visit for processing.

**Independent Test**: A rep can check in, upload a photo, and see the visit listed using only API routes.

### Tests for User Story 1

- [ ] T017 [P] Navid: Add unit tests for visit workflow in backend/tests/unit/visit.service.test.ts
- [ ] T018 [P] Shadman: Add integration tests for visit routes in backend/tests/integration/visit.routes.test.ts
- [ ] T019 [P] Shadman: Add integration tests for image upload in backend/tests/integration/image.routes.test.ts

### Implementation for User Story 1

- [ ] T020 [P] Navid: Implement visit logic in backend/src/services/visit.service.ts
- [ ] T021 [P] Shadman: Implement image upload + queue enqueue in backend/src/services/image.service.ts
- [ ] T022 [P] Navid: Implement validators in backend/src/api/validators/visit.validators.ts and backend/src/api/validators/store.validators.ts
- [ ] T023 [P] Shadman: Implement validators in backend/src/api/validators/image.validators.ts
- [ ] T024 Navid: Implement visit routes in backend/src/api/routes/visit.routes.ts
- [ ] T025 Shadman: Implement image routes in backend/src/api/routes/image.routes.ts
- [ ] T026 [P] Navid: Implement store routes in backend/src/api/routes/store.routes.ts
- [ ] T027 Navid: Wire visit/image/store routes and audit calls in backend/src/api/router.ts and backend/src/services/visit.service.ts

---

## Phase 4: User Story 2 — AI Analyses the Shelf and Produces a Compliance Score (Priority: P1)

**Goal**: Produce AI analysis results and compliance scores from shelf images.

**Independent Test**: Call the analysis endpoint and receive stored AI results for a visit image.

### Tests for User Story 2

- [ ] T028 [P] Navid: Add unit tests for analysis service in backend/tests/unit/analysis.service.test.ts
- [ ] T029 [P] Shadman: Add integration tests for analysis route in backend/tests/integration/analysis.routes.test.ts

### Implementation for User Story 2

- [ ] T030 [P] Navid: Implement YOLO client in backend/src/services/yolo.service.ts
- [ ] T031 [P] Navid: Implement Gemini chain in backend/src/services/gemini.service.ts
- [ ] T032 Shadman: Implement analysis orchestration in backend/src/services/analysis.service.ts
- [ ] T033 Shadman: Implement analysis worker in backend/src/queues/workers/analysis.worker.ts
- [ ] T034 Navid: Implement analysis route and validators in backend/src/api/routes/analysis.routes.ts and backend/src/api/validators/analysis.validators.ts

---

## Phase 5: User Story 3 — Supervisor Monitors All Visits on the Dashboard (Priority: P2)

**Goal**: Provide visit feed and compliance chart data to supervisors.

**Independent Test**: Dashboard feed and chart endpoints return expected visit data for seeded records.

### Tests for User Story 3

- [ ] T035 [P] Navid: Add unit tests for dashboard service in backend/tests/unit/dashboard.service.test.ts
- [ ] T036 [P] Shadman: Add integration tests for dashboard routes in backend/tests/integration/dashboard.routes.test.ts

### Implementation for User Story 3

- [ ] T037 [P] Navid: Implement dashboard service in backend/src/services/dashboard.service.ts
- [ ] T038 Shadman: Implement dashboard routes and validators in backend/src/api/routes/dashboard.routes.ts and backend/src/api/validators/dashboard.validators.ts

---

## Phase 6: User Story 4 — Fraud Detection Catches a Duplicate or Blurry Image (Priority: P2)

**Goal**: Detect duplicate/blurry images and flag GPS/EXIF anomalies before AI analysis.

**Independent Test**: Duplicate and blurry uploads are rejected and fraud flags are created.

### Tests for User Story 4

- [ ] T039 [P] Navid: Add unit tests for utils in backend/tests/unit/haversine.test.ts, backend/tests/unit/blur.test.ts, backend/tests/unit/phash.test.ts, backend/tests/unit/exif.test.ts
- [ ] T040 [P] Shadman: Add unit tests for fraud logic in backend/tests/unit/fraud.service.test.ts

### Implementation for User Story 4

- [ ] T041 [P] Navid: Implement haversine + fraud logic in backend/src/utils/haversine.ts and backend/src/services/fraud.service.ts
- [ ] T042 [P] Shadman: Implement blur, pHash, EXIF utilities in backend/src/utils/blur.ts, backend/src/utils/phash.ts, backend/src/utils/exif.ts
- [ ] T043 Shadman: Implement upload worker in backend/src/queues/workers/upload.worker.ts
- [ ] T044 Navid: Update image metadata + rejection handling in backend/src/services/image.service.ts

---

## Phase 7: User Story 5 — Admin Reviews and Resolves Fraud Flags (Priority: P3)

**Goal**: Allow admins to list and resolve fraud flags.

**Independent Test**: Admin can list pending flags and confirm/dismiss with audit log entries.

### Tests for User Story 5

- [ ] T045 [P] Navid: Add integration tests for fraud routes in backend/tests/integration/fraud.routes.test.ts
- [ ] T046 [P] Shadman: Add unit tests for fraud resolution in backend/tests/unit/fraud-resolution.test.ts

### Implementation for User Story 5

- [ ] T047 [P] Shadman: Implement validators in backend/src/api/validators/fraud.validators.ts
- [ ] T048 Navid: Implement fraud routes in backend/src/api/routes/fraud.routes.ts
- [ ] T049 Shadman: Implement fraud resolution + audit logging in backend/src/services/fraud.service.ts

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T050 [P] Navid: Add local dev guide in specs/001-retailos-backend/quickstart.md
- [ ] T051 Shadman: Ensure schema indexes are declared in backend/src/models/*.model.ts

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: Depend on Foundational phase completion
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2)
- **User Story 2 (P1)**: Can start after Foundational (Phase 2); relies on visit images from US1
- **User Story 3 (P2)**: Can start after Foundational (Phase 2); relies on visits + analysis from US1/US2
- **User Story 4 (P2)**: Can start after Foundational (Phase 2); relies on visit images from US1
- **User Story 5 (P3)**: Can start after Foundational (Phase 2); relies on fraud flags from US4

### Parallel Opportunities

- Setup tasks marked [P] can run in parallel
- Foundational tasks marked [P] can run in parallel
- After Foundational, US1 and US2 can start in parallel (two members)
- Within each user story, tests and independent modules marked [P] can run in parallel

---

## Parallel Example: User Story 1

```text
Navid: Implement visit logic in backend/src/services/visit.service.ts
Shadman: Implement image upload + queue enqueue in backend/src/services/image.service.ts
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (blocks all stories)
3. Complete Phase 3: User Story 1
4. Validate US1 independently with unit + integration tests

### Incremental Delivery

1. US1 (visit flow) → demo
2. US2 (AI analysis) → demo
3. US3 (dashboard) and US4 (fraud) → demo
4. US5 (admin fraud resolution) → demo

### Two-Member Split (Navid, Shadman)

- After Foundational: Navid focuses on US1/US2 core services; Shadman focuses on routes/workers/tests
- Rotate for US3–US5 to keep review coverage
