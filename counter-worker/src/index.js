const SITE_IDS = new Set(["iie", "iscas", "sict", "bgi", "hias", "cnic", "ict"]);
const WRITE_ORIGINS = new Set([
  "https://cskaoyan.cn",
  "https://www.cskaoyan.cn",
  "https://ucas-cskaoyan-web.github.io",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
]);
const textEncoder = new TextEncoder();

function json(data, init = {}) {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(data), { ...init, headers });
}

function siteIdFromPath(pathname, prefix) {
  const value = pathname.slice(prefix.length).replace(/^\/+|\/+$/g, "");
  return SITE_IDS.has(value) ? value : "";
}

function corsHeaders(request) {
  const origin = request.headers.get("origin");
  if (!origin || !WRITE_ORIGINS.has(origin)) return {};

  return {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "content-type",
    vary: "Origin",
  };
}

async function incrementClick(env, siteId) {
  return env.DB.prepare(`
    INSERT INTO card_clicks (site_id, clicks)
    VALUES (?, 1)
    ON CONFLICT(site_id) DO UPDATE SET
      clicks = clicks + 1,
      updated_at = CURRENT_TIMESTAMP
    RETURNING clicks
  `).bind(siteId).first("clicks");
}

async function hashRateKey(secret, value) {
  const key = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, textEncoder.encode(value));
  return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function reserveRateSlot(env, rateKey, windowStart, limit) {
  const attempts = await env.DB.prepare(`
    INSERT INTO click_rate_limits (rate_key, window_start, attempts)
    VALUES (?, ?, 1)
    ON CONFLICT(rate_key, window_start) DO UPDATE SET
      attempts = attempts + 1
    WHERE attempts < ?
    RETURNING attempts
  `).bind(rateKey, windowStart, limit).first("attempts");
  return attempts !== null;
}

function rateLimited(cors, reason = "rate_limited") {
  return json(
    { error: "rate_limited", reason, message: "点击过于频繁，请稍后再试" },
    { status: 429, headers: { ...cors, "retry-after": "60" } },
  );
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const cors = corsHeaders(request);

    if (request.method === "OPTIONS") {
      const origin = request.headers.get("origin");
      if (!origin || !WRITE_ORIGINS.has(origin)) return new Response(null, { status: 403 });
      return new Response(null, { status: 204, headers: cors });
    }

    if (request.method === "POST" && url.pathname.startsWith("/click/")) {
      const origin = request.headers.get("origin");
      const siteId = siteIdFromPath(url.pathname, "/click/");
      if (!origin || !WRITE_ORIGINS.has(origin)) return json({ error: "origin_not_allowed" }, { status: 403 });
      if (!siteId) return json({ error: "unknown_site" }, { status: 404, headers: cors });

      const visitorId = (url.searchParams.get("visitor") || "").slice(0, 96);
      const ipAddress = request.headers.get("cf-connecting-ip") || "unknown";
      const visitorKey = `${siteId}:${visitorId || ipAddress}`;
      const ipKey = `${siteId}:${ipAddress}`;
      const [visitorLimit, ipLimit] = await Promise.all([
        env.CARD_CLICK_RATE_LIMIT.limit({ key: visitorKey }),
        env.CARD_IP_RATE_LIMIT.limit({ key: ipKey }),
      ]);
      if (!visitorLimit.success || !ipLimit.success) return rateLimited(cors, "edge_limit");

      const currentMinute = Math.floor(Date.now() / 60_000);
      const minuteWindow = currentMinute * 10 + 1;
      const hourWindow = Math.floor(currentMinute / 60) * 600 + 2;
      const chinaDayStart = Math.floor((currentMinute + 480) / 1_440) * 1_440 - 480;
      const chinaDayWindow = chinaDayStart * 10 + 3;
      const visitorIdentity = visitorId || ipAddress;
      const [
        visitorRateKey,
        ipRateKey,
        visitorHourRateKey,
        visitorDayRateKey,
        ipHourRateKey,
        ipDayRateKey,
      ] = await Promise.all([
        hashRateKey(env.RATE_LIMIT_SECRET, `visitor:${siteId}:${visitorIdentity}`),
        hashRateKey(env.RATE_LIMIT_SECRET, `ip:${siteId}:${ipAddress}`),
        hashRateKey(env.RATE_LIMIT_SECRET, `visitor-hour:${visitorIdentity}`),
        hashRateKey(env.RATE_LIMIT_SECRET, `visitor-day:${visitorIdentity}`),
        hashRateKey(env.RATE_LIMIT_SECRET, `ip-hour:${ipAddress}`),
        hashRateKey(env.RATE_LIMIT_SECRET, `ip-day:${ipAddress}`),
      ]);
      if (!await reserveRateSlot(env, visitorRateKey, minuteWindow, 5)) {
        return rateLimited(cors, "visitor_minute_limit");
      }
      if (!await reserveRateSlot(env, ipRateKey, minuteWindow, 5)) {
        return rateLimited(cors, "ip_card_minute_limit");
      }
      if (!await reserveRateSlot(env, visitorHourRateKey, hourWindow, 10)) {
        return rateLimited(cors, "visitor_hour_limit");
      }
      if (!await reserveRateSlot(env, visitorDayRateKey, chinaDayWindow, 20)) {
        return rateLimited(cors, "visitor_day_limit");
      }
      if (!await reserveRateSlot(env, ipHourRateKey, hourWindow, 10)) {
        return rateLimited(cors, "ip_hour_limit");
      }
      if (!await reserveRateSlot(env, ipDayRateKey, chinaDayWindow, 20)) {
        return rateLimited(cors, "ip_day_limit");
      }

      const clicks = await incrementClick(env, siteId);
      if (Math.random() < 0.02) {
        ctx.waitUntil(
          env.DB.prepare("DELETE FROM click_rate_limits WHERE window_start < ?")
            .bind((currentMinute - 1_440) * 10)
            .run(),
        );
      }
      return json({ siteId, clicks: Number(clicks) }, { headers: cors });
    }

    if (request.method === "GET" && url.pathname === "/counts") {
      const result = await env.DB.prepare(
        "SELECT site_id, clicks FROM card_clicks ORDER BY site_id",
      ).all();
      const counts = Object.fromEntries(SITE_IDS.values().map((siteId) => [siteId, 0]));
      result.results.forEach((row) => {
        if (SITE_IDS.has(row.site_id)) counts[row.site_id] = Number(row.clicks || 0);
      });
      return json(counts, {
        headers: {
          ...cors,
          "cache-control": "public, max-age=30",
        },
      });
    }

    return json(
      {
        service: "cskaoyan card click counter",
        endpoints: ["POST /click/:siteId", "GET /counts"],
      },
      { headers: { "cache-control": "no-store" } },
    );
  },
};
