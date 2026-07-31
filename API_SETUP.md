# تفعيل Binance API مع المحفظة

## 1) إنشاء مفتاح على Binance

1. ادخل Binance → Profile → API Management
2. Create API → اختر نوع System generated
3. فعّل **Enable Reading** فقط
4. **لا تفعّل** Withdrawals أو Futures تداول إن لم تكن بحاجة
5. قيّد بـ IP إن أمكن (أ<object)
6. انسخ API Key و Secret مرة واحدة

## 2) في المحفظة

1. افتح التطبيق
2. تبويب **ربط Binance API**
3. الصق Key و Secret → **حفظ المفاتيح**
4. اضغط **مزامنة الأرصدة من Binance**

المفاتيح تُحفظ في `localStorage` على جهازك فقط.

## 3) ملاحظات أمنية

- استخدم Read-only دائماً
- لا تشارك المفاتيح
- المتصفح يرى الـ Secret (مناسب للاستخدام الشخصي فقط)
- للإنتاج الآمن لاحقاً: خادم وسيط يوقّع الطلبات دون كشف الـ Secret

## 4) أخطاء شائعة

| الرسالة | السبب |
|---------|--------|
| Invalid API-key | مفتاح خاطئ أو محذوف |
| Signature for this request is not valid | Secret خاطئ |
| IP not whitelisted | قيّد API بـ IP مختلف |
| CORS / Failed to fetch | شبكة أو حظر متصفح — جرّب متصفحاً آخر أو استضافة HTTPS |

## المستودع
https://github.com/Johanne012/crypto-portfolio
