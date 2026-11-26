# Engine frameworks

This Cordova plugin launches the **native** liveness screens, so it links the same engine the native iOS
app embeds. Four device frameworks belong here and none of them are in git:

| Bundle | What it is |
| ------ | ---------- |
| `facerecognitionsdk.framework` | The engine wrapper (LX / Luxand build) |
| `FacePluginSDK.framework` | Vendor runtime the wrapper links (ios-arm64 slice) |
| `FacePPlugin.framework` | Vendor runtime — ios-arm64 slice inside `FacePlugin.xcframework` |
| `FaceDetect.framework` | Vendor detector (ios-arm64 slice) |

Get them from
[Face-LivenessDetection-iOS](https://github.com/Faceplugin-ltd/Face-LivenessDetection-iOS)
(or copy the xcframeworks and extract the `ios-arm64` slices). `python run_ios` copies the slices
automatically when the xcframeworks are present.

The plugin's `hooks/ios_prepare.js` fails with a named list if any of them is absent, so a
missing engine is reported before the build rather than as a link error.
