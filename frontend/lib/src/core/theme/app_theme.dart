import 'package:flutter/material.dart';

ThemeData buildAppTheme() {
  const charcoal = Color(0xFF1D2A38);
  const coral = Color(0xFFD96B4F);
  const cream = Color(0xFFFFF9EF);
  const moss = Color(0xFF42695A);

  final colorScheme =
      ColorScheme.fromSeed(
        seedColor: coral,
        brightness: Brightness.light,
      ).copyWith(
        primary: coral,
        secondary: moss,
        surface: cream,
        tertiary: const Color(0xFFE8B86D),
        onPrimary: Colors.white,
      );

  return ThemeData(
    useMaterial3: true,
    colorScheme: colorScheme,
    scaffoldBackgroundColor: cream,
    textTheme: ThemeData.light().textTheme.apply(
      bodyColor: charcoal,
      displayColor: charcoal,
      fontFamily: 'Georgia',
    ),
    cardTheme: CardThemeData(
      color: Colors.white,
      elevation: 0,
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(24),
        side: BorderSide(color: Colors.black.withValues(alpha: 0.08)),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: Colors.white,
      contentPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(18),
        borderSide: BorderSide.none,
      ),
    ),
    snackBarTheme: const SnackBarThemeData(behavior: SnackBarBehavior.floating),
  );
}
