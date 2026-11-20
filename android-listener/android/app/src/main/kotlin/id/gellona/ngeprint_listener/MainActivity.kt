package id.gellona.ngeprint_listener

import android.content.Intent
import android.net.Uri
import android.provider.Settings
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel
import java.util.concurrent.Executors

class MainActivity : FlutterActivity() {
    private val channelName = "id.gellona.ngeprint_listener/bridge"
    private val executor = Executors.newSingleThreadExecutor()

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)

        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, channelName)
            .setMethodCallHandler { call, result ->
                when (call.method) {
                    "isNotificationAccessEnabled" -> {
                        val enabledListeners = Settings.Secure.getString(
                            contentResolver,
                            "enabled_notification_listeners"
                        ) ?: ""
                        result.success(enabledListeners.contains(packageName))
                    }

                    "openNotificationAccessSettings" -> {
                        try {
                            val intent = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)
                            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                            startActivity(intent)
                            result.success(true)
                        } catch (e: Exception) {
                            result.error("OPEN_SETTINGS_ERROR", e.message, null)
                        }
                    }

                    "openAppInfoSettings" -> {
                        try {
                            val intent = Intent(
                                Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                                Uri.parse("package:$packageName")
                            )
                            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                            startActivity(intent)
                            result.success(true)
                        } catch (e: Exception) {
                            result.error("APP_INFO_ERROR", e.message, null)
                        }
                    }

                    "openBatterySettings" -> {
                        try {
                            val intent = Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS)
                            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                            startActivity(intent)
                            result.success(true)
                        } catch (_: Exception) {
                            try {
                                val fallback = Intent(Settings.ACTION_SETTINGS)
                                fallback.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                                startActivity(fallback)
                                result.success(true)
                            } catch (e: Exception) {
                                result.error("BATTERY_SETTINGS_ERROR", e.message, null)
                            }
                        }
                    }

                    "getConfig" -> {
                        result.success(ListenerPrefs.getConfigMap(applicationContext))
                    }

                    "saveConfig" -> {
                        val serverUrl = call.argument<String>("serverUrl") ?: ""
                        val agentKey = call.argument<String>("agentKey") ?: ""
                        val enabled = call.argument<Boolean>("enabled") ?: true
                        val filterAllRp = call.argument<Boolean>("filterAllRp") ?: true
                        ListenerPrefs.saveConfig(
                            applicationContext,
                            serverUrl,
                            agentKey,
                            enabled,
                            filterAllRp
                        )
                        result.success(true)
                    }

                    "getLogs" -> {
                        result.success(ListenerPrefs.getLogsJson(applicationContext))
                    }

                    "clearLogs" -> {
                        ListenerPrefs.clearLogs(applicationContext)
                        result.success(true)
                    }

                    "sendTestWebhook" -> {
                        val amount = call.argument<String>("amount")?.trim().orEmpty().ifBlank { "1537" }
                        executor.execute {
                            val response = ListenerPrefs.sendWebhook(
                                context = applicationContext,
                                title = "GoPay Merchant (Uji Coba)",
                                text = "Pembayaran QRIS sebesar Rp$amount berhasil diterima",
                                packageName = "com.gojek.gobiz.test"
                            )
                            runOnUiThread {
                                result.success(response)
                            }
                        }
                    }

                    else -> result.notImplemented()
                }
            }
    }

    override fun onDestroy() {
        super.onDestroy()
        executor.shutdownNow()
    }
}
