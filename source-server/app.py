import hashlib
import hmac
import json
import mimetypes
import os
import sqlite3
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit, parse_qs


SITE_IDS = ("iie", "iscas", "sict", "bgi", "hias", "cnic", "ict")
SITE_ID_SET = set(SITE_IDS)
DB_PATH = Path(os.environ.get("DATABASE_PATH", "/data/counter.db"))
IMAGE_DIR = Path(os.environ.get("IMAGE_DIR", "/app/images")).resolve()
COUNTER_SECRET = os.environ.get("COUNTER_SECRET", "")
ALLOWED_ORIGINS = {
    origin.strip()
    for origin in os.environ.get(
        "ALLOWED_ORIGINS",
        "https://cskaoyan.cn,https://www.cskaoyan.cn,http://localhost:4173,http://127.0.0.1:4173",
    ).split(",")
    if origin.strip()
}


def initialize_database():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(DB_PATH) as connection:
        connection.execute("PRAGMA journal_mode=WAL")
        connection.execute("PRAGMA busy_timeout=5000")
        connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS card_clicks (
                site_id TEXT PRIMARY KEY,
                clicks INTEGER NOT NULL DEFAULT 0,
                updated_at INTEGER NOT NULL DEFAULT (unixepoch())
            );

            CREATE TABLE IF NOT EXISTS click_rate_limits (
                rate_key TEXT NOT NULL,
                window_start INTEGER NOT NULL,
                attempts INTEGER NOT NULL DEFAULT 0,
                updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
                PRIMARY KEY (rate_key, window_start)
            );

            CREATE INDEX IF NOT EXISTS idx_click_rate_limits_updated
            ON click_rate_limits(updated_at);
            """
        )
        connection.executemany(
            "INSERT OR IGNORE INTO card_clicks (site_id, clicks) VALUES (?, 0)",
            ((site_id,) for site_id in SITE_IDS),
        )


def rate_key(value):
    return hmac.new(
        COUNTER_SECRET.encode("utf-8"),
        value.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


def reserve_rate_slot(connection, key, window_start, limit):
    row = connection.execute(
        "SELECT attempts FROM click_rate_limits WHERE rate_key = ? AND window_start = ?",
        (key, window_start),
    ).fetchone()
    if row and row[0] >= limit:
        return False
    connection.execute(
        """
        INSERT INTO click_rate_limits (rate_key, window_start, attempts)
        VALUES (?, ?, 1)
        ON CONFLICT(rate_key, window_start) DO UPDATE SET
            attempts = attempts + 1,
            updated_at = unixepoch()
        """,
        (key, window_start),
    )
    return True


class RequestHandler(BaseHTTPRequestHandler):
    server_version = "cskaoyan-source/1.0"

    def log_message(self, message, *args):
        print(f"{self.address_string()} - {message % args}")

    def send_json(self, payload, status=200, headers=None):
        body = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("X-Content-Type-Options", "nosniff")
        for name, value in (headers or {}).items():
            self.send_header(name, value)
        self.end_headers()
        self.wfile.write(body)

    def cors_headers(self):
        origin = self.headers.get("Origin", "")
        if origin not in ALLOWED_ORIGINS:
            return {}
        return {
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
            "Vary": "Origin",
        }

    def client_ip(self):
        forwarded = self.headers.get("X-Forwarded-For", "")
        return (forwarded.split(",", 1)[0].strip() or self.client_address[0])[:64]

    def do_OPTIONS(self):
        if self.headers.get("Origin", "") not in ALLOWED_ORIGINS:
            self.send_json({"error": "origin_not_allowed"}, 403)
            return
        self.send_response(204)
        for name, value in self.cors_headers().items():
            self.send_header(name, value)
        self.send_header("Content-Length", "0")
        self.end_headers()

    def do_GET(self):
        parsed = urlsplit(self.path)
        if parsed.path in ("/health", "/count/health"):
            self.send_json({"status": "ok"}, headers={"Cache-Control": "no-store"})
            return
        if parsed.path in ("/counts", "/count/counts"):
            self.handle_counts()
            return
        if parsed.path.startswith("/img/"):
            self.handle_image(parsed.path, head_only=False)
            return
        self.send_json(
            {
                "service": "cskaoyan source service",
                "endpoints": ["GET /img/:filename", "GET /count/counts", "POST /count/click/:siteId"],
            },
            headers={"Cache-Control": "no-store"},
        )

    def do_HEAD(self):
        parsed = urlsplit(self.path)
        if parsed.path.startswith("/img/"):
            self.handle_image(parsed.path, head_only=True)
            return
        self.send_response(404)
        self.send_header("Content-Length", "0")
        self.end_headers()

    def do_POST(self):
        parsed = urlsplit(self.path)
        prefixes = ("/click/", "/count/click/")
        prefix = next((value for value in prefixes if parsed.path.startswith(value)), "")
        if not prefix:
            self.send_json({"error": "not_found"}, 404)
            return
        if self.headers.get("Origin", "") not in ALLOWED_ORIGINS:
            self.send_json({"error": "origin_not_allowed"}, 403)
            return
        site_id = unquote(parsed.path[len(prefix):]).strip("/")
        if site_id not in SITE_ID_SET:
            self.send_json({"error": "unknown_site"}, 404, self.cors_headers())
            return
        visitor = parse_qs(parsed.query).get("visitor", [""])[0][:96]
        self.handle_click(site_id, visitor)

    def handle_counts(self):
        with sqlite3.connect(DB_PATH) as connection:
            rows = connection.execute("SELECT site_id, clicks FROM card_clicks").fetchall()
        counts = {site_id: 0 for site_id in SITE_IDS}
        for site_id, clicks in rows:
            if site_id in counts:
                counts[site_id] = int(clicks)
        headers = {"Cache-Control": "public, max-age=30", **self.cors_headers()}
        self.send_json(counts, headers=headers)

    def handle_click(self, site_id, visitor):
        now = int(time.time())
        current_minute = now // 60
        minute_window = current_minute
        hour_window = current_minute // 60
        beijing_day_window = (now + 8 * 3600) // 86400
        ip_address = self.client_ip()
        visitor_identity = visitor or ip_address
        limits = (
            (rate_key(f"visitor-minute:{site_id}:{visitor_identity}"), minute_window, 5, "visitor_minute_limit"),
            (rate_key(f"ip-minute:{site_id}:{ip_address}"), minute_window, 5, "ip_card_minute_limit"),
            (rate_key(f"visitor-hour:{visitor_identity}"), hour_window, 10, "visitor_hour_limit"),
            (rate_key(f"ip-hour:{ip_address}"), hour_window, 10, "ip_hour_limit"),
            (rate_key(f"visitor-day:{visitor_identity}"), beijing_day_window, 20, "visitor_day_limit"),
            (rate_key(f"ip-day:{ip_address}"), beijing_day_window, 20, "ip_day_limit"),
        )

        connection = sqlite3.connect(DB_PATH, timeout=5, isolation_level=None)
        try:
            connection.execute("BEGIN IMMEDIATE")
            for key, window_start, limit, reason in limits:
                if not reserve_rate_slot(connection, key, window_start, limit):
                    connection.execute("ROLLBACK")
                    self.send_json(
                        {"error": "rate_limited", "reason": reason, "message": "点击过于频繁，请稍后再试"},
                        429,
                        {**self.cors_headers(), "Retry-After": "60"},
                    )
                    return
            row = connection.execute(
                """
                INSERT INTO card_clicks (site_id, clicks, updated_at)
                VALUES (?, 1, unixepoch())
                ON CONFLICT(site_id) DO UPDATE SET
                    clicks = clicks + 1,
                    updated_at = unixepoch()
                RETURNING clicks
                """,
                (site_id,),
            ).fetchone()
            if now % 50 == 0:
                connection.execute(
                    "DELETE FROM click_rate_limits WHERE updated_at < ?",
                    (now - 2 * 86400,),
                )
            connection.execute("COMMIT")
        except sqlite3.Error:
            try:
                connection.execute("ROLLBACK")
            except sqlite3.Error:
                pass
            self.send_json({"error": "database_error"}, 503, self.cors_headers())
            return
        finally:
            connection.close()
        self.send_json({"siteId": site_id, "clicks": int(row[0])}, headers=self.cors_headers())

    def handle_image(self, path, head_only):
        filename = unquote(path[len("/img/"):]).strip("/")
        if not filename or "/" in filename or "\\" in filename:
            self.send_json({"error": "not_found"}, 404)
            return
        image_path = (IMAGE_DIR / filename).resolve()
        if image_path.parent != IMAGE_DIR or not image_path.is_file():
            self.send_json({"error": "not_found"}, 404)
            return
        content_type = mimetypes.guess_type(image_path.name)[0] or "application/octet-stream"
        body = image_path.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        if not head_only:
            self.wfile.write(body)


if __name__ == "__main__":
    if len(COUNTER_SECRET) < 32:
        raise RuntimeError("COUNTER_SECRET must contain at least 32 characters")
    initialize_database()
    port = int(os.environ.get("PORT", "8080"))
    server = ThreadingHTTPServer(("0.0.0.0", port), RequestHandler)
    print(f"cskaoyan source service listening on {port}")
    server.serve_forever()
