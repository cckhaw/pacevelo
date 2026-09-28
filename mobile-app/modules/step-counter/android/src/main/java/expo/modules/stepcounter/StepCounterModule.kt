package expo.modules.stepcounter

import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.provider.Settings
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlin.coroutines.resume
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withTimeoutOrNull

private class NoStepSensorException :
  CodedException("ERR_NO_STEP_SENSOR", "This device has no step counter sensor.", null)

private class StepSensorTimeoutException :
  CodedException("ERR_STEP_SENSOR_TIMEOUT", "Timed out waiting for a reading from the step counter sensor.", null)

/**
 * Thin native bridge exposing exactly the two Android platform facts the
 * reboot-safe step banking algorithm (see src/stepBanking.ts, ported from
 * the native Kotlin app's StepBanking.kt) needs, and nothing else - the
 * actual banking arithmetic stays in JS/TypeScript where it can be unit
 * tested with Jest the same way it was with JUnit there.
 */
class StepCounterModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw CodedException("ERR_NO_CONTEXT", "No Android context available", null)

  override fun definition() = ModuleDefinition {
    Name("StepCounter")

    Function("hasStepCounterSensor") {
      sensorManager().getDefaultSensor(Sensor.TYPE_STEP_COUNTER) != null
    }

    // A plain integer Android increments on every single boot - the same
    // exact-reboot signal (immune to clock drift/timezone changes) the
    // native app used. See StepBanking.kt / stepBanking.ts for why this
    // matters: the step counter sensor's cumulative value resets on
    // reboot, and this is how a fresh reading is told apart from a
    // continuing session.
    Function("getBootCount") {
      Settings.Global.getInt(context.contentResolver, Settings.Global.BOOT_COUNT, -1)
    }

    // Cumulative steps since the device last booted (Android's own
    // documented contract for TYPE_STEP_COUNTER) - a single, one-shot
    // reading, not a live subscription, so the caller controls exactly
    // when a reading is taken (on app open, on manual sync, or from a
    // background task). Ported from the native app's StepSyncWorker.kt,
    // which used this exact suspendCancellableCoroutine + timeout shape.
    AsyncFunction("getRawStepsSinceBoot") Coroutine { ->
      val sensorManager = sensorManager()
      val sensor = sensorManager.getDefaultSensor(Sensor.TYPE_STEP_COUNTER) ?: throw NoStepSensorException()

      val steps = withTimeoutOrNull(10_000) {
        suspendCancellableCoroutine<Int> { continuation ->
          val listener = object : SensorEventListener {
            override fun onSensorChanged(event: SensorEvent) {
              sensorManager.unregisterListener(this)
              if (continuation.isActive) continuation.resume(event.values[0].toInt())
            }

            override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) = Unit
          }
          continuation.invokeOnCancellation { sensorManager.unregisterListener(listener) }
          sensorManager.registerListener(listener, sensor, SensorManager.SENSOR_DELAY_NORMAL)
        }
      }

      steps ?: throw StepSensorTimeoutException()
    }
  }

  private fun sensorManager(): SensorManager = context.getSystemService(Context.SENSOR_SERVICE) as SensorManager
}
