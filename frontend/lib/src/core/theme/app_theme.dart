import 'package:flutter/material.dart';

/// RV placement portal palette (login mockup).
abstract final class AppColors {
  static const Color white = Color(0xFFFFFFFF);
  static const Color lightBlue = Color(0xFFE1F0FF);
  static const Color cardGrey = Color(0xFF4A4A4A);
  static const Color primaryBlue = Color(0xFF0070CC);
  static const Color textDark = Color(0xFF000000);
}

ThemeData buildAppTheme() {
  final colorScheme = ColorScheme.light(
    primary: AppColors.primaryBlue,
    onPrimary: AppColors.white,
    secondary: AppColors.lightBlue,
    onSecondary: AppColors.textDark,
    surface: AppColors.white,
    onSurface: AppColors.textDark,
    error: const Color(0xFFB00020),
    onError: AppColors.white,
  );

  return ThemeData(
    useMaterial3: true,
    colorScheme: colorScheme,
    scaffoldBackgroundColor: AppColors.white,
    textTheme: ThemeData.light().textTheme.apply(
      bodyColor: AppColors.textDark,
      displayColor: AppColors.textDark,
    ),
    cardTheme: CardThemeData(
      color: AppColors.white,
      elevation: 2,
      shadowColor: Colors.black.withValues(alpha: 0.12),
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(18),
      ),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: AppColors.primaryBlue,
        foregroundColor: AppColors.white,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
        ),
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: AppColors.lightBlue,
      contentPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: BorderSide.none,
      ),
    ),
    snackBarTheme: const SnackBarThemeData(behavior: SnackBarBehavior.floating),
  );
}
