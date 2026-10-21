/**
   * Google Sign-In via Native Capacitor Plugin
   */
  static async signInWithGoogle(): Promise<UserCredential | null> {
    try {
      if (Capacitor.isNativePlatform()) {
        try {
          // تهيئة إضافة جوجل بجميع المعرفات المطلوبة لضمان عدم حدوث خطأ التطبيق
          await GoogleAuth.initialize({
            clientId: GOOGLE_WEB_CLIENT_ID,
            scopes: ['profile', 'email'],
            grantOfflineAccess: true,
          });
        } catch (initErr) {
          console.warn('GoogleAuth already initialized or notice:', initErr);
        }

        const googleUser = await GoogleAuth.signIn();
        const idToken = googleUser?.authentication?.idToken;

        if (!idToken) {
          throw new Error('لم يتم استرداد رمز المصادقة (idToken) من جوجل.');
        }

        const credential = GoogleAuthProvider.credential(idToken);
        const cred = await signInWithCredential(auth, credential);

        if (cred && cred.user) {
          await this.syncGoogleUserRecord(cred.user);
        }

        return cred;
      } else {
        // Fallback للمتصفح أو الويب
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({
          prompt: 'select_account',
        });
        throw new Error('تسجيل الدخول عبر Google مخصص للأجهزة الذكية حالياً.');
      }
    } catch (err: any) {
      console.warn('Google Sign-In native error:', err);
      
      const errDetail = err?.message || err?.code || JSON.stringify(err);
      
      // إذا كان الخطأ متعلق بإن الإضافة غير مرتبطة ناتيف أو Developer Error 10
      if (errDetail.includes('not implemented') || errDetail.includes('10') || errDetail.includes('developer-error')) {
        if (typeof window !== 'undefined') {
          alert('تنبيه إعدادات Google Sign-In:\nيرجى التأكد من مطابقة بصمة SHA-1 في Firebase Console وتثبيت ملف APK المحدث.');
        }
      } else {
        if (typeof window !== 'undefined') {
          alert(`تشخيص خطأ Google:\n${errDetail}`);
        }
      }

      throw err;
    }
  }
