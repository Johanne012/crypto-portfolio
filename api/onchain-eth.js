module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  try {
    const address = String((req.body && req.body.address) || "").trim();
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return res.status(400).json({ error: "invalid ETH address" });
    }

    // Public Ethereum JSON-RPC (Cloudflare) — eth_getBalance
    const r = await fetch("https://cloudflare-eth.com", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_getBalance",
        params: [address, "latest"],
      }),
    });
    const data = await r.json();
    if (data.error) {
      return res.status(502).json({ error: data.error.message || "rpc error" });
    }
    const weiHex = data.result;
    if (!weiHex) return res.status(502).json({ error: "empty balance result" });
    const wei = BigInt(weiHex);
    const eth = Number(wei) / 1e18;

    return res.status(200).json({
      chain: "ETH",
      address,
      balance: eth,
      balanceWei: weiHex,
    });
  } catch (e) {
    return res.status(500).json({ error: e.message || "server error" });
  }
};
