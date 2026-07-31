module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  try {
    const symbols = (req.body && req.body.symbols) || [];
    if (!Array.isArray(symbols) || !symbols.length) {
      return res.status(400).json({ error: "symbols array required" });
    }

    const unique = [...new Set(symbols.map((s) => String(s).toUpperCase()))];
    const prices = {};

    await Promise.all(
      unique.map(async (sym) => {
        if (["USDT", "USDC", "USD", "BUSD", "DAI"].includes(sym)) {
          prices[sym] = 1;
          return;
        }
        try {
          const r = await fetch(
            "https://api.binance.com/api/v3/ticker/price?symbol=" + encodeURIComponent(sym + "USDT")
          );
          if (!r.ok) {
            prices[sym] = null;
            return;
          }
          const data = await r.json();
          prices[sym] = parseFloat(data.price);
        } catch {
          prices[sym] = null;
        }
      })
    );

    return res.status(200).json({ prices });
  } catch (e) {
    return res.status(500).json({ error: e.message || "server error" });
  }
};
