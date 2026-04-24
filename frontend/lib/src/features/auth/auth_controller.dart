import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/config/app_config.dart';
import '../../core/network/api_client.dart';
import '../notifications/notification_service.dart';
import '../shared/models.dart';
import '../shared/placement_repository.dart';

enum AuthStatus { checking, loading, authenticated, unauthenticated }

class AuthState {
  const AuthState({required this.status, this.session, this.errorMessage});

  final AuthStatus status;
  final Session? session;
  final String? errorMessage;

  AuthState copyWith({
    AuthStatus? status,
    Session? session,
    String? errorMessage,
  }) {
    return AuthState(
      status: status ?? this.status,
      session: session ?? this.session,
      errorMessage: errorMessage,
    );
  }
}

final apiClientProvider = Provider<ApiClient>(
  (ref) => ApiClient(baseUrl: AppConfig.baseUrl),
);
final notificationServiceProvider = Provider<NotificationService>(
  (ref) => NotificationService(),
);
final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepository(ref.read(apiClientProvider));
});
final placementRepositoryProvider = Provider<PlacementRepository>((ref) {
  return PlacementRepository(ref.read(apiClientProvider));
});

final authControllerProvider = StateNotifierProvider<AuthController, AuthState>(
  (ref) {
    return AuthController(
      ref.read(authRepositoryProvider),
      ref.read(apiClientProvider),
      ref.read(notificationServiceProvider),
    )..restoreSession();
  },
);

class AuthController extends StateNotifier<AuthState> {
  AuthController(
    this._authRepository,
    this._apiClient,
    this._notificationService,
  ) : super(const AuthState(status: AuthStatus.checking));

  final AuthRepository _authRepository;
  final ApiClient _apiClient;
  final NotificationService _notificationService;

  Future<void> restoreSession() async {
    try {
      state = const AuthState(status: AuthStatus.checking);
      final session = await _authRepository.restoreSession();
      if (session == null) {
        state = const AuthState(status: AuthStatus.unauthenticated);
        return;
      }

      _apiClient.setToken(session.token);
      await _notificationService.configureForSession(session);
      state = AuthState(status: AuthStatus.authenticated, session: session);
    } catch (error) {
      await _authRepository.logout();
      state = AuthState(
        status: AuthStatus.unauthenticated,
        errorMessage: error.toString(),
      );
    }
  }

  Future<void> loginWithGoogle() async {
    await _runAuthAction(_authRepository.loginWithGoogle);
  }

  Future<void> loginWithSpc({
    required String username,
    required String password,
  }) async {
    await _runAuthAction(
      () =>
          _authRepository.loginWithSpc(username: username, password: password),
    );
  }

  Future<void> logout() async {
    await _authRepository.logout();
    state = const AuthState(status: AuthStatus.unauthenticated);
  }

  Future<void> _runAuthAction(Future<Session> Function() action) async {
    try {
      state = state.copyWith(status: AuthStatus.loading, errorMessage: null);
      final session = await action();
      _apiClient.setToken(session.token);
      await _notificationService.configureForSession(session);
      state = AuthState(status: AuthStatus.authenticated, session: session);
    } catch (error) {
      state = AuthState(
        status: AuthStatus.unauthenticated,
        errorMessage: error.toString(),
      );
    }
  }
}
