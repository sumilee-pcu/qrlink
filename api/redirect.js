function redirect(res, location) {
  res.statusCode = 302;
  res.setHeader("location", location);
  res.end();
}

function text(res, status, message) {
  res.statusCode = status;
  res.setHeader("content-type", "text/plain; charset=utf-8");
  res.end(message);
}

function isSlug(value) {
  return /^[A-Za-z0-9]{4,32}$/.test(String(value || ""));
}

async function findTarget(slug) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    throw new Error("Supabase environment variables are not configured.");
  }

  const query = new URLSearchParams({
    slug: `eq.${slug}`,
    select: "target_url",
    limit: "1",
  });

  const response = await fetch(`${supabaseUrl}/rest/v1/short_links?${query}`, {
    headers: {
      apikey: serviceKey,
      authorization: `Bearer ${serviceKey}`,
    },
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Supabase lookup failed: ${detail}`);
  }

  const [row] = await response.json();
  return row?.target_url;
}

export default async function handler(req, res) {
  const slug = req.query.slug;
  if (!isSlug(slug)) {
    text(res, 400, "Invalid short link.");
    return;
  }

  try {
    const targetUrl = await findTarget(slug);
    if (!targetUrl) {
      text(res, 404, "Short link not found.");
      return;
    }

    redirect(res, targetUrl);
  } catch (error) {
    text(res, 500, error.message);
  }
}
