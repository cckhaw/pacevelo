package cc.khaw.pacevelo.stepreporter

import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import org.json.JSONObject

data class SyncedChallenge(val title: String, val startDate: String, val endDate: String)

data class LastSync(val day: String, val steps: Int, val updatedAt: String)

data class SyncStatus(
    val fullName: String,
    val email: String,
    val challenges: List<SyncedChallenge>,
    val lastSync: LastSync?,
)

object StepsApi {
    /**
     * Same host/token as [postSteps]'s syncUrl, read instead of posted to -
     * see app/api/devices/status/route.ts. Derived by swapping the path
     * rather than taking a second QR code, since the server always serves
     * both endpoints from the same origin with the same token.
     */
    private fun statusUrl(syncUrl: String): String = syncUrl.replace("/api/devices/steps", "/api/devices/status")

    /** GETs the connected account, its currently-active steps challenge(s), and when a sync last landed. */
    fun getStatus(syncUrl: String): Result<SyncStatus> {
        return try {
            val connection = URL(statusUrl(syncUrl)).openConnection() as HttpURLConnection
            connection.requestMethod = "GET"
            connection.connectTimeout = 15_000
            connection.readTimeout = 15_000

            val code = connection.responseCode
            if (code !in 200..299) {
                val errorBody = connection.errorStream?.bufferedReader()?.readText() ?: ""
                return Result.failure(Exception("HTTP $code: $errorBody"))
            }

            val body = JSONObject(connection.inputStream.bufferedReader().readText())
            val profile = body.getJSONObject("profile")
            val challengesJson = body.getJSONArray("challenges")
            val challenges = (0 until challengesJson.length()).map { i ->
                val c = challengesJson.getJSONObject(i)
                SyncedChallenge(c.getString("title"), c.getString("startDate"), c.getString("endDate"))
            }
            val lastSyncJson = body.optJSONObject("lastSync")
            val lastSync = lastSyncJson?.let {
                LastSync(it.getString("day"), it.getInt("steps"), it.getString("updatedAt"))
            }

            Result.success(
                SyncStatus(
                    fullName = profile.getString("fullName"),
                    email = profile.getString("email"),
                    challenges = challenges,
                    lastSync = lastSync,
                ),
            )
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

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
