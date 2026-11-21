import 'package:flutter/material.dart';
import 'package:archer_core/archer_core.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const ArcherCustomerApp());
}

class ArcherCustomerApp extends StatelessWidget {
  const ArcherCustomerApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Archer Executive',
      debugShowCheckedModeBanner: false,
      theme: ArcherTheme.darkTheme,
      home: const CustomerRootNavigator(),
    );
  }
}

class CustomerRootNavigator extends StatefulWidget {
  const CustomerRootNavigator({super.key});

  @override
  State<CustomerRootNavigator> createState() => _CustomerRootNavigatorState();
}

enum _CustomerFlowState { splash, onboarding, mainApp }

class _CustomerRootNavigatorState extends State<CustomerRootNavigator> {
  _CustomerFlowState _flow = _CustomerFlowState.splash;

  final List<OnboardingSlide> _slides = const [
    OnboardingSlide(
      icon: Icons.directions_car_filled_rounded,
      title: 'Elite Chauffeur Fleet',
      subtitle: 'Bespoke Travel',
      description:
          'Travel in absolute luxury with pristine Cadillac Escalades, Suburbans, and executive sedans operated by vetted security specialists.',
      highlights: [
        'Pristine Luxury Fleet',
        'Vetted Security Chauffeurs',
        'Complimentary Amenities',
      ],
    ),
    OnboardingSlide(
      icon: Icons.radar_rounded,
      title: 'Live Vehicle Telemetry',
      subtitle: 'Precision Timing',
      description:
          'Track your assigned chauffeur in real time with high-accuracy GPS telemetry, instant arrival alerts, and flight synchronization.',
      highlights: [
        'Live GPS Tracking',
        'Flight Number Sync',
        'Doorstep Arrival Alerts',
      ],
    ),
    OnboardingSlide(
      icon: Icons.shield_rounded,
      title: 'Concierge & Security',
      subtitle: 'Executive Protection',
      description:
          'Seamless Executive Assistant (EA/PA) coordination, bespoke close protection details, and 24/7 direct concierge dispatch.',
      highlights: [
        'EA / PA Booking Sync',
        'Close Protection Details',
        'Direct Concierge Dispatch',
      ],
    ),
  ];

  Future<void> _handleSplashComplete() async {
    final seen = await TokenStore.read('customer_onboarding_done');
    if (!mounted) return;
    if (seen == 'true') {
      setState(() => _flow = _CustomerFlowState.mainApp);
    } else {
      setState(() => _flow = _CustomerFlowState.onboarding);
    }
  }

  Future<void> _handleOnboardingFinish() async {
    await TokenStore.write('customer_onboarding_done', 'true');
    if (mounted) {
      setState(() => _flow = _CustomerFlowState.mainApp);
    }
  }

  void _replayTutorial() {
    setState(() => _flow = _CustomerFlowState.onboarding);
  }

  @override
  Widget build(BuildContext context) {
    switch (_flow) {
      case _CustomerFlowState.splash:
        return AnimatedSplashScreen(
          title: 'ARCHER',
          subtitle: 'TRANSPORTATION & SECURITY SPECIALISTS',
          onComplete: _handleSplashComplete,
        );
      case _CustomerFlowState.onboarding:
        return OnboardingTutorialScreen(
          appName: 'Archer Executive',
          slides: _slides,
          onFinish: _handleOnboardingFinish,
        );
      case _CustomerFlowState.mainApp:
        return CustomerAuthGate(onReplayTutorial: _replayTutorial);
    }
  }
}

class CustomerAuthGate extends StatefulWidget {
  final VoidCallback onReplayTutorial;

  const CustomerAuthGate({
    super.key,
    required this.onReplayTutorial,
  });

  @override
  State<CustomerAuthGate> createState() => _CustomerAuthGateState();
}

class _CustomerAuthGateState extends State<CustomerAuthGate> {
  bool _isLoading = true;
  bool _isAuthenticated = false;
  late final ArcherApiClient _api;

  @override
  void initState() {
    super.initState();
    _api = ArcherApiClient(tokenStore: TokenStore.customer);
    _checkAuth();
  }

  Future<void> _checkAuth() async {
    final token = await TokenStore.customer.get();
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
      await _api.get('/customer/me');
      if (mounted) {
        setState(() {
          _isAuthenticated = true;
          _isLoading = false;
        });
      }
    } catch (_) {
      await TokenStore.customer.clear();
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
        body: Center(child: CircularProgressIndicator(color: ArcherColors.gold)),
      );
    }

    if (_isAuthenticated) {
      return CustomerHomeScreen(
        api: _api,
        onReplayTutorial: widget.onReplayTutorial,
        onLogout: () async {
          await TokenStore.customer.clear();
          setState(() => _isAuthenticated = false);
        },
      );
    }

    return CustomerLoginScreen(
      api: _api,
      onReplayTutorial: widget.onReplayTutorial,
      onLoginSuccess: () => setState(() => _isAuthenticated = true),
    );
  }
}

class CustomerLoginScreen extends StatefulWidget {
  final ArcherApiClient api;
  final VoidCallback onLoginSuccess;
  final VoidCallback onReplayTutorial;

  const CustomerLoginScreen({
    super.key,
    required this.api,
    required this.onLoginSuccess,
    required this.onReplayTutorial,
  });

  @override
  State<CustomerLoginScreen> createState() => _CustomerLoginScreenState();
}

class _CustomerLoginScreenState extends State<CustomerLoginScreen> {
  final _emailController = TextEditingController();
  final _codeController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _usePassword = false;
  bool _codeSent = false;
  bool _submitting = false;
  String? _errorMessage;

  Future<void> _handlePasswordLogin() async {
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
        throw ApiError(status: 401, code: 'AUTH_FAILED', message: 'No session token received.');
      }

      await TokenStore.customer.set(token);
      widget.onLoginSuccess();
    } on ApiError catch (e) {
      setState(() => _errorMessage = e.message);
    } catch (_) {
      setState(() => _errorMessage = 'Login failed. Please check credentials.');
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  Future<void> _requestCode() async {
    final email = _emailController.text.trim();
    if (email.isEmpty || !email.contains('@')) {
      setState(() => _errorMessage = 'Please enter a valid email address.');
      return;
    }

    setState(() {
      _submitting = true;
      _errorMessage = null;
    });

    try {
      await widget.api.post('/customer/auth/code', data: {'email': email});
      setState(() => _codeSent = true);
    } on ApiError catch (e) {
      setState(() => _errorMessage = e.message);
    } catch (_) {
      setState(() => _errorMessage = 'Failed to send verification code. Try again.');
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  Future<void> _verifyCode() async {
    final email = _emailController.text.trim();
    final code = _codeController.text.trim();

    if (code.isEmpty) {
      setState(() => _errorMessage = 'Please enter the 6-digit verification code.');
      return;
    }

    setState(() {
      _submitting = true;
      _errorMessage = null;
    });

    try {
      final res = await widget.api.post<Map<String, dynamic>>(
        '/customer/auth/code/verify',
        data: {'email': email, 'code': code},
      );

      final token = res['token']?.toString();
      if (token == null) {
        throw ApiError(status: 401, code: 'AUTH_FAILED', message: 'No session token received.');
      }

      await TokenStore.customer.set(token);
      widget.onLoginSuccess();
    } on ApiError catch (e) {
      setState(() => _errorMessage = e.message);
    } catch (_) {
      setState(() => _errorMessage = 'Verification failed. Please check code.');
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
                  subtitle: 'EXECUTIVE PASSENGER PORTAL',
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
                  enabled: !_codeSent,
                  keyboardType: TextInputType.emailAddress,
                  style: const TextStyle(color: ArcherColors.textPrimary),
                  decoration: const InputDecoration(
                    labelText: 'Executive Account Email',
                    prefixIcon: Icon(Icons.email_outlined, color: ArcherColors.gold),
                  ),
                ),
                if (_usePassword) ...[
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
                ] else if (_codeSent) ...[
                  const SizedBox(height: 16),
                  TextField(
                    controller: _codeController,
                    keyboardType: TextInputType.number,
                    style: const TextStyle(color: ArcherColors.textPrimary, letterSpacing: 3, fontSize: 18),
                    decoration: const InputDecoration(
                      labelText: 'Verification Code',
                      hintText: '6-digit code',
                      prefixIcon: Icon(Icons.lock_clock_outlined, color: ArcherColors.gold),
                    ),
                  ),
                ],
                const SizedBox(height: 28),
                ElevatedButton(
                  onPressed: _submitting
                      ? null
                      : (_usePassword
                          ? _handlePasswordLogin
                          : (_codeSent ? _verifyCode : _requestCode)),
                  child: _submitting
                      ? const SizedBox(
                          height: 22,
                          width: 22,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.black),
                        )
                      : Text(_usePassword
                          ? 'SIGN IN'
                          : (_codeSent ? 'VERIFY & SIGN IN' : 'CONTINUE WITH EMAIL CODE')),
                ),
                const SizedBox(height: 12),
                TextButton(
                  onPressed: () {
                    setState(() {
                      _usePassword = !_usePassword;
                      _codeSent = false;
                      _errorMessage = null;
                    });
                  },
                  child: Text(
                    _usePassword ? 'Sign in with one-time email code' : 'Sign in with password instead',
                    style: const TextStyle(color: ArcherColors.gold),
                  ),
                ),
                if (_codeSent && !_usePassword) ...[
                  TextButton(
                    onPressed: () => setState(() => _codeSent = false),
                    child: const Text('Change email address', style: TextStyle(color: ArcherColors.gold)),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class CustomerHomeScreen extends StatefulWidget {
  final ArcherApiClient api;
  final VoidCallback onLogout;
  final VoidCallback onReplayTutorial;

  const CustomerHomeScreen({
    super.key,
    required this.api,
    required this.onLogout,
    required this.onReplayTutorial,
  });

  @override
  State<CustomerHomeScreen> createState() => _CustomerHomeScreenState();
}

class _CustomerHomeScreenState extends State<CustomerHomeScreen> {
  int _tabIndex = 0;
  bool _isLoading = true;
  CustomerUser? _user;
  List<Ride> _rides = [];

  // Booking form state
  final _pickupController = TextEditingController();
  final _dropoffController = TextEditingController();
  double? _estimatedPrice;
  bool _calculatingQuote = false;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    try {
      final userRes = await widget.api.get<Map<String, dynamic>>('/customer/me');
      final ridesRes = await widget.api.get<Map<String, dynamic>>('/customer/rides');

      final user = CustomerUser.fromJson(userRes);
      final list = (ridesRes['rides'] as List<dynamic>?) ?? [];
      final rides = list.map((r) => Ride.fromJson(r as Map<String, dynamic>)).toList();

      if (mounted) {
        setState(() {
          _user = user;
          _rides = rides;
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _getInstantQuote() async {
    final pickup = _pickupController.text.trim();
    final dropoff = _dropoffController.text.trim();

    if (pickup.isEmpty || dropoff.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter both pickup and destination')),
      );
      return;
    }

    setState(() => _calculatingQuote = true);
    try {
      final quote = await widget.api.post<Map<String, dynamic>>(
        '/quotes',
        data: {
          'pickup_address': pickup,
          'dropoff_address': dropoff,
          'service_type': 'chauffeur',
        },
      );

      final total = (quote['total_amount'] as num?)?.toDouble() ??
          (quote['estimated_total'] as num?)?.toDouble() ??
          150.0;

      if (mounted) setState(() => _estimatedPrice = total);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to calculate quote: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _calculatingQuote = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator(color: ArcherColors.gold)),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            const ArcherLogoWidget(size: 32, showText: false),
            const SizedBox(width: 10),
            const Text(
              'ARCHER',
              style: TextStyle(fontWeight: FontWeight.w700, letterSpacing: 2, color: ArcherColors.gold),
            ),
            const SizedBox(width: 8),
            Text(
              '• ${_user?.name ?? 'Executive'}',
              style: const TextStyle(fontSize: 13, color: ArcherColors.textSecondary),
            ),
          ],
        ),
        actions: [
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
      body: _tabIndex == 0 ? _buildBookTab() : _buildRidesTab(),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _tabIndex,
        onTap: (idx) => setState(() => _tabIndex = idx),
        backgroundColor: ArcherColors.surface,
        selectedItemColor: ArcherColors.gold,
        unselectedItemColor: ArcherColors.textMuted,
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.directions_car), label: 'Book Chauffeur'),
          BottomNavigationBarItem(icon: Icon(Icons.history), label: 'My Rides'),
        ],
      ),
    );
  }

  Widget _buildBookTab() {
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        const Text(
          'EXECUTIVE RESERVATION',
          style: TextStyle(
            fontSize: 12,
            letterSpacing: 1.5,
            fontWeight: FontWeight.bold,
            color: ArcherColors.gold,
          ),
        ),
        const SizedBox(height: 16),
        TextField(
          controller: _pickupController,
          style: const TextStyle(color: ArcherColors.textPrimary),
          decoration: const InputDecoration(
            labelText: 'Pickup Location',
            hintText: 'e.g. Heathrow Airport Terminal 5',
            prefixIcon: Icon(Icons.trip_origin, color: ArcherColors.gold),
          ),
        ),
        const SizedBox(height: 14),
        TextField(
          controller: _dropoffController,
          style: const TextStyle(color: ArcherColors.textPrimary),
          decoration: const InputDecoration(
            labelText: 'Destination',
            hintText: 'e.g. The Dorchester, Park Lane',
            prefixIcon: Icon(Icons.location_on, color: ArcherColors.danger),
          ),
        ),
        const SizedBox(height: 20),
        ElevatedButton(
          onPressed: _calculatingQuote ? null : _getInstantQuote,
          child: _calculatingQuote
              ? const SizedBox(
                  height: 20,
                  width: 20,
                  child: CircularProgressIndicator(strokeWidth: 2, color: Colors.black),
                )
              : const Text('CALCULATE ESTIMATED FARE'),
        ),
        if (_estimatedPrice != null) ...[
          const SizedBox(height: 24),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'EXCLUSIVE EXECUTIVE QUOTE',
                    style: TextStyle(fontSize: 11, letterSpacing: 1.5, color: ArcherColors.gold),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    '£${_estimatedPrice!.toStringAsFixed(2)}',
                    style: const TextStyle(
                      fontSize: 32,
                      fontWeight: FontWeight.bold,
                      color: ArcherColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 6),
                  const Text(
                    'Includes meet & greet, chauffeur gratuity, and 60 minutes airport waiting time.',
                    style: TextStyle(fontSize: 12, color: ArcherColors.textMuted),
                  ),
                  const SizedBox(height: 18),
                  ElevatedButton(
                    onPressed: () {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Proceeding to Stripe Payment confirmation...')),
                      );
                    },
                    child: const Text('CONFIRM & DISPATCH CHAUFFEUR'),
                  ),
                ],
              ),
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildRidesTab() {
    if (_rides.isEmpty) {
      return const Center(
        child: Text('No previous or scheduled rides.', style: TextStyle(color: ArcherColors.textMuted)),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadData,
      color: ArcherColors.gold,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _rides.length,
        itemBuilder: (context, idx) {
          final ride = _rides[idx];
          return Card(
            margin: const EdgeInsets.only(bottom: 12),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Trip #${ride.reference}',
                        style: const TextStyle(fontWeight: FontWeight.bold),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: ArcherColors.gold.withOpacity(0.15),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          ride.formattedStatus,
                          style: const TextStyle(fontSize: 11, color: ArcherColors.goldLight, fontWeight: FontWeight.w600),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Text(
                    '${ride.pickupAddress} → ${ride.dropoffAddress}',
                    style: const TextStyle(fontSize: 13, color: ArcherColors.textSecondary),
                  ),
                  if (ride.driverName != null) ...[
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        const Icon(Icons.person, size: 16, color: ArcherColors.gold),
                        const SizedBox(width: 6),
                        Text(
                          'Chauffeur: ${ride.driverName}',
                          style: const TextStyle(fontSize: 12, color: ArcherColors.textPrimary),
                        ),
                      ],
                    ),
                  ],
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}
