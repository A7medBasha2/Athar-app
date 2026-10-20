plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("com.google.dagger.hilt.android")
    id("com.google.devtools.ksp")
    id("com.google.gms.google-services")
    id("com.google.firebase.crashlytics")
}

android {
    namespace = "com.athar.islamic"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.athar.islamic"
        minSdk = 26
        targetSdk = 36
        versionCode = 1
        versionName = "1.0.0"
        multiDexEnabled = true
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_21
        targetCompatibility = JavaVersion.VERSION_21
    }

    kotlinOptions {
        jvmTarget = "21"
        // هذا السطر هو الحل السحري لتخطي أخطاء الـ Val والتحذيرات الواردة في المكاتب الخارجية مثل local-notifications
        freeCompilerArgs += listOf("-Xsuppress-version-warnings", "-Xjvm-default=all")
    }

    androidResources {
        noCompress += listOf("mp3", "wav", "ogg")
    }

    buildFeatures {
        buildConfig = true
    }
}

dependencies {
    implementation("androidx.appcompat:appcompat:1.6.1")

    // Android Media3 & ExoPlayer for Background Audio & MediaSession
    implementation("androidx.media3:media3-exoplayer:1.2.1")
    implementation("androidx.media3:media3-session:1.2.1")
    implementation("androidx.media3:media3-ui:1.2.1")
    implementation("androidx.media3:media3-common:1.2.1")
    implementation("androidx.media3:media3-datasource:1.2.1")

    // Hilt Dependency Injection
    implementation("com.google.dagger:hilt-android:2.50")
    ksp("com.google.dagger:hilt-android-compiler:2.50")

    // MultiDex Support
    implementation("androidx.multidex:multidex:2.0.1")

    // Firebase BoM and Services (FCM & Crashlytics)
    implementation(platform("com.google.firebase:firebase-bom:33.9.0"))
    implementation("com.google.firebase:firebase-messaging-ktx")
    implementation("com.google.firebase:firebase-crashlytics-ktx")
    implementation("com.google.firebase:firebase-analytics-ktx")

    // Google Play Services Auth for Native Google Sign-In
    implementation("com.google.android.gms:play-services-auth:21.3.0")

    // Capacitor Native Bridge & Plugins
    findProject(":capacitor-android")?.let {
        implementation(project(":capacitor-android"))
    }
    findProject(":capacitor-local-notifications")?.let {
        implementation(project(":capacitor-local-notifications"))
    }
    findProject(":codetrix-studio-capacitor-google-auth")?.let {
        implementation(project(":codetrix-studio-capacitor-google-auth"))
    }
}
