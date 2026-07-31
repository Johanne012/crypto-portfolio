const crypto = require("crypto");

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  try {
    const { key, secret, passphrase } = req.body || {};
    if (!key || !secret || !passphrase) {
      return res.status(400).json({ error: "key, secret, passphrase required" });
    }

    const requestPath = "/api/v3/brokerage/accounts";
    const timestamp = String(Math.floor(Date.now() / 1000));
    const message = timestamp + "GET" + requestPath;

    let secretKey;
    try {
      secretKey = Buffer.from(secret, "base64");
    } catch {
      secretKey = Buffer.from(secret, "utf8");
    }

    const signature = crypto.createHmac("sha256", secretKey).update(message).digest("base64");

    const r = await fetch("https://api.coinbase.com" + requestPath, {
      method: "GET",
      headers: {
        "CB-ACCESS-KEY": key,
        "CB-ACCESS-SIGN": signature,
        "CB-ACCESS-TIMESTAMP": timestamp,
        "CB-ACCESS-PASSPHRASE": passphrase,
        "Content-Type": "application/json",
      },
    });

    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      return res.status(r.status).json({
        error: data.message || data.error || r.statusText || "Coinbase error",
        raw: data,
      });
    }
    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ error: e.message || "server error" });
  }
};
