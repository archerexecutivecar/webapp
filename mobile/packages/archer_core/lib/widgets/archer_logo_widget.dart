import 'package:flutter/material.dart';
import '../theme/archer_theme.dart';

class ArcherLogoWidget extends StatelessWidget {
  final double size;
  final bool showText;
  final String? subtitle;

  const ArcherLogoWidget({
    super.key,
    this.size = 80,
    this.showText = true,
    this.subtitle,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: size,
          height: size,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            boxShadow: [
              BoxShadow(
                color: ArcherColors.gold.withOpacity(0.25),
                blurRadius: 24,
                spreadRadius: 2,
              ),
            ],
          ),
          child: Image.asset(
            'assets/images/archer-logo.png',
            width: size,
            height: size,
            fit: BoxFit.contain,
            errorBuilder: (context, error, stackTrace) {
              return Container(
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: ArcherColors.surfaceElevated,
                  border: Border.all(color: ArcherColors.gold, width: 2),
                ),
                child: Center(
                  child: Icon(
                    Icons.shield_outlined,
                    color: ArcherColors.gold,
                    size: size * 0.5,
                  ),
                ),
              );
            },
          ),
        ),
        if (showText) ...[
          const SizedBox(height: 14),
          const Text(
            'ARCHER',
            style: TextStyle(
              fontSize: 26,
              fontWeight: FontWeight.w800,
              letterSpacing: 4.5,
              color: ArcherColors.gold,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            subtitle ?? 'TRANSPORTATION & SECURITY SPECIALISTS',
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w600,
              letterSpacing: 2.2,
              color: ArcherColors.textSecondary,
            ),
          ),
        ],
      ],
    );
  }
}
