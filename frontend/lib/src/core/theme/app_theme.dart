import 'package:flutter/material.dart';

/// RV placement portal palette (login mockup).
abstract final class AppColors {
  static const Color white = Color(0xFFFFFFFF);
  static const Color lightBlue = Color(0xFFE6F4FF);
  static const Color softBlue = Color(0xFFD8ECFF);
  static const Color cardGrey = Color(0xFF404040);
  static const Color panelBlack = Color(0xFF111111);
  static const Color panelTop = Color(0xFF3F3F3F);
  static const Color emerald = Color(0xFF139879);
  static const Color olive = Color(0xFF9CA50D);
  static const Color cobalt = Color(0xFF1432C7);
  static const Color primaryBlue = Color(0xFF0070CC);
  static const Color textDark = Color(0xFF000000);
  static const Color mutedText = Color(0xFF7A7F87);
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
      color: AppColors.panelBlack,
      elevation: 0,
      shadowColor: Colors.black.withValues(alpha: 0.2),
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(28)),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: AppColors.primaryBlue,
        foregroundColor: AppColors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
        padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 15),
        textStyle: const TextStyle(fontWeight: FontWeight.w800),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: AppColors.white,
      hintStyle: TextStyle(color: AppColors.textDark.withValues(alpha: 0.66)),
      labelStyle: TextStyle(color: AppColors.textDark.withValues(alpha: 0.68)),
      contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 17),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(18),
        borderSide: BorderSide.none,
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(18),
        borderSide: BorderSide(color: Colors.black.withValues(alpha: 0.10)),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(18),
        borderSide: const BorderSide(color: AppColors.primaryBlue, width: 2),
      ),
    ),
    snackBarTheme: const SnackBarThemeData(behavior: SnackBarBehavior.floating),
  );
}
