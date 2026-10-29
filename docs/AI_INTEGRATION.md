# AI Study Assistant Integration

## Implemented code path

The React AI Study Assistant calls `POST /api/v1/ai/ask`. The Express backend validates the prompt, rejects obvious email/phone patterns, enforces authentication, applies a short-window request limiter and per-user daily usage limit, and calls an OpenAI-compatible `/chat/completions` endpoint. The browser never receives the provider API key. Prompts and responses are not stored in the usage record; only user reference, feature, provider label, status, and character counts are recorded.

## Configuration

Set these on the backend only:

- `AI_API_KEY`: secret provider credential.
- `AI_BASE_URL`: base URL for the OpenAI-compatible API, default `https://api.openai.com/v1`.
- `AI_MODEL`: model name accepted by the configured provider.
- `AI_DAILY_LIMIT`: per-user daily call limit.

Do not use a `VITE_` prefix for secrets. Do not commit actual keys. The feature returns a clear 503 response when no key is configured; other MaskChat features should continue to work.

## Privacy and limitations

The endpoint does not send the user's institutional email, profile, uploaded ID, or stored chat history as provider context. Users are asked not to include personal information, and obvious email/phone patterns are rejected. Pattern checks are not complete PII detection: they cannot guarantee that every sensitive detail is removed. Configure the provider's data handling and review terms before enabling the feature for real students. Do not send ID documents or identity-verification records to the LLM.

The LLM is not permitted to approve mentors, verify documents, or change roles. Output is rendered as text in React, not as raw HTML. AI answers can be wrong and should be treated as learning assistance.

## Test status

The implementation includes mocked-provider testing as a recommended next step, but live provider behavior has not been tested in this environment. Validate missing key, timeout, provider 429, malformed response, secret redaction, prompt length, and personal-information handling before release.
