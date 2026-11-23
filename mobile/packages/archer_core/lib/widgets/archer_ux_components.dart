import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'archer_logo_widget.dart';

/// Bespoke Luxury UX Components for Archer Executive mobile applications.
class ArcherConfirmationDialog {
  ArcherConfirmationDialog._();

  /// Displays an executive confirmation dialog with luxury dark obsidian and gold styling.
  static Future<bool> show({
    required BuildContext context,
    required String title,
    required String message,
    String confirmLabel = 'CONFIRM',
    String cancelLabel = 'CANCEL',
    IconData icon = Icons.warning_amber_rounded,
    Color iconColor = const Color(0xFFE5C07B),
    Color confirmColor = const Color(0xFFEF4444),
    bool isDestructive = true,
  }) async {
    HapticFeedback.mediumImpact();
    final result = await showDialog<bool>(
      context: context,
      barrierDismissible: true,
      barrierColor: Colors.black.withOpacity(0.72),
      builder: (ctx) {
        return Dialog(
          backgroundColor: const Color(0xFF0F121A),
          elevation: 24,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20),
            side: const BorderSide(color: Color(0x33C8A96A), width: 1.2),
          ),
          insetPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(22, 24, 22, 20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Glowing Icon Badge
                Container(
                  width: 54,
                  height: 54,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: iconColor.withOpacity(0.12),
                    border: Border.all(color: iconColor.withOpacity(0.35), width: 1.5),
                    boxShadow: [
                      BoxShadow(
                        color: iconColor.withOpacity(0.18),
                        blurRadius: 16,
                        spreadRadius: 2,
                      ),
                    ],
                  ),
                  child: Center(
                    child: Icon(icon, color: iconColor, size: 28),
                  ),
                ),
                const SizedBox(height: 18),

                // Title
                Text(
                  title.toUpperCase(),
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 2.0,
                    color: Color(0xFFC8A96A),
                    fontFamily: 'serif',
                  ),
                ),
                const SizedBox(height: 10),

                // Message
                Text(
                  message,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontSize: 13,
                    height: 1.5,
                    color: Color(0xFF9CA3AF),
                  ),
                ),
                const SizedBox(height: 24),

                // Action Buttons
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        style: OutlinedButton.styleFrom(
                          side: const BorderSide(color: Color(0xFF2E3444)),
                          backgroundColor: const Color(0xFF161922),
                          foregroundColor: const Color(0xFFD1D5DB),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          padding: const EdgeInsets.symmetric(vertical: 13),
                        ),
                        onPressed: () {
                          HapticFeedback.lightImpact();
                          Navigator.of(ctx).pop(false);
                        },
                        child: Text(
                          cancelLabel.toUpperCase(),
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            letterSpacing: 1.2,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: confirmColor,
                          foregroundColor: isDestructive ? Colors.white : Colors.black,
                          elevation: 0,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          padding: const EdgeInsets.symmetric(vertical: 13),
                        ),
                        onPressed: () {
                          HapticFeedback.mediumImpact();
                          Navigator.of(ctx).pop(true);
                        },
                        child: Text(
                          confirmLabel.toUpperCase(),
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                            letterSpacing: 1.2,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
    return result ?? false;
  }
}

/// Floating luxury toast notification for Archer applications.
class ArcherToast {
  ArcherToast._();

  static void show(
    BuildContext context, {
    required String message,
    IconData? icon,
    bool isError = false,
    Duration duration = const Duration(seconds: 4),
    String? actionLabel,
    VoidCallback? onAction,
  }) {
    HapticFeedback.lightImpact();
    ScaffoldMessenger.of(context).hideCurrentSnackBar();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        behavior: SnackBarBehavior.floating,
        margin: const EdgeInsets.fromLTRB(16, 0, 16, 96),
        backgroundColor: const Color(0xFF11141E),
        elevation: 8,
        duration: duration,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: BorderSide(
            color: isError ? const Color(0x66EF4444) : const Color(0x44C8A96A),
            width: 1,
          ),
        ),
        content: Row(
          children: [
            Icon(
              icon ?? (isError ? Icons.error_outline_rounded : Icons.check_circle_outline_rounded),
              color: isError ? const Color(0xFFEF4444) : const Color(0xFFC8A96A),
              size: 20,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                message,
                style: const TextStyle(
                  fontSize: 13,
                  color: Colors.white,
                  fontWeight: FontWeight.w500,
                  height: 1.3,
                ),
              ),
            ),
          ],
        ),
        action: actionLabel != null
            ? SnackBarAction(
                label: actionLabel,
                textColor: const Color(0xFFC8A96A),
                onPressed: onAction ?? () {},
              )
            : null,
      ),
    );
  }
}

/// Dynamic luxury Archer App Bar with contextual titles, brand crest, and refined actions.
class ArcherTopAppBar extends StatelessWidget implements PreferredSizeWidget {
  final String title;
  final String subtitle;
  final List<Widget>? actions;
  final VoidCallback? onProfileTap;
  final String profileInitials;
  final bool showLogo;
  final Widget? customLeading;

  const ArcherTopAppBar({
    super.key,
    required this.title,
    required this.subtitle,
    this.actions,
    this.onProfileTap,
    this.profileInitials = 'VIP',
    this.showLogo = true,
    this.customLeading,
  });

  @override
  Size get preferredSize => const Size.fromHeight(66);

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: Color(0xFF090B10),
        border: Border(
          bottom: BorderSide(color: Color(0x18C8A96A), width: 1),
        ),
      ),
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: Row(
            children: [
              if (customLeading != null)
                customLeading!
              else if (showLogo) ...[
                const ArcherLogoWidget(size: 30, showText: false),
                const SizedBox(width: 12),
              ],
              Expanded(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title.toUpperCase(),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 2.2,
                        color: Color(0xFFC8A96A),
                        fontFamily: 'serif',
                      ),
                    ),
                    const SizedBox(height: 2),
                    Row(
                      children: [
                        Container(
                          width: 5,
                          height: 5,
                          decoration: const BoxDecoration(
                            color: Color(0xFF10B981),
                            shape: BoxShape.circle,
                          ),
                        ),
                        const SizedBox(width: 5),
                        Expanded(
                          child: Text(
                            subtitle.toUpperCase(),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              fontSize: 9,
                              fontWeight: FontWeight.w600,
                              letterSpacing: 1.2,
                              color: Color(0xFF9CA3AF),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              if (actions != null) ...actions!,
              if (onProfileTap != null) ...[
                const SizedBox(width: 8),
                InkWell(
                  onTap: () {
                    HapticFeedback.lightImpact();
                    onProfileTap!();
                  },
                  borderRadius: BorderRadius.circular(20),
                  child: Container(
                    width: 36,
                    height: 36,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: const Color(0xFF141824),
                      border: Border.all(color: const Color(0x55C8A96A), width: 1.2),
                      boxShadow: const [
                        BoxShadow(
                          color: Color(0x18C8A96A),
                          blurRadius: 6,
                        ),
                      ],
                    ),
                    child: Center(
                      child: Text(
                        profileInitials.toUpperCase(),
                        style: const TextStyle(
                          color: Color(0xFFDFBE82),
                          fontSize: 11,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 0.5,
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
