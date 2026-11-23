import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:archer_core/archer_core.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const ArcherDriverApp());
}

class ArcherDriverApp extends StatelessWidget {
  const ArcherDriverApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Archer Chauffeur',
      debugShowCheckedModeBanner: false,
      theme: ArcherTheme.darkTheme,
      home: const DriverRootNavigator(),
    );
  }
}

class DriverRootNavigator extends StatefulWidget {
  const DriverRootNavigator({super.key});

  @override
  State<DriverRootNavigator> createState() => _DriverRootNavigatorState();
}

enum _DriverFlowState { splash, onboarding, mainApp }

class _DriverRootNavigatorState extends State<DriverRootNavigator> {
  _DriverFlowState _flow = _DriverFlowState.splash;

  final List<OnboardingSlide> _slides = const [
    OnboardingSlide(
      icon: Icons.local_taxi_rounded,
      title: 'Smart Dispatch & Live Offers',
      subtitle: 'Guaranteed Bookings',
      description:
          'Receive instant dispatch invitations with transparent upfront earnings, full passenger itineraries, and live airport flight sync.',
      highlights: [
        'Instant Dispatch Offers',
        'Transparent Compensation',
        'Flight Delay Monitoring',
      ],
    ),
    OnboardingSlide(
      icon: Icons.alt_route_rounded,
      title: 'Seamless Ride Stepper',
      subtitle: 'One-Touch Workflow',
      description:
          'Effortlessly update trip milestones: En Route to Pickup, Doorstep Arrival ping, and Passenger Onboard tracking.',
      highlights: [
        'Doorstep Arrival Ping',
        'Turn-by-Turn Navigation',
        'Automatic Telemetry',
      ],
    ),
    OnboardingSlide(
      icon: Icons.account_balance_wallet_rounded,
      title: 'Earnings & Compliance',
      subtitle: 'Chauffeur Partner Suite',
      description:
          'Monitor weekly gross compensation, manage compliance and vehicle inspection credentials, and view scheduled security shifts.',
      highlights: [
        'Real-Time Earnings Dashboard',
        'Shift Roster Management',
        'Credential Expiry Warnings',
      ],
    ),
  ];

  Future<void> _handleSplashComplete() async {
    final seen = await TokenStore.read('driver_onboarding_done');
    if (!mounted) return;
    if (seen == 'true') {
      setState(() => _flow = _DriverFlowState.mainApp);
    } else {
      setState(() => _flow = _DriverFlowState.onboarding);
    }
  }

  Future<void> _handleOnboardingFinish() async {
    await TokenStore.write('driver_onboarding_done', 'true');
    if (mounted) {
      setState(() => _flow = _DriverFlowState.mainApp);
    }
  }

  void _replayTutorial() {
    setState(() => _flow = _DriverFlowState.onboarding);
  }

  @override
  Widget build(BuildContext context) {
    switch (_flow) {
      case _DriverFlowState.splash:
        return AnimatedSplashScreen(
          title: 'ARCHER',
          subtitle: 'CHAUFFEUR PARTNER DISPATCH',
          onComplete: _handleSplashComplete,
        );
      case _DriverFlowState.onboarding:
        return OnboardingTutorialScreen(
          appName: 'Archer Chauffeur',
          slides: _slides,
          onFinish: _handleOnboardingFinish,
        );
      case _DriverFlowState.mainApp:
        return DriverAuthGate(onReplayTutorial: _replayTutorial);
    }
  }
}

class DriverAuthGate extends StatefulWidget {
  final VoidCallback onReplayTutorial;

  const DriverAuthGate({
    super.key,
    required this.onReplayTutorial,
  });

  @override
  State<DriverAuthGate> createState() => _DriverAuthGateState();
}

class _DriverAuthGateState extends State<DriverAuthGate> {
  bool _isLoading = true;
  bool _isAuthenticated = false;
  late final ArcherApiClient _api;

  @override
  void initState() {
    super.initState();
    _api = ArcherApiClient(tokenStore: TokenStore.driver);
    _checkAuth();
  }

  Future<void> _checkAuth() async {
    final token = await TokenStore.driver.get();
    if (token == null || token.isEmpty) {
      if (mounted) {
        setState(() {
          _isAuthenticated = false;
          _isLoading = false;
        });
      }
      return;
    }

    try {
      await _api.get('/driver/profile');
      if (mounted) {
        setState(() {
          _isAuthenticated = true;
          _isLoading = false;
        });
      }
    } catch (_) {
      await TokenStore.driver.clear();
      if (mounted) {
        setState(() {
          _isAuthenticated = false;
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const ArcherLoaderWidget(tagline: 'Authenticating Chauffeur');
    }

    if (_isAuthenticated) {
      return DriverMainShell(
        api: _api,
        onReplayTutorial: widget.onReplayTutorial,
        onLogout: () async {
          await TokenStore.driver.clear();
          setState(() => _isAuthenticated = false);
        },
      );
    }

    return DriverLoginScreen(
      api: _api,
      onReplayTutorial: widget.onReplayTutorial,
      onLoginSuccess: () => setState(() => _isAuthenticated = true),
    );
  }
}

class DriverLoginScreen extends StatefulWidget {
  final ArcherApiClient api;
  final VoidCallback onLoginSuccess;
  final VoidCallback onReplayTutorial;

  const DriverLoginScreen({
    super.key,
    required this.api,
    required this.onLoginSuccess,
    required this.onReplayTutorial,
  });

  @override
  State<DriverLoginScreen> createState() => _DriverLoginScreenState();
}

class _DriverLoginScreenState extends State<DriverLoginScreen> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _submitting = false;
  String? _errorMessage;

  Future<void> _handleLogin() async {
    final email = _emailController.text.trim();
    final password = _passwordController.text;

    if (email.isEmpty || password.isEmpty) {
      setState(() => _errorMessage = 'Please enter chauffeur credentials.');
      return;
    }

    setState(() {
      _submitting = true;
      _errorMessage = null;
    });

    try {
      final res = await widget.api.post<Map<String, dynamic>>(
        '/auth/login',
        data: {'email': email, 'password': password},
      );

      final token = res['token']?.toString();
      if (token == null) {
        throw ApiError(status: 401, code: 'AUTH_FAILED', message: 'No session token received.');
      }

      await TokenStore.driver.set(token);
      widget.onLoginSuccess();
    } on ApiError catch (e) {
      setState(() => _errorMessage = e.message);
    } catch (_) {
      setState(() => _errorMessage = 'Chauffeur login failed. Please verify credentials.');
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: ArcherColors.background,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        actions: [
          TextButton.icon(
            icon: const Icon(Icons.info_outline, size: 16, color: ArcherColors.gold),
            label: const Text('Tutorial', style: TextStyle(color: ArcherColors.gold, fontSize: 13)),
            onPressed: widget.onReplayTutorial,
          ),
        ],
      ),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 28),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const ArcherLogoWidget(
                  size: 90,
                  subtitle: 'CHAUFFEUR PARTNER DISPATCH',
                ),
                const SizedBox(height: 36),
                if (_errorMessage != null) ...[
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: ArcherColors.danger.withOpacity(0.15),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: ArcherColors.danger.withOpacity(0.5)),
                    ),
                    child: Text(_errorMessage!, style: const TextStyle(color: Colors.white, fontSize: 13)),
                  ),
                  const SizedBox(height: 16),
                ],
                TextField(
                  controller: _emailController,
                  keyboardType: TextInputType.emailAddress,
                  style: const TextStyle(color: ArcherColors.textPrimary),
                  decoration: const InputDecoration(
                    labelText: 'Chauffeur Work Email',
                    prefixIcon: Icon(Icons.badge_outlined, color: ArcherColors.gold),
                  ),
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: _passwordController,
                  obscureText: true,
                  style: const TextStyle(color: ArcherColors.textPrimary),
                  decoration: const InputDecoration(
                    labelText: 'Password',
                    prefixIcon: Icon(Icons.lock_outline, color: ArcherColors.gold),
                  ),
                ),
                const SizedBox(height: 28),
                ElevatedButton(
                  onPressed: _submitting ? null : _handleLogin,
                  child: _submitting
                      ? const SizedBox(
                          height: 22,
                          width: 22,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.black),
                        )
                      : const Text('SIGN IN TO DISPATCH'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class DriverMainShell extends StatefulWidget {
  final ArcherApiClient api;
  final VoidCallback onLogout;
  final VoidCallback onReplayTutorial;

  const DriverMainShell({
    super.key,
    required this.api,
    required this.onLogout,
    required this.onReplayTutorial,
  });

  @override
  State<DriverMainShell> createState() => _DriverMainShellState();
}

class _DriverMainShellState extends State<DriverMainShell> {
  int _tabIndex = 0;
  bool _isLoading = true;

  // Driver data
  Map<String, dynamic>? _portal;
  List<dynamic> _offers = [];
  List<dynamic> _rides = [];
  List<dynamic> _notifications = [];
  List<dynamic> _shifts = [];
  Map<String, dynamic>? _payWeek;
  List<dynamic> _earningsHistory = [];

  bool _isOnline = false;
  bool _togglingPresence = false;

  @override
  void initState() {
    super.initState();
    _loadAllDriverData();
  }

  Future<void> _loadAllDriverData() async {
    setState(() => _isLoading = true);
    try {
      final profileRes = await widget.api.get<Map<String, dynamic>>('/driver/profile');
      final portal = (profileRes['portal'] as Map<String, dynamic>?) ?? profileRes;

      // Offers, Rides, Notifications in parallel
      final results = await Future.wait([
        widget.api.get<dynamic>('/driver/offers').catchError((_) => {'offers': []}),
        widget.api.get<dynamic>('/driver/rides').catchError((_) => {'rides': []}),
        widget.api.get<dynamic>('/driver/notifications').catchError((_) => {'notifications': []}),
        widget.api.get<dynamic>('/driver/security-shifts').catchError((_) => {'shifts': []}),
        widget.api.get<dynamic>('/driver/earnings').catchError((_) => {'pay_week': null, 'history': []}),
      ]);

      final offersData = results[0];
      final ridesData = results[1];
      final notifsData = results[2];
      final shiftsData = results[3];
      final earningsData = results[4];

      final offersList = (offersData is Map && offersData['offers'] is List) ? offersData['offers'] as List : [];
      final ridesList = (ridesData is Map && ridesData['rides'] is List) ? ridesData['rides'] as List : [];
      final notifsList = (notifsData is Map && notifsData['notifications'] is List)
          ? notifsData['notifications'] as List
          : [];
      final shiftsList = (shiftsData is Map && shiftsData['shifts'] is List) ? shiftsData['shifts'] as List : [];
      final payWeek = earningsData is Map ? earningsData['pay_week'] as Map<String, dynamic>? : null;
      final history = (earningsData is Map && earningsData['history'] is List) ? earningsData['history'] as List : [];

      if (mounted) {
        setState(() {
          _portal = portal;
          _isOnline = portal['is_online'] == true;
          _offers = offersList;
          _rides = ridesList;
          _notifications = notifsList;
          _shifts = shiftsList;
          _payWeek = payWeek;
          _earningsHistory = history;
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _toggleOnlinePresence() async {
    setState(() => _togglingPresence = true);
    final next = !_isOnline;
    try {
      final res = await widget.api.put<Map<String, dynamic>>(
        '/driver/presence',
        data: {'is_online': next, 'push_alerts_enabled': next},
      );
      final updatedPortal = res['portal'] as Map<String, dynamic>?;
      if (mounted) {
        setState(() {
          _isOnline = updatedPortal?['is_online'] == true || next;
        });
        ArcherToast.show(
          context,
          message: _isOnline ? 'Online: Receiving real-time dispatch assignment offers' : 'Standby / Offline: Not receiving dispatch offers',
          icon: _isOnline ? Icons.radar_rounded : Icons.pause_circle_outline_rounded,
        );
      }
    } catch (e) {
      if (mounted) {
        ArcherToast.show(
          context,
          message: 'Failed to update presence: $e',
          isError: true,
        );
      }
    } finally {
      if (mounted) setState(() => _togglingPresence = false);
    }
  }

  Future<void> _acceptOffer(String offerId) async {
    try {
      await widget.api.post('/driver/offers/$offerId/accept');
      if (mounted) {
        ArcherToast.show(
          context,
          message: 'Dispatch offer accepted! Ride scheduled in your active missions.',
          icon: Icons.check_circle_rounded,
        );
      }
      await _loadAllDriverData();
      if (mounted) setState(() => _tabIndex = 1); // switch to Rides
    } catch (e) {
      if (mounted) {
        ArcherToast.show(
          context,
          message: 'Failed to accept offer: $e',
          isError: true,
        );
      }
    }
  }

  Future<void> _updateRideStatus(String rideId, String nextStatus, {String? notes}) async {
    try {
      await widget.api.put(
        '/driver/rides/$rideId/status',
        data: {'status': nextStatus, if (notes != null) 'notes': notes},
      );
      if (mounted) {
        ArcherToast.show(
          context,
          message: 'Mission status updated to: ${nextStatus.replaceAll("_", " ").toUpperCase()}',
          icon: Icons.alt_route_rounded,
        );
      }
      await _loadAllDriverData();
    } catch (e) {
      if (mounted) {
        ArcherToast.show(
          context,
          message: 'Failed to update status: $e',
          isError: true,
        );
      }
    }
  }

  String _getDriverInitials(String name) {
    final parts = name.trim().split(RegExp(r'\s+'));
    if (parts.length >= 2) {
      return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
    }
    return parts[0].substring(0, parts[0].length >= 2 ? 2 : 1).toUpperCase();
  }

  Future<void> _handleLogoutConfirmation() async {
    final confirmed = await ArcherConfirmationDialog.show(
      context: context,
      title: 'Sign Out of Dispatch',
      message: 'Are you sure you want to end your active dispatch session? You will be placed on Standby and will not receive assignment alerts until you sign back in.',
      confirmLabel: 'SIGN OUT',
      cancelLabel: 'STAY ON DUTY',
      icon: Icons.logout_rounded,
      iconColor: const Color(0xFFEF4444),
      confirmColor: const Color(0xFFEF4444),
      isDestructive: true,
    );
    if (confirmed) {
      widget.onLogout();
    }
  }

  PreferredSizeWidget _buildDriverTopNav(String driverName, int offersCount, int activeRidesCount, int unreadCount) {
    String title;
    String subtitle;

    switch (_tabIndex) {
      case 0:
        title = 'DISPATCH OFFERS';
        subtitle = offersCount > 0 ? '$offersCount Active Assignment Requests' : 'Waiting for Missions';
        break;
      case 1:
        title = 'ACTIVE SCHEDULE';
        subtitle = '$activeRidesCount Missions Assigned • $driverName';
        break;
      case 2:
        title = 'EARNINGS & PAYOUTS';
        subtitle = 'Weekly Pay Cycle & Statements';
        break;
      case 3:
        title = 'DUTY ROSTER';
        subtitle = 'Shift Schedule & Availability';
        break;
      case 4:
        title = 'DISPATCH COMMS';
        subtitle = unreadCount > 0 ? '$unreadCount Unread Operational Messages' : 'All Messages Read';
        break;
      case 5:
        title = 'CHAUFFEUR PROFILE';
        subtitle = 'Credentials, Badges & Dossier';
        break;
      default:
        title = 'ARCHER CHAUFFEUR';
        subtitle = driverName;
    }

    return ArcherTopAppBar(
      title: title,
      subtitle: subtitle,
      profileInitials: _getDriverInitials(driverName),
      onProfileTap: () {
        HapticFeedback.selectionClick();
        setState(() => _tabIndex = 5);
      },
      actions: [
        // Interactive Duty Status Pill
        InkWell(
          onTap: _togglingPresence
              ? null
              : () {
                  HapticFeedback.mediumImpact();
                  _toggleOnlinePresence();
                },
          borderRadius: BorderRadius.circular(20),
          child: Container(
            margin: const EdgeInsets.symmetric(vertical: 4),
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(
              color: _isOnline ? const Color(0x1F10B981) : const Color(0x1FF59E0B),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                color: _isOnline ? const Color(0xFF10B981) : const Color(0xFFF59E0B),
                width: 1,
              ),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 7,
                  height: 7,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: _isOnline ? const Color(0xFF10B981) : const Color(0xFFF59E0B),
                    boxShadow: [
                      BoxShadow(
                        color: (_isOnline ? const Color(0xFF10B981) : const Color(0xFFF59E0B)).withOpacity(0.55),
                        blurRadius: 4,
                        spreadRadius: 1,
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 6),
                Text(
                  _isOnline ? 'ON DUTY' : 'STANDBY',
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 1.2,
                    color: _isOnline ? const Color(0xFF10B981) : const Color(0xFFF59E0B),
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(width: 4),
        IconButton(
          icon: const Icon(Icons.help_outline_rounded, size: 18, color: ArcherColors.textSecondary),
          constraints: const BoxConstraints(minWidth: 34, minHeight: 34),
          padding: EdgeInsets.zero,
          tooltip: 'Chauffeur Guide',
          onPressed: () {
            HapticFeedback.lightImpact();
            widget.onReplayTutorial();
          },
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const ArcherLoaderWidget(tagline: 'Loading Driver Portal');
    }

    final driverName = _portal?['name']?.toString() ?? 'Marcus Vance';
    final activeRidesCount = _rides.where((r) => r['status'] != 'completed' && r['status'] != 'cancelled').length;
    final offersCount = _offers.length;
    final unreadCount = _notifications.where((n) => n['is_read'] != true).length;

    return Scaffold(
      backgroundColor: ArcherColors.background,
      extendBody: true,
      appBar: _buildDriverTopNav(driverName, offersCount, activeRidesCount, unreadCount),
      body: GestureDetector(
        onTap: () => FocusScope.of(context).unfocus(),
        behavior: HitTestBehavior.opaque,
        child: IndexedStack(
          index: _tabIndex,
          children: [
            _buildRequestsTab(),
            _buildRidesTab(),
            _buildEarningsTab(),
            _buildShiftsTab(),
            _buildChatTab(),
            _buildProfileTab(),
          ],
        ),
      ),
      bottomNavigationBar: _buildModernDriverNavbar(offersCount, activeRidesCount, unreadCount),
    );
  }

  Widget _buildModernDriverNavbar(int offersCount, int activeRidesCount, int unreadCount) {
    final navItems = [
      _DriverNavItem(
        icon: Icons.format_list_bulleted_rounded,
        label: 'Offers',
        badgeCount: offersCount,
      ),
      _DriverNavItem(
        icon: Icons.directions_car_filled_rounded,
        label: 'Rides',
        badgeCount: activeRidesCount,
      ),
      const _DriverNavItem(
        icon: Icons.account_balance_wallet_rounded,
        label: 'Earnings',
      ),
      const _DriverNavItem(
        icon: Icons.calendar_today_rounded,
        label: 'Shifts',
      ),
      _DriverNavItem(
        icon: Icons.chat_bubble_rounded,
        label: 'Chat',
        badgeCount: unreadCount,
      ),
      const _DriverNavItem(
        icon: Icons.person_rounded,
        label: 'Profile',
      ),
    ];

    return SafeArea(
      child: Container(
        margin: const EdgeInsets.fromLTRB(14, 0, 14, 14),
        alignment: Alignment.bottomCenter,
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 480),
          child: Container(
            height: 62,
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 5),
            decoration: BoxDecoration(
              color: const Color(0xF20F121A),
              borderRadius: BorderRadius.circular(30),
              border: Border.all(
                color: const Color(0x38C8A96A),
                width: 1.2,
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.65),
                  blurRadius: 28,
                  offset: const Offset(0, 10),
                ),
                BoxShadow(
                  color: const Color(0xFFC8A96A).withOpacity(0.10),
                  blurRadius: 18,
                ),
              ],
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: List.generate(navItems.length, (index) {
                final item = navItems[index];
                final isSelected = _tabIndex == index;

                return Expanded(
                  child: GestureDetector(
                    onTap: () {
                      if (_tabIndex != index) {
                        HapticFeedback.selectionClick();
                        setState(() => _tabIndex = index);
                      }
                    },
                    behavior: HitTestBehavior.opaque,
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 200),
                      padding: const EdgeInsets.symmetric(vertical: 5),
                      decoration: BoxDecoration(
                        color: isSelected ? const Color(0x24C8A96A) : Colors.transparent,
                        borderRadius: BorderRadius.circular(22),
                        border: isSelected
                            ? Border.all(color: const Color(0x48C8A96A), width: 1.0)
                            : Border.all(color: Colors.transparent),
                      ),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Stack(
                            clipBehavior: Clip.none,
                            children: [
                              Icon(
                                item.icon,
                                size: isSelected ? 19 : 18,
                                color: isSelected ? const Color(0xFFDFBE82) : const Color(0xFF7E8698),
                              ),
                              if (item.badgeCount != null && item.badgeCount! > 0)
                                Positioned(
                                  right: -7,
                                  top: -2,
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFFC8A96A),
                                      borderRadius: BorderRadius.circular(6),
                                    ),
                                    constraints: const BoxConstraints(minWidth: 11, minHeight: 11),
                                    child: Text(
                                      '${item.badgeCount}',
                                      style: const TextStyle(
                                        color: Colors.black,
                                        fontSize: 7.5,
                                        fontWeight: FontWeight.w900,
                                      ),
                                      textAlign: TextAlign.center,
                                    ),
                                  ),
                                ),
                            ],
                          ),
                          const SizedBox(height: 2),
                          Text(
                            item.label,
                            maxLines: 1,
                            style: TextStyle(
                              fontSize: 9,
                              fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                              letterSpacing: 0.4,
                              color: isSelected ? const Color(0xFFDFBE82) : const Color(0xFF7E8698),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              }),
            ),
          ),
        ),
      ),
    );
  }

  // 1. REQUESTS TAB (Offers matching Driver PWA)
  Widget _buildRequestsTab() {
    final driverName = _portal?['name']?.toString() ?? 'Chauffeur';
    final tierLabel = _portal?['tier_label']?.toString() ?? 'Tier-1 Security Chauffeur';

    return RefreshIndicator(
      onRefresh: _loadAllDriverData,
      color: ArcherColors.gold,
      child: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          // Identity & Tier Card
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: ArcherColors.surfaceCard,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: ArcherColors.surfaceElevated),
            ),
            child: Row(
              children: [
                CircleAvatar(
                  radius: 24,
                  backgroundColor: ArcherColors.gold.withOpacity(0.2),
                  child: Text(
                    driverName.isNotEmpty ? driverName[0].toUpperCase() : 'A',
                    style: const TextStyle(color: ArcherColors.gold, fontSize: 20, fontWeight: FontWeight.bold),
                  ),
                ),
                const SizedBox(width: 14),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      driverName,
                      style: const TextStyle(fontSize: 17, fontWeight: FontWeight.bold, color: ArcherColors.textPrimary),
                    ),
                    const SizedBox(height: 4),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: ArcherColors.gold.withOpacity(0.15),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        tierLabel,
                        style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: ArcherColors.goldLight),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Presence state banner
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: _isOnline ? ArcherColors.goldDark.withOpacity(0.12) : ArcherColors.surfaceCard,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: _isOnline ? ArcherColors.gold.withOpacity(0.4) : ArcherColors.surfaceElevated),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _isOnline ? 'Online — Ready for Dispatch' : 'Offline — Standby',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                        color: _isOnline ? ArcherColors.gold : ArcherColors.textSecondary,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      _isOnline ? 'You are receiving live alerts for offers in your tier.' : 'Go online to receive live trip requests.',
                      style: const TextStyle(fontSize: 11, color: ArcherColors.textMuted),
                    ),
                  ],
                ),
                Switch(
                  activeColor: ArcherColors.gold,
                  value: _isOnline,
                  onChanged: _togglingPresence ? null : (_) => _toggleOnlinePresence(),
                ),
              ],
            ),
          ),
          const SizedBox(height: 22),

          // Incoming offers list
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'INCOMING DISPATCH OFFERS',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 1.5,
                  color: ArcherColors.gold,
                ),
              ),
              Text(
                '${_offers.length} AVAILABLE',
                style: const TextStyle(fontSize: 11, color: ArcherColors.textMuted),
              ),
            ],
          ),
          const SizedBox(height: 12),

          if (_offers.isEmpty) ...[
            Container(
              padding: const EdgeInsets.all(32),
              alignment: Alignment.center,
              child: Column(
                children: [
                  Icon(Icons.radar_rounded, size: 44, color: ArcherColors.textMuted.withOpacity(0.5)),
                  const SizedBox(height: 12),
                  const Text('No pending dispatch offers right now.', style: TextStyle(color: ArcherColors.textMuted, fontSize: 13)),
                  const SizedBox(height: 4),
                  const Text('Ensure you remain Online to receive immediate priority alerts.', style: TextStyle(color: ArcherColors.textMuted, fontSize: 11)),
                ],
              ),
            ),
          ] else ...[
            ..._offers.map((offer) {
              final offerId = offer['id']?.toString() ?? '';
              final payout = (offer['driver_payout'] as num?)?.toDouble() ?? 95.0;
              final pickup = offer['pickup_address']?.toString() ?? 'Heathrow Terminal 5';
              final dropoff = offer['dropoff_address']?.toString() ?? 'Central London';
              final vehicle = offer['vehicle_class']?.toString() ?? 'Executive SUV';
              final time = offer['pickup_at']?.toString() ?? 'Immediate';

              return Container(
                margin: const EdgeInsets.only(bottom: 14),
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: ArcherColors.surfaceCard,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: ArcherColors.gold.withOpacity(0.4)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          '£${payout.toStringAsFixed(2)}',
                          style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: ArcherColors.gold),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: ArcherColors.surfaceElevated,
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(time, style: const TextStyle(fontSize: 11, color: ArcherColors.textSecondary)),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Text('Route: $pickup → $dropoff', style: const TextStyle(fontSize: 13, color: ArcherColors.textPrimary)),
                    const SizedBox(height: 4),
                    Text('Vehicle: $vehicle', style: const TextStyle(fontSize: 11, color: ArcherColors.textMuted)),
                    const SizedBox(height: 14),
                    ElevatedButton.icon(
                      icon: const Icon(Icons.check_circle_outline_rounded, size: 16),
                      label: const Text('ACCEPT DISPATCH OFFER'),
                      onPressed: () => _acceptOffer(offerId),
                    ),
                  ],
                ),
              );
            }),
          ],
        ],
      ),
    );
  }

  // 2. RIDES TAB (Assigned rides & Stepper matching Driver PWA)
  Widget _buildRidesTab() {
    if (_rides.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.directions_car_outlined, size: 48, color: ArcherColors.textMuted.withOpacity(0.5)),
            const SizedBox(height: 12),
            const Text('No rides assigned to you currently.', style: TextStyle(color: ArcherColors.textMuted, fontSize: 13)),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadAllDriverData,
      color: ArcherColors.gold,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _rides.length,
        itemBuilder: (context, idx) {
          final ride = _rides[idx];
          final id = ride['id']?.toString() ?? '';
          final status = ride['status']?.toString() ?? 'scheduled';
          final ref = ride['reference']?.toString() ?? id;
          final passenger = '${ride['first_name'] ?? "Principal"} ${ride['last_name'] ?? ""}';
          final phone = ride['phone']?.toString();
          final pickup = ride['pickup_location']?.toString() ?? 'As directed';
          final dropoff = ride['dropoff_location']?.toString() ?? 'As directed';

          return Container(
            margin: const EdgeInsets.only(bottom: 14),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: ArcherColors.surfaceCard,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(
                color: status != 'completed' ? ArcherColors.gold.withOpacity(0.4) : ArcherColors.surfaceElevated,
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      passenger,
                      style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: ArcherColors.textPrimary),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: ArcherColors.gold.withOpacity(0.15),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        status.replaceAll('_', ' ').toUpperCase(),
                        style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: ArcherColors.goldLight),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Text('Trip #$ref', style: const TextStyle(fontSize: 12, color: ArcherColors.textMuted)),
                const SizedBox(height: 12),
                Text('Pickup: $pickup', style: const TextStyle(fontSize: 13, color: ArcherColors.textPrimary)),
                const SizedBox(height: 4),
                Text('Dropoff: $dropoff', style: const TextStyle(fontSize: 13, color: ArcherColors.textSecondary)),
                const SizedBox(height: 14),

                // Stepper actions
                if (status == 'scheduled' || status == 'assigned') ...[
                  ElevatedButton(
                    onPressed: () => _updateRideStatus(id, 'on_my_way'),
                    child: const Text('EN ROUTE TO PICKUP (ON MY WAY)'),
                  ),
                ] else if (status == 'on_my_way') ...[
                  ElevatedButton(
                    onPressed: () => _updateRideStatus(id, 'at_doorstep'),
                    child: const Text('ARRIVED AT DOORSTEP'),
                  ),
                ] else if (status == 'at_doorstep') ...[
                  ElevatedButton(
                    onPressed: () => _updateRideStatus(id, 'in_progress'),
                    child: const Text('PASSENGER ONBOARD (START TRIP)'),
                  ),
                ] else if (status == 'in_progress') ...[
                  ElevatedButton(
                    style: ElevatedButton.styleFrom(backgroundColor: ArcherColors.success),
                    onPressed: () async {
                      final confirmed = await ArcherConfirmationDialog.show(
                        context: context,
                        title: 'Complete Mission',
                        message: 'Confirm passenger drop-off and arrival at destination for Mission #$ref?',
                        confirmLabel: 'COMPLETE MISSION',
                        cancelLabel: 'RESUME TRIP',
                        icon: Icons.check_circle_rounded,
                        iconColor: const Color(0xFF10B981),
                        confirmColor: const Color(0xFF10B981),
                        isDestructive: false,
                      );
                      if (confirmed) {
                        _updateRideStatus(id, 'completed');
                      }
                    },
                    child: const Text('COMPLETE TRIP'),
                  ),
                ],

                if (phone != null && phone.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  OutlinedButton.icon(
                    icon: const Icon(Icons.phone_rounded, size: 16),
                    label: Text('CALL PASSENGER ($phone)'),
                    onPressed: () {
                      ArcherToast.show(
                        context,
                        message: 'Dialing passenger: $phone',
                        icon: Icons.phone_forwarded_rounded,
                      );
                    },
                  ),
                ],
              ],
            ),
          );
        },
      ),
    );
  }

  // 3. EARNINGS TAB (Weekly ledger & history matching Driver PWA)
  Widget _buildEarningsTab() {
    final payWeek = _payWeek;
    final gross = (payWeek?['earned_pay_tips'] as num?)?.toDouble() ?? 0.0;
    final cashKept = (payWeek?['cash_kept'] as num?)?.toDouble() ?? 0.0;
    final net = (payWeek?['net_balance'] as num?)?.toDouble() ?? gross;
    final lifetime = (payWeek?['lifetime_earnings'] as num?)?.toDouble() ?? 0.0;
    final banner = payWeek?['status_banner']?.toString();

    return RefreshIndicator(
      onRefresh: _loadAllDriverData,
      color: ArcherColors.gold,
      child: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          const Text(
            'PAYROLL & COMPENSATION',
            style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 1.5, color: ArcherColors.gold),
          ),
          const SizedBox(height: 14),

          // Summary Card
          if (payWeek != null) ...[
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: ArcherColors.surfaceCard,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: ArcherColors.gold.withOpacity(0.35)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('THIS WEEK EARNINGS', style: TextStyle(fontSize: 11, letterSpacing: 1.2, color: ArcherColors.gold)),
                  const SizedBox(height: 8),
                  Text(
                    '£${gross.toStringAsFixed(2)}',
                    style: const TextStyle(fontSize: 34, fontWeight: FontWeight.w800, color: ArcherColors.textPrimary),
                  ),
                  if (banner != null && banner.isNotEmpty) ...[
                    const SizedBox(height: 6),
                    Text(banner, style: const TextStyle(fontSize: 12, color: ArcherColors.textSecondary)),
                  ],
                  const SizedBox(height: 14),
                  const Divider(color: ArcherColors.surfaceElevated, height: 1),
                  const SizedBox(height: 12),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Net Balance', style: TextStyle(fontSize: 12, color: ArcherColors.textSecondary)),
                      Text('£${net.toStringAsFixed(2)}', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: ArcherColors.goldLight)),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Cash Kept', style: TextStyle(fontSize: 12, color: ArcherColors.textSecondary)),
                      Text('£${cashKept.toStringAsFixed(2)}', style: const TextStyle(fontSize: 12, color: ArcherColors.textMuted)),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Lifetime Compensation', style: TextStyle(fontSize: 12, color: ArcherColors.textSecondary)),
                      Text('£${lifetime.toStringAsFixed(2)}', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: ArcherColors.textPrimary)),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 22),
          ],

          const Text(
            'COMPLETED TRIP LEDGER',
            style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 1.5, color: ArcherColors.gold),
          ),
          const SizedBox(height: 12),

          if (_earningsHistory.isEmpty) ...[
            const Center(
              child: Padding(
                padding: EdgeInsets.all(24),
                child: Text('No completed rides on your ledger yet.', style: TextStyle(color: ArcherColors.textMuted)),
              ),
            ),
          ] else ...[
            ..._earningsHistory.map((row) {
              final earned = (row['earned'] as num?)?.toDouble() ?? 0.0;
              final client = row['client']?.toString() ?? 'Client';
              final date = row['date']?.toString() ?? '';
              final ref = row['reference']?.toString() ?? '';
              final job = row['job']?.toString() ?? '';
              final paidBy = row['paid_by']?.toString() ?? '';

              return Container(
                margin: const EdgeInsets.only(bottom: 10),
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: ArcherColors.surfaceCard,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: ArcherColors.surfaceElevated),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(client, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: ArcherColors.textPrimary)),
                        const SizedBox(height: 4),
                        Text('$date • $ref • $job • $paidBy', style: const TextStyle(fontSize: 11, color: ArcherColors.textMuted)),
                      ],
                    ),
                    Text(
                      '£${earned.toStringAsFixed(2)}',
                      style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: ArcherColors.gold),
                    ),
                  ],
                ),
              );
            }),
          ],
        ],
      ),
    );
  }

  // 4. SHIFTS TAB (Security Shifts Roster matching Driver PWA)
  Widget _buildShiftsTab() {
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        const Text(
          'SECURITY SHIFT ROSTER',
          style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 1.5, color: ArcherColors.gold),
        ),
        const SizedBox(height: 6),
        const Text(
          'Dedicated close protection and venue security assignments assigned by operations.',
          style: TextStyle(fontSize: 12, color: ArcherColors.textSecondary),
        ),
        const SizedBox(height: 16),

        if (_shifts.isEmpty) ...[
          Container(
            padding: const EdgeInsets.all(32),
            alignment: Alignment.center,
            child: Column(
              children: [
                Icon(Icons.event_available_rounded, size: 44, color: ArcherColors.textMuted.withOpacity(0.5)),
                const SizedBox(height: 12),
                const Text('No security standby shifts scheduled for this week.', style: TextStyle(color: ArcherColors.textMuted)),
              ],
            ),
          ),
        ] else ...[
          ..._shifts.map((shift) {
            final name = shift['name']?.toString() ?? 'Executive Detail';
            final date = shift['shift_date_label']?.toString() ?? 'Upcoming';
            final address = shift['site_address']?.toString() ?? 'Mayfair Protocol Site';
            final isCritical = shift['is_critical'] == true;

            return Container(
              margin: const EdgeInsets.only(bottom: 12),
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: ArcherColors.surfaceCard,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: isCritical ? ArcherColors.danger : ArcherColors.surfaceElevated),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(name, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: ArcherColors.textPrimary)),
                      if (isCritical)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: ArcherColors.danger.withOpacity(0.15),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: const Text('CRITICAL', style: TextStyle(fontSize: 10, color: ArcherColors.danger, fontWeight: FontWeight.bold)),
                        ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text('Date: $date', style: const TextStyle(fontSize: 12, color: ArcherColors.goldLight)),
                  const SizedBox(height: 4),
                  Text('Location: $address', style: const TextStyle(fontSize: 12, color: ArcherColors.textSecondary)),
                ],
              ),
            );
          }),
        ],
      ],
    );
  }

  // 5. CHAT TAB (Dispatch notifications matching Driver PWA)
  Widget _buildChatTab() {
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        const Text(
          'DISPATCH COMMUNICATIONS',
          style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 1.5, color: ArcherColors.gold),
        ),
        const SizedBox(height: 6),
        const Text(
          'Priority alerts, itinerary adjustments, and flight updates from Archer Command.',
          style: TextStyle(fontSize: 12, color: ArcherColors.textSecondary),
        ),
        const SizedBox(height: 16),

        if (_notifications.isEmpty) ...[
          const Center(
            child: Padding(
              padding: EdgeInsets.all(32),
              child: Text('No dispatch messages on file.', style: TextStyle(color: ArcherColors.textMuted)),
            ),
          ),
        ] else ...[
          ..._notifications.map((n) {
            final id = n['id']?.toString() ?? '';
            final title = n['title']?.toString() ?? 'Dispatch Alert';
            final message = n['message']?.toString() ?? '';
            final isRead = n['is_read'] == true;

            return GestureDetector(
              onTap: () async {
                if (!isRead) {
                  try {
                    await widget.api.put('/driver/notifications/$id/read');
                    _loadAllDriverData();
                  } catch (_) {}
                }
              },
              child: Container(
                margin: const EdgeInsets.only(bottom: 12),
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: isRead ? ArcherColors.surfaceCard : ArcherColors.goldDark.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: isRead ? ArcherColors.surfaceElevated : ArcherColors.gold.withOpacity(0.4)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(title, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: ArcherColors.textPrimary)),
                        if (!isRead)
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                            decoration: BoxDecoration(color: ArcherColors.gold, borderRadius: BorderRadius.circular(6)),
                            child: const Text('NEW', style: TextStyle(fontSize: 9, color: Colors.black, fontWeight: FontWeight.bold)),
                          ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Text(message, style: const TextStyle(fontSize: 12, color: ArcherColors.textSecondary)),
                  ],
                ),
              ),
            );
          }),
        ],
      ],
    );
  }

  // 6. PROFILE TAB (Credentials checklist matching Driver PWA)
  Widget _buildProfileTab() {
    final credentials = (_portal?['credentials'] as List<dynamic>?) ?? [];

    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        const Text(
          'CHAUFFEUR PARTNER PROFILE',
          style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 1.5, color: ArcherColors.gold),
        ),
        const SizedBox(height: 16),

        // Chauffeur Identity
        Container(
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            color: ArcherColors.surfaceCard,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: ArcherColors.surfaceElevated),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(_portal?['name']?.toString() ?? 'Marcus Vance', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: ArcherColors.textPrimary)),
              const SizedBox(height: 6),
              Text(_portal?['email']?.toString() ?? 'marcus.vance@archer.com', style: const TextStyle(fontSize: 13, color: ArcherColors.textSecondary)),
              if (_portal?['phone'] != null) ...[
                const SizedBox(height: 4),
                Text(_portal!['phone'].toString(), style: const TextStyle(fontSize: 13, color: ArcherColors.textMuted)),
              ],
            ],
          ),
        ),
        const SizedBox(height: 20),

        const Text(
          'COMPLIANCE & CREDENTIALS CHECKLIST',
          style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 1.5, color: ArcherColors.gold),
        ),
        const SizedBox(height: 12),

        if (credentials.isEmpty) ...[
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: ArcherColors.surfaceCard,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: ArcherColors.surfaceElevated),
            ),
            child: const Text('No credentials are on your driver record.', style: TextStyle(color: ArcherColors.textMuted, fontSize: 13)),
          ),
        ] else ...[
          ...credentials.map((c) {
            final name = c['name']?.toString() ?? 'Credential';
            final label = c['label']?.toString() ?? 'Active';
            final isBad = c['status'] == 'expired' || c['status'] == 'pickup_suspended';
            final isWarn = c['needs_attention'] == true;
            return _buildCredentialTile(name, label, isGood: !isBad && !isWarn, isWarn: isWarn);
          }),
        ],

        const SizedBox(height: 24),
        ListTile(
          tileColor: ArcherColors.surfaceCard,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          leading: const Icon(Icons.play_circle_outline_rounded, color: ArcherColors.gold),
          title: const Text('Replay First-Time Tutorial', style: TextStyle(fontSize: 14, color: ArcherColors.textPrimary)),
          trailing: const Icon(Icons.arrow_forward_ios_rounded, size: 14, color: ArcherColors.textMuted),
          onTap: widget.onReplayTutorial,
        ),
        const SizedBox(height: 12),

        ListTile(
          tileColor: ArcherColors.surfaceCard,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          leading: const Icon(Icons.logout_rounded, color: ArcherColors.danger),
          title: const Text('Sign Out of Dispatch', style: TextStyle(fontSize: 14, color: ArcherColors.danger)),
          trailing: const Icon(Icons.arrow_forward_ios_rounded, size: 14, color: ArcherColors.textMuted),
          onTap: _handleLogoutConfirmation,
        ),
        const SizedBox(height: 28),

        Center(
          child: Column(
            children: [
              Text(
                'ARCHER CHAUFFEUR CORPS',
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 2.5,
                  color: ArcherColors.gold.withOpacity(0.7),
                  fontFamily: 'serif',
                ),
              ),
              const SizedBox(height: 4),
              const Text(
                'Version 1.0.0 (Build 8) • Dispatch Active',
                style: TextStyle(fontSize: 11, color: ArcherColors.textMuted),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildCredentialTile(String name, String status, {bool isGood = true, bool isWarn = false}) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: ArcherColors.surfaceCard,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: ArcherColors.surfaceElevated),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Expanded(
            child: Text(name, style: const TextStyle(fontSize: 13, color: ArcherColors.textPrimary)),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: isGood
                  ? ArcherColors.success.withOpacity(0.15)
                  : (isWarn ? ArcherColors.warning.withOpacity(0.15) : ArcherColors.danger.withOpacity(0.15)),
              borderRadius: BorderRadius.circular(6),
            ),
            child: Text(
              status,
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w600,
                color: isGood ? ArcherColors.success : (isWarn ? ArcherColors.warning : ArcherColors.danger),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _DriverNavItem {
  final IconData icon;
  final String label;
  final int? badgeCount;

  const _DriverNavItem({
    required this.icon,
    required this.label,
    this.badgeCount,
  });
}
