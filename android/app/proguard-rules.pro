# Proguard & R8 Optimization rules for Athar (com.athar.athar & com.athar.islamic)
-keep class com.athar.athar.** { *; }
-keep class com.athar.islamic.** { *; }
-keep class * extends android.app.Service { *; }
-keep class * extends android.content.BroadcastReceiver { *; }
-keep class * extends android.app.Activity { *; }
-keep class com.getcapacitor.** { *; }
-dontwarn com.google.dagger.hilt.**
-keepattributes *Annotation*,Signature,InnerClasses,EnclosingMethod

# Strip verbose, debug, and info logs as well as printStackTrace in production Release builds
-assumenosideeffects class android.util.Log {
    public static boolean isLoggable(java.lang.String, int);
    public static int v(...);
    public static int d(...);
    public static int i(...);
}

-assumenosideeffects class java.lang.Throwable {
    public void printStackTrace();
}

# Firebase & Google Play Services - Consumer rules inside AARs apply; allow R8 to prune unused code
-dontwarn com.google.firebase.**
-dontwarn com.google.android.gms.**
-keep class com.google.firebase.messaging.FirebaseMessagingService { *; }

# Android Media3 & ExoPlayer - Keep runtime audio playback classes, allow unused decoders/codecs to be pruned
-keep class androidx.media3.exoplayer.** { <init>(...); }
-keep class androidx.media3.session.** { <init>(...); }
-dontwarn androidx.media3.**

# Kotlin Coroutines & JSON serialization
-keepclassmembers class * {
    @com.google.gson.annotations.SerializedName <fields>;
}
-dontwarn sun.misc.Unsafe
