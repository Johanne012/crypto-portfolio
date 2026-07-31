# تتبع العناوين On-chain

## BTC
`POST /api/onchain-btc` body: `{ "address": "bc1... أو 1... أو 3..." }`
مصدر الرصيد: Blockstream API (عام)

## ETH
`POST /api/onchain-eth` body: `{ "address": "0x..." }`
مصدر الرصيد: Cloudflare Ethereum JSON-RPC (`eth_getBalance`) — رصيد ETH الأصلي فقط (ليس ERC-20)

## في الواجهة
تبويب **سلسلة** → اختر BTC أو ETH → الصق العنوان → مزامنة
يُستبدل أي أصل سابق بمصدر `onchain` لنفس الرمز.
