import 'package:flutter/material.dart';
import '../theme/archer_theme.dart';

class OnboardingSlide {
  final IconData icon;
  final String title;
  final String subtitle;
  final String description;
  final List<String> highlights;

  const OnboardingSlide({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.description,
    required this.highlights,
  });
}

class OnboardingTutorialScreen extends StatefulWidget {
  final String appName;
  final List<OnboardingSlide> slides;
  final VoidCallback onFinish;

  const OnboardingTutorialScreen({
    super.key,
    required this.appName,
    required this.slides,
    required this.onFinish,
  });

  @override
  State<OnboardingTutorialScreen> createState() => _OnboardingTutorialScreenState();
}

class _OnboardingTutorialScreenState extends State<OnboardingTutorialScreen> {
  final PageController _pageController = PageController();
  int _currentPage = 0;

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  void _nextPage() {
    if (_currentPage < widget.slides.length - 1) {
      _pageController.nextPage(
        duration: const Duration(milliseconds: 350),
        curve: Curves.easeInOut,
      );
    } else {
      widget.onFinish();
    }
  }

  @override
  Widget build(BuildContext context) {
    final isLastPage = _currentPage == widget.slides.length - 1;

    return Scaffold(
      backgroundColor: ArcherColors.background,
      body: SafeArea(
        child: Column(
          children: [
            // Top Bar: Brand tag & Skip button
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: ArcherColors.gold.withOpacity(0.15),
                          borderRadius: BorderRadius.circular(6),
                          border: Border.all(color: ArcherColors.gold.withOpacity(0.4)),
                        ),
                        child: Text(
                          widget.appName.toUpperCase(),
                          style: const TextStyle(
                            fontSize: 10,
                            letterSpacing: 1.5,
                            fontWeight: FontWeight.bold,
                            color: ArcherColors.gold,
                          ),
                        ),
                      ),
                    ],
                  ),
                  TextButton(
                    onPressed: widget.onFinish,
                    child: const Text(
                      'SKIP',
                      style: TextStyle(
                        fontSize: 12,
                        letterSpacing: 1.5,
                        fontWeight: FontWeight.w600,
                        color: ArcherColors.textSecondary,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            // Slides Carousel
            Expanded(
              child: PageView.builder(
                controller: _pageController,
                itemCount: widget.slides.length,
                onPageChanged: (idx) => setState(() => _currentPage = idx),
                itemBuilder: (context, index) {
                  final slide = widget.slides[index];
                  return Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 28),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        // Icon Halo
                        Container(
                          width: 110,
                          height: 110,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: ArcherColors.surfaceElevated,
                            border: Border.all(
                              color: ArcherColors.gold.withOpacity(0.4),
                              width: 1.5,
                            ),
                            boxShadow: [
                              BoxShadow(
                                color: ArcherColors.gold.withOpacity(0.15),
                                blurRadius: 28,
                                spreadRadius: 4,
                              ),
                            ],
                          ),
                          child: Icon(
                            slide.icon,
                            size: 48,
                            color: ArcherColors.gold,
                          ),
                        ),
                        const SizedBox(height: 36),
                        Text(
                          slide.subtitle.toUpperCase(),
                          style: const TextStyle(
                            fontSize: 11,
                            letterSpacing: 2.2,
                            fontWeight: FontWeight.bold,
                            color: ArcherColors.goldLight,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          slide.title,
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            fontSize: 26,
                            fontWeight: FontWeight.w700,
                            color: ArcherColors.textPrimary,
                          ),
                        ),
                        const SizedBox(height: 14),
                        Text(
                          slide.description,
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            fontSize: 14,
                            height: 1.5,
                            color: ArcherColors.textSecondary,
                          ),
                        ),
                        const SizedBox(height: 24),
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          alignment: WrapAlignment.center,
                          children: slide.highlights.map((h) {
                            return Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 12,
                                vertical: 6,
                              ),
                              decoration: BoxDecoration(
                                color: ArcherColors.surfaceCard,
                                borderRadius: BorderRadius.circular(20),
                                border: Border.all(color: ArcherColors.borderSubtle),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  const Icon(
                                    Icons.check_circle_rounded,
                                    size: 14,
                                    color: ArcherColors.gold,
                                  ),
                                  const SizedBox(width: 6),
                                  Text(
                                    h,
                                    style: const TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w500,
                                      color: ArcherColors.textPrimary,
                                    ),
                                  ),
                                ],
                              ),
                            );
                          }).toList(),
                        ),
                      ],
                    ),
                  );
                },
              ),
            ),
            // Bottom Controls: Page indicators & Action button
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 24),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: List.generate(
                      widget.slides.length,
                      (idx) => AnimatedContainer(
                        duration: const Duration(milliseconds: 300),
                        margin: const EdgeInsets.symmetric(horizontal: 4),
                        width: _currentPage == idx ? 28 : 8,
                        height: 8,
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(4),
                          color: _currentPage == idx
                              ? ArcherColors.gold
                              : ArcherColors.surfaceElevated,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),
                  ElevatedButton(
                    onPressed: _nextPage,
                    child: Text(isLastPage ? 'GET STARTED' : 'CONTINUE'),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
