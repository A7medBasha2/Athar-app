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
        versionCode = 2
        versionName = "1.1.0"
        multiDexEnabled = true
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    flavorDimensions += "distribution"
    productFlavors {
        create("github") {
            dimension = "distribution"
        }
        create("play") {
            dimension = "distribution"
        }
    }

    signingConfigs {
        create("release") {
            val keystoreFile = System.getenv("RELEASE_KEYSTORE_PATH")?.let { file(it) }
                ?: rootProject.file("../release.keystore")
            if (keystoreFile.exists()) {
                storeFile = keystoreFile
                storePassword = System.getenv("RELEASE_KEYSTORE_PASSWORD")
                    ?: (project.findProperty("RELEASE_KEYSTORE_PASSWORD") as? String)
                    ?: "athar2026key"
                keyAlias = System.getenv("RELEASE_KEY_ALIAS")
                    ?: (project.findProperty("RELEASE_KEY_ALIAS") as? String)
                    ?: "releasekey"
                keyPassword = System.getenv("RELEASE_KEY_PASSWORD")
                    ?: (project.findProperty("RELEASE_KEY_PASSWORD") as? String)
                    ?: (System.getenv("RELEASE_KEYSTORE_PASSWORD") ?: "athar2026key")
            }
        }
    }

    buildTypes {
        release {
            isDebuggable = false
            isMinifyEnabled = true
            isShrinkResources = true
            val keystoreFile = System.getenv("RELEASE_KEYSTORE_PATH")?.let { file(it) }
                ?: rootProject.file("../release.keystore")
            if (keystoreFile.exists()) {
                signingConfig = signingConfigs.getByName("release")
            }
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }

    packaging {
        resources {
            excludes += listOf(
                "META-INF/DEPENDENCIES",
                "META-INF/LICENSE",
                "META-INF/LICENSE.txt",
                "META-INF/license.txt",
                "META-INF/NOTICE",
                "META-INF/NOTICE.txt",
                "META-INF/notice.txt",
                "META-INF/ASL2.0",
                "META-INF/*.kotlin_module"
            )
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_21
        targetCompatibility = JavaVersion.VERSION_21
    }

    kotlinOptions {
        jvmTarget = "21"
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

    // Capacitor Native Bridge & Plugins (مباشرة لضمان عدم فشل البناء)
    implementation(project(":capacitor-android"))
    implementation(project(":capacitor-local-notifications"))
    implementation(project(":capacitor-google-auth"))
}
