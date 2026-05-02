import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'core/theme/app_theme.dart' show AppColors, buildAppTheme;
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
      backgroundColor: AppColors.white,
      body: Stack(
        children: [
          Positioned(
            top: -80,
            right: -60,
            child: IgnorePointer(
              child: Container(
                width: 200,
                height: 200,
                decoration: const BoxDecoration(
                  color: AppColors.lightBlue,
                  shape: BoxShape.circle,
                ),
              ),
            ),
          ),
          const Center(
            child: CircularProgressIndicator(color: AppColors.primaryBlue),
          ),
        ],
      ),
    );
  }
}
