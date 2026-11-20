package id.gellona.ngeprint_listener

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

object ListenerPrefs {
    private const val PREFS_NAME = "ngeprint_listener_prefs"
    private const val KEY_SERVER_URL = "server_url"
    private const val KEY_AGENT_KEY = "agent_key"
    private const val KEY_ENABLED = "enabled"
    private const val KEY_FILTER_ALL_RP = "filter_all_rp"
    private const val KEY_LOGS = "logs_json"
    private const val DEFAULT_SERVER_URL = "https://ngeprint.gellona.web.id"
    private const val MAX_LOGS = 50

    fun getServerUrl(context: Context): String {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        return prefs.getString(KEY_SERVER_URL, DEFAULT_SERVER_URL)?.trim() ?: DEFAULT_SERVER_URL
    }

    fun getAgentKey(context: Context): String {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        return prefs.getString(KEY_AGENT_KEY, "")?.trim() ?: ""
    }

    fun isEnabled(context: Context): Boolean {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        return prefs.getBoolean(KEY_ENABLED, true)
    }

    fun isFilterAllRp(context: Context): Boolean {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        return prefs.getBoolean(KEY_FILTER_ALL_RP, true)
    }

    fun saveConfig(
        context: Context,
        serverUrl: String,
        agentKey: String,
        enabled: Boolean,
        filterAllRp: Boolean
    ) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        prefs.edit()
            .putString(KEY_SERVER_URL, serverUrl.trim().trimEnd('/'))
            .putString(KEY_AGENT_KEY, agentKey.trim())
            .putBoolean(KEY_ENABLED, enabled)
            .putBoolean(KEY_FILTER_ALL_RP, filterAllRp)
            .apply()
    }

    fun getConfigMap(context: Context): Map<String, Any> {
        return mapOf(
            "serverUrl" to getServerUrl(context),
            "agentKey" to getAgentKey(context),
            "enabled" to isEnabled(context),
            "filterAllRp" to isFilterAllRp(context)
        )
    }

    fun getLogsJson(context: Context): String {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        return prefs.getString(KEY_LOGS, "[]") ?: "[]"
    }

    fun clearLogs(context: Context) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        prefs.edit().putString(KEY_LOGS, "[]").apply()
    }

    @Synchronized
    fun appendLog(
        context: Context,
        pkg: String,
        snippet: String,
        httpCode: Int,
        matched: Boolean,
        jobCode: String?,
        amount: Int?,
        detail: String
    ) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val existing = try {
            JSONArray(prefs.getString(KEY_LOGS, "[]") ?: "[]")
        } catch (_: Exception) {
            JSONArray()
        }

        val entry = JSONObject().apply {
            val fmt = SimpleDateFormat("HH:mm:ss", Locale.getDefault())
            put("time", fmt.format(Date()))
            put("pkg", pkg)
            put("snippet", snippet.take(140))
            put("httpCode", httpCode)
            put("matched", matched)
            put("jobCode", jobCode ?: "")
            put("amount", amount ?: 0)
            put("detail", detail.take(160))
        }

        val updated = JSONArray()
        updated.put(entry)
        val limit = minOf(existing.length(), MAX_LOGS - 1)
        for (i in 0 until limit) {
            updated.put(existing.get(i))
        }

        prefs.edit().putString(KEY_LOGS, updated.toString()).apply()
    }

    fun sendWebhook(
        context: Context,
        title: String,
        text: String,
        packageName: String
    ): Map<String, Any> {
        val baseUrl = getServerUrl(context).trim().trimEnd('/')
        val agentKey = getAgentKey(context).trim()
        val snippet = listOf(title, text).filter { it.isNotBlank() }.joinToString(" — ")

        if (baseUrl.isEmpty() || agentKey.isEmpty()) {
            val msg = "Server URL atau Agent Key belum diisi."
            appendLog(context, packageName, snippet, 0, false, null, null, msg)
            return mapOf("ok" to false, "message" to msg)
        }

        var conn: HttpURLConnection? = null
        return try {
            val encodedKey = URLEncoder.encode(agentKey, "UTF-8")
            val endpoint = "$baseUrl/api/webhooks/qris-notification?key=$encodedKey"
            val url = URL(endpoint)
            conn = (url.openConnection() as HttpURLConnection).apply {
                requestMethod = "POST"
                connectTimeout = 10000
                readTimeout = 10000
                doOutput = true
                setRequestProperty("Content-Type", "application/json; charset=utf-8")
                setRequestProperty("x-agent-key", agentKey)
            }

            val payload = JSONObject().apply {
                put("title", title)
                put("text", text)
                put("packageName", packageName)
            }

            OutputStreamWriter(conn.outputStream, Charsets.UTF_8).use { writer ->
                writer.write(payload.toString())
                writer.flush()
            }

            val code = conn.responseCode
            val stream = if (code in 200..299) conn.inputStream else conn.errorStream
            val body = stream?.let {
                BufferedReader(InputStreamReader(it, Charsets.UTF_8)).use { reader ->
                    reader.readText()
                }
            } ?: ""

            var matched = false
            var jobCode: String? = null
            var detectedAmount: Int? = null
            var detail = "HTTP $code"

            try {
                val json = JSONObject(body)
                matched = json.optBoolean("matched", false)
                jobCode = json.optString("jobCode", "").ifBlank { null }
                if (json.has("detectedAmount") && !json.isNull("detectedAmount")) {
                    detectedAmount = json.optInt("detectedAmount", 0)
                }
                val serverMsg = json.optString("message", "").ifBlank {
                    json.optString("error", "")
                }
                if (serverMsg.isNotBlank()) {
                    detail = serverMsg
                } else if (matched && jobCode != null) {
                    detail = "Job $jobCode otomatis LUNAS & masuk antrean cetak."
                }
            } catch (_: Exception) {
                if (body.isNotBlank()) {
                    detail = "HTTP $code: ${body.take(100)}"
                }
            }

            appendLog(
                context = context,
                pkg = packageName,
                snippet = snippet,
                httpCode = code,
                matched = matched,
                jobCode = jobCode,
                amount = detectedAmount,
                detail = detail
            )

            mapOf(
                "ok" to (code in 200..299),
                "httpCode" to code,
                "matched" to matched,
                "jobCode" to (jobCode ?: ""),
                "detectedAmount" to (detectedAmount ?: 0),
                "message" to detail
            )
        } catch (e: Exception) {
            val errMsg = "Gagal koneksi: ${e.message ?: e.javaClass.simpleName}"
            appendLog(context, packageName, snippet, 0, false, null, null, errMsg)
            mapOf(
                "ok" to false,
                "httpCode" to 0,
                "matched" to false,
                "message" to errMsg
            )
        } finally {
            conn?.disconnect()
        }
    }
}
