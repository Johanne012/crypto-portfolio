module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  try {
    const address = String((req.body && req.body.address) || "").trim();
    if (!address || address.length < 26 || address.length > 90) {
      return res.status(400).json({ error: "invalid BTC address" });
    }
    if (!/^(bc1|[13]|tb1)[a-zA-HJ-NP-Z0-9]{25,87}$/i.test(address)) {
      return res.status(400).json({ error: "address format not recognized as BTC" });
    }

    const r = await fetch("https://blockstream.info/api/address/" + encodeURIComponent(address));
    if (!r.ok) {
      const t = await r.text();
      return res.status(r.status).json({ error: "blockstream error", detail: t.slice(0, 200) });
    }
    const data = await r.json();
    const funded = (data.chain_stats && data.chain_stats.funded_txo_sum) || 0;
    const spent = (data.chain_stats && data.chain_stats.spent_txo_sum) || 0;
    const memFunded = (data.mempool_stats && data.mempool_stats.funded_txo_sum) || 0;
    const memSpent = (data.mempool_stats && data.mempool_stats.spent_txo_sum) || 0;
    const sats = funded - spent + memFunded - memSpent;
    const btc = sats / 1e8;

    return res.status(200).json({
      chain: "BTC",
      address,
      balance: btc,
      balanceSats: sats,
      txCount: (data.chain_stats && data.chain_stats.tx_count) || 0,
    });
  } catch (e) {
    return res.status(500).json({ error: e.message || "server error" });
  }
};
