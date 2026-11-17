# Idempotency keys

Optional header `Idempotency-Key` applies to authenticated `POST` and `PATCH`.

Read this page before you add one of those routes.
Read this page before a client retries a mutation.

## Client rules

If the header is absent, the handler runs.

The value has 1 to 255 characters.
Each character is printable ASCII.
The value has no whitespace.

Clients should send a UUIDv7.
Send one `Idempotency-Key` for one logical attempt.
If you retry, send the same raw bytes.
A new payload needs a new `Idempotency-Key`.

## Scope

The scope is the authenticated user id.
A session and an API key for the same person use the same `Idempotency-Key` scope.
The API does not replay one user's response for a different user.

## Fingerprint

The fingerprint is the `sha256` of the method, the path, the raw query, and the raw body bytes.

## Request outcomes

The first request claims a processing row.
The handler runs after the claim.

If the `Idempotency-Key` and the fingerprint match a completed row, the API replays the stored status and the stored body.
The response includes the header `Idempotent-Replayed: true`.
The handler does not run.

If the `Idempotency-Key` matches and the fingerprint differs, the API returns `422` `idempotency_key_mismatch`.

If the same `Idempotency-Key` arrives while the first request holds the lease, the API returns `409` `idempotency_key_in_progress`.
The response includes `Retry-After`.
The client waits.
The client retries the same `Idempotency-Key`.

If the `Idempotency-Key` value is invalid, the API returns `400` `idempotency_key_invalid`.

If `POST /chat` includes an `Idempotency-Key`, the API returns `400` `idempotency_key_unsupported`.

## Stored responses

The API stores each `2xx` response for 24 hours.
The API stores each deterministic `4xx` response for 24 hours.
The stored `4xx` codes are `400`, `404`, `409`, and `422`.

If the status is `401`, `403`, `429`, or `5xx`, the API releases the claim.
The client may retry the same `Idempotency-Key`.

If the request has no authenticated user, the API ignores the header.
Stripe webhooks, CSP reports, and Better Auth sign-in have no authenticated user.

The API never replays a Better Auth `/auth` route.

This contract excludes `PUT` and `DELETE`.

Sync push keeps a receipt for each mutation.
The HTTP `Idempotency-Key` replays the whole push response.

## Lease

The lease lasts 60 seconds. The API refreshes the lease while the request is open. A crash can repeat a side effect that already committed.

## Checkout

Checkout sends Stripe a hash of the user id and the `Idempotency-Key`.
A crash does not open a second Checkout session.

## Large responses

If the response is larger than 1 MiB, the API does not store it.
A replay returns `409` `idempotency_response_omitted`.

## Hook

The global hook covers a new `POST` or `PATCH`.
The route adds no idempotency code.
An exemption sets `config.idempotency` to `false`.
List each exemption and its reason in this table.

| Route | Reason |
|-------|--------|
| `POST /chat` | SSE stream. An `Idempotency-Key` returns `400` `idempotency_key_unsupported`. |

The error envelope is in [api-errors.md](./api-errors.md).

## Webapp

The webapp client mints one `Idempotency-Key` for one `POST` or `PATCH` call.
A retry of that call reuses the key and the same body bytes.
`useMutation` does not retry.
A new `mutationFn` call is a new attempt.
`POST /chat` uses `DefaultChatTransport`, not this client.

## Checklist

- [ ] The global hook covers a new `POST` or `PATCH`
- [ ] An exemption sets `config.idempotency` to `false`
- [ ] This file names the exemption and the reason
