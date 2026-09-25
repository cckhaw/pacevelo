package cc.khaw.pacevelo.stepreporter

import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import org.json.JSONObject

object StepsApi {
    /**
     * POSTs one day's step total to PaceVelo's device-sync endpoint
     * (see app/api/devices/steps/route.ts) - syncUrl already carries the
     * profile's bearer token as a query param, exactly as scanned from the
     * dashboard's QR code. Blocking - call from a background thread/worker.
     */
    fun postSteps(syncUrl: String, date: String, steps: Int): Result<Unit> {
        return try {
            val connection = URL(syncUrl).openConnection() as HttpURLConnection
            connection.requestMethod = "POST"
            connection.doOutput = true
            connection.setRequestProperty("Content-Type", "application/json")
            connection.connectTimeout = 15_000
            connection.readTimeout = 15_000

            val body = JSONObject().apply {
                put("date", date)
                put("steps", steps)
            }
            OutputStreamWriter(connection.outputStream).use { it.write(body.toString()) }

            val code = connection.responseCode
            if (code in 200..299) {
                Result.success(Unit)
            } else {
                val errorBody = connection.errorStream?.bufferedReader()?.readText() ?: ""
                Result.failure(Exception("HTTP $code: $errorBody"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
