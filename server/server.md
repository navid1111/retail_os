# Task: Build a FastAPI Server for YOLOv8 ONNX Inference at `/yolo/predict`

You are an expert Python developer. Your goal is to write a complete FastAPI server that loads a YOLOv8 ONNX model and provides a prediction endpoint at `/yolo/predict`. The server must follow the exact patterns and functionality of the provided `server.py` reference, with the only difference being the endpoint path: use `/yolo/predict` instead of `/predict`. The input image to the model is expected to be letterbox-resized to **640×640** pixels before inference.

## Inputs / Environment

- The ONNX model file is expected at `./best_shelf_model.onnx` by default, but can be overridden via environment variable `MODEL_PATH`.
- Optionally, the model can be downloaded from Hugging Face Hub if `HF_REPO` is set (use `huggingface_hub`).
- Class names:  
  - `0`: `"foodie_noodles_olympics"` (display name `"Olympic Noodles"`)  
  - `1`: `"mr_noodles_competitor"` (display name `"Competitor"`)
- Confidence threshold default: `0.25`, IOU threshold for NMS: `0.45`.
- Image size for ONNX model: `640x640` (3 channels, RGB normalized).

## Required Endpoints

1. **GET `/health`** – returns health status and model info.
2. **POST `/yolo/predict`** – accepts an image file upload and returns detection JSON (or optionally annotated image).

The `/yolo/predict` endpoint must support the following query parameters:
- `conf` (float, optional, default 0.25) – confidence threshold.
- `annotate` (bool, default `false`) – if `true`, return the annotated image (JPEG) instead of JSON.

Request body: `multipart/form-data` with a field `file` containing the image (JPEG/PNG).

## Required Functionality

### 1. Model Loading & ONNX Wrapper

Implement a class `ONNXDetector` that:
- Initializes an ONNX Runtime session (prefer CUDA, fallback to CPU).
- Provides a `preprocess` method: letterbox resize to 640×640, pad with gray (114), convert BGR → RGB, normalize to [0,1], add batch dimension. Return the blob, scale factors, and padding offsets.
- Provides a `postprocess` method: parse YOLOv8 output (shape `[1, 6, 8400]`), filter by confidence, convert cxcywh → xyxy, remove padding, rescale coordinates to original image, apply class‑aware NMS.
- Provides a `detect` method that runs the full pipeline and returns a list of detection dicts.

### 2. Image Metadata Extraction

Implement `get_image_taken_time` that extracts the capture time from EXIF (priority: DateTimeOriginal, DateTimeDigitized, DateTime), falls back to file modification time (if a file path is known), otherwise current server time.

### 3. Shelf Analysis & Metrics

Implement `build_shelf_analysis(detections)` that returns a structured dict as in the reference `server.py`. This includes:
- `no_objects_of_interest` flag when no class 0 detections exist.
- Compliance scores (`facing_score_pct`, `area_score_pct`) when class 0 exists.
- Per‑class statistics (facing count, total area, avg/min confidence, low_visibility_risk).
- Adjacency analysis: count Olympic facings adjacent to competitor facings (gap ≤ 40 pixels in both axes).
- Add `bbox_area_px` to each detection.

### 4. Drawing Annotations

Implement `draw_detections` that draws semi‑transparent filled bounding boxes, colored borders, and label tags (with class display name and confidence). Use the color palette:
- Class 0: `(113, 204, 46)` – emerald green
- Class 1: `(60, 76, 231)` – coral red

### 5. FastAPI Application

- Create a `FastAPI` app with title, description, version.
- Load the ONNX model at startup (event `startup`).
- Define the `/health` endpoint returning `{"status": "healthy", "model": MODEL_PATH, "classes": ...}`.
- Define the `/yolo/predict` endpoint:
  - Read the uploaded file, decode with `cv2.imdecode`.
  - Run inference with the requested confidence threshold.
  - If `annotate` is True, draw detections, encode as JPEG (quality 92), and return as `StreamingResponse` with `media_type="image/jpeg"`.
  - Otherwise, extract image size, image taken time, build shelf analysis, and return a JSON response with the structure shown below.
- **Do not** include the `/predict/{image_num}` endpoint from the reference; only `/yolo/predict` is required.

### 6. JSON Response Schema (when `annotate=false`)

```json
{
  "image_size": {"width": int, "height": int},
  "image_taken_time": "ISO 8601 string",
  "inference_time_ms": float,
  "num_detections": int,
  "shelf_analysis": { /* as defined in reference */ },
  "detections": [
    {
      "class_id": 0 or 1,
      "class_name": "foodie_noodles_olympics" or "mr_noodles_competitor",
      "confidence": float,
      "bbox": [x1, y1, x2, y2],
      "bbox_area_px": int
    }
  ]
}