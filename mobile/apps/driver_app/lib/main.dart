import 'package:flutter/material.dart';
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
      return const Scaffold(
        body: Center(
          child: CircularProgressIndicator(color: ArcherColors.gold),
        ),
      );
    }

    if (_isAuthenticated) {
      return DriverHomeScreen(
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
      setState(() => _errorMessage = 'Please enter both email and password.');
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
        throw ApiError(status: 401, code: 'AUTH_FAILED', message: 'No session token returned.');
      }

      await TokenStore.driver.set(token);
      widget.onLoginSuccess();
    } on ApiError catch (e) {
      setState(() => _errorMessage = e.message);
    } catch (_) {
      setState(() => _errorMessage = 'Login failed. Please check credentials.');
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: Colors.transparent,
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
                    child: Text(
                      _errorMessage!,
                      style: const TextStyle(color: Colors.white, fontSize: 13),
                    ),
                  ),
                  const SizedBox(height: 16),
                ],
                TextField(
                  controller: _emailController,
                  keyboardType: TextInputType.emailAddress,
                  style: const TextStyle(color: ArcherColors.textPrimary),
                  decoration: const InputDecoration(
                    labelText: 'Chauffeur Email',
                    prefixIcon: Icon(Icons.email_outlined, color: ArcherColors.gold),
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

class DriverHomeScreen extends StatefulWidget {
  final ArcherApiClient api;
  final VoidCallback onLogout;
  final VoidCallback onReplayTutorial;

  const DriverHomeScreen({
    super.key,
    required this.api,
    required this.onLogout,
    required this.onReplayTutorial,
  });

  @override
  State<DriverHomeScreen> createState() => _DriverHomeScreenState();
}

class _DriverHomeScreenState extends State<DriverHomeScreen> {
  bool _isLoading = true;
  DriverProfile? _profile;
  List<Ride> _assignedRides = [];
  List<DriverOffer> _offers = [];
  bool _isTogglingPresence = false;

  @override
  void initState() {
    super.initState();
    _loadDashboard();
  }

  Future<void> _loadDashboard() async {
    setState(() => _isLoading = true);
    try {
      final profileRes = await widget.api.get<Map<String, dynamic>>('/driver/profile');
      final ridesRes = await widget.api.get<Map<String, dynamic>>('/driver/rides');
      final offersRes = await widget.api.get<Map<String, dynamic>>('/driver/offers');

      final profile = DriverProfile.fromJson(profileRes);

      final ridesList = (ridesRes['rides'] as List<dynamic>?) ?? [];
      final rides = ridesList.map((r) => Ride.fromJson(r as Map<String, dynamic>)).toList();

      final offersList = (offersRes['offers'] as List<dynamic>?) ?? [];
      final offers = offersList.map((o) => DriverOffer.fromJson(o as Map<String, dynamic>)).toList();

      if (mounted) {
        setState(() {
          _profile = profile;
          _assignedRides = rides;
          _offers = offers;
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _togglePresence() async {
    if (_profile == null || _isTogglingPresence) return;

    final nextStatus = !_profile!.isOnline;
    setState(() => _isTogglingPresence = true);

    try {
      await widget.api.put(
        '/driver/presence',
        data: {'presence_status': nextStatus ? 'online' : 'offline'},
      );
      await _loadDashboard();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to update presence: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isTogglingPresence = false);
    }
  }

  Future<void> _updateRideStatus(String rideId, String newStatus) async {
    try {
      await widget.api.put(
        '/driver/rides/$rideId/status',
        data: {'status': newStatus},
      );
      await _loadDashboard();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Status updated to: $newStatus')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Status update error: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator(color: ArcherColors.gold)),
      );
    }

    final activeTrip = _assignedRides.where((r) => r.status != 'completed' && r.status != 'cancelled').firstOrNull;

    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            const ArcherLogoWidget(size: 32, showText: false),
            const SizedBox(width: 10),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _profile?.name ?? 'Chauffeur',
                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
                Text(
                  _profile?.tier ?? 'Executive Tier',
                  style: const TextStyle(fontSize: 11, color: ArcherColors.goldLight),
                ),
              ],
            ),
          ],
        ),
        actions: [
          Row(
            children: [
              Text(
                (_profile?.isOnline ?? false) ? 'ONLINE' : 'OFFLINE',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                  color: (_profile?.isOnline ?? false) ? ArcherColors.success : ArcherColors.textMuted,
                ),
              ),
              Switch(
                value: _profile?.isOnline ?? false,
                activeColor: ArcherColors.success,
                onChanged: _isTogglingPresence ? null : (_) => _togglePresence(),
              ),
              IconButton(
                icon: const Icon(Icons.help_outline, size: 20),
                tooltip: 'Tutorial',
                onPressed: widget.onReplayTutorial,
              ),
              IconButton(
                icon: const Icon(Icons.logout, size: 20),
                onPressed: widget.onLogout,
              ),
            ],
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _loadDashboard,
        color: ArcherColors.gold,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            if (activeTrip != null) ...[
              const Text(
                'ACTIVE ASSIGNMENT',
                style: TextStyle(
                  fontSize: 12,
                  letterSpacing: 1.5,
                  fontWeight: FontWeight.bold,
                  color: ArcherColors.gold,
                ),
              ),
              const SizedBox(height: 10),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(18),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: ArcherColors.gold.withOpacity(0.2),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              activeTrip.formattedStatus.toUpperCase(),
                              style: const TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                                color: ArcherColors.goldLight,
                              ),
                            ),
                          ),
                          Text(
                            activeTrip.reference,
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: ArcherColors.textMuted,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Icon(Icons.trip_origin, color: ArcherColors.gold, size: 18),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              activeTrip.pickupAddress,
                              style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Icon(Icons.location_on, color: ArcherColors.danger, size: 18),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              activeTrip.dropoffAddress,
                              style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 20),
                      _buildStateTransitionButtons(activeTrip),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 24),
            ],
            const Text(
              'ASSIGNED RIDES',
              style: TextStyle(
                fontSize: 12,
                letterSpacing: 1.5,
                fontWeight: FontWeight.bold,
                color: ArcherColors.textSecondary,
              ),
            ),
            const SizedBox(height: 10),
            if (_assignedRides.isEmpty)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 24),
                child: Center(
                  child: Text(
                    'No assigned trips at this time.',
                    style: TextStyle(color: ArcherColors.textMuted),
                  ),
                ),
              )
            else
              ..._assignedRides.map(
                (ride) => Card(
                  margin: const EdgeInsets.only(bottom: 12),
                  child: ListTile(
                    title: Text(
                      'Trip #${ride.reference}',
                      style: const TextStyle(fontWeight: FontWeight.bold),
                    ),
                    subtitle: Text(
                      '${ride.pickupAddress} → ${ride.dropoffAddress}',
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 12, color: ArcherColors.textSecondary),
                    ),
                    trailing: Text(
                      ride.formattedStatus,
                      style: const TextStyle(fontSize: 12, color: ArcherColors.gold),
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildStateTransitionButtons(Ride ride) {
    switch (ride.status) {
      case 'dispatched':
      case 'pending':
        return ElevatedButton.icon(
          icon: const Icon(Icons.directions_car, color: Colors.black),
          label: const Text('EN ROUTE TO PICKUP'),
          onPressed: () => _updateRideStatus(ride.id, 'on_my_way'),
        );
      case 'on_my_way':
        return ElevatedButton.icon(
          icon: const Icon(Icons.door_front_door_outlined, color: Colors.black),
          label: const Text('ARRIVED AT DOORSTEP'),
          onPressed: () => _updateRideStatus(ride.id, 'at_doorstep'),
        );
      case 'at_doorstep':
        return ElevatedButton.icon(
          icon: const Icon(Icons.airline_seat_recline_normal, color: Colors.black),
          label: const Text('PASSENGER ONBOARD (START TRIP)'),
          onPressed: () => _updateRideStatus(ride.id, 'in_progress'),
        );
      case 'in_progress':
        return ElevatedButton.icon(
          style: ElevatedButton.styleFrom(backgroundColor: ArcherColors.success),
          icon: const Icon(Icons.check_circle_outline, color: Colors.black),
          label: const Text('COMPLETE TRIP'),
          onPressed: () => _updateRideStatus(ride.id, 'completed'),
        );
      default:
        return const SizedBox.shrink();
    }
  }
}
