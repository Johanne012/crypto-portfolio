# محفظتي — Crypto Portfolio

محفظة عربية مع مزامنة **Binance** و **Coinbase** عبر **Vercel Serverless Functions** (تجاوز CORS).

## المسارات
| Path | الوظيفة |
|------|--------|
| `POST /api/binance-account` | حساب Binance موقّع |
| `POST /api/coinbase-accounts` | حسابات Coinbase موقّعة |
| `POST /api/prices` | أسعار من Binance العامة |

المفاتيح تُرسل في جسم الطلب ولا تُخزَّن على الخادم.

## النشر
```bash
npx vercel --yes
```
أو Import على https://vercel.com/new من المستودع `Johanne012/crypto-portfolio`

**مهم:** مسارات `/api` تعمل فقط بعد النشر على Vercel (لا تعمل من فتح الملف محلياً كـ file://).

## الخيارات
- ترتيب حسب القيمة / الربح / الاسم
- إخفاء أرصدة &lt; $1
- إخفاء المستقرات
- فترة التحديث التلقائي
- مزامنة المنصتين معاً

## أمان
استخدم مفاتيح قراءة فقط. لا ترفع الأسرار إلى Git.
