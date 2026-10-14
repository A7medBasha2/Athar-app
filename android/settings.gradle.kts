pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.PREFER_SETTINGS)
    repositories {
        google()
        mavenCentral()
    }
}
rootProject.name = "Athar"
include(":app")

val capacitorAndroidDir = file("../node_modules/@capacitor/android/capacitor")
if (capacitorAndroidDir.exists()) {
    include(":capacitor-android")
    project(":capacitor-android").projectDir = capacitorAndroidDir
}

val capacitorLocalNotifDir = file("../node_modules/@capacitor/local-notifications/android")
if (capacitorLocalNotifDir.exists()) {
    include(":capacitor-local-notifications")
    project(":capacitor-local-notifications").projectDir = capacitorLocalNotifDir
}
