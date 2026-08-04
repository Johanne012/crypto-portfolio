# محفظتي — Crypto Portfolio

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Deploy on Vercel](https://img.shields.io/badge/Deploy-Vercel-black)](https://vercel.com/new)

محفظة عملات رقمية عربية مجانية — تتبع الأرباح والخسائر بأسعار Binance الحية، مع مزامنة Binance و Coinbase وعناوين On-chain.

**Demo:** [crypto-portfolio-rust.vercel.app](https://crypto-portfolio-rust.vercel.app)

## الميزات

- إدخال يدوي للأصول + وضع ورقي (Paper)
- مزامنة **Binance** و **Coinbase** (مفاتيح قراءة فقط)
- عناوين **On-chain** (BTC عبر Blockstream · ETH رصيد أصلي)
- أسعار حية + تغيّر 24 ساعة
- رسوم بيانية (توزيع + خط زمني)
- تحليل مخاطر بسيط (تركّز، HHI، تقلب، تراجع)
- وضع خصوصية (إخفاء الأرقام)
- تصدير/استيراد CSV + تصدير JSON + Webhook
- حفظ محلي في المتصفح فقط

## مسارات الـ API (Vercel Serverless)

| Path | الوظيفة |
|------|--------|
| `POST /api/prices` | أسعار من Binance العامة |
| `POST /api/binance-account` | حساب Binance موقّع |
| `POST /api/coinbase-accounts` | حسابات Coinbase موقّعة |
| `POST /api/onchain-btc` | رصيد عنوان Bitcoin |
| `POST /api/onchain-eth` | رصيد عنوان Ethereum |
| `POST /api/webhook-proxy` | إرسال webhook |

المفاتيح تُرسل في جسم الطلب ولا تُخزَّن على الخادم.

## النشر

```bash
npx vercel --yes
```

أو Import من https://vercel.com/new للمستودع `Johanne012/crypto-portfolio`.

> **مهم:** مسارات `/api` تعمل فقط بعد النشر على Vercel (لا تعمل عند فتح الملف محلياً كـ `file://`).

## الأمان (مهم جداً)

1. استخدم **مفاتيح قراءة فقط** (Read-only) على Binance و Coinbase.
2. لا تفعّل صلاحيات السحب أو التداول.
3. المفاتيح تُحفظ في `localStorage` على جهازك فقط — لا ترفعها إلى Git.
4. لا تشارك لقطة شاشة تحتوي على المفاتيح.
5. امسح المفاتيح من التطبيق عند استخدام جهاز مشترك.

## الاستخدام السريع

1. افتح الصفحة المنشورة
2. أضف عملة + كمية + سعر شراء (تبويب «يدوي»)
3. أو اربط Binance/Coinbase من التبويبات المخصصة
4. راقب القيمة والربح وتحليل المخاطر مباشرة

## التوثيق الإضافي

- [API_SETUP.md](API_SETUP.md) — إعداد مفاتيح المنصات
- [ONCHAIN.md](ONCHAIN.md) — العناوين على السلسلة
- [DEV.md](DEV.md) — وضع المطوّر و Webhook
- [STATUS.md](STATUS.md) — حالة المشروع

## الرخصة

MIT — انظر [LICENSE](LICENSE)
