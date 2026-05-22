# API Routes

Base URL: `http://localhost:5000/api`

All routes below return JSON. Unless stated otherwise, errors respond with a JSON object containing an `error` string and may include `details` for validation failures.

## Auth

### POST /api/auth/\*

BetterAuth endpoints mounted by the auth handler.

- Auth: handled by BetterAuth
- Request/Response: varies by BetterAuth configuration

---

## Utility

### GET /api/test

Fetches a cached user from Redis or falls back to MongoDB.

- Auth: none
- Response (200):
  ```json
  {
    "_id": "...",
    "email": "user@example.com"
  }
  ```
- Response (500):
  ```json
  { "error": "Failed to fetch users" }
  ```

### GET /api/me

Returns the authenticated user.

- Auth: required
- Response (200):
  ```json
  {
    "user": {
      "_id": "507f1f77bcf86cd799439012",
      "email": "rep@example.com",
      "role": "rep"
    }
  }
  ```
- Response (401):
  ```json
  { "error": "Unauthorized - No user found" }
  ```

### GET /api/error

Throws a test error to validate error handling.

- Auth: none
- Response: 500

---

## Cloudinary Helpers

### POST /api/upload/image

Upload an image. Supports both standard JSON payloads and direct multipart/form-data file uploads.

- Auth: none
- Request (JSON):
  ```json
  {
    "filePath": "/tmp/image.jpg",
    "publicId": "optional-public-id"
  }
  ```
- Request (multipart/form-data):
  * `image` or `file`: The binary image file to upload.
  * `publicId`: (Optional) String representing the desired public ID.
- Response (200):
  ```json
  {
    "public_id": "visit-123",
    "secure_url": "https://res.cloudinary.com/...",
    "url": "https://res.cloudinary.com/...",
    "format": "jpg",
    "resource_type": "image",
    "created_at": "2026-05-21T00:00:00.000Z",
    "bytes": 2048,
    "width": 1200,
    "height": 800
  }
  ```
- Response (400):
  ```json
  { "error": "filePath is required" }
  ```

### POST /api/upload/url

Upload an image from a remote URL.

- Auth: none
- Request:
  ```json
  {
    "url": "https://example.com/image.jpg",
    "publicId": "optional-public-id"
  }
  ```
- Response (200): same as `/api/upload/image`
- Response (400):
  ```json
  { "error": "url is required" }
  ```

### POST /api/upload/video

Upload a video from a local file path.

- Auth: none
- Request:
  ```json
  {
    "filePath": "/tmp/video.mp4",
    "publicId": "optional-public-id"
  }
  ```
- Response (200): same shape as `/api/upload/image` with `resource_type` = `video`
- Response (400):
  ```json
  { "error": "filePath is required" }
  ```

### DELETE /api/assets/:publicId

Delete an asset by its Cloudinary public id.

- Auth: none
- Response (200):
  ```json
  { "result": "ok" }
  ```

---

## Visits

### POST /api/visits/check-in

Create a visit record.

- Auth: required
- Request:
  ```json
  {
    "storeId": "507f1f77bcf86cd799439011",
    "gpsLat": 23.7806,
    "gpsLng": 90.2794,
    "gpsAccuracyM": 12,
    "repNotes": "Arrived on time"
  }
  ```
- Response (201):
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
    "repNotes": "Arrived on time",
    "images": [],
    "fraudFlags": [],
    "deletedAt": null,
    "createdAt": "2026-05-21T00:00:00.000Z"
  }
  ```
- Response (400):
  ```json
  { "error": "Validation error", "details": [] }
  ```
- Response (500):
  ```json
  { "error": "Failed to check in visit" }
  ```

### POST /api/visits/:visitId/submit

Submit a visit (sets status to `processing`).

- Auth: required
- Response (200):
  ```json
  {
    "_id": "507f1f77bcf86cd799439012",
    "status": "processing",
    "checkOutTime": "2026-05-21T00:05:00.000Z"
  }
  ```
- Response (400):
  ```json
  { "error": "Validation error", "details": [] }
  ```
- Response (500):
  ```json
  { "error": "Failed to submit visit" }
  ```

### POST /api/visits/:visitId/images

Upload an image for a visit and enqueue processing. Supports both standard JSON payloads and direct multipart/form-data file uploads.

- Auth: required
- Request (JSON):
  ```json
  {
    "filePath": "/tmp/photo.jpg",
    "sourceUrl": "https://example.com/photo.jpg",
    "publicId": "optional-public-id"
  }
  ```
  Provide either `filePath` or `sourceUrl`.
- Request (multipart/form-data):
  * `image` or `file`: The binary image file to upload.
  * `publicId`: (Optional) String representing the desired public ID.
- Response (201):
  ```json
  {
    "_id": "507f1f77bcf86cd799439099",
    "visitId": "507f1f77bcf86cd799439012",
    "imageUrl": "https://res.cloudinary.com/...",
    "fileSizeKb": 256,
    "widthPx": 1200,
    "heightPx": 800,
    "isRejected": false,
    "uploadedAt": "2026-05-21T00:10:00.000Z"
  }
  ```
- Response (400):
  ```json
  { "error": "Validation error", "details": [] }
  ```
- Response (500):
  ```json
  { "error": "Failed to upload image" }
  ```

---

## Stores

### GET /api/stores/:storeId

Fetch a store record.

- Auth: required
- Response (200):
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
- Response (404):
  ```json
  { "error": "Store not found" }
  ```
- Response (400):
  ```json
  { "error": "Validation error", "details": [] }
  ```
- Response (500):
  ```json
  { "error": "Failed to fetch store" }
  ```
