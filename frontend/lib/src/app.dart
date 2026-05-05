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
            top: -220,
            left: -170,
            right: -170,
            child: IgnorePointer(
              child: Container(
                height: 520,
                decoration: const BoxDecoration(
                  color: AppColors.lightBlue,
                  shape: BoxShape.circle,
                ),
              ),
            ),
          ),
          Positioned(
            bottom: -210,
            left: -180,
            right: -180,
            child: IgnorePointer(
              child: Container(
                height: 500,
                decoration: const BoxDecoration(
                  color: AppColors.lightBlue,
                  shape: BoxShape.circle,
                ),
              ),
            ),
          ),
          Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Image(
                  image: AssetImage('assets/images/rvce-logo.png'),
                  width: 220,
                  fit: BoxFit.contain,
                ),
                const SizedBox(height: 28),
                Text(
                  'P\nL\nA\nC\nE\nM\nE\nN\nT\nS',
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    color: AppColors.textDark,
                    fontWeight: FontWeight.w800,
                    height: 1.18,
                    letterSpacing: 0,
                  ),
                ),
                const SizedBox(height: 28),
                const SizedBox(
                  width: 24,
                  height: 24,
                  child: CircularProgressIndicator(
                    color: AppColors.primaryBlue,
                    strokeWidth: 2.8,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
