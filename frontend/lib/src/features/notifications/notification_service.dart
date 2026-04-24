import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';

import '../shared/models.dart';

class NotificationService {
  bool _initialized = false;

  Future<void> configureForSession(Session session) async {
    try {
      if (!_initialized) {
        await Firebase.initializeApp();
        _initialized = true;
      }

      final messaging = FirebaseMessaging.instance;
      await messaging.requestPermission();
      await messaging.subscribeToTopic(session.notificationTopic);
    } catch (_) {
      // Firebase config is intentionally optional until the platform files are added.
    }
  }
}
