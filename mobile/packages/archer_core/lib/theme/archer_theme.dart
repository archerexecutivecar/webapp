import 'package:flutter/material.dart';

class ArcherColors {
  ArcherColors._();

  static const Color background = Color(0xFF0D0F14);
  static const Color surface = Color(0xFF161922);
  static const Color surfaceCard = Color(0xFF1E222D);
  static const Color surfaceElevated = Color(0xFF262C3A);

  static const Color gold = Color(0xFFC5A059);
  static const Color goldLight = Color(0xFFE5C07B);
  static const Color goldDark = Color(0xFF9A7B38);

  static const Color textPrimary = Color(0xFFF3F4F6);
  static const Color textSecondary = Color(0xFF9CA3AF);
  static const Color textMuted = Color(0xFF6B7280);

  static const Color border = Color(0xFF2E3444);
  static const Color borderSubtle = Color(0xFF232733);

  static const Color success = Color(0xFF10B981);
  static const Color warning = Color(0xFFF59E0B);
  static const Color danger = Color(0xFFEF4444);
  static const Color info = Color(0xFF3B82F6);
}

class ArcherTheme {
  ArcherTheme._();

  static ThemeData get darkTheme {
    return ThemeData(
      brightness: Brightness.dark,
      scaffoldBackgroundColor: ArcherColors.background,
      primaryColor: ArcherColors.gold,
      colorScheme: const ColorScheme.dark(
        primary: ArcherColors.gold,
        secondary: ArcherColors.goldLight,
        surface: ArcherColors.surface,
        error: ArcherColors.danger,
        onPrimary: Colors.black,
        onSecondary: Colors.black,
        onSurface: ArcherColors.textPrimary,
        onError: Colors.white,
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: ArcherColors.background,
        elevation: 0,
        centerTitle: false,
        titleTextStyle: TextStyle(
          fontSize: 20,
          fontWeight: FontWeight.w600,
          letterSpacing: 0.5,
          color: ArcherColors.textPrimary,
        ),
        iconTheme: IconThemeData(color: ArcherColors.gold),
      ),
      cardTheme: CardThemeData(
        color: ArcherColors.surfaceCard,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: ArcherColors.borderSubtle, width: 1),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: ArcherColors.gold,
          foregroundColor: Colors.black,
          minimumSize: const Size.fromHeight(52),
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          textStyle: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w600,
            letterSpacing: 0.5,
          ),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: ArcherColors.gold,
          minimumSize: const Size.fromHeight(52),
          side: const BorderSide(color: ArcherColors.gold, width: 1.2),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          textStyle: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w600,
            letterSpacing: 0.5,
          ),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: ArcherColors.surface,
        hintStyle: const TextStyle(color: ArcherColors.textMuted, fontSize: 14),
        labelStyle: const TextStyle(color: ArcherColors.textSecondary, fontSize: 14),
        contentPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: ArcherColors.border),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: ArcherColors.border),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: ArcherColors.gold, width: 1.5),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: ArcherColors.danger),
        ),
      ),
      dividerTheme: const DividerThemeData(
        color: ArcherColors.borderSubtle,
        thickness: 1,
      ),
    );
  }
}
