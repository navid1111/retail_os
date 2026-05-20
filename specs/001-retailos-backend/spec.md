# Feature Specification: RetailOS — AI-Native Retail Field Execution Platform

**Feature Branch**: `001-retailos-mvp`

**Created**: 2026-05-21

**Status**: Draft

**Input**: User description: "AI-native retail field execution platform with store visit workflow, AI shelf analysis, fraud detection, and supervisor dashboard"

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Field Rep Completes a Store Visit (Priority: P1)

A field rep arrives at an outlet, opens the mobile app, taps check-in, photographs the shelf, and submits. The system records GPS, timestamp, and the image against the visit. The rep can also add optional notes before submitting.

**Why this priority**: This is the data-entry point for the entire system. Nothing else — AI analysis, fraud detection, compliance scoring, or the dashboard — has any data to work with unless a visit is created with at least one image. It is the irreducible core of the product.

**Independent Test**: Deploy only the backend visit API and a minimal mobile UI. A rep can check in, upload a photo, and see the visit listed. No AI, no dashboard needed to verify this works.

**Acceptance Scenarios**:

1. **Given** the rep is within 500 m of the outlet, **When** they tap "Check in", **Then** a visit record is created with server-side timestamp, the rep's GPS coordinates, and the linked store ID.
2. **Given** an active visit, **When** the rep photographs the shelf and taps upload, **Then** the image is stored in object storage, linked to the visit, and a blur check + pHash check runs automatically.
3. **Given** an active visit, **When** the rep taps "Submit", **Then** visit status transitions from `pending` to `processing` and an AI analysis job is queued.
4. **Given** the rep is more than 500 m from the outlet, **When** they attempt check-in, **Then** the app shows a GPS mismatch warning and a `gps_mismatch` fraud flag is written to `fraud_flags`.

---

### User Story 2 — AI Analyses the Shelf and Produces a Compliance Score (Priority: P1)

After image upload, an AI vision model automatically identifies products, detects competitor brands, scores compliance 0–100 against the store's expected SKU list, and writes a one-paragraph plain-English summary for the supervisor.

**Why this priority**: This is the primary value proposition — replacing manual shelf audits. Without this, the platform is just a photo-upload app. Tied with P1 visit workflow because neither is useful without the other.

**Independent Test**: Send a real shelf image and a mock SKU list to the AI analysis endpoint directly. Verify the response includes `products_detected`, `competitors_detected`, `compliance_score`, `missing_skus`, and `supervisor_summary` as valid JSON stored in `ai_analyses`.

**Acceptance Scenarios**:

1. **Given** a submitted visit image and the store's SKU list, **When** the AI job runs, **Then** `ai_analyses` is populated with product list (each item with confidence), competitor brands, a 0–100 score, missing SKUs, and a natural-language summary.
2. **Given** a completed analysis, **When** the supervisor opens the visit detail, **Then** they see the summary paragraph, detected products, competitor flags, and the score — all from the stored analysis result.
3. **Given** an AI provider returns an error or times out, **When** the job fails, **Then** the job record is marked `failed`, `error_message` is stored, and the job is retried up to 3 times before being marked permanently failed.
4. **Given** a compliance score below 50, **When** the analysis completes, **Then** a notification record is created targeting all supervisors in the store's region.

---

### User Story 3 — Supervisor Monitors All Visits on the Dashboard (Priority: P2)

A supervisor opens the web dashboard and sees a live feed of today's visits, a bar chart of compliance scores by outlet, and can drill into any visit to view the shelf photo, AI analysis result, and fraud flags.

**Why this priority**: P2 because it depends on P1 data existing. However it is essential before any demo — without it the product is invisible to the business user.

**Independent Test**: Seed the database with mock visits and analyses. Open the dashboard and verify the visit feed renders, the compliance chart displays, and clicking a visit shows the detail panel with the AI summary and image.

**Acceptance Scenarios**:

1. **Given** visits exist for today, **When** the supervisor loads the dashboard, **Then** a chronological feed shows each visit's rep name, outlet name, check-in time, compliance score, and a fraud flag indicator if any flags exist.
2. **Given** the compliance chart is displayed, **When** the supervisor applies a date range filter, **Then** the chart updates to show only visits within that range, colour-coded (green ≥ 80, amber 50–79, red < 50).
3. **Given** a visit with a fraud flag, **When** the supervisor clicks the visit, **Then** the detail panel shows the flag type, confidence score, and the detail JSON (e.g. `{distance_m: 820, limit_m: 300}` for a GPS mismatch).
4. **Given** an outlet with multiple past visits, **When** the supervisor opens the image history view, **Then** a thumbnail grid shows all past images with date, score, and a click-to-expand view.

---

### User Story 4 — Fraud Detection Catches a Duplicate or Blurry Image (Priority: P2)

When a rep uploads an image, the system automatically computes its perceptual hash and Laplacian variance. Duplicate images are flagged against the original visit; blurry images are rejected before AI analysis runs.

**Why this priority**: P2 because visit workflow must exist first, but this is mandatory for the sprint and protects data quality for all downstream analysis.

**Independent Test**: Upload the same image twice in two separate visits. Verify the second upload triggers a `duplicate_image` fraud flag linking to the original image ID. Upload a heavily blurred image and verify it is rejected with `rejection_reason = blurry` before any AI job is queued.

**Acceptance Scenarios**:

1. **Given** a previously uploaded image, **When** an identical or near-identical image (pHash distance < threshold) is uploaded in a new visit, **Then** `visit_images.is_rejected = true`, `rejection_reason = duplicate`, a `fraud_flags` record is created with `fraud_type = duplicate_image` and `duplicate_of_image_id` pointing to the original.
2. **Given** an image with Laplacian variance below the blur threshold, **When** it is uploaded, **Then** `is_rejected = true`, `rejection_reason = blurry`, the rep is prompted to retake, and no AI job is queued for that image.
3. **Given** an image with EXIF `DateTimeOriginal` more than 24 hours before the server's current time, **When** it is uploaded, **Then** a `timestamp_anomaly` fraud flag is created and the visit is marked `flagged`.

---

### User Story 5 — Admin Reviews and Resolves Fraud Flags (Priority: P3)

An admin can view all open fraud flags, inspect the evidence (linked images, GPS delta, EXIF timestamps), and mark each flag as `confirmed` or `dismissed`.

**Why this priority**: P3 because it requires fraud data to exist and is an operational/governance feature rather than core demo flow.

**Independent Test**: Seed a fraud flag. Open the admin fraud review panel, confirm the flag appears with its detail JSON, and click "Confirm" — verify `resolution = confirmed` and `reviewed_by` is set in the database.

**Acceptance Scenarios**:

1. **Given** a pending fraud flag, **When** the admin opens the fraud review panel, **Then** all flags with `resolution = pending` are listed with type, confidence, detail, and links to the affected visit and image.
2. **Given** a fraud flag, **When** the admin clicks "Confirm", **Then** `resolution` is set to `confirmed` and `reviewed_by` is set to the admin's user ID.
3. **Given** a fraud flag, **When** the admin clicks "Dismiss", **Then** `resolution` is set to `dismissed` and an audit log entry is written.

---

### Edge Cases

- What happens when the rep loses connectivity mid-upload? The image upload must be resumable or the rep must be notified to retry; a partial upload must not create an `ai_analyses` job.
- What happens when the AI provider is down or rate-limited? Jobs must back off with exponential retry up to 3 attempts; the visit stays in `processing` status and the dashboard shows a "pending analysis" state rather than an empty score.
- What happens if a store has no SKUs configured in `store_skus`? The AI prompt must still run but the compliance score should reflect 0 expected SKUs; missing_skus must be an empty array, not an error.
- What happens when two reps check in to the same outlet simultaneously? Both visits are valid and independent; no locking is needed, but the dashboard must show both.
- What happens when GPS is unavailable on the rep's device? Check-in is still permitted but `gps_lat`/`gps_lng` are null; the GPS fraud check is skipped and a warning is logged rather than blocking the workflow.
- What happens when the image is valid but the shelf is empty or entirely non-product? The AI must return an empty `products_detected` array and a compliance score of 0 rather than hallucinating products.

---

## Requirements *(mandatory)*

### Functional Requirements

**Visit Workflow**

- **FR-001**: System MUST create a visit record with server-set `check_in_time`, `rep_id`, `store_id`, `gps_lat`, and `gps_lng` when a rep checks in.
- **FR-002**: System MUST accept image uploads linked to an active visit and store them in object storage with a signed URL written to `visit_images.image_url`.
- **FR-003**: System MUST display outlet name, address, region, last visit date, and target SKU list to the rep at check-in.
- **FR-004**: System MUST transition visit `status` from `pending` → `processing` on submission and queue an AI analysis job.

**AI Shelf Analysis**

- **FR-005**: System MUST call a vision AI provider (Claude, GPT-4o, or Gemini) with the shelf image and the store's SKU list and store the structured result in `ai_analyses`.
- **FR-006**: AI analysis result MUST include: `products_detected` (JSONB array with name, brand, confidence), `competitors_detected` (JSONB array with brand, count), `compliance_score` (0–100), `missing_skus` (JSONB array), and `supervisor_summary` (plain-English paragraph).
- **FR-007**: System MUST update `visits.overall_score` with the `compliance_score` after analysis completes and transition status to `completed`.
- **FR-008**: System MUST retry failed AI jobs up to 3 times before marking them `failed`.

**Fraud Detection**

- **FR-009**: System MUST compute a perceptual hash (pHash) for every uploaded image and compare it against all existing hashes; a match MUST create a `duplicate_image` fraud flag.
- **FR-010**: System MUST compute Laplacian variance for every uploaded image; images below the blur threshold MUST be rejected with `rejection_reason = blurry` before any AI job is queued.
- **FR-011**: System MUST compute Haversine distance between the rep's check-in GPS and the store's registered coordinates; distance > `stores.gps_radius_m` MUST create a `gps_mismatch` fraud flag.
- **FR-012**: System MUST extract EXIF `DateTimeOriginal` from uploaded images; a delta > 24 hours from server time MUST create a `timestamp_anomaly` fraud flag.
- **FR-013**: Visits with any fraud flag MUST have `status = flagged`.

**Dashboard**

- **FR-014**: Dashboard MUST display a live feed of all visits for the current day with rep name, outlet name, check-in time, compliance score, and fraud flag indicator.
- **FR-015**: Dashboard MUST display a bar chart of compliance scores by outlet, filterable by date range, colour-coded by threshold (≥80 green, 50–79 amber, <50 red).
- **FR-016**: Dashboard MUST allow browsing of past shelf images per outlet as a thumbnail grid with date, score, and click-to-full-view.

**Notifications**

- **FR-017**: System MUST create a notification record and attempt delivery when compliance score < 50; delivery channel is configurable per user (WhatsApp via Twilio or email).

**Audit**

- **FR-018**: System MUST write an append-only `audit_logs` record for every: login, visit creation, image upload, and fraud flag review action. Audit records MUST never be updated or deleted.

### Key Entities

- **Visit**: The core transactional unit. Represents one rep's attendance at one store on one occasion. Has lifecycle status (`pending → processing → completed | flagged`) and owns images, analysis results, and fraud flags.
- **Visit Image**: A single photograph taken during a visit. Carries quality metadata (blur score, pHash, EXIF timestamp) and a rejection flag. One visit may have multiple images; each image has at most one AI analysis result.
- **AI Analysis**: The structured output of one AI vision call against one image. Stores detected products, competitors, score, missing SKUs, issues, and summary text. Denormalized `visit_id` for fast dashboard queries.
- **Fraud Flag**: An automatically raised signal of a potential integrity violation on a visit or image. Has a `resolution` lifecycle (`pending → confirmed | dismissed`) managed by admins.
- **Store SKU**: The expected product list for a specific store, used as the ground truth for compliance scoring. Configurable per store with `is_required` and `min_facing` constraints.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A field rep can complete a full visit (check-in → photo → submit) in under 90 seconds on a standard mobile connection.
- **SC-002**: AI shelf analysis result is available on the dashboard within 30 seconds of image submission under normal load.
- **SC-003**: Duplicate image detection correctly identifies re-submitted identical images with 0 false negatives (exact duplicates must always be caught).
- **SC-004**: Dashboard visit feed reflects a new visit within 5 seconds of submission without a manual page refresh.
- **SC-005**: 100% of visits have an immutable audit trail entry covering creation and any fraud review actions.
- **SC-006**: Compliance score and supervisor summary are present on ≥ 95% of completed visits (excluding those with rejected/blurry images only).
- **SC-007**: The system correctly flags GPS mismatches on 100% of check-ins where Haversine distance exceeds the store's configured `gps_radius_m`.

---

## Assumptions

- The rep-facing interface is a mobile web app or PWA; a native iOS/Android app is out of scope for this sprint.
- Image storage uses Supabase Storage or AWS S3; the system stores signed URLs, not raw binary in the database.
- AI analysis uses Claude vision (claude-sonnet-4-20250514) as the primary provider; GPT-4o or Gemini may be swapped in by changing the `provider` field and prompt adapter — no schema change required.
- The blur detection threshold (Laplacian variance) and pHash similarity threshold are configurable constants, not hardcoded, so they can be tuned after initial deployment.
- Authentication uses JWT with role claims (`rep`, `supervisor`, `admin`); the auth system is built or provided (e.g. Supabase Auth) and is not implemented from scratch in this sprint.
- WhatsApp notification delivery depends on a Twilio or Meta Cloud API account being available; if not available, the notification record is created with `status = failed` and no retry blocks the core workflow.
- Row-level security (role-based access: reps see only their own visits) is a bonus feature; the MVP may return all visits filtered in application logic rather than at the DB level.
- All timestamps are stored in UTC; timezone conversion is a frontend concern.
- The `store_skus` table is pre-seeded with product data before the sprint demo; the sprint does not include a SKU management UI.
- Internet connectivity is assumed for the rep at check-in time; offline sync is a bonus feature and out of scope for the MVP.
