# RetailOS: Rep & Supervisor Dashboards UI/UX Design Plan

This document outlines the UI/UX architecture, layout structures, user flows, and interface requirements for the **Sales Representative Dashboard** and **Supervisor Dashboard** of RetailOS. 

---

## 1. Design Principles & Aesthetics
To project a premium, state-of-the-art feel, the application will follow a clean, modern aesthetic with rich interactive feedback:
- **Design System**: Use standard responsive grid layouts, subtle gradients, and glassmorphism cards.
- **Color Palette (Dynamic & Semantic)**:
  - **Primary**: Indigo/Blue (`#3B82F6` to `#4F46E5`) for actions, check-ins, and focus states.
  - **Success / High Compliance**: Emerald Green (`#10B981`) for scores $\ge 80\%$.
  - **Warning / Moderate Compliance**: Amber/Orange (`#F59E0B`) for scores between $50\%$ and $79\%$.
  - **Danger / Low Compliance / Fraud**: Rose/Red (`#EF4444`) for low compliance scores ($< 50\%$) and flagged fraud alerts (blurry/duplicate images, GPS mismatch).
  - **Neutral**: Slate/Gray (`#1F2937` dark mode, `#F3F4F6` light mode).
- **Typography**: Clean, highly readable geometric sans-serif (such as Inter or Outfit) to ensure clear readability of numbers and metrics.
- **Micro-Animations**: Smooth transitions on tab switches, hover actions on store cards, progress bars filling on score loading, and fade-in states for images.

---

## 2. Sales Representative Dashboard (Mobile-First)

The Rep Dashboard is designed as a mobile-first, single-column web app (optimized for viewport widths up to 480px, centered on larger screens) for field agents checking in at physical retail outlets.

### Screen 1: Store Check-in & Visit Form
This is the landing view for a representative to begin their store audit.
- **Visual Layout**:
  - Top header displaying the active representative's name and a progress indicator of visits completed today.
  - A clean, step-by-step card interface.
- **Form Controls & Interactive Elements**:
  1. **Store Selector**: A search-and-select dropdown. In the UI, the rep selects from a list of assigned stores.
  2. **Outlet Details Card**:
     - *Outlet Name*: Auto-filled based on selection.
     - *Contact Person Name*: Input field.
     - *Rep Visit Notes*: Optional textarea for local comments.
  3. **GPS Geolocation Card**:
     - A "Verify Location" button.
     - Once clicked, it fetches browser coordinates, validates accuracy, and displays a green checkmark with the coordinates or a red warning if GPS is unavailable/inaccurate.
  4. **Image Upload Area**:
     - Drag-and-drop or camera shutter button for mobile.
     - Once an image is chosen, it displays a thumbnail preview with a "Remove" button.
  5. **Submit Button**: Primary call-to-action, styled with a clean loading spinner and disabled until:
     - A store is selected.
     - Location is verified.
     - At least one shelf photo is attached.
- **UI-to-API Mapping**:
  - **User Session**: `GET /api/me` is called on load to verify identity and role.
  - **Check-in Initiation**: Submitting the location and store details sends a `POST /api/visits/check-in` request, returning the `visitId`.
  - **Image Attachment**: The selected photo is uploaded via `POST /api/visits/:visitId/images`, which uploads to Cloudinary and triggers asynchronous background shelf analysis.
  - **Submit Visit**: The visit is completed via `POST /api/visits/:visitId/submit`, changing its status to `"processing"`.

---

### Screen 2: Real-time Analysis Feedback
Shown immediately after submitting a visit or checking a completed visit. It gives reps instant AI-powered compliance feedback.
- **Visual Layout**:
  - A prominent compliance score visualizer (circular progress ring or large status indicator color-coded based on the compliance rating).
  - A two-column grid showing product counts.
- **Key Components**:
  1. **Compliance Visualizer**: Displays the overall audit percentage score (e.g., $85\%$).
  2. **Detections Overlay**:
     - The uploaded shelf image displayed with bounding boxes overlaying the detected items.
     - **Olympic Noodles** highlighted with Emerald boxes; **Mr. Noodles** (competitor) highlighted in Amber/Gray boxes.
  3. **Product Inventory Summary**:
     - Simple pills listing count comparison: `Olympic Noodles: 12 facings` vs `Mr. Noodles: 4 facings`.
  4. **Supervisor Summary Card**:
     - Displays the natural-language Gemini-generated summary preview (e.g., *"Olympic Noodles are well stocked and clearly visible, taking up the majority of the shelf share compared to the competitor. Recommend monitoring Mr. Noodles' shelf expansion."*).
  5. **Fraud & Quality Alerts**:
     - If the backend flags the upload, show an inline warning banner: `⚠️ Blurry Image Detected` or `⚠️ GPS Location Mismatch`.
  6. **Action Buttons**: "New Store Audit" or "Go to History".
- **UI-to-API Mapping**:
  - **Immediate YOLO Output**: `POST /api/yolo/predict` sends the image buffer to obtain coordinates, counts, and confidence scores to construct the bounding box canvas overlay.
  - **Immediate Gemini Summary**: `POST /api/yolo/report` sends the YOLO JSON response payload to fetch the concise natural language supervisor report text.

---

### Screen 3: Rep Personal History
A simple vertical list of the rep's previous store visits.
- **Visual Layout**:
  - Timeline cards sorted descending by check-in date.
  - Each item displays: Store name, timestamp, compliance badge (colored red/orange/green), status badge (`Pending`, `Processing`, `Completed`, or `Flagged`), and thumbnail preview of the audited shelf.
  - Clicking any history card navigates the rep back to the **Real-time Analysis Feedback** (Screen 2) for that visit.

---

## 3. Supervisor Dashboard (Desktop-Optimized)

The Supervisor Dashboard is designed to fit desktop resolutions (minimum width 1024px) but collapses into an organized vertical stack on smaller tablets.

### Screen 1: Regional Store Overview
The landing dashboard for a regional supervisor or manager.
- **Visual Layout**:
  - Sidebar navigation containing links to "Stores", "Fraud Alerts", and "Audit Reports".
  - Top header displaying total visits completed today across all stores, along with a user profile button.
  - Grid of store summary cards.
- **Key Components**:
  1. **Analytics Summary Pills**: Highlight numbers like:
     - Total Store Audits Today.
     - Flagged Fraud Alerts.
     - Average Compliance Score (Regional).
  2. **Store Search & Filters**: A text search bar matching store names/regions combined with filter pills for compliance levels ("Low <50%", "High >80%", "Flagged").
  3. **Store Audit Grid**:
     - Interactive cards representing individual outlets.
     - Each card displays: Store code, Store name, Last audited time, Average compliance score progress bar, and active warnings/fraud badges if relevant.
     - Clicking a card navigates to the **Store Detail View** (Screen 2).
- **UI-to-API Mapping**:
  - **Store Configuration**: Detailed metadata is obtained via `GET /api/stores/:storeId` for the clicked store.

---

### Screen 2: Store Detail & Analysis View
Provides deep-dive analytical context for a selected retail outlet.
- **Visual Layout**:
  - **Left Column (40% width)**: Store profile, representative selector, and historical compliance charts.
  - **Right Column (60% width)**: Scrollable visit log timeline, image gallery, and AI summaries.
- **Left Column Components**:
  1. **Store Metadata Card**: Displays address, store manager, coordinates, and active status.
  2. **Representative Filter**:
     - Dropdown containing names of reps who audit this store.
     - Selecting a rep filters the timeline, stats, and charts on the right column.
  3. **Compliance Score Trend Chart**:
     - Line chart (using a curved area layout) tracking compliance percentages over time.
     - X-axis shows visit dates; Y-axis ranges from $0\%$ to $100\%$.
- **Right Column Components**:
  1. **Audit Logs Timeline**:
     - A vertical log of visits.
     - Each entry shows: Rep Name, check-in timestamp, AI-generated supervisor summary, and a thumbnail of the uploaded image.
     - Hovering over a timeline item exposes quick action tools.
  2. **Aggregated Image Gallery**:
     - A grid displaying all shelf images uploaded for this store.
     - Each image card overlays the name of the representative who took the photo, the date, and a compliance badge.
     - Hovering over an image highlights it and displays any fraud indicators.
  3. **Detail Overlay Modal**:
     - Triggered by clicking any image in the gallery or timeline.
     - Opens a modal showing the full high-resolution image with YOLO bounding box overlays alongside the AI-generated supervisor audit summary.
- **UI-to-API Mapping**:
  - **Store Information**: Fetched via `GET /api/stores/:storeId`.
  - **AI Content**: Visualized summaries and bounding boxes correspond directly to responses from `/api/yolo/predict` and `/api/yolo/report`.

---

### Screen 3: Fraud & Quality Alerts View
A dedicated control panel listing visits that failed quality or integrity constraints.
- **Visual Layout**:
  - A clean data table showing flagged audits.
- **Key Components**:
  1. **Flagged Visits Table**:
     - Columns: Date/Time, Store Name, Representative, Issue Type, and Severity level.
     - **Issue Types**:
       - `GPS Mismatch`: Rep checked in outside the geofence radius. Shows distance offset (e.g., *"320m outside radius"*).
       - `Blurry Image`: Low focus/quality scores on the uploaded shelf photo.
       - `Duplicate Image`: Image matching previous upload hashes.
  2. **Image Inspection Panel**: Clicking a row slides open a detail panel showing the image alongside the explanation of the flag.
  3. **Resolution Actions**: Simple buttons allowing the supervisor to mark a flag as "Approved" (override) or "Request Retake".

---

## 4. REST API Schema References for UI Integration

This section defines the API endpoints exposed by the server that the UI client interacts with.

### 4.1 Authentication & Profile
- **Get Current Profile**: `GET /api/me`
  - **Request Headers**: Session/Authorization cookies.
  - **Response (200)**:
    ```json
    {
      "user": {
        "_id": "507f1f77bcf86cd799439012",
        "email": "rep@example.com",
        "role": "rep"
      }
    }
    ```

---

### 4.2 Visits Workflow
- **Check-in (Create Visit)**: `POST /api/visits/check-in`
  - **Request Body**:
    ```json
    {
      "storeId": "507f1f77bcf86cd799439011",
      "gpsLat": 23.7806,
      "gpsLng": 90.2794,
      "gpsAccuracyM": 12,
      "repNotes": "Arrived at location"
    }
    ```
  - **Response (201)**:
    ```json
    {
      "_id": "507f1f77bcf86cd799439012",
      "repId": "507f1f77bcf86cd799439013",
      "storeId": "507f1f77bcf86cd799439011",
      "checkInTime": "2026-05-21T00:00:00.000Z",
      "status": "pending",
      "gpsLat": 23.7806,
      "gpsLng": 90.2794,
      "gpsAccuracyM": 12,
      "repNotes": "Arrived at location",
      "images": [],
      "fraudFlags": [],
      "createdAt": "2026-05-21T00:00:00.000Z"
    }
    ```

- **Upload Visit Image**: `POST /api/visits/:visitId/images`
  - **Request Type**: `multipart/form-data`
  - **Form Payload**:
    - `file`: (Binary image file)
  - **Response (201)**:
    ```json
    {
      "_id": "507f1f77bcf86cd799439099",
      "visitId": "507f1f77bcf86cd799439012",
      "imageUrl": "https://res.cloudinary.com/retailos/image/upload/v12345/visit-image.jpg",
      "fileSizeKb": 256,
      "widthPx": 1200,
      "heightPx": 800,
      "isRejected": false,
      "uploadedAt": "2026-05-21T00:10:00.000Z"
    }
    ```

- **Submit Audit**: `POST /api/visits/:visitId/submit`
  - **Response (200)**:
    ```json
    {
      "_id": "507f1f77bcf86cd799439012",
      "status": "processing",
      "checkOutTime": "2026-05-21T00:05:00.000Z"
    }
    ```

---

### 4.3 Stores Data
- **Fetch Store Detail**: `GET /api/stores/:storeId`
  - **Response (200)**:
    ```json
    {
      "_id": "507f1f77bcf86cd799439011",
      "storeCode": "DHK-001",
      "storeName": "Dhaka Outlet",
      "address": "123 Main St",
      "region": "Dhaka",
      "latitude": 23.7806,
      "longitude": 90.2794,
      "gpsRadiusM": 300,
      "isActive": true,
      "skus": []
    }
    ```

---

### 4.4 AI Shelf Analytics
- **YOLO Shelf Detection**: `POST /api/yolo/predict`
  - **Request Type**: `multipart/form-data`
  - **Form Payload**:
    - `file`: (Binary image file)
  - **Response (200)**:
    ```json
    {
      "detections": [
        {
          "label": "olympic_noodle",
          "confidence": 0.94,
          "bbox": [120, 200, 240, 410]
        },
        {
          "label": "mr_noodle",
          "confidence": 0.81,
          "bbox": [250, 210, 370, 420]
        }
      ]
    }
    ```

- **Gemini Supervisor Summary**: `POST /api/yolo/report`
  - **Request Body**:
    - Pass the full JSON response received from `/api/yolo/predict`.
  - **Response (200)**:
    ```json
    {
      "report": "Olympic Noodles was detected with several shelf facings visible alongside competitor products. Our product appears clearly visible and enjoys a larger shelf share compared to the competitor. It is recommended to maintain stock levels and ensure Olympic Noodles remains positioned prominently."
    }
    ```

> [!NOTE]
> Since the database contains historical visit logs and multiple store items, the UI will implement mock datasets for listing stores (`GET /api/stores`) and listing historical visits (`GET /api/visits`) until the backend registers additional query/list endpoints.
