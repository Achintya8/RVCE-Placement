import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/theme/app_theme.dart';
import '../features/auth/auth_controller.dart';

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  final _usernameController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _isSpc = false;

  @override
  void dispose() {
    _usernameController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    ref.listen<AuthState>(authControllerProvider, (previous, next) {
      if (next.errorMessage != null &&
          next.errorMessage != previous?.errorMessage) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(next.errorMessage!)));
      }
    });

    final authState = ref.watch(authControllerProvider);
    final isBusy = authState.status == AuthStatus.loading;

    return Scaffold(
      backgroundColor: AppColors.white,
      body: Stack(
        clipBehavior: Clip.none,
        children: [
          Positioned(top: -165, right: -175, child: _DecorCircle(size: 480)),
          Positioned(bottom: -175, left: -205, child: _DecorCircle(size: 520)),
          SafeArea(
            child: Center(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(
                  horizontal: 24,
                  vertical: 20,
                ),
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 420),
                  child: Column(
                    children: [
                      const _PlacementHeader(),
                      const SizedBox(height: 86),
                      _LoginCard(
                        isSpc: _isSpc,
                        isBusy: isBusy,
                        onToggleStudent: () => setState(() => _isSpc = false),
                        onToggleSpc: () => setState(() => _isSpc = true),
                        usernameController: _usernameController,
                        passwordController: _passwordController,
                        onGoogle: () => ref
                            .read(authControllerProvider.notifier)
                            .loginWithGoogle(),
                        onSpcSignIn: () => ref
                            .read(authControllerProvider.notifier)
                            .loginWithSpc(
                              username: _usernameController.text.trim(),
                              password: _passwordController.text.trim(),
                            ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _DecorCircle extends StatelessWidget {
  const _DecorCircle({required this.size});

  final double size;

  @override
  Widget build(BuildContext context) {
    return IgnorePointer(
      child: Container(
        width: size,
        height: size,
        decoration: const BoxDecoration(
          color: AppColors.softBlue,
          shape: BoxShape.circle,
        ),
      ),
    );
  }
}

class _PlacementHeader extends StatelessWidget {
  const _PlacementHeader();

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Row(
          mainAxisSize: MainAxisSize.min,
          children: const [
            Image(
              image: AssetImage('assets/images/rvce-logo.png'),
              width: 178,
              fit: BoxFit.contain,
            ),
          ],
        ),
        const SizedBox(height: 12),
        Text(
          'Placement',
          style: Theme.of(
            context,
          ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w400),
        ),
      ],
    );
  }
}

class _LoginCard extends StatelessWidget {
  const _LoginCard({
    required this.isSpc,
    required this.isBusy,
    required this.onToggleStudent,
    required this.onToggleSpc,
    required this.usernameController,
    required this.passwordController,
    required this.onGoogle,
    required this.onSpcSignIn,
  });

  final bool isSpc;
  final bool isBusy;
  final VoidCallback onToggleStudent;
  final VoidCallback onToggleSpc;
  final TextEditingController usernameController;
  final TextEditingController passwordController;
  final VoidCallback onGoogle;
  final VoidCallback onSpcSignIn;

  @override
  Widget build(BuildContext context) {
    final fieldTheme = Theme.of(context).copyWith(
      inputDecorationTheme: const InputDecorationTheme(
        filled: true,
        fillColor: AppColors.lightBlue,
        hintStyle: TextStyle(
          color: Color(0x99000000),
          fontWeight: FontWeight.w400,
        ),
        contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.all(Radius.circular(16)),
          borderSide: BorderSide.none,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.all(Radius.circular(16)),
          borderSide: BorderSide.none,
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.all(Radius.circular(16)),
          borderSide: BorderSide(color: AppColors.primaryBlue, width: 2),
        ),
      ),
    );

    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [AppColors.cardGrey, AppColors.panelBlack],
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
        ),
        borderRadius: BorderRadius.circular(34),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.30),
            blurRadius: 34,
            offset: const Offset(0, 18),
          ),
          BoxShadow(
            color: AppColors.lightBlue.withValues(alpha: 0.85),
            blurRadius: 46,
            spreadRadius: 10,
          ),
        ],
      ),
      padding: const EdgeInsets.fromLTRB(24, 20, 24, 24),
      child: Theme(
        data: fieldTheme,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _RoleToggle(
              isSpc: isSpc,
              onStudent: onToggleStudent,
              onSpc: onToggleSpc,
            ),
            const SizedBox(height: 24),
            if (!isSpc) ...[
              Text(
                'Sign in with your RVCE Google account.',
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: AppColors.textLight.withValues(alpha: 0.70),
                  height: 1.35,
                ),
              ),
              const SizedBox(height: 10),
              _GoogleSignInButton(onPressed: isBusy ? null : onGoogle),
            ] else ...[
              TextField(
                controller: usernameController,
                enabled: !isBusy,
                textInputAction: TextInputAction.next,
                style: const TextStyle(color: AppColors.textDark),
                decoration: const InputDecoration(hintText: 'Username'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: passwordController,
                enabled: !isBusy,
                obscureText: true,
                textInputAction: TextInputAction.done,
                onSubmitted: (_) {
                  if (!isBusy) onSpcSignIn();
                },
                style: const TextStyle(color: AppColors.textDark),
                decoration: const InputDecoration(hintText: 'Password'),
              ),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: isBusy ? null : onSpcSignIn,
                  child: const Text('Sign in'),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _RoleToggle extends StatelessWidget {
  const _RoleToggle({
    required this.isSpc,
    required this.onStudent,
    required this.onSpc,
  });

  final bool isSpc;
  final VoidCallback onStudent;
  final VoidCallback onSpc;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: AppColors.softBlue,
        borderRadius: BorderRadius.circular(18),
      ),
      child: Row(
        children: [
          Expanded(
            child: _ToggleSegment(
              label: 'Student',
              selected: !isSpc,
              onTap: onStudent,
            ),
          ),
          Expanded(
            child: _ToggleSegment(label: 'SPC', selected: isSpc, onTap: onSpc),
          ),
        ],
      ),
    );
  }
}

class _ToggleSegment extends StatelessWidget {
  const _ToggleSegment({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          curve: Curves.easeOut,
          padding: const EdgeInsets.symmetric(vertical: 13),
          decoration: BoxDecoration(
            color: selected ? AppColors.white : Colors.transparent,
            borderRadius: BorderRadius.circular(16),
          ),
          alignment: Alignment.center,
          child: Text(
            label,
            style: Theme.of(context).textTheme.titleSmall?.copyWith(
              fontWeight: FontWeight.w700,
              color: AppColors.textDark,
            ),
          ),
        ),
      ),
    );
  }
}

class _GoogleSignInButton extends StatelessWidget {
  const _GoogleSignInButton({required this.onPressed});

  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      child: FilledButton(
        onPressed: onPressed,
        style: FilledButton.styleFrom(
          padding: const EdgeInsets.symmetric(vertical: 16),
          backgroundColor: AppColors.primaryBlue,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20),
          ),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 22,
              height: 22,
              decoration: BoxDecoration(
                color: AppColors.white,
                borderRadius: BorderRadius.circular(4),
              ),
              alignment: Alignment.center,
              child: const Text(
                'G',
                style: TextStyle(
                  color: Color(0xFF4285F4),
                  fontWeight: FontWeight.w800,
                  fontSize: 13,
                  height: 1,
                ),
              ),
            ),
            const SizedBox(width: 12),
            const Text('Continue with Google'),
          ],
        ),
      ),
    );
  }
}
