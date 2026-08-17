const SITE_IDS = new Set(["iie", "iscas", "sict", "bgi", "hias", "cnic", "ict"]);
const WRITE_ORIGINS = new Set([
  "https://cskaoyan.cn",
  "https://www.cskaoyan.cn",
  "https://ucas-cskaoyan-web.github.io",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
]);

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

export default {
  async fetch(request, env) {
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

      const clicks = await incrementClick(env, siteId);
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
