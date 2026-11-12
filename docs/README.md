# MaskChat Documentation

This directory contains the technical documentation for the MERN implementation of MaskChat.

## Documentation map

| Document | Purpose |
|---|---|
| [Feature parity](FEATURE_PARITY_AUDIT.md) | Reference feature inventory and implementation status |
| [Mentor verification](MENTOR_VERIFICATION.md) | Mentor eligibility, institutional verification and review workflow |
| [AI integration](AI_INTEGRATION.md) | AI assistant architecture, boundaries and configuration |
| [Security & privacy](SECURITY_PRIVACY.md) | Authentication, authorization, privacy and abuse controls |
| [Deployment](DEPLOYMENT.md) | Frontend/backend deployment and production configuration |
| [SSO setup](SSO_SETUP.md) | Institutional authentication configuration |
| [Testing](TESTING.md) | Automated, integration and security validation |
| [Final test report](FINAL_TEST_REPORT.md) | Recorded validation results |
| [Matching, groups & operations](MATCHING_GROUPS_OPERATIONS.md) | Matching queue, group sessions and operational controls |

## System overview

MaskChat is split into a React/Vite client and an Express/Node backend. MongoDB is the persistent data store and Socket.IO provides authenticated real-time messaging.

```text
React/Vite
   │
   ├── REST API ───────────────┐
   │                           ▼
   └── Socket.IO ───────► Express API
                              │
                    ┌─────────┼─────────┐
                    ▼         ▼         ▼
                Auth/RBAC   Matching  Moderation
                    │         │         │
                    └─────────┼─────────┘
                              ▼
                         MongoDB/Mongoose
```

The backend remains authoritative for identity, permissions, matching, moderation and session state. UI controls are not security boundaries.

## Documentation rule

When implementation changes, update the relevant document in the same change. Do not document planned functionality as implemented. Security claims must be backed by the server code and tests.