import 'package:flutter/foundation.dart' show kIsWeb;

class AppConfig {
  // PC's local Wi-Fi IP — iPhone and other devices on the same network use this
  static const String _pcLocalIp = '192.168.1.40';

  static String get baseUrl {
    if (kIsWeb) {
      // When running as web on the PC itself
      return 'http://localhost:4000/api';
    }
    // Android emulator uses 10.0.2.2, real devices use the PC's local IP
    return 'http://$_pcLocalIp:4000/api';
  }

  // Google OAuth Web Client ID (from Google Cloud Console)
  static const String googleClientId =
      '607953976042-9kpliq3pc8s3qcalg594dptolmkuvqkd.apps.googleusercontent.com';
}
