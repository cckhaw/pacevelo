package cc.khaw.pacevelo.stepreporter

import android.Manifest
import android.content.pm.PackageManager
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.Build
import android.os.Bundle
import android.view.View
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.Constraints
import cc.khaw.pacevelo.stepreporter.databinding.ActivityMainBinding
import com.journeyapps.barcodescanner.ScanContract
import com.journeyapps.barcodescanner.ScanOptions
import java.util.concurrent.TimeUnit
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class MainActivity : AppCompatActivity(), SensorEventListener {

    private lateinit var binding: ActivityMainBinding
    private var sensorManager: SensorManager? = null
    private var stepCounterSensor: Sensor? = null
    private var latestStepsToday: Int? = null

    private val qrScanLauncher = registerForActivityResult(ScanContract()) { result ->
        val scannedUrl = result.contents
        if (scannedUrl.isNullOrBlank()) return@registerForActivityResult
        if (!scannedUrl.startsWith("http") || !scannedUrl.contains("token=")) {
            binding.setupStatus.text = "That QR code doesn't look like a PaceVelo setup code."
            return@registerForActivityResult
        }
        SyncPrefs.setSyncUrl(this, scannedUrl)
        schedulePeriodicSync()
        refreshSetupStatus()
        refreshSyncStatus()
    }

    private val requestActivityRecognition = registerForActivityResult(
        ActivityResultContracts.RequestPermission(),
    ) { granted ->
        if (granted) registerStepSensor()
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        sensorManager = getSystemService(SENSOR_SERVICE) as SensorManager
        stepCounterSensor = sensorManager?.getDefaultSensor(Sensor.TYPE_STEP_COUNTER)

        binding.scanButton.setOnClickListener { launchScanner() }
        binding.syncButton.setOnClickListener { syncNow() }

        refreshSetupStatus()
        if (SyncPrefs.isConfigured(this)) {
            schedulePeriodicSync()
            refreshSyncStatus()
        }
    }

    override fun onResume() {
        super.onResume()
        ensurePermissionThenRegisterSensor()
    }

    override fun onPause() {
        super.onPause()
        sensorManager?.unregisterListener(this)
    }

    private fun ensurePermissionThenRegisterSensor() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            val granted = ContextCompat.checkSelfPermission(this, Manifest.permission.ACTIVITY_RECOGNITION) ==
                PackageManager.PERMISSION_GRANTED
            if (granted) {
                registerStepSensor()
            } else {
                requestActivityRecognition.launch(Manifest.permission.ACTIVITY_RECOGNITION)
            }
        } else {
            registerStepSensor()
        }
    }

    private fun registerStepSensor() {
        val sensor = stepCounterSensor
        if (sensor == null) {
            binding.stepsLabel.text = "This device has no step counter sensor."
            return
        }
        sensorManager?.registerListener(this, sensor, SensorManager.SENSOR_DELAY_NORMAL)
    }

    override fun onSensorChanged(event: SensorEvent) {
        val rawSteps = event.values[0].toInt()
        val stepsToday = DailyStepTracker.recordReading(this, rawSteps)
        latestStepsToday = stepsToday
        binding.stepsValue.text = stepsToday.toString()
        binding.syncButton.isEnabled = SyncPrefs.isConfigured(this)
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) = Unit

    private fun launchScanner() {
        val options = ScanOptions()
            .setDesiredBarcodeFormats(ScanOptions.QR_CODE)
            .setPrompt("Scan the setup QR code from your PaceVelo dashboard")
            .setBeepEnabled(false)
            .setOrientationLocked(true)
        qrScanLauncher.launch(options)
    }

    private fun syncNow() {
        val syncUrl = SyncPrefs.getSyncUrl(this) ?: return
        val stepsToday = latestStepsToday
        if (stepsToday == null) {
            binding.syncResult.text = "Still reading your step counter - try again in a moment."
            return
        }
        val today = StepMath.todayLocalDate()

        binding.syncButton.isEnabled = false
        binding.syncResult.text = "Syncing…"
        lifecycleScope.launch {
            val outcome = withContext(Dispatchers.IO) { StepsApi.postSteps(syncUrl, today, stepsToday) }
            binding.syncButton.isEnabled = true
            binding.syncResult.text = if (outcome.isSuccess) {
                "Synced $stepsToday steps for $today."
            } else {
                "Sync failed: ${outcome.exceptionOrNull()?.message ?: "unknown error"}"
            }
            if (outcome.isSuccess) refreshSyncStatus()
        }
    }

    private fun refreshSetupStatus() {
        val configured = SyncPrefs.isConfigured(this)
        binding.setupStatus.text = if (configured) {
            "Set up and reporting to PaceVelo."
        } else {
            getString(R.string.not_set_up)
        }
        binding.syncButton.isEnabled = configured && latestStepsToday != null
    }

    /**
     * Fills in account/challenge/last-sync from GET /api/devices/status - so
     * someone can confirm which account this phone is reporting as and what
     * it's actually counting toward without leaving the app. Best-effort: a
     * failure (offline, server error) just leaves whatever was shown before
     * rather than replacing it with an error, since none of this blocks the
     * app's actual job of syncing steps.
     */
    private fun refreshSyncStatus() {
        val syncUrl = SyncPrefs.getSyncUrl(this) ?: return
        lifecycleScope.launch {
            val result = withContext(Dispatchers.IO) { StepsApi.getStatus(syncUrl) }
            val status = result.getOrNull() ?: return@launch

            binding.accountInfo.text = "Connected as ${status.fullName} (${status.email})"
            binding.accountInfo.visibility = View.VISIBLE

            binding.challengeInfo.text = if (status.challenges.isEmpty()) {
                "Not currently in an active steps challenge."
            } else {
                status.challenges.joinToString("\n") { c ->
                    "${c.title} · ${StepMath.formatChallengeDate(c.startDate)} – ${StepMath.formatChallengeDate(c.endDate)}"
                }
            }
            binding.challengeInfo.visibility = View.VISIBLE

            val lastSync = status.lastSync
            binding.lastSyncInfo.text = if (lastSync == null) {
                "No sync recorded yet."
            } else {
                "Last synced ${StepMath.formatSyncTimestamp(lastSync.updatedAt)} · ${lastSync.steps} steps for ${lastSync.day}"
            }
            binding.lastSyncInfo.visibility = View.VISIBLE
        }
    }

    private fun schedulePeriodicSync() {
        val constraints = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build()
        // 15 minutes is WorkManager's own minimum periodic interval.
        val request = PeriodicWorkRequestBuilder<StepSyncWorker>(15, TimeUnit.MINUTES)
            .setConstraints(constraints)
            .build()
        WorkManager.getInstance(this).enqueueUniquePeriodicWork(
            "step-sync",
            ExistingPeriodicWorkPolicy.KEEP,
            request,
        )
    }
}
