# Architecture and data flow

The build produces four static pages from the original page templates. Shared navigation and footer fragments are included at build time, so no shell fetch or SPA framework is required. Page JavaScript calls four same-origin Vercel Node endpoints. All database access uses the server-only service-role JWT; no Supabase credentials are sent to browsers.

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/courses` | GET | Published course catalog, allowlisted columns only |
| `/api/application-prepare` | POST | Validate form and file metadata; issue staging upload URL and signed proof |
| `/api/applications` | POST | Verify proof, download and validate bytes, copy to private final object, atomically commit |
| `/api/contact` | POST | Validate and idempotently store a contact message |

Application steps:

1. Browser checks all form steps, hashes the selected document and sends a request UUID, applicant data and file metadata to prepare.
2. Prepare checks the form, admissions status and course; signs a Supabase staging upload URL and an HMAC proof binding request ID, normalized applicant hash, academic year, and file hash/size/type.
3. Browser uploads the file directly to Storage using that scoped URL. A 5MB document does not pass through the Vercel request body.
4. Finalize verifies proof and looks for a previously committed matching request before doing more work. It downloads the staged document using server authorization, checks bytes and signature, and writes a separate immutable final object.
5. `submit_application` serializes the request, verifies current admissions status and capacity under locks, and generates a unique receipt number. A unique academic-year/ID-card constraint prevents duplicate enrollment requests.
6. Only a confirmed commit returns success. If a network failure leaves the result uncertain, retrying the same request returns the existing receipt. The UI retains its prepared proof and uploaded state during retries in the same loaded page.

Final files cannot be overwritten through staging signed URLs. Files left behind by failures are retained temporarily to avoid deleting a file whose DB commit might already have succeeded. Cleanup deletes old staging files and unreferenced final files only after the proof validity window has elapsed. No end-user deletion, record lookup by national ID, public Storage policy, or new admin UI is exposed.

The original HTML includes institutional copy and policy placeholders that must be confirmed by the owner. This migration does not fabricate missing official course lists, institutional policies, historical applications, or the omitted Apps Script implementation.
