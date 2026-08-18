# Source service

This container provides the two public services used by `cskaoyan.cn`:

- `GET /img/:filename` serves institute images.
- `GET /count/counts` returns all card click totals.
- `POST /count/click/:siteId?visitor=...` records a card outbound click.

Runtime data stays outside the image:

- `data/counter.db` contains totals and rate-limit buckets.
- `images/` contains the public image files.
- `.env` contains the HMAC secret and must not be committed.

The service binds only to `127.0.0.1:9100`; public access goes through the
`source.cskaoyan.cn` Nginx virtual host. Supported site IDs are `iie`, `iscas`,
`sict`, `bgi`, `hias`, `cnic`, and `ict`.

Rate limiting is performed against HMAC hashes rather than raw IP addresses:

- 5 accepted clicks per card and identity per minute.
- 10 accepted clicks across all cards per natural hour.
- 20 accepted clicks across all cards per Beijing calendar day.

To update images, replace files under `images/`. No image rebuild or container
restart is required.
