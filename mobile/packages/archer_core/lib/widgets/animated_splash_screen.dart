import 'dart:async';
import 'dart:math' as math;
import 'package:flutter/material.dart';

/// Full-screen branded loading screen & animated splash screen.
/// Visually and behaviorally identical to the Archer frontpage loader
/// (src/src/components/ui/ArcherLoader.tsx):
/// - Jet-black background (#0b0b0c)
/// - Centered 112x112 mark with spinning gold arc (#c8a96a) on a subtle track
/// - Archer emblem in center with breathing luminescence (scale 0.85 -> 1.0, opacity breathing)
/// - Serif brand wordmark typed letter-by-letter ("ARCHER") with blinking gold cursor
/// - Fading gold/silver tagline ("EXECUTIVE SERVICES" / "CHAUFFEUR PARTNER")
class AnimatedSplashScreen extends StatefulWidget {
  final String title;
  final String subtitle;
  final VoidCallback? onComplete;
  final Duration typingInterval;
  final Duration holdAfterTyping;
  final bool loops;

  const AnimatedSplashScreen({
    super.key,
    this.title = 'ARCHER',
    this.subtitle = 'EXECUTIVE SERVICES',
    this.onComplete,
    this.typingInterval = const Duration(milliseconds: 160),
    this.holdAfterTyping = const Duration(milliseconds: 1500),
    this.loops = false,
  });

  @override
  State<AnimatedSplashScreen> createState() => _AnimatedSplashScreenState();
}

class _AnimatedSplashScreenState extends State<AnimatedSplashScreen>
    with TickerProviderStateMixin {
  late AnimationController _spinController;
  late AnimationController _breatheController;
  late Animation<double> _breatheAnimation;
  late Animation<double> _entranceScale;

  Timer? _typingTimer;
  Timer? _cursorTimer;
  Timer? _completionTimer;

  int _charCount = 0;
  bool _cursorVisible = true;
  bool _taglineVisible = false;

  @override
  void initState() {
    super.initState();

    // 1. Spinning gold arc (1.6s linear infinite)
    _spinController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1600),
    )..repeat();

    // 2. Breathing logo opacity (2.4s ease-in-out infinite)
    _breatheController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2400),
    );

    _entranceScale = Tween<double>(begin: 0.85, end: 1.0).animate(
      CurvedAnimation(
        parent: _breatheController,
        curve: const Interval(0.0, 0.35, curve: Curves.easeOut),
      ),
    );

    _breatheAnimation = TweenSequence<double>([
      TweenSequenceItem(
        tween: Tween<double>(begin: 0.0, end: 1.0).chain(CurveTween(curve: Curves.easeIn)),
        weight: 35,
      ),
      TweenSequenceItem(
        tween: Tween<double>(begin: 1.0, end: 0.75).chain(CurveTween(curve: Curves.easeInOut)),
        weight: 32,
      ),
      TweenSequenceItem(
        tween: Tween<double>(begin: 0.75, end: 1.0).chain(CurveTween(curve: Curves.easeInOut)),
        weight: 33,
      ),
    ]).animate(_breatheController);

    _breatheController.forward().then((_) {
      if (mounted) {
        // Repeat subtle breathing between 0.75 and 1.0
        _breatheController.repeat(reverse: true, period: const Duration(milliseconds: 2400));
      }
    });

    // 3. Blinking gold cursor (500ms toggle)
    _cursorTimer = Timer.periodic(const Duration(milliseconds: 500), (_) {
      if (mounted) {
        setState(() {
          _cursorVisible = !_cursorVisible;
        });
      }
    });

    // 4. Letter-by-letter typewriter
    _startTypewriter();
  }

  void _startTypewriter() {
    _typingTimer?.cancel();
    _typingTimer = Timer.periodic(widget.typingInterval, (timer) {
      if (!mounted) {
        timer.cancel();
        return;
      }

      if (_charCount < widget.title.length) {
        setState(() {
          _charCount++;
          if (_charCount == widget.title.length) {
            _taglineVisible = true;
          }
        });
      } else {
        timer.cancel();
        if (widget.loops) {
          _completionTimer = Timer(widget.holdAfterTyping, () {
            if (mounted) {
              setState(() {
                _charCount = 0;
                _taglineVisible = false;
              });
              _startTypewriter();
            }
          });
        } else if (widget.onComplete != null) {
          _completionTimer = Timer(widget.holdAfterTyping, () {
            if (mounted) {
              widget.onComplete!();
            }
          });
        }
      }
    });
  }

  @override
  void dispose() {
    _spinController.dispose();
    _breatheController.dispose();
    _typingTimer?.cancel();
    _cursorTimer?.cancel();
    _completionTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final typedText = widget.title.substring(0, math.min(_charCount, widget.title.length));

    return Scaffold(
      backgroundColor: const Color(0xFF0B0B0C),
      body: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: () {
          // Allow tapping to skip splash if onComplete is set
          if (widget.onComplete != null && _taglineVisible) {
            _completionTimer?.cancel();
            widget.onComplete!();
          }
        },
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              // 1. Mark: 112x112 circle with spinning arc + centered logo
              SizedBox(
                width: 112,
                height: 112,
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    // Spinning gold arc on track
                    AnimatedBuilder(
                      animation: _spinController,
                      builder: (context, child) {
                        return CustomPaint(
                          size: const Size(112, 112),
                          painter: _ArcherRingPainter(
                            angle: _spinController.value * 2 * math.pi,
                          ),
                        );
                      },
                    ),
                    // Centered emblem with breathing opacity and entrance scale
                    AnimatedBuilder(
                      animation: _breatheController,
                      builder: (context, child) {
                        final scale = _entranceScale.value;
                        final opacity = _breatheAnimation.value.clamp(0.0, 1.0);
                        return Transform.scale(
                          scale: scale,
                          child: Opacity(
                            opacity: opacity,
                            child: child,
                          ),
                        );
                      },
                      child: SizedBox(
                        width: 72,
                        height: 72,
                        child: Image.asset(
                          'assets/images/archer-logo.png',
                          fit: BoxFit.contain,
                          errorBuilder: (context, error, stackTrace) {
                            return Image.asset(
                              'packages/archer_core/assets/images/archer-logo.png',
                              fit: BoxFit.contain,
                              errorBuilder: (context, error, stackTrace) {
                                return const Icon(
                                  Icons.shield_outlined,
                                  color: Color(0xFFC8A96A),
                                  size: 40,
                                );
                              },
                            );
                          },
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 28),

              // 2. Typewriter brand name ("ARCHER") with blinking cursor
              SizedBox(
                height: 48,
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    Text(
                      typedText,
                      style: const TextStyle(
                        fontFamily: 'Georgia',
                        fontFamilyFallback: ['Cormorant Garamond', 'serif'],
                        fontSize: 34,
                        fontWeight: FontWeight.w600,
                        letterSpacing: 10.0, // .32em
                        color: Color(0xFFF4EFE6),
                      ),
                    ),
                    AnimatedOpacity(
                      duration: const Duration(milliseconds: 100),
                      opacity: _cursorVisible ? 1.0 : 0.0,
                      child: Container(
                        margin: const EdgeInsets.only(left: 4),
                        width: 2.2,
                        height: 28, // .85em
                        color: const Color(0xFFC8A96A),
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 10),

              // 3. Fading tagline ("EXECUTIVE SERVICES")
              AnimatedOpacity(
                duration: const Duration(milliseconds: 600),
                opacity: _taglineVisible ? 1.0 : 0.0,
                child: Text(
                  widget.subtitle,
                  style: const TextStyle(
                    fontFamily: 'Inter',
                    fontFamilyFallback: ['system-ui', 'sans-serif'],
                    fontSize: 11,
                    fontWeight: FontWeight.w500,
                    letterSpacing: 4.4, // .4em
                    color: Color(0xFF8A8478),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Custom painter recreating the exact SVG ring from ArcherLoader:
/// <svg className="al-ring" viewBox="0 0 112 112">
///   <circle className="al-track" cx="56" cy="56" r="54" />
///   <circle className="al-arc" cx="56" cy="56" r="54" />
/// </svg>
/// Track stroke: rgba(200, 169, 106, 0.15), width: 1.5
/// Arc stroke: #c8a96a, stroke-linecap: round, stroke-dasharray: 80 260 (~85 degrees sweep)
class _ArcherRingPainter extends CustomPainter {
  final double angle;

  _ArcherRingPainter({required this.angle});

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    const radius = 54.0;

    // Subtle gold track circle
    final trackPaint = Paint()
      ..color = const Color.fromRGBO(200, 169, 106, 0.15)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.5;
    canvas.drawCircle(center, radius, trackPaint);

    // Spinning gold arc
    final arcPaint = Paint()
      ..color = const Color(0xFFC8A96A)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.5
      ..strokeCap = StrokeCap.round;

    // 80 length out of 339.3 circumference = ~1.48 radians (~85 degrees)
    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      angle,
      1.48,
      false,
      arcPaint,
    );
  }

  @override
  bool shouldRepaint(covariant _ArcherRingPainter oldDelegate) {
    return oldDelegate.angle != angle;
  }
}

/// Standalone ArcherLoader component that can be dropped into any view as a branded loading overlay
class ArcherLoaderWidget extends StatelessWidget {
  final String tagline;
  const ArcherLoaderWidget({super.key, this.tagline = 'Executive Services'});

  @override
  Widget build(BuildContext context) {
    return AnimatedSplashScreen(
      title: 'ARCHER',
      subtitle: tagline.toUpperCase(),
      loops: true,
    );
  }
}
