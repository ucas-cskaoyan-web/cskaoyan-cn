# Tencent CloudBase counter

This function is compatible with the existing counter API:

`scf_bootstrap` starts the HTTP server on port 9000, as required by the HTTP function runtime.

```text
GET  /counts
POST /click/:siteId?visitor=<visitor-id>
GET  /health
```

For later releases, update only the function code so the existing HTTP gateway
route remains unchanged:

```bash
npm install
tcb fn code update cskaoyan-counter --dir . --deployMode cos
```

The first deployment needs two CloudBase database collections:

- `card_clicks`: `siteId`, `clicks`, `updatedAt`
- `click_rate_limits`: `key`, `windowStart`, `attempts`, `updatedAt`

Only the function accesses these collections. Keep client database read/write
permissions disabled. The function hashes IP and browser identities with HMAC
before storing rate-limit keys.

The HTTP function also requires these server-side environment variables:

- `TCB_ENV_ID`: the target CloudBase environment ID
- `CLOUDBASE_APIKEY`: a dedicated server API key; never commit it to this repo
- `RATE_LIMIT_SECRET`: a random HMAC secret; never commit it to this repo

Configure both secrets in the CloudBase function environment. The GitHub Pages
frontend only needs the public gateway URL.
