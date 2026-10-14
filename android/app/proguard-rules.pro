# Proguard rules for Athar (com.athar.athar & com.athar.islamic)
-keep class com.athar.athar.** { *; }
-keep class com.athar.islamic.** { *; }
-keep class * extends android.app.Service { *; }
-keep class * extends android.content.BroadcastReceiver { *; }
-keep class * extends android.app.Activity { *; }
-keep class com.getcapacitor.** { *; }
-dontwarn com.google.dagger.hilt.**
-keepattributes *Annotation*,Signature,InnerClasses,EnclosingMethod
