# Android runtime

`facerecognitionsdk.aar` belongs in this directory and is **not in git** — it is around 80 MB.

It is the same AAR [Face-LivenessDetection-Android](https://github.com/Faceplugin-ltd/FaceLivenessDetection-Android)
links (`libs/facerecognitionsdk.aar`, the FacePlugin engine build). Get it from that repository's
release and drop it here, then run:

```
npx cordova prepare android
```

`hooks/android_prepare.js` copies it into `platforms/android/app/src/main/libs/`, where
`aarintegration.gradle` picks it up through a `flatDir` repository. The hook fails with a named
message if it is absent, so a missing engine is reported before Gradle runs.

A licence key is bound to the `applicationId`, so your own build needs its own key — contact
FacePlugin. A key issued for the previous engine reports "Invalid license" on this runtime.
