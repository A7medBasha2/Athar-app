# Proguard rules for Athar (com.athar.athar)
-keep class com.athar.islamic.** { *; }
-keep class com.athar.athar.** { *; }
-keep class com.getcapacitor.** { *; }
-dontwarn com.google.dagger.hilt.**
-keepattributes *Annotation*,Signature,InnerClasses,EnclosingMethod
