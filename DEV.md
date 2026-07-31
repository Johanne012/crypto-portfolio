# Developer API — محفظتي

## JSON schema (export)

```json
{
  "version": 1,
  "exportedAt": "ISO-8601",
  "portfolio": {
    "totalValue": 0,
    "totalCost": 0,
    "totalPnl": 0,
    "assets": [
      {
        "symbol": "BTC",
        "amount": 0.1,
        "buyPrice": 40000,
        "price": 42000,
        "value": 4200,
        "pnl": 200,
        "change24h": 1.5,
        "source": "manual"
      }
    ]
  },
  "risk": {
    "level": "متوسط",
    "riskScore": 42,
    "divScore": 55,
    "hhi": 0.22,
    "effN": 4.5,
    "top1Pct": 35,
    "top3Pct": 70,
    "stableSharePct": 10,
    "volProxy24h": 3.2,
    "maxDrawdownPct": 5,
    "nAssets": 5,
    "notes": ["..."]
  },
  "meta": { "app": "crypto-portfolio", "repo": "https://github.com/Johanne012/crypto-portfolio" }
}
```

## Webhook

1. In-app: خيارات → Developer → الصق URL → اختبار / إرسال عند التحديث
2. Server receives `POST` JSON body as above
3. Browser may use `/api/webhook-proxy` to avoid CORS

### Example receiver (Node)

```js
app.post("/hook", (req, res) => {
  console.log(req.body.risk?.riskScore, req.body.portfolio?.totalValue);
  res.sendStatus(200);
});
```

### Example (Zapier / Make / n8n)

Catch webhook → filter `risk.riskScore >= 65` → email/Telegram.
