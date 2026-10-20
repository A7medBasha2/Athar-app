plugins {
    id("com.android.application") version "8.9.1" apply false
    id("com.android.library") version "8.9.1" apply false
    id("org.jetbrains.kotlin.android") version "2.1.0" apply false
    id("com.google.dagger.hilt.android") version "2.53.1" apply false // تم التحديث لدعم Kotlin 2.1.0 بنجاح
    id("com.google.devtools.ksp") version "2.1.0-1.0.29" apply false
    id("com.google.gms.google-services") version "4.4.2" apply false
    id("com.google.firebase.crashlytics") version "3.0.2" apply false
}

extra.apply {
    set("compileSdkVersion", 36)
    set("targetSdkVersion", 36)
    set("minSdkVersion", 26)
    set("androidxActivityVersion", "1.11.0")
}

tasks.register<Delete>("clean") {
    delete(rootProject.layout.buildDirectory)
}
