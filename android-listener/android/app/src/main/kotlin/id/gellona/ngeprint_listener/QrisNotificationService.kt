package id.gellona.ngeprint_listener

import android.app.Notification
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.Executors

class QrisNotificationService : NotificationListenerService() {

    private val executor = Executors.newSingleThreadExecutor()
    private val recentFingerprints = ConcurrentHashMap<String, Long>()

    companion object {
        private const val DEDUPE_WINDOW_MS = 8_000L

        private val PAYMENT_PACKAGES = setOf(
            "com.gojek.gobiz",
            "com.gojek.merchant",
            "com.gojek.gopay",
            "com.gojek.app",
            "id.dana",
            "id.dana.merchant",
            "id.dana.bisnis",
            "ovo.id",
            "com.ovo.merchant",
            "com.bca",
            "com.bca.mybca.omni.android",
            "com.bca.merchant",
            "id.co.bri.brimo",
            "id.co.bri.merchant",
            "id.bmri.livin",
            "id.co.bankmandiri.livinmerchant",
            "com.bankmandiri.mandirionline",
            "com.bni.mobile",
            "id.bni.wondr",
            "com.shopee.id",
            "com.shopeepay.merchant",
            "com.linkaja.merchant",
            "com.telkom.mwallet",
            "id.co.bsi.bsimobile"
        )

        private val IGNORED_PACKAGES = setOf(
            "id.gellona.ngeprint_listener",
            "android",
            "com.android.systemui",
            "com.android.providers.downloads"
        )

        private val RUPIAH_REGEX = Regex(
            pattern = """(?i)(rp\.?\s*\d|idr\s*\d|qris|pembayaran\s+berhasil|dana\s+masuk|transfer\s+masuk)""",
        )
    }

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        if (sbn == null) return
        if (sbn.isOngoing) return

        val pkg = sbn.packageName ?: return
        if (IGNORED_PACKAGES.contains(pkg)) return

        val ctx = applicationContext
        if (!ListenerPrefs.isEnabled(ctx)) return
        if (ListenerPrefs.getAgentKey(ctx).isBlank() || ListenerPrefs.getServerUrl(ctx).isBlank()) {
            return
        }

        val extras = sbn.notification?.extras ?: return
        val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString()?.trim() ?: ""
        val normalText = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString()?.trim() ?: ""
        val bigText = extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString()?.trim() ?: ""
        val bodyText = if (bigText.length > normalText.length) bigText else normalText

        if (title.isBlank() && bodyText.isBlank()) return

        val combined = "$title $bodyText"
        val isKnownPaymentApp = PAYMENT_PACKAGES.any { pkg == it || pkg.startsWith("$it.") }
        val allowAllRp = ListenerPrefs.isFilterAllRp(ctx)
        val hasRupiahSignal = RUPIAH_REGEX.containsMatchIn(combined)

        if (!isKnownPaymentApp && !(allowAllRp && hasRupiahSignal)) {
            return
        }

        // For known payment apps, still require at least one digit so promo banners aren't sent
        if (!combined.any { it.isDigit() }) {
            return
        }

        val now = System.currentTimeMillis()
        val fingerprint = "$pkg|$title|$bodyText"
        val lastSeen = recentFingerprints[fingerprint]
        if (lastSeen != null && (now - lastSeen) < DEDUPE_WINDOW_MS) {
            return
        }
        recentFingerprints[fingerprint] = now

        // Clean stale entries occasionally
        if (recentFingerprints.size > 60) {
            recentFingerprints.entries.removeIf { now - it.value > 60_000L }
        }

        executor.execute {
            ListenerPrefs.sendWebhook(
                context = ctx,
                title = title,
                text = bodyText,
                packageName = pkg
            )
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        executor.shutdownNow()
    }
}
