# دليل ربط API — محفظتي

## Binance
1. API Management → Create API
2. Enable **Reading** فقط
3. انسخ Key + Secret
4. تبويب Binance في المحفظة → حفظ → مزامنة

## Coinbase (Advanced Trade)
1. Coinbase → Settings → API (أو Cloud portal حسب نوع الحساب)
2. أنشئ مفتاحاً مع **View** فقط
3. ستحصل على: **API Key** + **Secret** + **Passphrase**
4. تبويب Coinbase → أدخل الثلاثة → حفظ → مزامنة

المسار المستخدم: `GET /api/v3/brokerage/accounts`

### توقيع Coinbase
- Timestamp (ثوانٍ)
- الرسالة: `timestamp + GET + /api/v3/brokerage/accounts`
- HMAC-SHA256 بمفتاح Secret (Base64) ثم ترميز Base64 للتوقيع
- Headers: `CB-ACCESS-KEY`, `CB-ACCESS-SIGN`, `CB-ACCESS-TIMESTAMP`, `CB-ACCESS-PASSPHRASE`

## أمان
- صلاحيات قراءة فقط
- المفاتيح في `localStorage` على جهازك
- لا ترفع المفاتيح إلى GitHub

## قيود المتصفح (CORS)
- **Binance:** غالباً يعمل من المتصفح
- **Coinbase:** قد يفشل بسبب CORS من صفحة ثابتة
  - الحل لاحقاً: دالة Vercel/Cloudflare كوسيط توقيع دون كشف Secret للعموم

## المستودع
https://github.com/Johanne012/crypto-portfolio
