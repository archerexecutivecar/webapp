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

/// Persistent luxury floating telemetry pill (Dynamic Island) for active missions.
class ArcherTelemetryIsland extends StatelessWidget {
  final String statusText;
  final String detailText;
  final String? vehicleInfo;
  final String? driverName;
  final VoidCallback onTap;
  final VoidCallback? onCall;
  final bool isLive;
  final bool isCollapsed;
  final VoidCallback? onToggleCollapse;

  const ArcherTelemetryIsland({
    super.key,
    required this.statusText,
    required this.detailText,
    this.vehicleInfo,
    this.driverName,
    required this.onTap,
    this.onCall,
    this.isLive = true,
    this.isCollapsed = false,
    this.onToggleCollapse,
  });

  @override
  Widget build(BuildContext context) {
    if (isCollapsed) {
      return SafeArea(
        top: false,
        bottom: false,
        child: Container(
          margin: const EdgeInsets.fromLTRB(16, 0, 16, 6),
          alignment: Alignment.bottomCenter,
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 480),
            child: Material(
              color: Colors.transparent,
              child: InkWell(
                onTap: () {
                  HapticFeedback.lightImpact();
                  if (onToggleCollapse != null) {
                    onToggleCollapse!();
                  } else {
                    onTap();
                  }
                },
                borderRadius: BorderRadius.circular(16),
                child: Container(
                  height: 36,
                  padding: const EdgeInsets.symmetric(horizontal: 14),
                  decoration: BoxDecoration(
                    color: const Color(0xEE0B0E16),
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(color: const Color(0x44C8A96A), width: 1),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.4),
                        blurRadius: 10,
                        offset: const Offset(0, 3),
                      ),
                    ],
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 7,
                        height: 7,
                        decoration: const BoxDecoration(
                          shape: BoxShape.circle,
                          color: Color(0xFF10B981),
                          boxShadow: [
                            BoxShadow(
                              color: Color(0xFF10B981),
                              blurRadius: 4,
                              spreadRadius: 1,
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        '${statusText.toUpperCase()} • $detailText',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 0.8,
                          color: Color(0xFFDFBE82),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Icon(
                        Icons.keyboard_arrow_up_rounded,
                        size: 16,
                        color: const Color(0xFFC8A96A).withOpacity(0.8),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      );
    }

    return SafeArea(
      top: false,
      bottom: false,
      child: Container(
        margin: const EdgeInsets.fromLTRB(16, 0, 16, 8), // Sits right above the bottom nav capsule
        alignment: Alignment.bottomCenter,
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 480),
          child: Material(
            color: Colors.transparent,
            child: InkWell(
              onTap: () {
                HapticFeedback.lightImpact();
                onTap();
              },
              borderRadius: BorderRadius.circular(20),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xF50F1420), Color(0xF5171D2D)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: const Color(0x66C8A96A),
                    width: 1.2,
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.55),
                      blurRadius: 18,
                      offset: const Offset(0, 6),
                    ),
                    BoxShadow(
                      color: const Color(0xFFC8A96A).withOpacity(0.16),
                      blurRadius: 12,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: Row(
                  children: [
                    // Vehicle / Pulse indicator badge
                    Stack(
                      alignment: Alignment.center,
                      children: [
                        Container(
                          width: 38,
                          height: 38,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: const Color(0xFF222938),
                            border: Border.all(color: const Color(0x55C8A96A), width: 1.2),
                          ),
                          child: const Icon(
                            Icons.directions_car_filled_rounded,
                            color: Color(0xFFDFBE82),
                            size: 19,
                          ),
                        ),
                        if (isLive)
                          Positioned(
                            top: 1,
                            right: 1,
                            child: Container(
                              width: 9,
                              height: 9,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                color: const Color(0xFF10B981),
                                border: Border.all(color: const Color(0xFF0F1420), width: 1.5),
                                boxShadow: const [
                                  BoxShadow(
                                    color: Color(0xFF10B981),
                                    blurRadius: 4,
                                    spreadRadius: 1,
                                  ),
                                ],
                              ),
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(width: 12),

                    // Status and Mission details
                    Expanded(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Text(
                                statusText.toUpperCase(),
                                style: const TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w800,
                                  letterSpacing: 1.2,
                                  color: Color(0xFFDFBE82),
                                ),
                              ),
                              const SizedBox(width: 6),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                                decoration: BoxDecoration(
                                  color: const Color(0x3310B981),
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: const Text(
                                  'LIVE RADAR',
                                  style: TextStyle(
                                    fontSize: 8,
                                    fontWeight: FontWeight.w700,
                                    letterSpacing: 0.8,
                                    color: Color(0xFF10B981),
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 2),
                          Text(
                            detailText,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              fontSize: 12,
                              color: Color(0xFFD1D5DB),
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                      ),
                    ),

                    // Call Chauffeur Button
                    if (onCall != null) ...[
                      const SizedBox(width: 8),
                      Container(
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: const Color(0xFF161E2E),
                          border: Border.all(color: const Color(0x44C8A96A), width: 1),
                        ),
                        child: IconButton(
                          icon: const Icon(Icons.phone_in_talk_rounded, size: 16, color: Color(0xFFC8A96A)),
                          constraints: const BoxConstraints(minWidth: 34, minHeight: 34),
                          padding: EdgeInsets.zero,
                          tooltip: 'Call Assigned Chauffeur',
                          onPressed: () {
                            HapticFeedback.lightImpact();
                            onCall!();
                          },
                        ),
                      ),
                    ],

                    const SizedBox(width: 8),
                    // Collapse or Expand Chevron
                    if (onToggleCollapse != null)
                      InkWell(
                        onTap: () {
                          HapticFeedback.lightImpact();
                          onToggleCollapse!();
                        },
                        borderRadius: BorderRadius.circular(12),
                        child: Container(
                          width: 26,
                          height: 26,
                          decoration: const BoxDecoration(
                            shape: BoxShape.circle,
                            color: Color(0x22C8A96A),
                          ),
                          child: const Center(
                            child: Icon(
                              Icons.keyboard_arrow_down_rounded,
                              size: 18,
                              color: Color(0xFFC8A96A),
                            ),
                          ),
                        ),
                      )
                    else
                      Container(
                        width: 24,
                        height: 24,
                        decoration: const BoxDecoration(
                          shape: BoxShape.circle,
                          color: Color(0x22C8A96A),
                        ),
                        child: const Center(
                          child: Icon(
                            Icons.arrow_forward_ios_rounded,
                            size: 11,
                            color: Color(0xFFC8A96A),
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Bespoke luxury destination capsule (analogous to the "Where to?" pattern, styled for executives).
class ArcherReservationCapsule extends StatelessWidget {
  final VoidCallback onTap;
  final VoidCallback onScheduleTap;
  final String placeholder;

  const ArcherReservationCapsule({
    super.key,
    required this.onTap,
    required this.onScheduleTap,
    this.placeholder = 'Where may Archer chauffeur you today?',
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: Container(
        decoration: BoxDecoration(
          color: const Color(0xFF0F1420),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0x44C8A96A), width: 1.2),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.4),
              blurRadius: 14,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Row(
          children: [
            Expanded(
              child: InkWell(
                onTap: () {
                  HapticFeedback.lightImpact();
                  onTap();
                },
                borderRadius: const BorderRadius.horizontal(left: Radius.circular(16)),
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                  child: Row(
                    children: [
                      const Icon(Icons.search_rounded, color: Color(0xFFC8A96A), size: 20),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          placeholder,
                          style: const TextStyle(
                            fontSize: 13,
                            color: Color(0xFF9CA3AF),
                            fontWeight: FontWeight.w500,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
            Container(width: 1, height: 28, color: const Color(0x22C8A96A)),
            // Inline Schedule Switcher
            InkWell(
              onTap: () {
                HapticFeedback.lightImpact();
                onScheduleTap();
              },
              borderRadius: const BorderRadius.horizontal(right: Radius.circular(16)),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                child: Row(
                  children: [
                    const Icon(Icons.calendar_month_rounded, color: Color(0xFFDFBE82), size: 16),
                    const SizedBox(width: 6),
                    const Text(
                      'RESERVE',
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 1.0,
                        color: Color(0xFFDFBE82),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Hero card for ongoing/imminent mission with 4-stage luxury milestone stepper.
class ArcherMissionProgressCard extends StatelessWidget {
  final String reference;
  final String status;
  final String pickup;
  final String dropoff;
  final String? vehicle;
  final String? driverName;
  final VoidCallback onTap;
  final VoidCallback? onCall;

  const ArcherMissionProgressCard({
    super.key,
    required this.reference,
    required this.status,
    required this.pickup,
    required this.dropoff,
    this.vehicle,
    this.driverName,
    required this.onTap,
    this.onCall,
  });

  int get currentStep {
    switch (status) {
      case 'on_my_way':
        return 1;
      case 'at_doorstep':
        return 2;
      case 'in_progress':
        return 3;
      case 'completed':
        return 4;
      default: // 'scheduled', 'assigned', 'pending'
        return 0;
    }
  }

  String get headline {
    switch (status) {
      case 'on_my_way':
        return 'SPECIALIST EN ROUTE • ETA 6 MIN';
      case 'at_doorstep':
        return 'CHAUFFEUR AT DOORSTEP • VEHICLE STAGED';
      case 'in_progress':
        return 'MISSION IN PROGRESS • EN ROUTE';
      default:
        return 'MISSION CONFIRMED • DISPATCH LOCKED';
    }
  }

  @override
  Widget build(BuildContext context) {
    const steps = ['Confirmed', 'En Route', 'At Doorstep', 'Onboard'];

    return Container(
      margin: const EdgeInsets.only(bottom: 20),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF131826), Color(0xFF1B2234)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0x66C8A96A), width: 1.2),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.5),
            blurRadius: 18,
            offset: const Offset(0, 6),
          ),
          BoxShadow(
            color: const Color(0xFFC8A96A).withOpacity(0.14),
            blurRadius: 16,
            spreadRadius: 1,
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () {
            HapticFeedback.lightImpact();
            onTap();
          },
          borderRadius: BorderRadius.circular(18),
          child: Padding(
            padding: const EdgeInsets.all(18),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Top row with mission badge
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        Container(
                          width: 8,
                          height: 8,
                          decoration: const BoxDecoration(
                            shape: BoxShape.circle,
                            color: Color(0xFF10B981),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          'MISSION #$reference',
                          style: const TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 1.6,
                            color: Color(0xFFDFBE82),
                          ),
                        ),
                      ],
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: const Color(0x33C8A96A),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: const Text(
                        'ACTIVE MISSION',
                        style: TextStyle(
                          fontSize: 9,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 1.0,
                          color: Color(0xFFDFBE82),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),

                // Headline
                Text(
                  headline,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0.5,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  '${pickup.split(',').first} → ${dropoff.split(',').first}',
                  style: const TextStyle(fontSize: 12, color: Color(0xFF9CA3AF)),
                ),
                const SizedBox(height: 16),

                // Milestone Stepper Bar
                LayoutBuilder(
                  builder: (context, constraints) {
                    final progress = (currentStep / (steps.length - 1)).clamp(0.0, 1.0);
                    return Column(
                      children: [
                        Stack(
                          alignment: Alignment.centerLeft,
                          children: [
                            // Background line
                            Container(
                              height: 3,
                              width: constraints.maxWidth,
                              decoration: BoxDecoration(
                                color: const Color(0xFF2E364A),
                                borderRadius: BorderRadius.circular(2),
                              ),
                            ),
                            // Active progress fill
                            Container(
                              height: 3,
                              width: constraints.maxWidth * progress,
                              decoration: BoxDecoration(
                                gradient: const LinearGradient(
                                  colors: [Color(0xFFC8A96A), Color(0xFF10B981)],
                                ),
                                borderRadius: BorderRadius.circular(2),
                              ),
                            ),
                            // Moving vehicle icon
                            Positioned(
                              left: (constraints.maxWidth * progress - 12).clamp(0.0, constraints.maxWidth - 24),
                              child: Container(
                                width: 24,
                                height: 24,
                                decoration: BoxDecoration(
                                  color: const Color(0xFF0F1420),
                                  shape: BoxShape.circle,
                                  border: Border.all(color: const Color(0xFFDFBE82), width: 1.5),
                                  boxShadow: [
                                    BoxShadow(
                                      color: const Color(0xFFC8A96A).withOpacity(0.4),
                                      blurRadius: 6,
                                    ),
                                  ],
                                ),
                                child: const Center(
                                  child: Icon(
                                    Icons.directions_car_filled_rounded,
                                    size: 13,
                                    color: Color(0xFFDFBE82),
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 10),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: List.generate(steps.length, (idx) {
                            final isPassed = idx <= currentStep;
                            return Text(
                              steps[idx],
                              style: TextStyle(
                                fontSize: 9.5,
                                fontWeight: isPassed ? FontWeight.w700 : FontWeight.w500,
                                color: isPassed ? const Color(0xFFDFBE82) : const Color(0xFF6B7280),
                              ),
                            );
                          }),
                        ),
                      ],
                    );
                  },
                ),
                const SizedBox(height: 16),
                const Divider(color: Color(0x18C8A96A), height: 1),
                const SizedBox(height: 12),

                // Chauffeur & Vehicle row
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          driverName ?? 'Assigned Chauffeur Specialist',
                          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Colors.white),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          vehicle ?? 'Cadillac Escalade ESV',
                          style: const TextStyle(fontSize: 11, color: Color(0xFF9CA3AF)),
                        ),
                      ],
                    ),
                    if (onCall != null)
                      ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0x22C8A96A),
                          foregroundColor: const Color(0xFFDFBE82),
                          elevation: 0,
                          side: const BorderSide(color: Color(0x55C8A96A)),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                          minimumSize: Size.zero,
                        ),
                        icon: const Icon(Icons.phone_in_talk_rounded, size: 14),
                        label: const Text(
                          'INTERCOM',
                          style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 0.8),
                        ),
                        onPressed: () {
                          HapticFeedback.lightImpact();
                          onCall!();
                        },
                      ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
