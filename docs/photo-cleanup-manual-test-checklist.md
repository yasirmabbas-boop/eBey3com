# Photo Cleanup manual test checklist

## Setup
- Ensure `GEMINI_API_KEY` is set in your environment/secrets.
- Ensure object storage is configured (`PRIVATE_OBJECT_DIR` set) and uploads work.

## Success path
- Go to the listing creation flow (`/sell`).
- Upload 2+ images.
- Click **✨ Clean Background** on image #2.
- Expected:
  - Button shows **Cleaning…** with spinner and is disabled while running.
  - On success, **only image #2** preview updates (ordering unchanged).
  - If you clean image #2 again, it re-runs cleanup on the current version.

## Subject-unclear path (422)
- Use a very cluttered image (multiple subjects / busy background).
- Click **✨ Clean Background**.
- Expected:
  - The UI shows exactly: `Background too complex to clean. Please try a clearer photo.`
  - The original image stays unchanged.

## Provider/network failure path (502)
- Temporarily unset/invalid `GEMINI_API_KEY` or block outbound requests.
- Click **✨ Clean Background**.
- Expected:
  - Request returns 502.
  - UI shows a retryable message (no provider internals exposed).

## Multiple images / association
- Upload 4 images.
- Clean image #3.
- Expected: only index 3 updates; indices 0,1,2 remain unchanged.

## Auth/permissions enforced
- Log out.
- Try clicking **✨ Clean Background**.
- Expected: request is rejected with 401/403 and UI shows an error.

