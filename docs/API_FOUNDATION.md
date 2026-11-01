# Archer API Foundation

## Conventions

- Base path: `/api/v1`.
- Laravel is the authoritative API and domain layer.
- Production configuration targets MySQL. Automated tests may use an isolated in-memory database and must never use production credentials or data.
- New privileged, operational, financial, or personal-data endpoints require server-side validation, authorization, audit behavior where applicable, and automated tests.

## Health check

### `GET /api/v1/health`

Returns a minimal liveness response for local development, deployment probes, and future monitoring. It does not authenticate a user, query database state, reveal version/build data, or expose configuration.

Successful response (`200 OK`):

```json
{
  "data": {
    "service": "archer-api",
    "status": "ok"
  }
}
```

This endpoint is intentionally not a readiness check for MySQL, queues, payments, or third-party services. Those dependencies will receive explicit, approved operational checks when their implementation slices are ready.
