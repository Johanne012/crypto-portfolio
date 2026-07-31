const crypto = require("crypto");

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  try {
    const { key, secret } = req.body || {};
    if (!key || !secret) return res.status(400).json({ error: "key and secret required" });

    const timestamp = Date.now();
    const qs = new URLSearchParams({
      timestamp: String(timestamp),
      recvWindow: "60000",
    }).toString();
    const signature = crypto.createHmac("sha256", secret).update(qs).digest("hex");
    const url = `https://api.binance.com/api/v3/account?${qs}&signature=${signature}`;

    const r = await fetch(url, {
      headers: { "X-MBX-APIKEY": key },
    });
    const data = await r.json();
    if (!r.ok) {
      return res.status(r.status).json({ error: data.msg || data.message || "Binance error", raw: data });
    }
    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ error: e.message || "server error" });
  }
};
