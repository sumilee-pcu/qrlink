import { randomBytes } from "node:crypto";

const SLUG_ALPHABET = "23456789abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";
const MAX_RETRIES = 6;

function json(res, status, payload) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

function normalizeUrl(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function isAllowedUrl(value) {
  try {
    const url = new URL(value);
    return ["http:", "https:", "mailto:", "tel:"].includes(url.protocol);
  } catch {
    return false;
  }
}

function makeSlug(length = 5) {
  const bytes = randomBytes(length);
  let slug = "";
  for (const byte of bytes) {
    slug += SLUG_ALPHABET[byte % SLUG_ALPHABET.length];
  }
  return slug;
}

function getBaseUrl(req) {
  if (process.env.PUBLIC_BASE_URL) return process.env.PUBLIC_BASE_URL.replace(/\/$/, "");
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  return `${proto}://${host}`;
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

async function insertShortLink(slug, targetUrl) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    throw new Error("Supabase environment variables are not configured.");
  }

  const response = await fetch(`${supabaseUrl}/rest/v1/short_links`, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      authorization: `Bearer ${serviceKey}`,
      "content-type": "application/json",
      prefer: "return=representation",
    },
    body: JSON.stringify({ slug, target_url: targetUrl }),
  });

  if (response.status === 409) return { conflict: true };
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Supabase insert failed: ${detail}`);
  }

  const [row] = await response.json();
  return { row };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    json(res, 405, { error: "POST only" });
    return;
  }

  let body;
  try {
    body = await readJson(req);
  } catch {
    json(res, 400, { error: "Invalid JSON body" });
    return;
  }

  const targetUrl = normalizeUrl(body.url);
  if (!isAllowedUrl(targetUrl)) {
    json(res, 400, { error: "Invalid URL" });
    return;
  }

  try {
    for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
      const slug = makeSlug();
      const result = await insertShortLink(slug, targetUrl);
      if (result.conflict) continue;

      const baseUrl = getBaseUrl(req);
      json(res, 201, {
        slug: result.row.slug,
        targetUrl: result.row.target_url,
        shortUrl: `${baseUrl}/r/${result.row.slug}`,
      });
      return;
    }

    json(res, 503, { error: "Could not allocate a unique short code" });
  } catch (error) {
    json(res, 500, { error: error.message });
  }
}
