plugins {
    id("com.android.application") version "8.4.2" apply false
    id("org.jetbrains.kotlin.android") version "1.9.22" apply false
    id("com.google.dagger.hilt.android") version "2.50" apply false
    id("com.google.devtools.ksp") version "1.9.22-1.0.17" apply false
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
