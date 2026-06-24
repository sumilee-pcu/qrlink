import QRCode from "qrcode";

function text(res, status, message) {
  res.statusCode = status;
  res.setHeader("content-type", "text/plain; charset=utf-8");
  res.end(message);
}

function isAllowedUrl(value) {
  try {
    const url = new URL(value);
    return ["http:", "https:", "mailto:", "tel:"].includes(url.protocol);
  } catch {
    return false;
  }
}

export default async function handler(req, res) {
  const targetUrl = String(req.query.url || "").trim();
  if (!isAllowedUrl(targetUrl)) {
    text(res, 400, "Invalid URL");
    return;
  }

  const svg = await QRCode.toString(targetUrl, {
    type: "svg",
    errorCorrectionLevel: "quartile",
    margin: 3,
    color: {
      dark: "#111827",
      light: "#ffffff",
    },
  });

  res.statusCode = 200;
  res.setHeader("content-type", "image/svg+xml; charset=utf-8");
  res.setHeader("cache-control", "public, max-age=86400, s-maxage=86400");
  res.end(svg);
}
