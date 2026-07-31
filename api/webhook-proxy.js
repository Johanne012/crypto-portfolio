/** Optional proxy so browser can POST to user webhooks without CORS issues */
module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  try {
    const { url, payload } = req.body || {};
    if (!url || typeof url !== "string") {
      return res.status(400).json({ error: "url required" });
    }
    let parsed;
    try {
      parsed = new URL(url);
    } catch {
      return res.status(400).json({ error: "invalid url" });
    }
    if (!/^https?:$/.test(parsed.protocol)) {
      return res.status(400).json({ error: "only http/https" });
    }

    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": "crypto-portfolio-webhook/1.0" },
      body: JSON.stringify(payload == null ? {} : payload),
    });

    const text = await r.text();
    return res.status(200).json({
      ok: r.ok,
      status: r.status,
      bodyPreview: text.slice(0, 500),
    });
  } catch (e) {
    return res.status(500).json({ error: e.message || "proxy error" });
  }
};
