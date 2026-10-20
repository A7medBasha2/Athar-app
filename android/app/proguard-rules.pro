# Proguard rules for Athar (com.athar.athar & com.athar.islamic)
-keep class com.athar.athar.** { *; }
-keep class com.athar.islamic.** { *; }
-keep class * extends android.app.Service { *; }
-keep class * extends android.content.BroadcastReceiver { *; }
-keep class * extends android.app.Activity { *; }
-keep class com.getcapacitor.** { *; }
-dontwarn com.google.dagger.hilt.**
-keepattributes *Annotation*,Signature,InnerClasses,EnclosingMethod

# Strip verbose, debug, and info logs in production Release builds for maximum speed and security
-assumenosideeffects class android.util.Log {
    public static boolean isLoggable(java.lang.String, int);
    public static int v(...);
    public static int d(...);
    public static int i(...);
}
