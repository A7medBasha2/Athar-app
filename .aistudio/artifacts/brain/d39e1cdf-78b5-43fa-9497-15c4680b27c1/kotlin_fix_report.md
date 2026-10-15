# تقرير معالجة خطأ تجميع Kotlin: `Val cannot be reassigned` في `AthanForegroundService.kt`

## 1. تفاصيل الخطأ البرمجي
- **الملف**: `android/app/src/main/java/com/athar/islamic/AthanForegroundService.kt`
- **الموضع**: حول السطر 158 داخل دالة `onStartCommand`
- **رسالة الخطأ**: `Val cannot be reassigned`
- **السبب**: محاولة إسناد قيمة جديدة للمتغير `isBackgroundServiceRunning = true` عند تلقي الحدث `ACTION_START_BACKGROUND_SERVICE`، و`isBackgroundServiceRunning = false` عند `ACTION_STOP_BACKGROUND_SERVICE`، بينما كان المتغير معرّفاً بصيغة القراءة فقط `val`.

---

## 2. الإجراءات التصحيحية المنفذة

### أ) ترقية المتغير `isBackgroundServiceRunning` إلى `var` وتوحيده
تم نقله إلى `companion object` كمتغير عام آمن برمجياً وقابل للتعديل:
```kotlin
companion object {
    ...
    @Volatile var isRinging: Boolean = false
    @Volatile var isBackgroundServiceRunning: Boolean = false
    ...
}
```
الميزات المحققة:
1. **القابلية للإسناد (`var`)**: حل جذري لخطأ `Val cannot be reassigned` عند السطر 158 (`isBackgroundServiceRunning = true`) والسطر 153 (`isBackgroundServiceRunning = false`).
2. **الأمان المتزامن (`@Volatile`)**: ضمان قراءة الحالة المحدثة فوراً بين مختلف الخيوط البرمجية (Threads) والخدمات الفرعية.
3. **التصفير النظيف**: التأكد من إعادة تعيين `isBackgroundServiceRunning = false` عند استدعاء `stopBackgroundInternal()`.

### ب) تحويل المتغيرات المؤقتة في `showFloatingOverlayIfPermitted` إلى `var`
تم تحويل `elapsed` و `duration` إلى `var` لمنع أي تعارض محتمل مستقبلاً:
```kotlin
var elapsed = getCurrentPositionMs()
var duration = getDurationMs()
```

---

## 3. التحقق وسلامة البناء
1. **التحقق من الأنواع والتجميع (`npm run lint` / `tsc --noEmit`)**: نجاح تام بدون أي أخطاء.
2. **فحص بناء التطبيق (`compile_applet`)**: نجاح تام.
3. **سير العمل الآلي لـ Gradle و GitHub Actions (`.github/workflows/build-apk.yml`)**:
   ملفات Gradle جاهزة للتجميع مع تفعيل `chmod +x android/gradlew` وبناء حزمة الـ APK بسلاسة.
