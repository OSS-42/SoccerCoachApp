#!/bin/bash

# This script sets up the Gradle environment for Android app development
# while keeping the dist directory as a clean web app version

# Create necessary directories if they don't exist
mkdir -p app/src/main/java/com/soccercoach/tracker
mkdir -p app/src/main/res/layout
mkdir -p app/src/main/res/values
mkdir -p gradle/wrapper

# Create minimal gradle files
cat > build.gradle << EOL
// Top-level build file
buildscript {
    repositories {
        google()
        mavenCentral()
    }
    dependencies {
        classpath 'com.android.tools.build:gradle:7.4.2'
    }
}

allprojects {
    repositories {
        google()
        mavenCentral()
    }
}
EOL

cat > app/build.gradle << EOL
plugins {
    id 'com.android.application'
}

android {
    compileSdkVersion 33
    defaultConfig {
        applicationId "com.soccercoach.tracker"
        minSdkVersion 21
        targetSdkVersion 33
        versionCode 1
        versionName "1.4.0"
    }
    buildTypes {
        release {
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}

dependencies {
    implementation 'androidx.appcompat:appcompat:1.6.1'
    implementation 'androidx.constraintlayout:constraintlayout:2.1.4'
    implementation 'com.google.android.material:material:1.9.0'
}
EOL

cat > settings.gradle << EOL
include ':app'
EOL

cat > gradle.properties << EOL
org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8
android.useAndroidX=true
android.enableJetifier=true
EOL

cat > gradlew << EOL
#!/bin/sh
# Gradle wrapper script
exec java -Xmx64m -Dorg.gradle.appname=gradlew -jar gradle/wrapper/gradle-wrapper.jar "\$@"
EOL

chmod +x gradlew

# Create minimal Android app files to satisfy Gradle
cat > app/src/main/AndroidManifest.xml << EOL
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.soccercoach.tracker">
    <application
        android:allowBackup="true"
        android:label="Soccer Coach Tracker"
        android:theme="@style/Theme.AppCompat.Light.DarkActionBar">
        <activity android:name=".MainActivity"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
EOL

cat > app/src/main/java/com/soccercoach/tracker/MainActivity.java << EOL
package com.soccercoach.tracker;

import android.os.Bundle;
import android.webkit.WebView;
import androidx.appcompat.app.AppCompatActivity;

public class MainActivity extends AppCompatActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
        
        WebView webView = findViewById(R.id.webview);
        webView.getSettings().setJavaScriptEnabled(true);
        webView.loadUrl("file:///android_asset/index.html");
    }
}
EOL

cat > app/src/main/res/layout/activity_main.xml << EOL
<?xml version="1.0" encoding="utf-8"?>
<androidx.constraintlayout.widget.ConstraintLayout 
    xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res-auto"
    android:layout_width="match_parent"
    android:layout_height="match_parent">

    <WebView
        android:id="@+id/webview"
        android:layout_width="match_parent"
        android:layout_height="match_parent"
        app:layout_constraintBottom_toBottomOf="parent"
        app:layout_constraintEnd_toEndOf="parent"
        app:layout_constraintStart_toStartOf="parent"
        app:layout_constraintTop_toTopOf="parent" />

</androidx.constraintlayout.widget.ConstraintLayout>
EOL

cat > app/src/main/res/values/styles.xml << EOL
<resources>
    <style name="AppTheme" parent="Theme.AppCompat.Light.DarkActionBar">
        <item name="colorPrimary">#2196F3</item>
        <item name="colorPrimaryDark">#1976D2</item>
        <item name="colorAccent">#FF4081</item>
    </style>
</resources>
EOL

echo "Gradle environment has been set up successfully!"
echo "You can now run './gradlew assembleDebug' to build the Android app"
echo "The web app version remains clean in the 'dist' directory"