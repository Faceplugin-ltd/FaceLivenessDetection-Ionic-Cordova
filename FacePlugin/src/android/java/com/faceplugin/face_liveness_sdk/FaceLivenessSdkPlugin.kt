package com.faceplugin.face_liveness_sdk

import android.app.Activity
import android.content.Intent
import android.os.Handler
import android.os.Looper
import androidx.camera.core.CameraSelector
import com.faceplugin.face_liveness_sdk.passive.PassiveLivenessActivity
import com.faceplugin.faceliveness.active.ActiveCheck
import com.faceplugin.faceliveness.active.ActiveLivenessActivity
import com.faceplugin.faceliveness.active.ActiveLivenessOptions
import com.faceplugin.faceliveness.active.ActiveLivenessResult
import com.faceplugin.faceliveness.kit.FaceEngine
import com.faceplugin.faceliveness.kit.LicenseStatus
import com.faceplugin.facerecognitionsdk.FaceRecognitionSDK
import org.apache.cordova.CallbackContext
import org.apache.cordova.CordovaPlugin
import org.json.JSONArray
import org.json.JSONObject

/**
 * Bridges Cordova to the native FacePlugin liveness implementation.
 *
 * The engine and both camera screens are the native ones — [FaceEngine] from `face-liveness-kit`,
 * [ActiveLivenessActivity] from `face-liveness-active`, and [PassiveLivenessActivity], a port of
 * the native demo's passive screen. Nothing about liveness is re-implemented in the web layer, so
 * the camera preview, the anti-spoofing gate, the challenge sequence and the result card behave
 * exactly as they do in Face-LivenessDetection-Android.
 */
class FaceLivenessSdkPlugin : CordovaPlugin() {

    private val main = Handler(Looper.getMainLooper())

    /** The `startActiveLiveness` call waiting on [onActivityResult]. */
    private var activeCallback: CallbackContext? = null

    override fun execute(
        action: String,
        args: JSONArray,
        callbackContext: CallbackContext,
    ): Boolean {
        val options = args.optJSONObject(0) ?: JSONObject()
        when (action) {
            "start" -> start(options, callbackContext)
            "licenseStatus" -> licenseStatus(callbackContext)
            "lastLicenseError" -> callbackContext.success(
                JSONObject().put("message", FaceEngine.lastLicenseError()),
            )
            "machineCode" -> machineCode(callbackContext)
            "startActiveLiveness" -> startActiveLiveness(options, callbackContext)
            "startPassiveLiveness" -> startPassiveLiveness(options, callbackContext)
            else -> return false
        }
        return true
    }

    // region engine

    private fun start(options: JSONObject, callback: CallbackContext) {
        val license = options.optString("license")
        if (license.isBlank()) {
            callback.error(JSONObject().put("message", "A license key is required.")
                .put("code", "E_LICENSE"))
            return
        }
        // The kit activates and initialises on its own worker and calls back on the main thread.
        FaceEngine.start(cordova.context, license) { code ->
            callback.success(JSONObject().put("code", code))
        }
    }

    private fun licenseStatus(callback: CallbackContext) {
        FaceEngine.async {
            val status = FaceEngine.licenseStatus()
            main.post { callback.success(status.toJSON()) }
        }
    }

    private fun machineCode(callback: CallbackContext) {
        FaceEngine.async {
            val code = try {
                synchronized(FaceEngine.lock) { FaceRecognitionSDK.machineCode(cordova.context) }
            } catch (_: Throwable) {
                ""
            }
            main.post { callback.success(JSONObject().put("code", code.orEmpty())) }
        }
    }

    // endregion

    // region screens

    private fun startActiveLiveness(options: JSONObject, callback: CallbackContext) {
        val host = cordova.activity
        if (host == null) {
            callback.error(JSONObject().put("message", "The screen needs a foreground Activity.")
                .put("code", "E_NO_ACTIVITY"))
            return
        }
        val lens = if (options.optBoolean("useFrontCamera", true)) {
            CameraSelector.LENS_FACING_FRONT
        } else {
            CameraSelector.LENS_FACING_BACK
        }
        activeCallback = callback
        // Cordova registers this plugin for the result and routes it to onActivityResult below.
        cordova.startActivityForResult(
            this,
            ActiveLivenessActivity.intent(host, options.toOptions(), lens),
            REQ_ACTIVE,
        )
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, intent: Intent?) {
        if (requestCode != REQ_ACTIVE) {
            super.onActivityResult(requestCode, resultCode, intent)
            return
        }
        val callback = activeCallback ?: return
        activeCallback = null
        val result = ActiveLivenessActivity.result(intent)
        val payload = JSONObject()
        // A closed screen produces no result, which the web layer reads as null.
        if (result != null) payload.put("result", result.toJSON())
        callback.success(payload)
    }

    private fun startPassiveLiveness(options: JSONObject, callback: CallbackContext) {
        val host: Activity? = cordova.activity
        if (host == null) {
            callback.error(JSONObject().put("message", "The screen needs a foreground Activity.")
                .put("code", "E_NO_ACTIVITY"))
            return
        }
        host.startActivity(
            PassiveLivenessActivity.intent(
                host,
                useFrontCamera = options.optBoolean("useFrontCamera", true),
                livenessThreshold = options.optDouble(
                    "livenessThreshold",
                    ActiveLivenessOptions.DEFAULT_LIVENESS_THRESHOLD.toDouble(),
                ).toFloat(),
            ),
        )
        callback.success(JSONObject())
    }

    // endregion

    private companion object {
        const val REQ_ACTIVE = 0x4C56 // "LV"
    }
}

// region mapping

/** Builds the native options from the web payload, falling back to the engine's defaults. */
private fun JSONObject.toOptions(): ActiveLivenessOptions {
    val defaults = ActiveLivenessOptions()
    val keys = buildSet {
        val array = optJSONArray("pool") ?: return@buildSet
        for (index in 0 until array.length()) array.optString(index)?.let(::add)
    }
    // Keep the canonical enum order so the pool is stable when randomize is off.
    val pool = ActiveCheck.entries.filter { keys.contains(it.key) }

    fun float(key: String, fallback: Float): Float = optDouble(key, fallback.toDouble()).toFloat()
    fun int(key: String, fallback: Int): Int = optInt(key, fallback)
    fun bool(key: String, fallback: Boolean): Boolean = optBoolean(key, fallback)

    return ActiveLivenessOptions(
        pool = pool.ifEmpty { ActiveLivenessOptions.DEFAULT_POOL },
        count = int("count", defaults.count),
        randomize = bool("randomize", defaults.randomize),
        livenessThreshold = float("livenessThreshold", defaults.livenessThreshold),
        passiveSamples = int("passiveSamples", defaults.passiveSamples),
        framesWait = int("framesWait", defaults.framesWait),
        yawThreshold = float("yawThreshold", defaults.yawThreshold),
        pitchThreshold = float("pitchThreshold", defaults.pitchThreshold),
        smileThreshold = float("smileThreshold", defaults.smileThreshold),
        blinkThreshold = float("blinkThreshold", defaults.blinkThreshold),
        blinksNumber = int("blinksNumber", defaults.blinksNumber),
        perspectiveThreshold = float("perspectiveThreshold", defaults.perspectiveThreshold),
        alignAngle = float("alignAngle", defaults.alignAngle),
        minFaceFraction = float("minFaceFraction", defaults.minFaceFraction),
        qualityThreshold = float("qualityThreshold", defaults.qualityThreshold),
        invertTurn = bool("invertTurn", defaults.invertTurn),
        invertTilt = bool("invertTilt", defaults.invertTilt),
    )
}

private fun LicenseStatus.toJSON(): JSONObject = JSONObject()
    .put("licensed", licensed)
    .put("level", level)
    .put("levelName", levelName)
    .put("recognition", recognition)
    .put("liveness", liveness)
    .put("label", label)

private fun ActiveLivenessResult.toJSON(): JSONObject = JSONObject()
    .put("passed", passed)
    .put("failure", failure.name)
    .put("passiveScore", passiveScore.toDouble())
    .put("passivePassed", passivePassed)
    .put("challenges", JSONArray(challenges.map { it.key }))
    .put("outcomes", JSONArray(outcomes.map { it.name }))
    .put("durationMs", durationMs)

// endregion
