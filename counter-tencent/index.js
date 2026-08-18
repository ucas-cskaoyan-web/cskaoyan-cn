const cloudbase = require("@cloudbase/node-sdk");
const crypto = require("node:crypto");
const http = require("node:http");

const SITE_IDS = ["iie", "iscas", "sict", "bgi", "hias", "cnic", "ict"];
const SITE_ID_SET = new Set(SITE_IDS);
const INITIAL_COUNTS = { iie: 11, iscas: 2, sict: 3, bgi: 0, hias: 1, cnic: 0, ict: 5 };
const ALLOWED_ORIGINS = new Set([
  "https://cskaoyan.cn",
  "https://www.cskaoyan.cn",
  "https://ucas-cskaoyan-web.github.io",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
]);
const GATEWAY_CORS_ORIGINS = new Set([
  "http://localhost:4173",
  "http://127.0.0.1:4173",
]);

const envId = process.env.TCB_ENV_ID || process.env.ENV_ID;
const cloudbaseApiKey = process.env.CLOUDBASE_APIKEY;
const rateLimitSecret = process.env.RATE_LIMIT_SECRET;

if (!envId || !cloudbaseApiKey || !rateLimitSecret) {
  throw new Error("TCB_ENV_ID, CLOUDBASE_APIKEY and RATE_LIMIT_SECRET are required");
}

const app = cloudbase.init({ env: envId, accessKey: cloudbaseApiKey });
const db = app.database();
const command = db.command;
let databaseReady;

function firstDocument(result) {
  const data = result?.data;
  return Array.isArray(data) ? data[0] || null : data || null;
}

function isMissingDocument(error) {
  const value = `${error?.code || ""} ${error?.message || error || ""}`;
  return /not.?found|not.?exist|collection.?not.?exist|不存在|找不到/i.test(value);
}

function headersFor(origin) {
  if (!ALLOWED_ORIGINS.has(origin) || GATEWAY_CORS_ORIGINS.has(origin)) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
}

async function ensureDocument(document, initialData) {
  try {
    const result = await document.get();
    const data = firstDocument(result);
    if (data && Object.keys(data).length) return;
  } catch (error) {
    if (!isMissingDocument(error)) throw error;
  }
  await document.set(initialData);
}

async function ensureDatabase() {
  if (!databaseReady) {
    databaseReady = (async () => {
      await Promise.all(SITE_IDS.map((siteId) => ensureDocument(
        db.collection("card_clicks").doc(siteId),
        { siteId, clicks: INITIAL_COUNTS[siteId], updatedAt: db.serverDate() },
      )));
      await ensureDocument(
        db.collection("click_rate_limits").doc("bootstrap"),
        { key: "bootstrap", windowStart: 0, attempts: 0, updatedAt: db.serverDate() },
      );
    })().catch((error) => {
      databaseReady = null;
      throw error;
    });
  }
  return databaseReady;
}

function response(statusCode, body, headers = {}) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      ...headers,
    },
    body: JSON.stringify(body),
  };
}

function hashKey(value) {
  return crypto.createHmac("sha256", rateLimitSecret).update(value).digest("hex");
}

function eventRequest(event) {
  const headers = Object.fromEntries(
    Object.entries(event.headers || {}).map(([key, value]) => [key.toLowerCase(), value]),
  );
  const requestContext = event.requestContext || {};
  const http = requestContext.http || {};
  return {
    method: String(event.httpMethod || http.method || "GET").toUpperCase(),
    path: event.path || http.path || "/",
    query: event.queryStringParameters || {},
    headers,
  };
}

function clientIp(headers) {
  return String(
    headers["x-original-forwarded-for"]?.split(",", 1)[0]
      || headers["x-forwarded-for"]?.split(",", 1)[0]
      || headers["x-real-ip"]
      || headers["client-ip"]
      || "unknown",
  ).slice(0, 64);
}

function rateDocumentId(key, windowStart) {
  return `${hashKey(key)}-${windowStart}`.slice(0, 120);
}

async function reserveRateSlot(key, windowStart, limit) {
  const id = rateDocumentId(key, windowStart);
  const collection = db.collection("click_rate_limits");
  const transactionResult = await db.runTransaction(async (transaction) => {
    const document = transaction.collection("click_rate_limits").doc(id);
    let attempts = 0;
    try {
      const snapshot = await document.get();
      attempts = Number(snapshot.data?.attempts || 0);
    } catch (error) {
      if (!/not exist|不存在|document/i.test(String(error.message || error))) throw error;
    }
    if (attempts >= limit) return false;
    await document.set({
      key: hashKey(key),
      windowStart,
      attempts: attempts + 1,
      updatedAt: db.serverDate(),
    });
    return true;
  });
  return transactionResult;
}

async function getCounts() {
  await ensureDatabase();
  const result = await db.collection("card_clicks").get();
  const counts = Object.fromEntries(SITE_IDS.map((siteId) => [siteId, 0]));
  for (const row of result.data || []) {
    if (SITE_ID_SET.has(row.siteId)) counts[row.siteId] = Number(row.clicks || 0);
  }
  return counts;
}

async function incrementClick(siteId) {
  await ensureDatabase();
  const document = db.collection("card_clicks").doc(siteId);
  try {
    await document.update({ clicks: command.inc(1), updatedAt: db.serverDate() });
  } catch (error) {
    if (!/not exist|不存在|document/i.test(String(error.message || error))) throw error;
    await document.set({ siteId, clicks: 1, updatedAt: db.serverDate() });
  }
  const result = await document.get();
  return Number(firstDocument(result)?.clicks || 0);
}

async function isRateLimited(siteId, visitor, ipAddress) {
  await ensureDatabase();
  const now = Math.floor(Date.now() / 1000);
  const minute = Math.floor(now / 60);
  const hour = Math.floor(minute / 60);
  const beijingDay = Math.floor((now + 8 * 3600) / 86400);
  const visitorIdentity = visitor || ipAddress;
  const checks = [
    [`visitor-minute:${siteId}:${visitorIdentity}`, minute, 5, "visitor_minute_limit"],
    [`ip-minute:${siteId}:${ipAddress}`, minute, 5, "ip_card_minute_limit"],
    [`visitor-hour:${visitorIdentity}`, hour, 10, "visitor_hour_limit"],
    [`ip-hour:${ipAddress}`, hour, 10, "ip_hour_limit"],
    [`visitor-day:${visitorIdentity}`, beijingDay, 20, "visitor_day_limit"],
    [`ip-day:${ipAddress}`, beijingDay, 20, "ip_day_limit"],
  ];
  for (const [key, windowStart, limit, reason] of checks) {
    if (!await reserveRateSlot(key, windowStart, limit)) return reason;
  }
  return "";
}

async function main(event) {
  const request = eventRequest(event);
  const origin = request.headers.origin || "";
  const cors = headersFor(origin);

  if (request.method === "OPTIONS") {
    return origin && ALLOWED_ORIGINS.has(origin)
      ? response(204, {}, cors)
      : response(403, { error: "origin_not_allowed" });
  }

  if (request.method === "GET" && request.path === "/health") {
    return response(200, { status: "ok" }, { ...cors, "Cache-Control": "no-store" });
  }

  if (request.method === "GET" && (request.path === "/counts" || request.path === "/count/counts")) {
    try {
      return response(200, await getCounts(), { ...cors, "Cache-Control": "public, max-age=30" });
    } catch (error) {
      console.error("get counts failed", error);
      return response(503, { error: "database_error" }, cors);
    }
  }

  const match = request.path.match(/^(?:\/count)?\/click\/([^/]+)\/?$/);
  if (request.method === "POST" && match) {
    if (!origin || !ALLOWED_ORIGINS.has(origin)) return response(403, { error: "origin_not_allowed" });
    const siteId = decodeURIComponent(match[1]);
    if (!SITE_ID_SET.has(siteId)) return response(404, { error: "unknown_site" }, cors);
    const visitor = String(request.query.visitor || "").slice(0, 96);
    const reason = await isRateLimited(siteId, visitor, clientIp(request.headers));
    if (reason) {
      return response(429, { error: "rate_limited", reason, message: "点击过于频繁，请稍后再试" }, {
        ...cors,
        "Retry-After": "60",
      });
    }
    try {
      const clicks = await incrementClick(siteId);
      return response(200, { siteId, clicks }, cors);
    } catch (error) {
      console.error("increment click failed", error);
      return response(503, { error: "database_error" }, cors);
    }
  }

  return response(200, {
    service: "cskaoyan Tencent CloudBase counter",
    endpoints: ["GET /counts", "POST /click/:siteId", "GET /health"],
  }, { ...cors, "Cache-Control": "no-store" });
}

exports.main = main;

if (require.main === module) {
  const server = http.createServer(async (request, response) => {
    const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);
    const event = {
      httpMethod: request.method,
      path: url.pathname,
      queryStringParameters: Object.fromEntries(url.searchParams.entries()),
      headers: request.headers,
    };
    try {
      const result = await main(event);
      response.writeHead(result.statusCode || 200, result.headers || {});
      response.end(result.body || "");
    } catch (error) {
      console.error("request failed", error);
      response.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
      response.end(JSON.stringify({ error: "internal_error" }));
    }
  });

  server.listen(9000, "0.0.0.0", () => {
    console.log("cskaoyan Tencent counter listening on port 9000");
  });
}
