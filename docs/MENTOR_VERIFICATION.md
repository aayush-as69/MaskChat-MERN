# Mentor Verification and Junior Exception Workflow

## Principles

Institutional membership, cohort/seniority, identity-document review, mentoring competence, and approval are separate checks. A college email or uploaded image alone is not proof that someone is currently enrolled or qualified to mentor. The current application does not integrate with a live GCET identity provider; production onboarding remains disabled until a trusted verification flow is configured.

## Senior pathway

1. User creates a student account.
2. User submits a senior mentor application with skills and available academic-year/cohort evidence.
3. User uploads a JPEG, PNG, or PDF institutional ID (maximum 5 MB).
4. File signature is checked; the file is stored under a random server-controlled filename outside the public frontend directory.
5. An `admin` reviewer retrieves the document through an authenticated route, reviews it, and records a decision.
6. The reviewer marks identity verified only after checking the document; the system also requires a previous enrollment cohort or academic year >= 2 before senior approval.
7. Only then does the backend assign mentor role and create a mentor profile.

The cohort year is a signal and can conflict with actual academic standing; the reviewer must use institutional evidence and should not approve a contradictory or unclear case.

## Junior exception pathway

Junior applicants provide skills and evidence, upload an ID, and undergo the same identity review. They must receive three positive recommendations from distinct approved mentors. Recommenders must be in the same institution and meet configured reputation/session thresholds (`JUNIOR_MENTOR_MIN_RATING`, `JUNIOR_MENTOR_MIN_SESSIONS`). The application remains unapproved until an authorized admin makes the final decision. The current implementation provides an assessment/review status but does not yet implement a built-in practical assessment or interview scheduler.

## Reviewer permissions

The mentor application queue and document retrieval/decision endpoints require the `admin` or `institution_admin` role. An `institution_admin` is scoped to applications in their own configured institution; a global `admin` can review across institutions. A moderator role does not automatically permit ID access. A reviewer cannot approve their own application. Create/administer the first admin account only through a trusted operator process; do not grant admin role based solely on an email address.

For local development only, `npm run seed` creates demo accounts including `admin@demo.edu` / `AdminDemo123!`. The seed script now refuses to run when `NODE_ENV=production`. Never use demo credentials in a deployed environment.

## Document handling

- Accepted signatures: JPEG, PNG, PDF; maximum 5 MB.
- Storage directory: `PRIVATE_UPLOAD_DIR`, defaulting to `./private-uploads` relative to the server process working directory.
- Permissions: directory mode 0700, file mode 0600 where supported; random server-generated file names.
- Access: admin-only API route, no public file URL, `Cache-Control: no-store, private`.
- Replacement: old file is removed after successful replacement when its storage reference is available.
- Rejection: uploaded document file and application document metadata are removed when the application is rejected; audit record records the decision without the document itself.
- Suspension/revocation: the current implementation disables availability/revokes mentor role as appropriate but does not yet have a scheduled retention job for the original ID. This must be resolved before production.

A filesystem directory is only appropriate if it is outside public static paths and, in production, resides on a private persistent volume with restricted OS access. If the host has ephemeral storage, the current adapter is not sufficient; configure a private object-storage adapter before relying on document retention.

## Misuse monitoring

Audit events are created for application submission, document upload/view, recommendation submission, identity review, approval, rejection, suspension, and revocation. Duplicate recommendations are prevented by a unique compound index. Qualifying recommendation counts are recalculated against current mentor approval and reputation data.

Limitations: image-level duplicate-ID detection, OCR authenticity checking, institutional registry lookups, scheduled retention, and an automated fraud-detection system are not implemented. The app must not claim they are.

## Required operational controls before production

- Confirm official institutional email domain and cohort rules with the institution.
- Integrate and test trusted institutional authentication.
- Provision a private persistent document store with access controls and backup/retention policy.
- Establish authorized reviewer identities and an escalation process.
- Configure log retention and review access to sensitive documents.
- Run MID-01 through MID-12 tests against a dedicated test database and private storage location.
