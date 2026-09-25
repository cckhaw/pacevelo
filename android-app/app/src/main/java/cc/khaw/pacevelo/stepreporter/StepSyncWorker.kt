package cc.khaw.pacevelo.stepreporter

import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import kotlin.coroutines.resume
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withTimeoutOrNull

/**
 * Runs periodically in the background (see MainActivity.schedulePeriodicSync)
 * to keep reporting steps without the app being open, mirroring what the
 * iOS Shortcut's daily automation does.
 */
class StepSyncWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        val syncUrl = SyncPrefs.getSyncUrl(applicationContext) ?: return Result.success()

        val rawSteps = readStepCounter(applicationContext) ?: return Result.retry()
        val today = StepMath.todayLocalDate()
        val stepsToday = DailyStepTracker.recordReading(applicationContext, rawSteps)

        val outcome = StepsApi.postSteps(syncUrl, today, stepsToday)
        return if (outcome.isSuccess) Result.success() else Result.retry()
    }

    /** One-shot read of the cumulative step counter, or null if it times out / the sensor is unavailable. */
    private suspend fun readStepCounter(context: Context): Int? {
        val sensorManager = context.getSystemService(Context.SENSOR_SERVICE) as SensorManager
        val sensor = sensorManager.getDefaultSensor(Sensor.TYPE_STEP_COUNTER) ?: return null

        return withTimeoutOrNull(10_000) {
            suspendCancellableCoroutine { continuation ->
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
    }
}
