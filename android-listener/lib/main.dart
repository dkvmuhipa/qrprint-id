import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

void main() {
  runApp(const NgeprintListenerApp());
}

class NgeprintPalette {
  static const bg = Color(0xFFF7F4EE);
  static const surface = Color(0xFFFDFBF7);
  static const surfaceSubtle = Color(0xFFF0EBE1);
  static const border = Color(0xFFE4DDD2);
  static const ink = Color(0xFF1F1B16);
  static const muted = Color(0xFF6B6257);
  static const accent = Color(0xFFD9381E);
  static const success = Color(0xFF15803D);
  static const successBg = Color(0xFFECFDF3);
  static const warning = Color(0xFFB45309);
  static const warningBg = Color(0xFFFEF3C7);
}

class NgeprintListenerApp extends StatelessWidget {
  const NgeprintListenerApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Ngeprint Listener',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        scaffoldBackgroundColor: NgeprintPalette.bg,
        colorScheme: ColorScheme.fromSeed(
          seedColor: NgeprintPalette.accent,
          surface: NgeprintPalette.surface,
        ),
        appBarTheme: const AppBarTheme(
          backgroundColor: NgeprintPalette.bg,
          foregroundColor: NgeprintPalette.ink,
          elevation: 0,
          scrolledUnderElevation: 0,
        ),
      ),
      home: const ListenerHomePage(),
    );
  }
}

class ListenerHomePage extends StatefulWidget {
  const ListenerHomePage({super.key});

  @override
  State<ListenerHomePage> createState() => _ListenerHomePageState();
}

class _ListenerHomePageState extends State<ListenerHomePage>
    with WidgetsBindingObserver {
  static const _channel = MethodChannel('id.gellona.ngeprint_listener/bridge');

  final _serverUrlCtrl = TextEditingController();
  final _agentKeyCtrl = TextEditingController();
  final _testAmountCtrl = TextEditingController(text: '1537');

  bool _hasPermission = false;
  bool _enabled = true;
  bool _filterAllRp = true;
  bool _saving = false;
  bool _testing = false;
  String? _statusMessage;
  bool _statusIsError = false;
  List<Map<String, dynamic>> _logs = [];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _loadAll();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _serverUrlCtrl.dispose();
    _agentKeyCtrl.dispose();
    _testAmountCtrl.dispose();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      _refreshStatusAndLogs();
    }
  }

  Future<void> _loadAll() async {
    try {
      final hasPerm =
          await _channel.invokeMethod<bool>('isNotificationAccessEnabled') ??
              false;
      final config =
          await _channel.invokeMapMethod<String, dynamic>('getConfig') ?? {};
      final logsJson =
          await _channel.invokeMethod<String>('getLogs') ?? '[]';

      final parsedLogs = (jsonDecode(logsJson) as List<dynamic>)
          .map((e) => Map<String, dynamic>.from(e as Map))
          .toList();

      if (!mounted) return;
      setState(() {
        _hasPermission = hasPerm;
        _serverUrlCtrl.text = (config['serverUrl'] as String?) ?? '';
        _agentKeyCtrl.text = (config['agentKey'] as String?) ?? '';
        _enabled = (config['enabled'] as bool?) ?? true;
        _filterAllRp = (config['filterAllRp'] as bool?) ?? true;
        _logs = parsedLogs;
      });
    } catch (e) {
      _showBanner('Gagal memuat konfigurasi: $e', isError: true);
    }
  }

  Future<void> _refreshStatusAndLogs() async {
    try {
      final hasPerm =
          await _channel.invokeMethod<bool>('isNotificationAccessEnabled') ??
              false;
      final logsJson =
          await _channel.invokeMethod<String>('getLogs') ?? '[]';
      final parsedLogs = (jsonDecode(logsJson) as List<dynamic>)
          .map((e) => Map<String, dynamic>.from(e as Map))
          .toList();

      if (!mounted) return;
      setState(() {
        _hasPermission = hasPerm;
        _logs = parsedLogs;
      });
    } catch (_) {}
  }

  void _showBanner(String message, {bool isError = false}) {
    if (!mounted) return;
    setState(() {
      _statusMessage = message;
      _statusIsError = isError;
    });
  }

  Future<void> _saveConfig() async {
    final serverUrl = _serverUrlCtrl.text.trim();
    final agentKey = _agentKeyCtrl.text.trim();
    if (serverUrl.isEmpty || !serverUrl.startsWith('http')) {
      _showBanner('URL Server harus diawali https:// atau http://',
          isError: true);
      return;
    }
    if (agentKey.isEmpty) {
      _showBanner('Masukkan Agent Key toko (AGT_...) dari Dashboard Ngeprint.',
          isError: true);
      return;
    }

    setState(() => _saving = true);
    try {
      await _channel.invokeMethod('saveConfig', {
        'serverUrl': serverUrl,
        'agentKey': agentKey,
        'enabled': _enabled,
        'filterAllRp': _filterAllRp,
      });
      _showBanner('Konfigurasi disimpan. Listener siap memantau notifikasi QRIS.');
    } catch (e) {
      _showBanner('Gagal menyimpan: $e', isError: true);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _toggleEnabled(bool value) async {
    setState(() => _enabled = value);
    await _channel.invokeMethod('saveConfig', {
      'serverUrl': _serverUrlCtrl.text.trim(),
      'agentKey': _agentKeyCtrl.text.trim(),
      'enabled': value,
      'filterAllRp': _filterAllRp,
    });
  }

  Future<void> _toggleFilterAllRp(bool value) async {
    setState(() => _filterAllRp = value);
    await _channel.invokeMethod('saveConfig', {
      'serverUrl': _serverUrlCtrl.text.trim(),
      'agentKey': _agentKeyCtrl.text.trim(),
      'enabled': _enabled,
      'filterAllRp': value,
    });
  }

  Future<void> _openNotificationSettings() async {
    await _channel.invokeMethod('openNotificationAccessSettings');
  }

  Future<void> _openAppInfoSettings() async {
    await _channel.invokeMethod('openAppInfoSettings');
  }

  Future<void> _openBatterySettings() async {
    await _channel.invokeMethod('openBatterySettings');
  }

  Future<void> _sendTestWebhook() async {
    await _saveConfig();
    if (_statusIsError) return;

    setState(() => _testing = true);
    try {
      final amount = _testAmountCtrl.text.replaceAll(RegExp(r'[^0-9]'), '');
      final res = await _channel.invokeMapMethod<String, dynamic>(
            'sendTestWebhook',
            {'amount': amount.isEmpty ? '1537' : amount},
          ) ??
          {};

      final ok = res['ok'] == true;
      final matched = res['matched'] == true;
      final msg = (res['message'] as String?) ?? 'Selesai';

      _showBanner(
        matched
            ? 'Berhasil cocok! $msg'
            : (ok ? 'Server merespons: $msg' : msg),
        isError: !ok,
      );
      await _refreshStatusAndLogs();
    } catch (e) {
      _showBanner('Gagal kirim uji coba: $e', isError: true);
    } finally {
      if (mounted) setState(() => _testing = false);
    }
  }

  Future<void> _clearLogs() async {
    await _channel.invokeMethod('clearLogs');
    await _refreshStatusAndLogs();
  }

  @override
  Widget build(BuildContext context) {
    final isReady = _hasPermission &&
        _enabled &&
        _agentKeyCtrl.text.trim().isNotEmpty &&
        _serverUrlCtrl.text.trim().isNotEmpty;

    return Scaffold(
      appBar: AppBar(
        titleSpacing: 20,
        title: Row(
          children: [
            Container(
              width: 30,
              height: 30,
              decoration: BoxDecoration(
                color: NgeprintPalette.ink,
                borderRadius: BorderRadius.circular(8),
              ),
              alignment: Alignment.center,
              child: const Text(
                'N',
                style: TextStyle(
                  color: NgeprintPalette.surface,
                  fontWeight: FontWeight.w600,
                  fontSize: 16,
                ),
              ),
            ),
            const SizedBox(width: 10),
            const Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Ngeprint Listener',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    letterSpacing: -0.2,
                  ),
                ),
                Text(
                  'Otomatisasi QRIS v1.1 • by Gellona Teknologi',
                  style: TextStyle(
                    fontSize: 11,
                    color: NgeprintPalette.muted,
                    fontWeight: FontWeight.w400,
                  ),
                ),
              ],
            ),
          ],
        ),
        actions: [
          IconButton(
            onPressed: _refreshStatusAndLogs,
            tooltip: 'Muat ulang',
            icon: const Icon(Icons.refresh_rounded, size: 20),
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
        children: [
          if (_statusMessage != null) ...[
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              decoration: BoxDecoration(
                color: _statusIsError
                    ? const Color(0xFFFEF2F2)
                    : NgeprintPalette.successBg,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: _statusIsError
                      ? const Color(0xFFFECACA)
                      : const Color(0xFFBBF7D0),
                ),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(
                    _statusIsError
                        ? Icons.error_outline_rounded
                        : Icons.check_circle_outline_rounded,
                    size: 18,
                    color: _statusIsError
                        ? NgeprintPalette.accent
                        : NgeprintPalette.success,
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      _statusMessage!,
                      style: TextStyle(
                        fontSize: 13,
                        height: 1.35,
                        color: _statusIsError
                            ? const Color(0xFF991B1B)
                            : const Color(0xFF166534),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
          ],

          // 1. STATUS CARD
          _SectionCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      width: 10,
                      height: 10,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: isReady
                            ? NgeprintPalette.success
                            : (_hasPermission
                                ? NgeprintPalette.warning
                                : NgeprintPalette.accent),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        isReady
                            ? 'Listener Aktif & Siap'
                            : (!_hasPermission
                                ? 'Izin Akses Notifikasi Belum Aktif'
                                : 'Lengkapi Konfigurasi Toko'),
                        style: const TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                          color: NgeprintPalette.ink,
                        ),
                      ),
                    ),
                    Switch(
                      value: _enabled,
                      onChanged: _toggleEnabled,
                      activeThumbColor: NgeprintPalette.surface,
                      activeTrackColor: NgeprintPalette.ink,
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Text(
                  _hasPermission
                      ? 'Aplikasi berjalan di latar belakang untuk meneruskan notifikasi pembayaran QRIS (GoPay Merchant, DANA Bisnis, OVO, Bank) ke server Ngeprint.'
                      : 'Aktifkan izin "Akses Notifikasi" agar aplikasi ini bisa membaca notifikasi uang masuk dari GoPay Merchant dan menandai cetakan otomatis LUNAS.',
                  style: const TextStyle(
                    fontSize: 12.5,
                    height: 1.45,
                    color: NgeprintPalette.muted,
                  ),
                ),
                const SizedBox(height: 14),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    FilledButton.icon(
                      onPressed: _openNotificationSettings,
                      style: FilledButton.styleFrom(
                        backgroundColor: _hasPermission
                            ? NgeprintPalette.surfaceSubtle
                            : NgeprintPalette.accent,
                        foregroundColor: _hasPermission
                            ? NgeprintPalette.ink
                            : Colors.white,
                        elevation: 0,
                        padding: const EdgeInsets.symmetric(
                            horizontal: 14, vertical: 10),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10),
                        ),
                      ),
                      icon: Icon(
                        _hasPermission
                            ? Icons.verified_user_outlined
                            : Icons.notifications_active_outlined,
                        size: 16,
                      ),
                      label: Text(
                        _hasPermission
                            ? 'Izin Notifikasi Aktif'
                            : 'Aktifkan Izin Notifikasi',
                        style: const TextStyle(
                            fontSize: 12.5, fontWeight: FontWeight.w500),
                      ),
                    ),
                    if (!_hasPermission)
                      OutlinedButton.icon(
                        onPressed: _openAppInfoSettings,
                        style: OutlinedButton.styleFrom(
                          foregroundColor: NgeprintPalette.ink,
                          side: const BorderSide(color: NgeprintPalette.border),
                          padding: const EdgeInsets.symmetric(
                              horizontal: 14, vertical: 10),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(10),
                          ),
                        ),
                        icon: const Icon(Icons.tune_rounded, size: 16),
                        label: const Text(
                          'Buka Info Aplikasi (Setelan Terbatas)',
                          style: TextStyle(
                              fontSize: 12.5, fontWeight: FontWeight.w500),
                        ),
                      ),
                    OutlinedButton.icon(
                      onPressed: _openBatterySettings,
                      style: OutlinedButton.styleFrom(
                        foregroundColor: NgeprintPalette.ink,
                        side: const BorderSide(color: NgeprintPalette.border),
                        padding: const EdgeInsets.symmetric(
                            horizontal: 14, vertical: 10),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10),
                        ),
                      ),
                      icon: const Icon(Icons.battery_saver_outlined, size: 16),
                      label: const Text(
                        'Matikan Hemat Baterai',
                        style: TextStyle(
                            fontSize: 12.5, fontWeight: FontWeight.w500),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),

          const SizedBox(height: 12),

          // 2. CONFIGURATION CARD
          _SectionCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Konfigurasi Toko',
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                    color: NgeprintPalette.ink,
                  ),
                ),
                const SizedBox(height: 4),
                const Text(
                  'Salin URL Server dan Agent Key dari Dashboard Ngeprint → menu Tarif & Printer.',
                  style: TextStyle(
                    fontSize: 12,
                    color: NgeprintPalette.muted,
                  ),
                ),
                const SizedBox(height: 14),
                _FieldLabel('URL Server Ngeprint'),
                const SizedBox(height: 6),
                TextField(
                  controller: _serverUrlCtrl,
                  keyboardType: TextInputType.url,
                  style: const TextStyle(fontSize: 13.5),
                  decoration: _inputDecoration('https://ngeprint.id'),
                ),
                const SizedBox(height: 12),
                _FieldLabel('Agent Key Toko (AGT_...)'),
                const SizedBox(height: 6),
                TextField(
                  controller: _agentKeyCtrl,
                  style: const TextStyle(
                    fontSize: 13.5,
                    fontFamily: 'monospace',
                  ),
                  decoration: _inputDecoration('AGT_xxxxxxxxxxxx'),
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: const [
                          Text(
                            'Deteksi semua notifikasi berisi "Rp"',
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w500,
                              color: NgeprintPalette.ink,
                            ),
                          ),
                          Text(
                            'Cocok untuk GoPay Merchant, DANA Bisnis, OVO, QRIS Bank, dll.',
                            style: TextStyle(
                              fontSize: 11.5,
                              color: NgeprintPalette.muted,
                            ),
                          ),
                        ],
                      ),
                    ),
                    Switch(
                      value: _filterAllRp,
                      onChanged: _toggleFilterAllRp,
                      activeThumbColor: NgeprintPalette.surface,
                      activeTrackColor: NgeprintPalette.ink,
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton(
                    onPressed: _saving ? null : _saveConfig,
                    style: FilledButton.styleFrom(
                      backgroundColor: NgeprintPalette.ink,
                      foregroundColor: NgeprintPalette.surface,
                      elevation: 0,
                      padding: const EdgeInsets.symmetric(vertical: 13),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10),
                      ),
                    ),
                    child: Text(
                      _saving ? 'Menyimpan...' : 'Simpan Konfigurasi',
                      style: const TextStyle(
                        fontSize: 13.5,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 12),

          // 3. TEST WEBHOOK CARD
          _SectionCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Uji Koneksi ke Server',
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                    color: NgeprintPalette.ink,
                  ),
                ),
                const SizedBox(height: 4),
                const Text(
                  'Masukkan nominal pesanan pending (termasuk 2 digit kode unik) untuk menguji konfirmasi otomatis.',
                  style: TextStyle(
                    fontSize: 12,
                    color: NgeprintPalette.muted,
                  ),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _testAmountCtrl,
                        keyboardType: TextInputType.number,
                        style: const TextStyle(
                          fontSize: 14,
                          fontFamily: 'monospace',
                        ),
                        decoration: _inputDecoration('1537', prefixText: 'Rp '),
                      ),
                    ),
                    const SizedBox(width: 10),
                    FilledButton(
                      onPressed: _testing ? null : _sendTestWebhook,
                      style: FilledButton.styleFrom(
                        backgroundColor: NgeprintPalette.accent,
                        foregroundColor: Colors.white,
                        elevation: 0,
                        padding: const EdgeInsets.symmetric(
                            horizontal: 16, vertical: 14),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10),
                        ),
                      ),
                      child: Text(
                        _testing ? 'Mengirim...' : 'Uji Kirim',
                        style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),

          const SizedBox(height: 12),

          // 4. ACTIVITY LOGS CARD
          _SectionCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Expanded(
                      child: Text(
                        'Riwayat Notifikasi',
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                          color: NgeprintPalette.ink,
                        ),
                      ),
                    ),
                    TextButton(
                      onPressed: _refreshStatusAndLogs,
                      style: TextButton.styleFrom(
                        foregroundColor: NgeprintPalette.ink,
                        visualDensity: VisualDensity.compact,
                      ),
                      child: const Text('Muat Ulang', style: TextStyle(fontSize: 12)),
                    ),
                    if (_logs.isNotEmpty)
                      TextButton(
                        onPressed: _clearLogs,
                        style: TextButton.styleFrom(
                          foregroundColor: NgeprintPalette.muted,
                          visualDensity: VisualDensity.compact,
                        ),
                        child: const Text('Hapus', style: TextStyle(fontSize: 12)),
                      ),
                  ],
                ),
                const SizedBox(height: 6),
                if (_logs.isEmpty)
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(vertical: 24),
                    decoration: BoxDecoration(
                      color: NgeprintPalette.bg,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: NgeprintPalette.border),
                    ),
                    child: const Column(
                      children: [
                        Icon(Icons.inbox_outlined,
                            size: 24, color: NgeprintPalette.muted),
                        SizedBox(height: 6),
                        Text(
                          'Belum ada notifikasi pembayaran yang diteruskan.',
                          style: TextStyle(
                            fontSize: 12.5,
                            color: NgeprintPalette.muted,
                          ),
                        ),
                      ],
                    ),
                  )
                else
                  ListView.separated(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: _logs.length,
                    separatorBuilder: (_, __) => const Divider(
                      height: 14,
                      color: NgeprintPalette.border,
                    ),
                    itemBuilder: (context, index) {
                      final item = _logs[index];
                      final matched = item['matched'] == true;
                      final httpCode = (item['httpCode'] as num?)?.toInt() ?? 0;
                      final ok = httpCode >= 200 && httpCode < 300;
                      final jobCode = (item['jobCode'] as String?) ?? '';

                      return Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Text(
                                (item['time'] as String?) ?? '--:--',
                                style: const TextStyle(
                                  fontSize: 11.5,
                                  fontFamily: 'monospace',
                                  color: NgeprintPalette.muted,
                                ),
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  (item['pkg'] as String?) ?? '-',
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(
                                    fontSize: 11.5,
                                    color: NgeprintPalette.muted,
                                  ),
                                ),
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 8, vertical: 2),
                                decoration: BoxDecoration(
                                  color: matched
                                      ? NgeprintPalette.successBg
                                      : (ok
                                          ? NgeprintPalette.surfaceSubtle
                                          : const Color(0xFFFEF2F2)),
                                  borderRadius: BorderRadius.circular(99),
                                ),
                                child: Text(
                                  matched
                                      ? 'LUNAS${jobCode.isNotEmpty ? ' • $jobCode' : ''}'
                                      : (ok ? 'HTTP $httpCode' : 'GAGAL'),
                                  style: TextStyle(
                                    fontSize: 10.5,
                                    fontWeight: FontWeight.w600,
                                    color: matched
                                        ? NgeprintPalette.success
                                        : (ok
                                            ? NgeprintPalette.ink
                                            : NgeprintPalette.accent),
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 4),
                          Text(
                            (item['snippet'] as String?) ?? '',
                            style: const TextStyle(
                              fontSize: 12.5,
                              color: NgeprintPalette.ink,
                              height: 1.35,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            (item['detail'] as String?) ?? '',
                            style: const TextStyle(
                              fontSize: 11.5,
                              color: NgeprintPalette.muted,
                            ),
                          ),
                        ],
                      );
                    },
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  InputDecoration _inputDecoration(String hint, {String? prefixText}) {
    return InputDecoration(
      hintText: hint,
      prefixText: prefixText,
      hintStyle: const TextStyle(color: Color(0xFFA39B8F)),
      filled: true,
      fillColor: NgeprintPalette.bg,
      isDense: true,
      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: NgeprintPalette.border),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: NgeprintPalette.border),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: NgeprintPalette.ink, width: 1.4),
      ),
    );
  }
}

class _SectionCard extends StatelessWidget {
  final Widget child;
  const _SectionCard({required this.child});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: NgeprintPalette.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: NgeprintPalette.border),
      ),
      child: child,
    );
  }
}

class _FieldLabel extends StatelessWidget {
  final String text;
  const _FieldLabel(this.text);

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      style: const TextStyle(
        fontSize: 12,
        fontWeight: FontWeight.w500,
        color: NgeprintPalette.ink,
      ),
    );
  }
}
