import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'core/theme/app_theme.dart';
import 'features/auth/auth_controller.dart';
import 'ui/dashboard_screen.dart';
import 'ui/home_screen.dart';

class PlacementApp extends ConsumerWidget {
  const PlacementApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authControllerProvider);

    return MaterialApp(
      title: 'MCA Placement Manager',
      debugShowCheckedModeBanner: false,
      theme: buildAppTheme(),
      home: switch (authState.status) {
        AuthStatus.checking => const _SplashView(),
        AuthStatus.loading => const _SplashView(),
        AuthStatus.authenticated => const DashboardScreen(),
        AuthStatus.unauthenticated => const HomeScreen(),
      },
    );
  }
}

class _SplashView extends StatelessWidget {
  const _SplashView();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: DecoratedBox(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [Color(0xFFFFF3D6), Color(0xFFE2F3EF), Color(0xFFF7E6DE)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
        child: const Center(child: CircularProgressIndicator()),
      ),
    );
  }
}
