# Applied to the app's release build type by aarintegration.gradle.
#
# The engine is reached by name from native code, and the vendored liveness sources are reached
# from the Cordova bridge and from the manifest, so none of these may be renamed or stripped.
-keep class com.faceplugin.facerecognitionsdk.** { *; }
-keep class com.faceplugin.faceliveness.kit.** { *; }
-keep class com.faceplugin.faceliveness.active.** { *; }
-keep class com.faceplugin.face_liveness_sdk.** { *; }
