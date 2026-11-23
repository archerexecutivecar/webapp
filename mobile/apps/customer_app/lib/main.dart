import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
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
          subtitle: 'EXECUTIVE SERVICES',
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
      return const ArcherLoaderWidget(tagline: 'Authenticating');
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

// ----------------------------------------------------------------------
// LUXURY MODERN LOGIN SCREEN
// ----------------------------------------------------------------------
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
  bool _usePassword = true;
  bool _codeSent = false;
  bool _submitting = false;
  String? _errorMessage;

  Future<void> _handlePasswordLogin() async {
    final email = _emailController.text.trim();
    final password = _passwordController.text;

    if (email.isEmpty || password.isEmpty) {
      setState(() => _errorMessage = 'Please enter your email and password.');
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
      setState(() => _errorMessage = 'Authentication failed. Please verify credentials.');
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
      setState(() => _errorMessage = 'Failed to dispatch verification code. Try again.');
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
      backgroundColor: const Color(0xFF07080B),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 28),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 440),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const ArcherLogoWidget(
                    size: 84,
                    subtitle: 'EXECUTIVE PASSENGER PORTAL',
                  ),
                  const SizedBox(height: 36),
                  if (_errorMessage != null) ...[
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      decoration: BoxDecoration(
                        color: ArcherColors.danger.withOpacity(0.12),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: ArcherColors.danger.withOpacity(0.4)),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.error_outline_rounded, color: ArcherColors.danger, size: 18),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              _errorMessage!,
                              style: const TextStyle(color: Colors.white, fontSize: 12, height: 1.4),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 20),
                  ],
                  // Email Field
                  Container(
                    decoration: BoxDecoration(
                      color: const Color(0xFF0F121A),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0x22C8A96A)),
                    ),
                    child: TextField(
                      controller: _emailController,
                      enabled: !_codeSent,
                      keyboardType: TextInputType.emailAddress,
                      style: const TextStyle(color: Colors.white, fontSize: 14),
                      decoration: const InputDecoration(
                        labelText: 'Executive Account Email',
                        labelStyle: TextStyle(color: Color(0xFF9CA3AF), fontSize: 13),
                        prefixIcon: Icon(Icons.mail_outline_rounded, color: Color(0xFFC8A96A), size: 20),
                        border: InputBorder.none,
                        contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                      ),
                    ),
                  ),
                  const SizedBox(height: 14),
                  if (_usePassword) ...[
                    Container(
                      decoration: BoxDecoration(
                        color: const Color(0xFF0F121A),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0x22C8A96A)),
                      ),
                      child: TextField(
                        controller: _passwordController,
                        obscureText: true,
                        style: const TextStyle(color: Colors.white, fontSize: 14),
                        decoration: const InputDecoration(
                          labelText: 'Password',
                          labelStyle: TextStyle(color: Color(0xFF9CA3AF), fontSize: 13),
                          prefixIcon: Icon(Icons.lock_outline_rounded, color: Color(0xFFC8A96A), size: 20),
                          border: InputBorder.none,
                          contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                        ),
                      ),
                    ),
                  ] else if (_codeSent) ...[
                    Container(
                      decoration: BoxDecoration(
                        color: const Color(0xFF0F121A),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0x33C8A96A)),
                      ),
                      child: TextField(
                        controller: _codeController,
                        keyboardType: TextInputType.number,
                        style: const TextStyle(color: Colors.white, letterSpacing: 4, fontSize: 18),
                        decoration: const InputDecoration(
                          labelText: '6-Digit Verification Code',
                          labelStyle: TextStyle(color: Color(0xFF9CA3AF), fontSize: 13),
                          prefixIcon: Icon(Icons.key_outlined, color: Color(0xFFC8A96A), size: 20),
                          border: InputBorder.none,
                          contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                        ),
                      ),
                    ),
                  ],
                  const SizedBox(height: 26),
                  Container(
                    height: 50,
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [Color(0xFFDFBE82), Color(0xFFC8A96A), Color(0xFF9E7D3B)],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.circular(12),
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xFFC8A96A).withOpacity(0.25),
                          blurRadius: 16,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.transparent,
                        shadowColor: Colors.transparent,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      onPressed: _submitting
                          ? null
                          : (_usePassword
                              ? _handlePasswordLogin
                              : (_codeSent ? _verifyCode : _requestCode)),
                      child: _submitting
                          ? const SizedBox(
                              height: 20,
                              width: 20,
                              child: CircularProgressIndicator(strokeWidth: 2, color: Colors.black),
                            )
                          : Text(
                              _usePassword
                                  ? 'ENTER PRIVATE PORTAL'
                                  : (_codeSent ? 'VERIFY & ACCESS' : 'REQUEST ACCESS CODE'),
                              style: const TextStyle(
                                color: Colors.black,
                                fontWeight: FontWeight.w700,
                                letterSpacing: 1.5,
                                fontSize: 13,
                              ),
                            ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Center(
                    child: TextButton(
                      onPressed: () {
                        setState(() {
                          _usePassword = !_usePassword;
                          _codeSent = false;
                          _errorMessage = null;
                        });
                      },
                      child: Text(
                        _usePassword
                            ? 'Switch to one-time email passcode'
                            : 'Switch to confidential password',
                        style: const TextStyle(
                          color: Color(0xFFC8A96A),
                          fontSize: 12,
                          letterSpacing: 0.5,
                        ),
                      ),
                    ),
                  ),
                  if (_codeSent && !_usePassword) ...[
                    Center(
                      child: TextButton(
                        onPressed: () => setState(() => _codeSent = false),
                        child: const Text(
                          'Re-enter email address',
                          style: TextStyle(color: Color(0xFF9CA3AF), fontSize: 11),
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

// ----------------------------------------------------------------------
// HAUTE LUXURY MINIMALIST CUSTOMER HOME SCREEN
// ----------------------------------------------------------------------
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
  int _previousTabIndex = 0;
  bool _isLoading = true;
  CustomerUser? _user;
  List<Ride> _rides = [];
  List<dynamic> _assistantProfiles = [];
  Ride? _nextRide;

  // Booking form state matching https://staging.archerexecutivecar.com/book
  String _selectedService = 'hourly'; // 'hourly', 'airport', 'p2p', 'client', 'security'
  int _selectedTier = 1; // 1 (Tier 1) or 2 (Tier 2)
  String _selectedClass = 'exec'; // 'exec' or 'first'
  String _selectedSize = 'suv'; // 'sedan', 'suv', 'van'
  int _selectedHours = 4;
  int _passengers = 1;
  int _bags = 0;
  final List<TextEditingController> _stopControllers = [];
  final _pickupController = TextEditingController();
  final _dropoffController = TextEditingController();
  final _flightController = TextEditingController();
  final _terminalController = TextEditingController();
  final _clientVehicleController = TextEditingController();
  final _specialRequestsController = TextEditingController();
  DateTime _pickupDateTime = DateTime.now().add(const Duration(hours: 4));
  int _selectedGuards = 0; // 0, 1, 2 (or 1..4 if security)
  bool _armedChauffeur = false;
  bool _convoyEscort = false;

  Map<String, dynamic>? _serverQuote;
  double? _estimatedPrice;
  bool _calculatingQuote = false;
  bool _bookingConfirmed = false;
  bool _submittingBooking = false;
  String? _bookingReference;
  String? _bookingMessage;

  // Active Mission Island UX State (Auto-hide on scroll & Expand/Collapse)
  bool _isTelemetryVisible = true;
  bool _isTelemetryCollapsed = false;

  // Account form state
  final _homeAddressController = TextEditingController();
  bool _savingHome = false;
  String? _accountFeedback;

  @override
  void initState() {
    super.initState();
    _loadAllData();
  }

  Future<void> _loadAllData() async {
    setState(() => _isLoading = true);
    try {
      final userRes = await widget.api.get<Map<String, dynamic>>('/customer/me');
      final ridesRes = await widget.api.get<Map<String, dynamic>>('/customer/rides');

      final user = CustomerUser.fromJson(userRes);
      final list = (ridesRes['rides'] as List<dynamic>?) ?? [];
      final rides = list.map((r) => Ride.fromJson(r as Map<String, dynamic>)).toList();

      final upcoming = rides.where((r) => r.status != 'completed' && r.status != 'cancelled').toList();
      final next = upcoming.isNotEmpty ? upcoming.first : null;

      List<dynamic> assistants = [];
      try {
        final asstRes = await widget.api.get<dynamic>('/customer/assistant-profiles');
        if (asstRes is List) {
          assistants = asstRes;
        } else if (asstRes is Map && asstRes['profiles'] is List) {
          assistants = asstRes['profiles'] as List;
        }
      } catch (_) {}

      if (mounted) {
        setState(() {
          _user = user;
          _rides = rides;
          _nextRide = next;
          _assistantProfiles = assistants;
          _homeAddressController.text = user.homeAddress ?? '';
          if (_pickupController.text.isEmpty && user.homeAddress != null) {
            _pickupController.text = user.homeAddress!;
          }
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  void dispose() {
    _pickupController.dispose();
    _dropoffController.dispose();
    _flightController.dispose();
    _terminalController.dispose();
    _clientVehicleController.dispose();
    _specialRequestsController.dispose();
    for (final c in _stopControllers) {
      c.dispose();
    }
    _homeAddressController.dispose();
    super.dispose();
  }

  Future<void> _calculateQuote() async {
    final pickup = _pickupController.text.trim();
    final dropoff = _dropoffController.text.trim();

    if (pickup.isEmpty) {
      ArcherToast.show(
        context,
        message: 'Please specify your departure pickup location.',
        icon: Icons.edit_location_alt_rounded,
        isError: true,
      );
      return;
    }

    final isHourly = _selectedService == 'hourly';
    final isClient = _selectedService == 'client' || _selectedService == 'client_car';
    final isSecurity = _selectedService == 'security';
    final minH = (isClient || isSecurity) ? 3 : 4;
    final hrs = (isHourly || isClient || isSecurity) ? (_selectedHours < minH ? minH : _selectedHours) : null;

    setState(() => _calculatingQuote = true);
    try {
      final payload = <String, dynamic>{
        'service': _selectedService == 'point_to_point' ? 'p2p' : (_selectedService == 'client_car' ? 'client' : _selectedService),
        'tier': _selectedTier,
        'passengers': _passengers,
        'bags': _bags,
        'stops': _stopControllers.where((c) => c.text.trim().isNotEmpty).length,
      };

      if (!isClient && !isSecurity) {
        payload['vehicle_class'] = _selectedClass;
        payload['vehicle_size'] = _selectedSize;
      }

      if (hrs != null) {
        payload['hours'] = hrs;
      }

      if (_selectedGuards > 0) {
        payload['guards'] = _selectedGuards;
      }

      final res = await widget.api.post<Map<String, dynamic>>('/quotes', data: payload);
      final quote = (res['quote'] as Map<String, dynamic>?) ?? res;

      final totalCents = (quote['total_cents'] as num?)?.toDouble();
      final total = totalCents != null
          ? totalCents / 100
          : ((quote['total_amount'] as num?)?.toDouble() ?? (quote['estimated_total'] as num?)?.toDouble());

      if (total == null) {
        throw ApiError(
          status: 422,
          code: 'NO_QUOTE',
          message: quote['dispatch_note']?.toString() ?? 'Dispatch will quote this trip upon request review.',
        );
      }

      if (mounted) {
        setState(() {
          _serverQuote = quote;
          _estimatedPrice = total;
        });
        ArcherToast.show(
          context,
          message: 'Authoritative fare calculated: \$${total.toStringAsFixed(2)}',
          icon: Icons.price_check_rounded,
        );
      }
    } catch (e) {
      if (mounted) {
        ArcherToast.show(
          context,
          message: 'Quote calculation error: $e',
          isError: true,
        );
      }
    } finally {
      if (mounted) setState(() => _calculatingQuote = false);
    }
  }

  Future<void> _submitBooking() async {
    final pickup = _pickupController.text.trim();
    final dropoff = _dropoffController.text.trim();
    if (pickup.isEmpty) {
      ArcherToast.show(
        context,
        message: 'Please specify your departure pickup address.',
        icon: Icons.trip_origin_rounded,
        isError: true,
      );
      return;
    }

    final isHourly = _selectedService == 'hourly';
    final isClient = _selectedService == 'client' || _selectedService == 'client_car';
    final isSecurity = _selectedService == 'security';
    final minH = (isClient || isSecurity) ? 3 : 4;
    final hrs = (isHourly || isClient || isSecurity) ? (_selectedHours < minH ? minH : _selectedHours) : null;
    final stopsList = _stopControllers.map((c) => c.text.trim()).where((s) => s.isNotEmpty).toList();

    setState(() => _submittingBooking = true);
    try {
      final parts = (_user?.name ?? 'Demo Customer').trim().split(' ');
      final firstName = parts.first;
      final lastName = parts.length > 1 ? parts.sublist(1).join(' ') : 'Customer';

      final serviceKey = _selectedService == 'point_to_point'
          ? 'p2p'
          : (_selectedService == 'client_car' ? 'client' : _selectedService);

      final dateStr = '${_pickupDateTime.year}-${_pickupDateTime.month.toString().padLeft(2, '0')}-${_pickupDateTime.day.toString().padLeft(2, '0')}';
      final timeStr = '${_pickupDateTime.hour.toString().padLeft(2, '0')}:${_pickupDateTime.minute.toString().padLeft(2, '0')}';

      final payload = <String, dynamic>{
        'request_type': 'general',
        'service': serviceKey,
        'first_name': firstName,
        'last_name': lastName,
        'email': _user?.email ?? 'demo.customer@example.com',
        'phone': _user?.phone ?? '+18482319997',
        'pickup_address': pickup,
        'dropoff_address': dropoff.isNotEmpty ? dropoff : pickup,
        'date': dateStr,
        'time': timeStr,
        'passengers': _passengers,
        'bags': _bags,
        'stops': stopsList,
        'tier': _selectedTier,
        'terms_accepted': true,
      };

      if (!isClient && !isSecurity) {
        payload['vehicle_class'] = _selectedClass;
        payload['vehicle_size'] = _selectedSize;
      }

      if (hrs != null) {
        payload['hours'] = hrs;
      }

      if (serviceKey == 'airport') {
        if (_flightController.text.trim().isNotEmpty) {
          payload['airline_flight'] = _flightController.text.trim();
        }
        if (_terminalController.text.trim().isNotEmpty) {
          payload['terminal'] = _terminalController.text.trim();
        }
      }

      if (isClient && _clientVehicleController.text.trim().isNotEmpty) {
        payload['client_vehicle'] = _clientVehicleController.text.trim();
      }

      if (_selectedGuards > 0) {
        payload['guards'] = _selectedGuards;
      }

      if (_specialRequestsController.text.trim().isNotEmpty) {
        payload['special_requests'] = _specialRequestsController.text.trim();
      }

      final res = await widget.api.post<Map<String, dynamic>>('/booking-requests', data: payload);
      final data = (res['data'] as Map<String, dynamic>?) ?? res;
      final ref = data['reference']?.toString() ?? 'ARC-CONFIRMED';
      final msg = data['message']?.toString() ?? 'Request received. Dispatch will confirm the details and final price.';

      if (mounted) {
        setState(() {
          _bookingReference = ref;
          _bookingMessage = msg;
          _bookingConfirmed = true;
        });
        ArcherToast.show(
          context,
          message: 'Reservation [$ref] dispatched to Archer Ops!',
          icon: Icons.check_circle_rounded,
        );
        await _loadAllData();
      }
    } catch (e) {
      if (mounted) {
        ArcherToast.show(
          context,
          message: 'Booking request error: $e',
          isError: true,
        );
      }
    } finally {
      if (mounted) setState(() => _submittingBooking = false);
    }
  }

  Future<void> _saveHomeAddress() async {
    final address = _homeAddressController.text.trim();
    setState(() {
      _savingHome = true;
      _accountFeedback = null;
    });

    try {
      await widget.api.put('/customer/profile', data: {'home_address': address});
      setState(() => _accountFeedback = 'Default residence address securely updated.');
    } catch (e) {
      setState(() => _accountFeedback = 'Failed to update address: $e');
    } finally {
      if (mounted) setState(() => _savingHome = false);
    }
  }

  String _getTimeGreeting() {
    final hour = DateTime.now().hour;
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }

  String _getProfileInitials(String? name) {
    if (name == null || name.trim().isEmpty) return 'VIP';
    final parts = name.trim().split(RegExp(r'\s+'));
    if (parts.length >= 2) {
      return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
    }
    return parts[0].substring(0, parts[0].length >= 2 ? 2 : 1).toUpperCase();
  }

  Future<void> _handleLogoutConfirmation() async {
    final confirmed = await ArcherConfirmationDialog.show(
      context: context,
      title: 'Sign Out of Archer',
      message: 'Are you sure you want to end your active session? You will need your executive credentials to access your priority reservations again.',
      confirmLabel: 'SIGN OUT',
      cancelLabel: 'STAY SIGNED IN',
      icon: Icons.logout_rounded,
      iconColor: const Color(0xFFEF4444),
      confirmColor: const Color(0xFFEF4444),
      isDestructive: true,
    );
    if (confirmed) {
      widget.onLogout();
    }
  }

  PreferredSizeWidget _buildTopNav(int upcomingCount) {
    String title;
    String subtitle;

    switch (_tabIndex) {
      case 0:
        title = 'ARCHER';
        subtitle = _user != null && _user!.name.isNotEmpty
            ? 'Welcome, ${_user!.name}'
            : 'Tier 1 Client Portal';
        break;
      case 1:
        title = 'Reserve Chauffeur';
        subtitle = 'Bespoke Executive Fleet';
        break;
      case 2:
        title = 'Security Command';
        subtitle = 'Tier-1 Close Protection';
        break;
      case 3:
        title = 'My Reservations';
        subtitle = '$upcomingCount Active Missions Scheduled';
        break;
      case 4:
        title = 'Executive Profile';
        subtitle = 'Preferences & Membership';
        break;
      default:
        title = 'ARCHER';
        subtitle = 'Tier 1 Client Portal';
    }

    return ArcherTopAppBar(
      title: title,
      subtitle: subtitle,
      customLeading: _tabIndex == 4
          ? IconButton(
              icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Color(0xFFC8A96A), size: 18),
              tooltip: 'Return to Dashboard',
              onPressed: () {
                HapticFeedback.lightImpact();
                setState(() => _tabIndex = _previousTabIndex);
              },
            )
          : null,
      profileInitials: _getProfileInitials(_user?.name),
      onProfileTap: () {
        HapticFeedback.selectionClick();
        setState(() {
          if (_tabIndex == 4) {
            _tabIndex = _previousTabIndex;
          } else {
            _previousTabIndex = _tabIndex;
            _tabIndex = 4;
          }
        });
      },
      actions: [
        // 24/7 Priority Concierge line
        Container(
          margin: const EdgeInsets.symmetric(vertical: 4),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: const Color(0x33C8A96A)),
            color: const Color(0xFF11141E),
          ),
          child: IconButton(
            icon: const Icon(Icons.phone_in_talk_rounded, color: Color(0xFFC8A96A), size: 16),
            constraints: const BoxConstraints(minWidth: 34, minHeight: 34),
            padding: EdgeInsets.zero,
            tooltip: 'Priority Concierge Line',
            onPressed: () {
              ArcherToast.show(
                context,
                message: 'Connecting to 24/7 Priority Concierge: +1 (848) 231-9997',
                icon: Icons.support_agent_rounded,
              );
            },
          ),
        ),
        if (_tabIndex == 3) ...[
          const SizedBox(width: 4),
          IconButton(
            icon: const Icon(Icons.refresh_rounded, size: 19, color: Color(0xFFC8A96A)),
            constraints: const BoxConstraints(minWidth: 34, minHeight: 34),
            padding: EdgeInsets.zero,
            tooltip: 'Refresh Reservations',
            onPressed: () {
              HapticFeedback.lightImpact();
              _loadAllData();
            },
          ),
        ],
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const ArcherLoaderWidget(tagline: 'Accessing Archer Vault');
    }

    final upcomingCount = _rides.where((r) => r.status != 'completed' && r.status != 'cancelled').length;

    final upcomingRides = _rides.where((r) => r.status != 'completed' && r.status != 'cancelled').toList();
    final activeMission = upcomingRides.isNotEmpty ? upcomingRides.first : null;

    return Scaffold(
      backgroundColor: const Color(0xFF07080B),
      extendBody: true,
      appBar: _buildTopNav(upcomingCount),
      body: NotificationListener<UserScrollNotification>(
        onNotification: (notification) {
          if (notification.direction == ScrollDirection.reverse) {
            // User scrolling down -> smoothly auto-hide telemetry island so nothing is blocked
            if (_isTelemetryVisible) {
              setState(() => _isTelemetryVisible = false);
            }
          } else if (notification.direction == ScrollDirection.forward) {
            // User scrolling up -> smoothly reveal telemetry island
            if (!_isTelemetryVisible) {
              setState(() => _isTelemetryVisible = true);
            }
          }
          return false;
        },
        child: GestureDetector(
          onTap: () => FocusScope.of(context).unfocus(),
          behavior: HitTestBehavior.opaque,
          child: IndexedStack(
            index: _tabIndex,
            children: [
              _buildHomeDashboardTab(),
              _buildBookTab(),
              _buildSecurityTab(),
              _buildMyTripsTab(),
              _buildAccountTab(),
            ],
          ),
        ),
      ),
      bottomNavigationBar: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (activeMission != null)
            AnimatedSlide(
              duration: const Duration(milliseconds: 220),
              curve: Curves.easeInOutCubic,
              offset: _isTelemetryVisible ? Offset.zero : const Offset(0, 1.4),
              child: AnimatedOpacity(
                duration: const Duration(milliseconds: 180),
                opacity: _isTelemetryVisible ? 1.0 : 0.0,
                child: ArcherTelemetryIsland(
                  statusText: activeMission.status == 'on_my_way'
                      ? 'Specialist En Route'
                      : (activeMission.status == 'at_doorstep'
                          ? 'Chauffeur At Doorstep'
                          : (activeMission.status == 'in_progress'
                              ? 'Mission In Progress'
                              : 'Mission Confirmed')),
                  detailText: '${activeMission.pickupAddress.split(',').first} → ${activeMission.dropoffAddress.split(',').first}',
                  driverName: activeMission.driverName,
                  vehicleInfo: activeMission.vehicleClass,
                  isCollapsed: _isTelemetryCollapsed,
                  onToggleCollapse: () {
                    HapticFeedback.lightImpact();
                    setState(() => _isTelemetryCollapsed = !_isTelemetryCollapsed);
                  },
                  onTap: () => _showRideDetailSheet(activeMission),
                  onCall: () {
                    ArcherToast.show(
                      context,
                      message: 'Connecting to assigned chauffeur (+1 848-231-9997)...',
                      icon: Icons.phone_forwarded_rounded,
                    );
                  },
                ),
              ),
            ),
          _buildModernLuxuryNavbar(upcomingCount),
        ],
      ),
    );
  }

  Widget _buildModernLuxuryNavbar(int upcomingCount) {
    final navItems = [
      const _LuxuryNavItem(
        icon: Icons.explore_outlined,
        activeIcon: Icons.explore_rounded,
        label: 'Explore',
      ),
      const _LuxuryNavItem(
        icon: Icons.directions_car_outlined,
        activeIcon: Icons.directions_car_rounded,
        label: 'Reserve',
      ),
      const _LuxuryNavItem(
        icon: Icons.shield_outlined,
        activeIcon: Icons.shield_rounded,
        label: 'Protection',
      ),
      _LuxuryNavItem(
        icon: Icons.luggage_outlined,
        activeIcon: Icons.luggage_rounded,
        label: 'Itinerary',
        badgeCount: upcomingCount,
      ),
    ];

    return SafeArea(
      child: Container(
        margin: const EdgeInsets.fromLTRB(16, 0, 16, 16),
        alignment: Alignment.bottomCenter,
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 480),
          child: Container(
            height: 64,
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
            decoration: BoxDecoration(
              color: const Color(0xF20B0E16), // Deep frosted obsidian
              borderRadius: BorderRadius.circular(32),
              border: Border.all(
                color: const Color(0x38C8A96A), // Fine champagne gold hairline
                width: 1.2,
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.65),
                  blurRadius: 32,
                  offset: const Offset(0, 10),
                  spreadRadius: 2,
                ),
                BoxShadow(
                  color: const Color(0xFFC8A96A).withOpacity(0.12),
                  blurRadius: 20,
                  offset: const Offset(0, 2),
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
                        setState(() {
                          _previousTabIndex = index;
                          _tabIndex = index;
                        });
                      }
                    },
                    behavior: HitTestBehavior.opaque,
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 220),
                      curve: Curves.easeOutCubic,
                      padding: const EdgeInsets.symmetric(vertical: 6),
                      decoration: BoxDecoration(
                        color: isSelected ? const Color(0x24C8A96A) : Colors.transparent,
                        borderRadius: BorderRadius.circular(24),
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
                                isSelected ? item.activeIcon : item.icon,
                                size: isSelected ? 20 : 19,
                                color: isSelected ? const Color(0xFFDFBE82) : const Color(0xFF7E8698),
                              ),
                              if (item.badgeCount != null && item.badgeCount! > 0)
                                Positioned(
                                  right: -8,
                                  top: -2,
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFFC8A96A),
                                      borderRadius: BorderRadius.circular(6),
                                    ),
                                    constraints: const BoxConstraints(minWidth: 12, minHeight: 12),
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
                          const SizedBox(height: 3),
                          Text(
                            item.label,
                            maxLines: 1,
                            style: TextStyle(
                              fontSize: 9.5,
                              fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                              letterSpacing: 0.5,
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

  Widget _buildQuickDestinationPill({
    required IconData icon,
    required String title,
    required String subtitle,
    required String destination,
  }) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: () {
          HapticFeedback.lightImpact();
          setState(() {
            _dropoffController.text = destination;
            _tabIndex = 1;
          });
          _calculateQuote();
        },
        borderRadius: BorderRadius.circular(14),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          decoration: BoxDecoration(
            color: const Color(0xFF101420),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: const Color(0x33C8A96A), width: 1),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 32,
                height: 32,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: const Color(0xFF192030),
                  border: Border.all(color: const Color(0x44C8A96A)),
                ),
                child: Icon(icon, size: 16, color: const Color(0xFFDFBE82)),
              ),
              const SizedBox(width: 10),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      color: Colors.white,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: const TextStyle(
                      fontSize: 10,
                      color: Color(0xFF9CA3AF),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ----------------------------------------------------------------------
  // 1. HOME DASHBOARD TAB (HAUTE LUXURY MINIMALIST)
  // ----------------------------------------------------------------------
  Widget _buildHomeDashboardTab() {
    final firstName = _user?.name.trim().split(' ').first ?? 'Principal';

    return RefreshIndicator(
      onRefresh: _loadAllData,
      color: const Color(0xFFC8A96A),
      child: ListView(
        padding: const EdgeInsets.fromLTRB(20, 24, 20, 180),
        children: [
          // Hero Principal Greeting
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '${_getTimeGreeting()},',
                style: const TextStyle(
                  fontSize: 15,
                  fontStyle: FontStyle.italic,
                  letterSpacing: 1.2,
                  color: Color(0xFFC8A96A),
                  fontFamily: 'serif',
                ),
              ),
              const SizedBox(height: 4),
              Row(
                children: [
                  Text(
                    'Principal $firstName',
                    style: const TextStyle(
                      fontSize: 28,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 0.5,
                      color: Colors.white,
                      fontFamily: 'serif',
                    ),
                  ),
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(4),
                      border: Border.all(color: const Color(0x44C8A96A)),
                      color: const Color(0x18C8A96A),
                    ),
                    child: const Text(
                      'VIP',
                      style: TextStyle(
                        fontSize: 9,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 1.0,
                        color: Color(0xFFDFBE82),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 4),
              const Text(
                'Where may Archer escort you today?',
                style: TextStyle(fontSize: 13, color: Color(0xFF9CA3AF), letterSpacing: 0.2),
              ),
            ],
          ),
          const SizedBox(height: 24),

          // Active Mission Dock (if upcoming ride exists)
          if (_nextRide != null) ...[
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: const Color(0xFF0F121A),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0x44C8A96A), width: 1.2),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFFC8A96A).withOpacity(0.08),
                    blurRadius: 20,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          Container(
                            width: 8,
                            height: 8,
                            decoration: const BoxDecoration(
                              color: Color(0xFFC8A96A),
                              shape: BoxShape.circle,
                            ),
                          ),
                          const SizedBox(width: 8),
                          const Text(
                            'ACTIVE MISSION TELEMETRY',
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w700,
                              letterSpacing: 1.8,
                              color: Color(0xFFC8A96A),
                            ),
                          ),
                        ],
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                        decoration: BoxDecoration(
                          color: const Color(0x22C8A96A),
                          borderRadius: BorderRadius.circular(6),
                          border: Border.all(color: const Color(0x44C8A96A)),
                        ),
                        child: Text(
                          _nextRide!.formattedStatus.toUpperCase(),
                          style: const TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                            letterSpacing: 0.8,
                            color: Color(0xFFDFBE82),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  // Origin / Destination Route Visualizer
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Column(
                        children: [
                          Container(
                            width: 10,
                            height: 10,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              border: Border.all(color: const Color(0xFFC8A96A), width: 2),
                            ),
                          ),
                          Container(
                            width: 1.5,
                            height: 28,
                            color: const Color(0x33C8A96A),
                          ),
                          const Icon(Icons.location_on, color: Color(0xFFEF4444), size: 14),
                        ],
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              _nextRide!.pickupAddress,
                              style: const TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                                color: Colors.white,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            const SizedBox(height: 16),
                            Text(
                              _nextRide!.dropoffAddress,
                              style: const TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                                color: Colors.white,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),
                  const Divider(color: Color(0x18C8A96A), height: 1),
                  const SizedBox(height: 12),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        _nextRide!.driverName != null
                            ? 'Specialist: ${_nextRide!.driverName}'
                            : 'Chauffeur: Assigned by Dispatch',
                        style: const TextStyle(fontSize: 12, color: Color(0xFF9CA3AF)),
                      ),
                      GestureDetector(
                        onTap: () => setState(() => _tabIndex = 3),
                        child: const Row(
                          children: [
                            Text(
                              'Telemetry Details',
                              style: TextStyle(
                                color: Color(0xFFC8A96A),
                                fontSize: 11,
                                fontWeight: FontWeight.w600,
                                letterSpacing: 0.5,
                              ),
                            ),
                            SizedBox(width: 4),
                            Icon(Icons.arrow_forward_rounded, color: Color(0xFFC8A96A), size: 12),
                          ],
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 22),
          ],

          // Bespoke Luxury Reservation Bar
          ArcherReservationCapsule(
            onTap: () {
              HapticFeedback.lightImpact();
              setState(() => _tabIndex = 1);
            },
            onScheduleTap: () {
              HapticFeedback.lightImpact();
              setState(() => _tabIndex = 1);
            },
          ),
          const SizedBox(height: 18),

          // Quick Executive Destinations
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                _buildQuickDestinationPill(
                  icon: Icons.flight_takeoff_rounded,
                  title: 'Teterboro FBO',
                  subtitle: 'Signature Aviation',
                  destination: 'Teterboro Airport (TEB), NJ',
                ),
                const SizedBox(width: 10),
                _buildQuickDestinationPill(
                  icon: Icons.location_city_rounded,
                  title: 'Manhattan HQ',
                  subtitle: 'Hudson Yards, NYC',
                  destination: 'Hudson Yards, New York, NY',
                ),
                const SizedBox(width: 10),
                _buildQuickDestinationPill(
                  icon: Icons.flight_rounded,
                  title: 'EWR Terminal A',
                  subtitle: 'Newark Liberty',
                  destination: 'Newark Liberty International Airport (EWR)',
                ),
                const SizedBox(width: 10),
                _buildQuickDestinationPill(
                  icon: Icons.home_rounded,
                  title: 'Primary Residence',
                  subtitle: _user?.homeAddress ?? 'Oceanport, NJ',
                  destination: _user?.homeAddress ?? 'Oceanport, NJ',
                ),
              ],
            ),
          ),
          const SizedBox(height: 28),

          // Executive Services Section
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'EXECUTIVE SERVICES',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 2.2,
                  color: Color(0xFFC8A96A),
                ),
              ),
              GestureDetector(
                onTap: () => setState(() => _tabIndex = 1),
                child: const Text(
                  'Reserve Now →',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                    color: Color(0xFF9CA3AF),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),

          // 2x2 Clean Modern Luxury Grid
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisSpacing: 12,
            mainAxisSpacing: 12,
            childAspectRatio: 1.15,
            children: [
              _buildModernServiceCard(
                icon: Icons.flight_takeoff_rounded,
                title: 'Airport Escort',
                subtitle: 'FBO & terminal meet & greet with flight sync',
                serviceKey: 'airport',
              ),
              _buildModernServiceCard(
                icon: Icons.alt_route_rounded,
                title: 'Point-to-Point',
                subtitle: 'Direct executive interstate & city transit',
                serviceKey: 'point_to_point',
              ),
              _buildModernServiceCard(
                icon: Icons.access_time_rounded,
                title: 'Hourly As-Directed',
                subtitle: 'Dedicated vehicle & security specialist on standby',
                serviceKey: 'hourly',
              ),
              _buildModernServiceCard(
                icon: Icons.shield_rounded,
                title: 'Close Protection',
                subtitle: 'Tier-1 armed security specialist & tactical escort',
                serviceKey: 'security',
              ),
            ],
          ),
          const SizedBox(height: 26),

          // The Archer Standard of Excellence Banner
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFF131722), Color(0xFF0D1017)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0x33C8A96A)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Row(
                  children: [
                    Icon(Icons.verified_rounded, color: Color(0xFFC8A96A), size: 18),
                    SizedBox(width: 8),
                    Text(
                      'THE ARCHER STANDARD OF EXCELLENCE',
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 2.0,
                        color: Color(0xFFC8A96A),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                const Text(
                  'Every Archer vehicle undergoes strict 40-point daily sanitation and telemetry checks. Chauffeurs are vetted protection specialists with defensive driving certifications.',
                  style: TextStyle(fontSize: 12, height: 1.5, color: Color(0xFF9CA3AF)),
                ),
                const SizedBox(height: 16),
                Container(
                  height: 44,
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFFDFBE82), Color(0xFFC8A96A), Color(0xFF9E7D3B)],
                    ),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.transparent,
                      shadowColor: Colors.transparent,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    onPressed: () => setState(() => _tabIndex = 1),
                    child: const Text(
                      'COMMISSION CHAUFFEUR',
                      style: TextStyle(
                        color: Colors.black,
                        fontWeight: FontWeight.w700,
                        fontSize: 12,
                        letterSpacing: 1.2,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildModernServiceCard({
    required IconData icon,
    required String title,
    required String subtitle,
    required String serviceKey,
  }) {
    return GestureDetector(
      onTap: () {
        setState(() {
          _selectedService = serviceKey;
          _tabIndex = 1;
        });
      },
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: const Color(0xFF0F121A),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: const Color(0x22C8A96A)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: const Color(0x18C8A96A),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(icon, color: const Color(0xFFC8A96A), size: 20),
            ),
            const SizedBox(height: 12),
            Text(
              title,
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w700,
                color: Colors.white,
                letterSpacing: 0.2,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              subtitle,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                fontSize: 10,
                height: 1.35,
                color: Color(0xFF6B7280),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ----------------------------------------------------------------------
  // 2. BOOK TAB (BESPOKE RESERVATIONS, QUOTES & REAL DISPATCH)
  // Matching https://staging.archerexecutivecar.com/book
  // ----------------------------------------------------------------------
  Widget _buildBookTab() {
    final isHourly = _selectedService == 'hourly';
    final isClient = _selectedService == 'client' || _selectedService == 'client_car';
    final isSecurity = _selectedService == 'security';
    final isAirport = _selectedService == 'airport';
    final isTrip = _selectedService == 'p2p' || _selectedService == 'point_to_point' || isAirport;
    final minH = (isClient || isSecurity) ? 3 : 4;
    final activeHours = _selectedHours < minH ? minH : _selectedHours;

    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 24, 20, 180),
      children: [
        const Text(
          'BESPOKE RESERVATION',
          style: TextStyle(
            fontSize: 11,
            letterSpacing: 2.2,
            fontWeight: FontWeight.bold,
            color: Color(0xFFC8A96A),
          ),
        ),
        const SizedBox(height: 6),
        const Text(
          'Configure your trip itinerary, vehicle fleet class, and executive security enhancements.',
          style: TextStyle(fontSize: 13, color: Color(0xFF9CA3AF)),
        ),
        const SizedBox(height: 22),

        // Section 1: Service Type
        const Text(
          'SERVICE TYPE',
          style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1.2, color: Color(0xFFC8A96A)),
        ),
        const SizedBox(height: 10),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            _buildLuxuryServiceChip('hourly', 'Hourly Service (4-hr min)'),
            _buildLuxuryServiceChip('airport', 'Airport Transportation'),
            _buildLuxuryServiceChip('p2p', 'Point to Point'),
            _buildLuxuryServiceChip('client', 'Client Car Service'),
            _buildLuxuryServiceChip('security', 'Protection / Security'),
          ],
        ),
        const SizedBox(height: 24),

        // Section 2: Route & Stops
        const Text(
          'TRIP ITINERARY & ROUTE',
          style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1.2, color: Color(0xFFC8A96A)),
        ),
        const SizedBox(height: 10),

        // Pickup Location Input
        Container(
          decoration: BoxDecoration(
            color: const Color(0xFF0F121A),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0x22C8A96A)),
          ),
          child: TextField(
            controller: _pickupController,
            style: const TextStyle(color: Colors.white, fontSize: 14),
            decoration: const InputDecoration(
              labelText: 'Pickup Address',
              labelStyle: TextStyle(color: Color(0xFF9CA3AF), fontSize: 13),
              hintText: 'Street, city or airport',
              hintStyle: TextStyle(color: Color(0xFF4B5563), fontSize: 12),
              prefixIcon: Icon(Icons.trip_origin_rounded, color: Color(0xFFC8A96A), size: 20),
              border: InputBorder.none,
              contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            ),
          ),
        ),
        const SizedBox(height: 12),

        // Drop-off Location Input
        Container(
          decoration: BoxDecoration(
            color: const Color(0xFF0F121A),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0x22C8A96A)),
          ),
          child: TextField(
            controller: _dropoffController,
            style: const TextStyle(color: Colors.white, fontSize: 14),
            decoration: const InputDecoration(
              labelText: 'Drop-off Address',
              labelStyle: TextStyle(color: Color(0xFF9CA3AF), fontSize: 13),
              hintText: 'Street, city or airport',
              hintStyle: TextStyle(color: Color(0xFF4B5563), fontSize: 12),
              prefixIcon: Icon(Icons.location_on_rounded, color: Color(0xFFEF4444), size: 20),
              border: InputBorder.none,
              contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            ),
          ),
        ),

        // Intermediate Stops
        if (_stopControllers.isNotEmpty) ...[
          const SizedBox(height: 12),
          ...List.generate(_stopControllers.length, (idx) {
            return Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: Container(
                decoration: BoxDecoration(
                  color: const Color(0xFF0F121A),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0x33DFBE82)),
                ),
                child: TextField(
                  controller: _stopControllers[idx],
                  style: const TextStyle(color: Colors.white, fontSize: 14),
                  decoration: InputDecoration(
                    labelText: 'Stop ${idx + 1}',
                    labelStyle: const TextStyle(color: Color(0xFFDFBE82), fontSize: 13),
                    hintText: 'Street, city or venue',
                    hintStyle: const TextStyle(color: Color(0xFF4B5563), fontSize: 12),
                    prefixIcon: const Icon(Icons.add_location_alt_rounded, color: Color(0xFFDFBE82), size: 18),
                    suffixIcon: IconButton(
                      icon: const Icon(Icons.close_rounded, color: Color(0xFF9CA3AF), size: 18),
                      tooltip: 'Remove Stop',
                      onPressed: () {
                        setState(() {
                          _stopControllers[idx].dispose();
                          _stopControllers.removeAt(idx);
                        });
                      },
                    ),
                    border: InputBorder.none,
                    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                  ),
                ),
              ),
            );
          }),
        ],

        const SizedBox(height: 8),
        Align(
          alignment: Alignment.centerLeft,
          child: OutlinedButton.icon(
            style: OutlinedButton.styleFrom(
              side: const BorderSide(color: Color(0x44C8A96A), style: BorderStyle.solid),
              foregroundColor: const Color(0xFFE87722),
              backgroundColor: const Color(0x0DE87722),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            ),
            icon: const Icon(Icons.add_rounded, size: 16, color: Color(0xFFE87722)),
            label: const Text('+ Add a stop', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
            onPressed: () {
              if (_stopControllers.length < (isTrip ? 3 : 5)) {
                HapticFeedback.lightImpact();
                setState(() {
                  _stopControllers.add(TextEditingController());
                });
              } else {
                ArcherToast.show(
                  context,
                  message: 'Maximum ${isTrip ? 3 : 5} stops permitted for this itinerary.',
                  isError: true,
                );
              }
            },
          ),
        ),
        const SizedBox(height: 24),

        // Section 3: Date, Time & Hours
        const Text(
          'DATE & SCHEDULE',
          style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1.2, color: Color(0xFFC8A96A)),
        ),
        const SizedBox(height: 10),
        Row(
          children: [
            // Date Picker Button
            Expanded(
              child: GestureDetector(
                onTap: () async {
                  HapticFeedback.selectionClick();
                  final picked = await showDatePicker(
                    context: context,
                    initialDate: _pickupDateTime,
                    firstDate: DateTime.now(),
                    lastDate: DateTime.now().add(const Duration(days: 180)),
                    builder: (ctx, child) {
                      return Theme(
                        data: ThemeData.dark().copyWith(
                          colorScheme: const ColorScheme.dark(
                            primary: Color(0xFFC8A96A),
                            onPrimary: Colors.black,
                            surface: Color(0xFF141824),
                            onSurface: Colors.white,
                          ),
                        ),
                        child: child!,
                      );
                    },
                  );
                  if (picked != null) {
                    setState(() {
                      _pickupDateTime = DateTime(
                        picked.year,
                        picked.month,
                        picked.day,
                        _pickupDateTime.hour,
                        _pickupDateTime.minute,
                      );
                    });
                  }
                },
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  decoration: BoxDecoration(
                    color: const Color(0xFF0F121A),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0x22C8A96A)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.calendar_today_rounded, size: 16, color: Color(0xFFC8A96A)),
                      const SizedBox(width: 10),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Date', style: TextStyle(fontSize: 10, color: Color(0xFF9CA3AF))),
                          const SizedBox(height: 2),
                          Text(
                            '${_pickupDateTime.day.toString().padLeft(2, '0')}-${_pickupDateTime.month.toString().padLeft(2, '0')}-${_pickupDateTime.year}',
                            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Colors.white),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ),
            const SizedBox(width: 12),

            // Time Picker Button
            Expanded(
              child: GestureDetector(
                onTap: () async {
                  HapticFeedback.selectionClick();
                  final picked = await showTimePicker(
                    context: context,
                    initialTime: TimeOfDay.fromDateTime(_pickupDateTime),
                    builder: (ctx, child) {
                      return Theme(
                        data: ThemeData.dark().copyWith(
                          colorScheme: const ColorScheme.dark(
                            primary: Color(0xFFC8A96A),
                            onPrimary: Colors.black,
                            surface: Color(0xFF141824),
                            onSurface: Colors.white,
                          ),
                        ),
                        child: child!,
                      );
                    },
                  );
                  if (picked != null) {
                    setState(() {
                      _pickupDateTime = DateTime(
                        _pickupDateTime.year,
                        _pickupDateTime.month,
                        _pickupDateTime.day,
                        picked.hour,
                        picked.minute,
                      );
                    });
                  }
                },
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  decoration: BoxDecoration(
                    color: const Color(0xFF0F121A),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0x22C8A96A)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.access_time_rounded, size: 16, color: Color(0xFFC8A96A)),
                      const SizedBox(width: 10),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Pickup Time', style: TextStyle(fontSize: 10, color: Color(0xFF9CA3AF))),
                          const SizedBox(height: 2),
                          Text(
                            '${_pickupDateTime.hour.toString().padLeft(2, '0')}:${_pickupDateTime.minute.toString().padLeft(2, '0')}',
                            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Colors.white),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),

        // Hours selector for hourly, client car, or security
        if (isHourly || isClient || isSecurity) ...[
          const SizedBox(height: 16),
          Text(
            'Hours ($minH minimum)',
            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF9CA3AF)),
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            children: [3, 4, 5, 6, 8, 10, 12].where((h) => h >= minH).map((h) {
              final sel = activeHours == h;
              return ChoiceChip(
                label: Text('$h hrs', style: TextStyle(fontSize: 12, fontWeight: sel ? FontWeight.bold : FontWeight.normal)),
                selected: sel,
                selectedColor: const Color(0x33C8A96A),
                backgroundColor: const Color(0xFF0F121A),
                side: BorderSide(color: sel ? const Color(0xFFC8A96A) : const Color(0x22C8A96A)),
                labelStyle: TextStyle(color: sel ? const Color(0xFFDFBE82) : const Color(0xFF9CA3AF)),
                onSelected: (val) {
                  if (val) setState(() => _selectedHours = h);
                },
              );
            }).toList(),
          ),
        ],
        const SizedBox(height: 24),

        // Section 4: Passengers & Bags Counters
        const Text(
          'PASSENGERS & LUGGAGE',
          style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1.2, color: Color(0xFFC8A96A)),
        ),
        const SizedBox(height: 10),
        Row(
          children: [
            // Passengers Counter
            Expanded(
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                decoration: BoxDecoration(
                  color: const Color(0xFF0F121A),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0x22C8A96A)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Passengers', style: TextStyle(fontSize: 10, color: Color(0xFF9CA3AF))),
                    const SizedBox(height: 6),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        IconButton(
                          icon: const Icon(Icons.remove_circle_outline_rounded, size: 20, color: Color(0xFFC8A96A)),
                          constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                          padding: EdgeInsets.zero,
                          onPressed: _passengers > 1 ? () => setState(() => _passengers--) : null,
                        ),
                        Text(
                          '$_passengers',
                          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
                        ),
                        IconButton(
                          icon: const Icon(Icons.add_circle_outline_rounded, size: 20, color: Color(0xFFC8A96A)),
                          constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                          padding: EdgeInsets.zero,
                          onPressed: _passengers < 60 ? () => setState(() => _passengers++) : null,
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(width: 12),

            // Bags Counter
            Expanded(
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                decoration: BoxDecoration(
                  color: const Color(0xFF0F121A),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0x22C8A96A)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Bags', style: TextStyle(fontSize: 10, color: Color(0xFF9CA3AF))),
                    const SizedBox(height: 6),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        IconButton(
                          icon: const Icon(Icons.remove_circle_outline_rounded, size: 20, color: Color(0xFFC8A96A)),
                          constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                          padding: EdgeInsets.zero,
                          onPressed: _bags > 0 ? () => setState(() => _bags--) : null,
                        ),
                        Text(
                          '$_bags',
                          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
                        ),
                        IconButton(
                          icon: const Icon(Icons.add_circle_outline_rounded, size: 20, color: Color(0xFFC8A96A)),
                          constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                          padding: EdgeInsets.zero,
                          onPressed: _bags < 60 ? () => setState(() => _bags++) : null,
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),

        // Section 5: Airport / Client Car contextual inputs
        if (isAirport) ...[
          const SizedBox(height: 20),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: const Color(0xFF0F121A),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: const Color(0x22C8A96A)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Row(
                  children: [
                    Icon(Icons.flight_takeoff_rounded, color: Color(0xFFC8A96A), size: 16),
                    SizedBox(width: 8),
                    Text(
                      'FLIGHT TELEMETRY TRACKING',
                      style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 1.5, color: Color(0xFFC8A96A)),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _flightController,
                  style: const TextStyle(color: Colors.white, fontSize: 13),
                  decoration: const InputDecoration(
                    labelText: 'Airline & Flight Number (we track it)',
                    labelStyle: TextStyle(color: Color(0xFF9CA3AF), fontSize: 12),
                    hintText: 'e.g. UA 1234, DL 402',
                    hintStyle: TextStyle(color: Color(0xFF4B5563), fontSize: 11),
                    border: UnderlineInputBorder(borderSide: BorderSide(color: Color(0x33C8A96A))),
                  ),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: _terminalController,
                  style: const TextStyle(color: Colors.white, fontSize: 13),
                  decoration: const InputDecoration(
                    labelText: 'Terminal or FBO',
                    labelStyle: TextStyle(color: Color(0xFF9CA3AF), fontSize: 12),
                    hintText: 'e.g. Terminal C, Signature FBO',
                    hintStyle: TextStyle(color: Color(0xFF4B5563), fontSize: 11),
                    border: UnderlineInputBorder(borderSide: BorderSide(color: Color(0x33C8A96A))),
                  ),
                ),
              ],
            ),
          ),
        ],

        if (isClient) ...[
          const SizedBox(height: 20),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: const Color(0xFF0F121A),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: const Color(0x22C8A96A)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Row(
                  children: [
                    Icon(Icons.directions_car_rounded, color: Color(0xFFC8A96A), size: 16),
                    SizedBox(width: 8),
                    Text(
                      'CLIENT VEHICLE DETAILS',
                      style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 1.5, color: Color(0xFFC8A96A)),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _clientVehicleController,
                  style: const TextStyle(color: Colors.white, fontSize: 13),
                  decoration: const InputDecoration(
                    labelText: 'Your vehicle (make, model, year)',
                    labelStyle: TextStyle(color: Color(0xFF9CA3AF), fontSize: 12),
                    hintText: 'e.g. 2025 Cadillac Escalade ESV',
                    hintStyle: TextStyle(color: Color(0xFF4B5563), fontSize: 11),
                    border: UnderlineInputBorder(borderSide: BorderSide(color: Color(0x33C8A96A))),
                  ),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Client Car is billed round trip: your chauffeur safely returns your car to your departure address.',
                  style: TextStyle(fontSize: 11, color: Color(0xFF6B7280), height: 1.3),
                ),
              ],
            ),
          ),
        ],
        const SizedBox(height: 24),

        // Section 6: Tier of Service
        const Text(
          'TIER OF SERVICE',
          style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1.2, color: Color(0xFFC8A96A)),
        ),
        const SizedBox(height: 10),
        Row(
          children: [
            Expanded(
              child: GestureDetector(
                onTap: () {
                  HapticFeedback.selectionClick();
                  setState(() => _selectedTier = 1);
                },
                child: Container(
                  padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 12),
                  decoration: BoxDecoration(
                    color: _selectedTier == 1 ? const Color(0xFFE87722) : const Color(0xFF0F121A),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                      color: _selectedTier == 1 ? const Color(0xFFE87722) : const Color(0x33C8A96A),
                    ),
                  ),
                  child: Text(
                    'Tier 1 (Executive)',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      color: _selectedTier == 1 ? Colors.white : const Color(0xFF9CA3AF),
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: GestureDetector(
                onTap: () {
                  HapticFeedback.selectionClick();
                  setState(() => _selectedTier = 2);
                },
                child: Container(
                  padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 12),
                  decoration: BoxDecoration(
                    color: _selectedTier == 2 ? const Color(0xFFE87722) : const Color(0xFF0F121A),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                      color: _selectedTier == 2 ? const Color(0xFFE87722) : const Color(0x33C8A96A),
                    ),
                  ),
                  child: Text(
                    'Tier 2 (1st Class)',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      color: _selectedTier == 2 ? Colors.white : const Color(0xFF9CA3AF),
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 24),

        // Section 7: Fleet & Vehicle Class Picker (if not client vehicle and not standalone security)
        if (!isClient && !isSecurity) ...[
          const Text(
            'VEHICLE FLEET',
            style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1.2, color: Color(0xFFC8A96A)),
          ),
          const SizedBox(height: 6),
          const Text(
            'Prices shown for the tier you picked. Sprinters are hourly only, 4-hour minimum.',
            style: TextStyle(fontSize: 11, color: Color(0xFF6B7280)),
          ),
          const SizedBox(height: 12),

          // Executive Class group
          const Text(
            'EXECUTIVE CLASS',
            style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 1.5, color: Color(0xFFDFBE82)),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: _buildVehicleTile(
                  clsKey: 'exec',
                  sizeKey: 'sedan',
                  model: 'Chevrolet Traverse',
                  category: 'Mid-size SUV',
                  rate: _selectedTier == 1 ? r'$70/hr' : r'$80/hr',
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _buildVehicleTile(
                  clsKey: 'exec',
                  sizeKey: 'suv',
                  model: 'Chevrolet Suburban',
                  category: 'Full-size SUV',
                  rate: _selectedTier == 1 ? r'$80/hr' : r'$100/hr',
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _buildVehicleTile(
                  clsKey: 'exec',
                  sizeKey: 'van',
                  model: 'Mercedes-Benz Sprinter',
                  category: 'Sprinter',
                  rate: _selectedTier == 1 ? r'$175/hr' : r'$225/hr',
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // 1st Class group
          const Text(
            '1ST CLASS',
            style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 1.5, color: Color(0xFFDFBE82)),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: _buildVehicleTile(
                  clsKey: 'first',
                  sizeKey: 'sedan',
                  model: 'Lincoln Aviator',
                  category: 'Mid-size SUV',
                  rate: _selectedTier == 1 ? r'$80/hr' : r'$90/hr',
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _buildVehicleTile(
                  clsKey: 'first',
                  sizeKey: 'suv',
                  model: 'Cadillac Escalade #2',
                  category: 'Full-size SUV',
                  rate: _selectedTier == 1 ? r'$100/hr' : r'$125/hr',
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _buildVehicleTile(
                  clsKey: 'first',
                  sizeKey: 'van',
                  model: 'Executive Sprinter',
                  category: 'Sprinter',
                  rate: _selectedTier == 1 ? r'$225/hr' : r'$265/hr',
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),
        ],

        // Section 8: Add-on Security Protocol
        Text(
          isSecurity ? 'NUMBER OF GUARDS' : 'ADD-ON SECURITY',
          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1.2, color: Color(0xFFC8A96A)),
        ),
        const SizedBox(height: 10),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: (isSecurity ? [1, 2, 3, 4] : [0, 1, 2]).map((g) {
            final sel = _selectedGuards == g;
            final label = g == 0
                ? 'None'
                : '$g guard${g > 1 ? "s" : ""} · \$45/hr each';
            return ChoiceChip(
              label: Text(label, style: TextStyle(fontSize: 11, fontWeight: sel ? FontWeight.bold : FontWeight.normal)),
              selected: sel,
              selectedColor: const Color(0xFFE87722),
              backgroundColor: const Color(0xFF0F121A),
              side: BorderSide(color: sel ? const Color(0xFFE87722) : const Color(0x33C8A96A)),
              labelStyle: TextStyle(color: sel ? Colors.white : const Color(0xFF9CA3AF)),
              onSelected: (val) {
                if (val) setState(() => _selectedGuards = g);
              },
            );
          }).toList(),
        ),
        const SizedBox(height: 24),

        // Section 9: Special Requests (Optional)
        const Text(
          'SPECIAL REQUESTS (OPTIONAL)',
          style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1.2, color: Color(0xFFC8A96A)),
        ),
        const SizedBox(height: 8),
        Container(
          decoration: BoxDecoration(
            color: const Color(0xFF0F121A),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0x22C8A96A)),
          ),
          child: TextField(
            controller: _specialRequestsController,
            maxLines: 2,
            style: const TextStyle(color: Colors.white, fontSize: 13),
            decoration: const InputDecoration(
              hintText: 'Car seat, extra stops, meet-and-greet sign, chilled refreshments…',
              hintStyle: TextStyle(color: Color(0xFF4B5563), fontSize: 12),
              border: InputBorder.none,
              contentPadding: EdgeInsets.all(14),
            ),
          ),
        ),
        const SizedBox(height: 24),

        // Section 10: Calculate Guaranteed Fare Button
        Container(
          height: 50,
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [Color(0xFFDFBE82), Color(0xFFC8A96A), Color(0xFF9E7D3B)],
            ),
            borderRadius: BorderRadius.circular(12),
            boxShadow: [
              BoxShadow(
                color: const Color(0xFFC8A96A).withOpacity(0.2),
                blurRadius: 16,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.transparent,
              shadowColor: Colors.transparent,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
            onPressed: _calculatingQuote ? null : _calculateQuote,
            child: _calculatingQuote
                ? const SizedBox(
                    height: 20,
                    width: 20,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.black),
                  )
                : const Text(
                    'CALCULATE GUARANTEED FARE',
                    style: TextStyle(
                      color: Colors.black,
                      fontWeight: FontWeight.w700,
                      fontSize: 12,
                      letterSpacing: 1.5,
                    ),
                  ),
          ),
        ),

        // Section 11: Dynamic Quote Result Card & Submission
        if (_estimatedPrice != null) ...[
          const SizedBox(height: 24),
          Container(
            padding: const EdgeInsets.all(22),
            decoration: BoxDecoration(
              color: const Color(0xFF0F121A),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFC8A96A), width: 1.2),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'ESTIMATED EXECUTIVE FARE',
                      style: TextStyle(
                        fontSize: 10,
                        letterSpacing: 1.8,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFFC8A96A),
                      ),
                    ),
                    Icon(Icons.verified_rounded, color: Color(0xFF10B981), size: 18),
                  ],
                ),
                const SizedBox(height: 12),
                Text(
                  '\$${_estimatedPrice!.toStringAsFixed(2)}',
                  style: const TextStyle(
                    fontSize: 34,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0.5,
                    color: Color(0xFFDFBE82),
                    fontFamily: 'serif',
                  ),
                ),
                const SizedBox(height: 10),

                // Breakdown lines from server quote
                if (_serverQuote != null && _serverQuote!['lines'] is List) ...[
                  ...((_serverQuote!['lines'] as List).map((l) {
                    final line = l as Map<String, dynamic>;
                    final label = line['label']?.toString() ?? '';
                    final amtCents = (line['amount_cents'] as num?)?.toDouble() ?? 0.0;
                    return Padding(
                      padding: const EdgeInsets.symmetric(vertical: 3),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Text(
                              label,
                              style: const TextStyle(fontSize: 12, color: Color(0xFF9CA3AF)),
                            ),
                          ),
                          Text(
                            '\$${(amtCents / 100).toStringAsFixed(2)}',
                            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Colors.white),
                          ),
                        ],
                      ),
                    );
                  })),
                  const Divider(color: Color(0x18C8A96A), height: 16),
                ],

                const Text(
                  'Estimate only. Dispatch confirms the final price. All-inclusive: Chauffeur meet & greet, telemetry tracking, fuel, toll surcharges, and gratuity.',
                  style: TextStyle(fontSize: 11, height: 1.4, color: Color(0xFF6B7280)),
                ),
                const SizedBox(height: 20),

                if (_bookingConfirmed) ...[
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: const Color(0xFF10B981).withOpacity(0.12),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: const Color(0xFF10B981)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            const Icon(Icons.check_circle, color: Color(0xFF10B981), size: 20),
                            const SizedBox(width: 10),
                            Text(
                              'REFERENCE: ${_bookingReference ?? "ARC-CONFIRMED"}',
                              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF10B981)),
                            ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        Text(
                          _bookingMessage ?? 'Your executive booking request has been received by Archer Dispatch.',
                          style: const TextStyle(fontSize: 12, color: Colors.white, height: 1.4),
                        ),
                        const SizedBox(height: 12),
                        OutlinedButton(
                          style: OutlinedButton.styleFrom(
                            side: const BorderSide(color: Color(0xFF10B981)),
                            foregroundColor: const Color(0xFF10B981),
                          ),
                          onPressed: () {
                            setState(() => _tabIndex = 3); // Go to Itinerary
                          },
                          child: const Text('VIEW IN ITINERARY'),
                        ),
                      ],
                    ),
                  ),
                ] else ...[
                  Container(
                    height: 48,
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [Color(0xFFDFBE82), Color(0xFFC8A96A), Color(0xFF9E7D3B)],
                      ),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.transparent,
                        shadowColor: Colors.transparent,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      icon: _submittingBooking
                          ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.black))
                          : const Icon(Icons.lock_outline_rounded, color: Colors.black, size: 16),
                      label: Text(
                        _submittingBooking ? 'DISPATCHING MISSION...' : 'REQUEST MY RIDE / CONFIRM CHAUFFEUR',
                        style: const TextStyle(color: Colors.black, fontWeight: FontWeight.w700, fontSize: 12, letterSpacing: 0.8),
                      ),
                      onPressed: _submittingBooking ? null : _submitBooking,
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildLuxuryServiceChip(String key, String label) {
    final selected = _selectedService == key;
    return GestureDetector(
      onTap: () {
        HapticFeedback.selectionClick();
        setState(() => _selectedService = key);
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
        decoration: BoxDecoration(
          color: selected ? const Color(0xFFE87722) : const Color(0xFF0F121A),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: selected ? const Color(0xFFE87722) : const Color(0x33C8A96A),
            width: selected ? 1.4 : 1.0,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 11,
            fontWeight: selected ? FontWeight.bold : FontWeight.w500,
            color: selected ? Colors.white : const Color(0xFF9CA3AF),
          ),
        ),
      ),
    );
  }

  Widget _buildVehicleTile({
    required String clsKey,
    required String sizeKey,
    required String model,
    required String category,
    required String rate,
  }) {
    final isSelected = _selectedClass == clsKey && _selectedSize == sizeKey;
    return GestureDetector(
      onTap: () {
        HapticFeedback.selectionClick();
        setState(() {
          _selectedClass = clsKey;
          _selectedSize = sizeKey;
        });
      },
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFFE87722) : const Color(0xFF0F121A),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: isSelected ? const Color(0xFFE87722) : const Color(0x22C8A96A),
            width: isSelected ? 1.5 : 1,
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              model,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.bold,
                color: isSelected ? Colors.white : const Color(0xFFDFBE82),
              ),
            ),
            const SizedBox(height: 2),
            Text(
              category,
              style: TextStyle(
                fontSize: 9.5,
                color: isSelected ? Colors.white70 : const Color(0xFF6B7280),
              ),
            ),
            const SizedBox(height: 6),
            Text(
              rate,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w800,
                color: isSelected ? Colors.white : Colors.white,
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ----------------------------------------------------------------------
  // 3. SECURITY TAB (EXECUTIVE PROTECTION SUITE)
  // ----------------------------------------------------------------------
  Widget _buildSecurityTab() {
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 24, 20, 180),
      children: [
        const Text(
          'EXECUTIVE SECURITY COMMAND',
          style: TextStyle(
            fontSize: 11,
            letterSpacing: 2.2,
            fontWeight: FontWeight.bold,
            color: Color(0xFFC8A96A),
          ),
        ),
        const SizedBox(height: 6),
        const Text(
          'Close protection details, tactical escort convoys, and threat mitigation for high-profile principals.',
          style: TextStyle(fontSize: 13, color: Color(0xFF9CA3AF)),
        ),
        const SizedBox(height: 22),

        _buildModernSecurityCard(
          title: 'Close Personal Protection (CPO)',
          badge: 'Tier-1 Armed',
          description:
              'Dedicated close protection officers embedded directly with the principal. Comprehensive background vetting, tactical driving certifications, and emergency trauma medicine.',
          icon: Icons.shield_rounded,
        ),
        const SizedBox(height: 14),

        _buildModernSecurityCard(
          title: 'Convoy & Motorcade Escort',
          badge: 'Tactical Team',
          description:
              'Multi-vehicle tactical formation with lead reconnaissance, chase escort, and primary secure transport with synchronized radio dispatch telemetry.',
          icon: Icons.security_rounded,
        ),
        const SizedBox(height: 14),

        _buildModernSecurityCard(
          title: 'Residential & Venue Detail',
          badge: '24/7 Perimeter',
          description:
              'Perimeter access control, guest manifest vetting, sweeps for surveillance devices, and static guard deployments.',
          icon: Icons.home_work_rounded,
        ),
        const SizedBox(height: 26),

        // Urgent Security Command Box
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: const Color(0xFF0F121A),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0x44C8A96A)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Row(
                children: [
                  Icon(Icons.phone_in_talk_rounded, color: Color(0xFFC8A96A), size: 18),
                  SizedBox(width: 8),
                  Text(
                    'PRIORITY SECURITY OPERATIONS',
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 2.0,
                      color: Color(0xFFC8A96A),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              const Text(
                'For immediate tactical deployment or bespoke operational orders, contact the Archer Security Operations Command directly.',
                style: TextStyle(fontSize: 12, height: 1.45, color: Color(0xFF9CA3AF)),
              ),
              const SizedBox(height: 16),
              Container(
                height: 46,
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFFDFBE82), Color(0xFFC8A96A), Color(0xFF9E7D3B)],
                  ),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.transparent,
                    shadowColor: Colors.transparent,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  icon: const Icon(Icons.phone_rounded, color: Colors.black, size: 16),
                  label: const Text(
                    'CALL SECURITY DISPATCH: (848) 231-9997',
                    style: TextStyle(
                      color: Colors.black,
                      fontWeight: FontWeight.w700,
                      fontSize: 11,
                      letterSpacing: 1.0,
                    ),
                  ),
                  onPressed: () {
                    ArcherToast.show(
                      context,
                      message: 'Directing call to Security Operations Command (+1 848-231-9997)...',
                      icon: Icons.shield_rounded,
                    );
                  },
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildModernSecurityCard({
    required String title,
    required String badge,
    required String description,
    required IconData icon,
  }) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: const Color(0xFF0F121A),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0x22C8A96A)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Icon(icon, color: const Color(0xFFC8A96A), size: 18),
                  const SizedBox(width: 8),
                  Text(
                    title,
                    style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.white),
                  ),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: const Color(0x22C8A96A),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  badge,
                  style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: Color(0xFFDFBE82)),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            description,
            style: const TextStyle(fontSize: 12, height: 1.45, color: Color(0xFF9CA3AF)),
          ),
          const SizedBox(height: 14),
          OutlinedButton(
            style: OutlinedButton.styleFrom(
              side: const BorderSide(color: Color(0x44C8A96A)),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              minimumSize: const Size.fromHeight(38),
            ),
            onPressed: () {
              setState(() {
                _selectedService = 'security';
                _armedChauffeur = true;
                _tabIndex = 1;
              });
            },
            child: const Text(
              'COMMISSION PROTOCOL',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.bold,
                letterSpacing: 1.0,
                color: Color(0xFFC8A96A),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ----------------------------------------------------------------------
  // 4. MY TRIPS TAB (ITINERARY ARCHIVE & TELEMETRY)
  // ----------------------------------------------------------------------
  Widget _buildMyTripsTab() {
    return DefaultTabController(
      length: 2,
      child: Column(
        children: [
          Container(
            color: const Color(0xFF090B10),
            child: const TabBar(
              indicatorColor: Color(0xFFC8A96A),
              labelColor: Color(0xFFC8A96A),
              unselectedLabelColor: Color(0xFF6B7280),
              labelStyle: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, letterSpacing: 0.5),
              tabs: [
                Tab(text: 'Upcoming Reservations'),
                Tab(text: 'Travel History'),
              ],
            ),
          ),
          Expanded(
            child: TabBarView(
              children: [
                _buildTripsList(upcoming: true),
                _buildTripsList(upcoming: false),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTripsList({required bool upcoming}) {
    final filtered = _rides.where((r) {
      final isFinished = r.status == 'completed' || r.status == 'cancelled';
      return upcoming ? !isFinished : isFinished;
    }).toList();

    if (filtered.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.directions_car_outlined, size: 44, color: const Color(0xFF6B7280).withOpacity(0.4)),
              const SizedBox(height: 14),
              Text(
                upcoming ? 'No upcoming missions scheduled.' : 'No previous mission archives on record.',
                style: const TextStyle(color: Color(0xFF6B7280), fontSize: 13),
              ),
              const SizedBox(height: 18),
              OutlinedButton(
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: Color(0xFFC8A96A)),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
                onPressed: () => setState(() => _tabIndex = 1),
                child: const Text('RESERVE CHAUFFEUR', style: TextStyle(color: Color(0xFFC8A96A), fontSize: 12, letterSpacing: 1.0)),
              ),
            ],
          ),
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadAllData,
      color: const Color(0xFFC8A96A),
      child: ListView.builder(
        padding: const EdgeInsets.fromLTRB(18, 18, 18, 180),
        itemCount: filtered.length,
        itemBuilder: (context, idx) {
          final ride = filtered[idx];

          if (upcoming && idx == 0) {
            return Column(
              children: [
                ArcherMissionProgressCard(
                  reference: ride.reference,
                  status: ride.status,
                  pickup: ride.pickupAddress,
                  dropoff: ride.dropoffAddress,
                  vehicle: ride.vehicleClass,
                  driverName: ride.driverName,
                  onTap: () => _showRideDetailSheet(ride),
                  onCall: () {
                    ArcherToast.show(
                      context,
                      message: 'Calling assigned chauffeur specialist (+1 848-231-9997)...',
                      icon: Icons.phone_forwarded_rounded,
                    );
                  },
                ),
                if (filtered.length > 1) ...[
                  Row(
                    children: [
                      const Text(
                        'SUBSEQUENT MISSIONS',
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          letterSpacing: 1.6,
                          color: Color(0xFFC8A96A),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(child: Container(height: 1, color: const Color(0x18C8A96A))),
                    ],
                  ),
                  const SizedBox(height: 12),
                ],
              ],
            );
          }

          return Container(
            margin: const EdgeInsets.only(bottom: 14),
            decoration: BoxDecoration(
              color: const Color(0xFF0F121A),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: const Color(0x22C8A96A)),
            ),
            child: InkWell(
              borderRadius: BorderRadius.circular(14),
              onTap: () => _showRideDetailSheet(ride),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Mission #${ride.reference}',
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.white),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: const Color(0x22C8A96A),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            ride.formattedStatus.toUpperCase(),
                            style: const TextStyle(fontSize: 10, color: Color(0xFFDFBE82), fontWeight: FontWeight.bold),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Icon(Icons.trip_origin_rounded, color: Color(0xFFC8A96A), size: 14),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            ride.pickupAddress,
                            style: const TextStyle(fontSize: 13, color: Colors.white),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Icon(Icons.location_on_rounded, color: Color(0xFFEF4444), size: 14),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            ride.dropoffAddress,
                            style: const TextStyle(fontSize: 13, color: Colors.white),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    const Divider(color: Color(0x18C8A96A), height: 1),
                    const SizedBox(height: 10),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          ride.vehicleClass ?? 'Cadillac Escalade ESV',
                          style: const TextStyle(fontSize: 11, color: Color(0xFF6B7280)),
                        ),
                        Text(
                          ride.driverName != null ? 'Specialist: ${ride.driverName}' : 'View Details →',
                          style: const TextStyle(fontSize: 11, color: Color(0xFFC8A96A), fontWeight: FontWeight.w600),
                        ),
                      ],
                    ),
                    if (!upcoming) ...[
                      const SizedBox(height: 12),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.end,
                        children: [
                          OutlinedButton.icon(
                            style: OutlinedButton.styleFrom(
                              side: const BorderSide(color: Color(0x33C8A96A)),
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                              minimumSize: Size.zero,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                            ),
                            icon: const Icon(Icons.receipt_long_rounded, size: 13, color: Color(0xFFDFBE82)),
                            label: const Text('INVOICE', style: TextStyle(fontSize: 10, color: Color(0xFFDFBE82), fontWeight: FontWeight.bold)),
                            onPressed: () {
                              ArcherToast.show(
                                context,
                                message: 'Corporate Expense PDF for Mission #${ride.reference} sent to your email.',
                                icon: Icons.mark_email_read_rounded,
                              );
                            },
                          ),
                          const SizedBox(width: 8),
                          ElevatedButton.icon(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0x22C8A96A),
                              foregroundColor: const Color(0xFFDFBE82),
                              side: const BorderSide(color: Color(0x44C8A96A)),
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                              minimumSize: Size.zero,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                              elevation: 0,
                            ),
                            icon: const Icon(Icons.replay_rounded, size: 13),
                            label: const Text('REBOOK', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold)),
                            onPressed: () {
                              setState(() {
                                _pickupController.text = ride.pickupAddress;
                                _dropoffController.text = ride.dropoffAddress;
                                _tabIndex = 1;
                              });
                              _calculateQuote();
                            },
                          ),
                        ],
                      ),
                    ],
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  void _showRideDetailSheet(Ride ride) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: const Color(0xFF0C1018),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        side: BorderSide(color: Color(0x44C8A96A), width: 1.2),
      ),
      builder: (context) {
        return DraggableScrollableSheet(
          initialChildSize: 0.72,
          maxChildSize: 0.92,
          minChildSize: 0.5,
          expand: false,
          builder: (context, scrollController) {
            return ListView(
              controller: scrollController,
              padding: const EdgeInsets.fromLTRB(22, 16, 22, 32),
              children: [
                // Drag handle
                Center(
                  child: Container(
                    width: 38,
                    height: 4,
                    decoration: BoxDecoration(
                      color: const Color(0x44C8A96A),
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                const SizedBox(height: 18),

                // Top Header Row
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'MISSION DOSSIER #${ride.reference}',
                          style: const TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 1.8,
                            color: Color(0xFFDFBE82),
                            fontFamily: 'serif',
                          ),
                        ),
                        const SizedBox(height: 2),
                        const Text(
                          'Executive Chauffeur Detail • Telemetry Monitored',
                          style: TextStyle(fontSize: 11, color: Color(0xFF9CA3AF)),
                        ),
                      ],
                    ),
                    IconButton(
                      icon: const Icon(Icons.close_rounded, color: Color(0xFF9CA3AF)),
                      onPressed: () => Navigator.pop(context),
                    ),
                  ],
                ),
                const SizedBox(height: 18),

                // Live Interactive Route Map Canvas (Uber-Style with Street Grid, Route Polyline & Pins)
                ArcherLiveRouteMapWidget(
                  pickup: ride.pickupAddress,
                  dropoff: ride.dropoffAddress,
                  driverName: ride.driverName,
                  vehicleInfo: ride.vehicleClass,
                  status: ride.status,
                ),
                const SizedBox(height: 14),

                // Route Vector Embarkation & Arrival Card
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: const Color(0xFF131826),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0x33C8A96A)),
                  ),
                  child: Column(
                    children: [
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Column(
                            children: [
                              Container(
                                width: 12,
                                height: 12,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  border: Border.all(color: const Color(0xFFC8A96A), width: 2.5),
                                ),
                              ),
                              Container(width: 1.5, height: 36, color: const Color(0x33C8A96A)),
                              const Icon(Icons.location_on_rounded, color: Color(0xFFEF4444), size: 16),
                            ],
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  'PICKUP EMBARKATION',
                                  style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, letterSpacing: 1.2, color: Color(0xFFC8A96A)),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  ride.pickupAddress,
                                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Colors.white),
                                ),
                                const SizedBox(height: 16),
                                const Text(
                                  'DESTINATION ARRIVAL',
                                  style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, letterSpacing: 1.2, color: Color(0xFFEF4444)),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  ride.dropoffAddress,
                                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Colors.white),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 14),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        decoration: BoxDecoration(
                          color: const Color(0xFF0F1420),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: const Color(0x22C8A96A)),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Row(
                              children: [
                                Icon(Icons.flight_land_rounded, size: 16, color: Color(0xFF10B981)),
                                SizedBox(width: 8),
                                Text(
                                  'Flight Telemetry Sync Active',
                                  style: TextStyle(fontSize: 11, color: Color(0xFFD1D5DB)),
                                ),
                              ],
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: const Color(0x2210B981),
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: const Text(
                                'ON TIME',
                                style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: Color(0xFF10B981)),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),

                // 1. Chauffeur Specialist Dossier (Name, Details, Experience)
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: const Color(0xFF131826),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0x33C8A96A)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            width: 50,
                            height: 50,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: const Color(0xFF1A2234),
                              border: Border.all(color: const Color(0xFFC8A96A), width: 1.5),
                            ),
                            child: const Center(
                              child: Icon(Icons.person_rounded, color: Color(0xFFDFBE82), size: 28),
                            ),
                          ),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Text(
                                      ride.driverName ?? 'Marcus Vance',
                                      style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: Colors.white),
                                    ),
                                    const SizedBox(width: 6),
                                    const Icon(Icons.verified_rounded, size: 15, color: Color(0xFF10B981)),
                                  ],
                                ),
                                const SizedBox(height: 3),
                                const Text(
                                  'Tier-1 Armed Specialist • Dignitary Escort',
                                  style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFFDFBE82)),
                                ),
                                const SizedBox(height: 3),
                                Row(
                                  children: [
                                    const Icon(Icons.star_rounded, size: 14, color: Color(0xFFC8A96A)),
                                    const SizedBox(width: 3),
                                    const Text('4.99 Rating', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.white)),
                                    const SizedBox(width: 8),
                                    Text('• 14+ Yrs Experience', style: TextStyle(fontSize: 11, color: Colors.grey[400])),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      const Divider(color: Color(0x22C8A96A), height: 1),
                      const SizedBox(height: 10),
                      Text(
                        ride.driverBio ?? 'Former US Secret Service & State Dignitary Protection Specialist. 14+ years in defensive vehicle handling, precision motorcades, and route threat assessment.',
                        style: const TextStyle(fontSize: 12, height: 1.45, color: Color(0xFFD1D5DB)),
                      ),
                      const SizedBox(height: 10),
                      Wrap(
                        spacing: 6,
                        runSpacing: 6,
                        children: [
                          _buildDossierTag('Defensive Driving Cert'),
                          _buildDossierTag('Secret Service Protocol'),
                          _buildDossierTag('First Aid / CPR'),
                          _buildDossierTag('Live Threat Vetted'),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 14),

                // 2. Assigned Vehicle Details Dossier (Make, Model, Plate, Spec)
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: const Color(0xFF131826),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0x33C8A96A)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Row(
                            children: [
                              const Icon(Icons.directions_car_filled_rounded, color: Color(0xFFC8A96A), size: 18),
                              const SizedBox(width: 8),
                              Text(
                                (ride.vehicleModel ?? ride.vehicleClass ?? 'Cadillac Escalade ESV').toUpperCase(),
                                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800, letterSpacing: 0.8, color: Colors.white),
                              ),
                            ],
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: const Color(0x22C8A96A),
                              borderRadius: BorderRadius.circular(6),
                              border: Border.all(color: const Color(0x44C8A96A)),
                            ),
                            child: Text(
                              ride.vehiclePlate ?? 'ARC-740',
                              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w900, letterSpacing: 1.2, color: Color(0xFFDFBE82)),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),
                      Text(
                        'Class: ${ride.tierName ?? "1st Class Full-Size SUV"} • Black Sapphire Exterior • Ebony Leather Interior',
                        style: const TextStyle(fontSize: 11, color: Color(0xFF9CA3AF)),
                      ),
                      const SizedBox(height: 10),
                      const Row(
                        children: [
                          _VehicleAmenityChip(icon: Icons.shield_rounded, label: 'Ballistic Glass'),
                          SizedBox(width: 8),
                          _VehicleAmenityChip(icon: Icons.wifi_rounded, label: '5G Wi-Fi'),
                          SizedBox(width: 8),
                          _VehicleAmenityChip(icon: Icons.water_drop_rounded, label: 'Fiji Water'),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),

                // Action Buttons (PDF INVOICE removed per user request, replaced with Call Driver & Dispatch Line)
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        style: OutlinedButton.styleFrom(
                          side: const BorderSide(color: Color(0x55C8A96A)),
                          backgroundColor: const Color(0xFF131826),
                          foregroundColor: const Color(0xFFDFBE82),
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        icon: const Icon(Icons.phone_rounded, size: 16),
                        label: const Text('CALL CHAUFFEUR', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 1.0)),
                        onPressed: () {
                          Navigator.pop(context);
                          ArcherToast.show(
                            context,
                            message: 'Direct intercom connecting to ${ride.driverName ?? "assigned chauffeur"}...',
                            icon: Icons.phone_forwarded_rounded,
                          );
                        },
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFFC8A96A),
                          foregroundColor: Colors.black,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        icon: const Icon(Icons.support_agent_rounded, size: 16),
                        label: const Text('DISPATCH LINE', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, letterSpacing: 1.0)),
                        onPressed: () {
                          Navigator.pop(context);
                          ArcherToast.show(
                            context,
                            message: 'Connecting to Archer Priority Dispatch (+1 848-231-9997)...',
                            icon: Icons.phone_forwarded_rounded,
                          );
                        },
                      ),
                    ),
                  ],
                ),
              ],
            );
          },
        );
      },
    );
  }

  Widget _buildDossierTag(String label) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3.5),
      decoration: BoxDecoration(
        color: const Color(0x18C8A96A),
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: const Color(0x33C8A96A)),
      ),
      child: Text(
        label,
        style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: Color(0xFFDFBE82)),
      ),
    );
  }

  // ----------------------------------------------------------------------
  // 5. ACCOUNT TAB (EXECUTIVE PROFILE, DELEGATES, SETTINGS)
  // ----------------------------------------------------------------------
  Widget _buildAccountTab() {
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 24, 20, 180),
      children: [
        const Text(
          'EXECUTIVE PROFILE',
          style: TextStyle(
            fontSize: 11,
            letterSpacing: 2.2,
            fontWeight: FontWeight.bold,
            color: Color(0xFFC8A96A),
          ),
        ),
        const SizedBox(height: 16),

        // Principal info card
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: const Color(0xFF0F121A),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: const Color(0x22C8A96A)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    _user?.name ?? 'Executive Client',
                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white, fontFamily: 'serif'),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: const Color(0x22C8A96A),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: const Text('TIER 1 VIP', style: TextStyle(color: Color(0xFFDFBE82), fontSize: 9, fontWeight: FontWeight.bold)),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              Text(
                _user?.email ?? '',
                style: const TextStyle(fontSize: 13, color: Color(0xFF9CA3AF)),
              ),
              if (_user?.phone != null) ...[
                const SizedBox(height: 4),
                Text(
                  _user!.phone!,
                  style: const TextStyle(fontSize: 13, color: Color(0xFF6B7280)),
                ),
              ],
            ],
          ),
        ),
        const SizedBox(height: 20),

        // Default Residence (Connected to PUT /customer/profile)
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: const Color(0xFF0F121A),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: const Color(0x22C8A96A)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'DEFAULT RESIDENCE / DEPARTURE ADDRESS',
                style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 1.5, color: Color(0xFFC8A96A)),
              ),
              const SizedBox(height: 12),
              Container(
                decoration: BoxDecoration(
                  color: const Color(0xFF131722),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: const Color(0x18C8A96A)),
                ),
                child: TextField(
                  controller: _homeAddressController,
                  style: const TextStyle(color: Colors.white, fontSize: 13),
                  decoration: const InputDecoration(
                    labelText: 'Home Address',
                    labelStyle: TextStyle(color: Color(0xFF9CA3AF), fontSize: 12),
                    hintText: 'e.g. 14 Berkeley Square, Mayfair',
                    hintStyle: TextStyle(color: Color(0xFF4B5563), fontSize: 12),
                    prefixIcon: Icon(Icons.home_rounded, color: Color(0xFFC8A96A), size: 18),
                    border: InputBorder.none,
                    contentPadding: EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  ),
                ),
              ),
              if (_accountFeedback != null) ...[
                const SizedBox(height: 8),
                Text(
                  _accountFeedback!,
                  style: const TextStyle(fontSize: 12, color: Color(0xFFDFBE82)),
                ),
              ],
              const SizedBox(height: 14),
              Container(
                height: 42,
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFFDFBE82), Color(0xFFC8A96A), Color(0xFF9E7D3B)],
                  ),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.transparent,
                    shadowColor: Colors.transparent,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  onPressed: _savingHome ? null : _saveHomeAddress,
                  child: _savingHome
                      ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.black))
                      : const Text(
                          'UPDATE RESIDENCE ADDRESS',
                          style: TextStyle(color: Colors.black, fontWeight: FontWeight.w700, fontSize: 11, letterSpacing: 1.0),
                        ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),

        // Executive Assistant (EA/PA) Booking Sync
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: const Color(0xFF0F121A),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: const Color(0x22C8A96A)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'EXECUTIVE ASSISTANT (EA/PA) DELEGATES',
                    style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 1.5, color: Color(0xFFC8A96A)),
                  ),
                  Icon(Icons.people_alt_outlined, color: Color(0xFFC8A96A), size: 16),
                ],
              ),
              const SizedBox(height: 8),
              const Text(
                'Authorized staff permitted to book reservations and manage itinerary manifests.',
                style: TextStyle(fontSize: 12, color: Color(0xFF9CA3AF)),
              ),
              const SizedBox(height: 12),
              if (_assistantProfiles.isEmpty) ...[
                const Text(
                  'No secondary EA/PA accounts registered. Contact Concierge to authorize staff.',
                  style: TextStyle(fontSize: 12, color: Color(0xFF6B7280)),
                ),
              ] else ...[
                ..._assistantProfiles.map((asst) {
                  return ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: const Icon(Icons.person, color: Color(0xFFC8A96A), size: 20),
                    title: Text(asst['name']?.toString() ?? 'Executive Assistant', style: const TextStyle(fontSize: 13, color: Colors.white)),
                    subtitle: Text(asst['email']?.toString() ?? '', style: const TextStyle(fontSize: 11, color: Color(0xFF6B7280))),
                  );
                }),
              ],
            ],
          ),
        ),
        const SizedBox(height: 20),

        // Action options
        Container(
          decoration: BoxDecoration(
            color: const Color(0xFF0F121A),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: const Color(0x22C8A96A)),
          ),
          child: Column(
            children: [
              ListTile(
                leading: const Icon(Icons.play_circle_outline_rounded, color: Color(0xFFC8A96A), size: 20),
                title: const Text('Replay Introduction Tutorial', style: TextStyle(fontSize: 13, color: Colors.white)),
                trailing: const Icon(Icons.arrow_forward_ios_rounded, size: 12, color: Color(0xFF6B7280)),
                onTap: widget.onReplayTutorial,
              ),
              const Divider(color: Color(0x18C8A96A), height: 1),
              ListTile(
                leading: const Icon(Icons.logout_rounded, color: Color(0xFFEF4444), size: 20),
                title: const Text('Sign Out of Archer Account', style: TextStyle(fontSize: 13, color: Color(0xFFEF4444))),
                trailing: const Icon(Icons.arrow_forward_ios_rounded, size: 12, color: Color(0xFF6B7280)),
                onTap: _handleLogoutConfirmation,
              ),
            ],
          ),
        ),
        const SizedBox(height: 28),
        Center(
          child: Column(
            children: [
              Text(
                'ARCHER EXECUTIVE SERVICES',
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 2.5,
                  color: const Color(0xFFC8A96A).withOpacity(0.7),
                  fontFamily: 'serif',
                ),
              ),
              const SizedBox(height: 4),
              const Text(
                'Version 1.0.0 (Build 8) • Production Tier 1',
                style: TextStyle(fontSize: 11, color: Color(0xFF6B7280)),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _LuxuryNavItem {
  final IconData icon;
  final IconData activeIcon;
  final String label;
  final int? badgeCount;

  const _LuxuryNavItem({
    required this.icon,
    required this.activeIcon,
    required this.label,
    this.badgeCount,
  });
}

class _VehicleAmenityChip extends StatelessWidget {
  final IconData icon;
  final String label;

  const _VehicleAmenityChip({
    required this.icon,
    required this.label,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: const Color(0xFF0F1420),
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: const Color(0x22C8A96A)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: const Color(0xFFDFBE82)),
          const SizedBox(width: 4),
          Text(
            label,
            style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: Color(0xFFD1D5DB)),
          ),
        ],
      ),
    );
  }
}

/// High-contrast live interactive route map canvas matching executive telemetry
class ArcherLiveRouteMapWidget extends StatefulWidget {
  final String pickup;
  final String dropoff;
  final String? driverName;
  final String? vehicleInfo;
  final String? status;

  const ArcherLiveRouteMapWidget({
    super.key,
    required this.pickup,
    required this.dropoff,
    this.driverName,
    this.vehicleInfo,
    this.status,
  });

  @override
  State<ArcherLiveRouteMapWidget> createState() => _ArcherLiveRouteMapWidgetState();
}

class _ArcherLiveRouteMapWidgetState extends State<ArcherLiveRouteMapWidget> with SingleTickerProviderStateMixin {
  late AnimationController _pulseController;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2000),
    )..repeat();
  }

  @override
  void dispose() {
    _pulseController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 200,
      width: double.infinity,
      decoration: BoxDecoration(
        color: const Color(0xFFE5EBF2),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0x44C8A96A), width: 1.2),
        boxShadow: const [
          BoxShadow(
            color: Color(0x33000000),
            blurRadius: 10,
            offset: Offset(0, 4),
          ),
        ],
      ),
      clipBehavior: Clip.antiAlias,
      child: Stack(
        children: [
          // Live Custom Map Canvas
          Positioned.fill(
            child: AnimatedBuilder(
              animation: _pulseController,
              builder: (context, child) {
                return CustomPaint(
                  painter: _UberStyleMapPainter(
                    pulseProgress: _pulseController.value,
                    pickupName: widget.pickup.split(',').first,
                    dropoffName: widget.dropoff.split(',').first,
                  ),
                );
              },
            ),
          ),

          // Top Info Pill
          Positioned(
            top: 10,
            left: 10,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
              decoration: BoxDecoration(
                color: const Color(0xF00F1420),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0x55C8A96A), width: 1),
                boxShadow: const [
                  BoxShadow(color: Colors.black38, blurRadius: 6),
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
                        BoxShadow(color: Color(0xFF10B981), blurRadius: 4, spreadRadius: 1),
                      ],
                    ),
                  ),
                  const SizedBox(width: 6),
                  const Text(
                    'LIVE RADAR • ON TIME',
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 0.8,
                      color: Color(0xFFDFBE82),
                    ),
                  ),
                ],
              ),
            ),
          ),

          // ETA Pill Top Right
          Positioned(
            top: 10,
            right: 10,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
              decoration: BoxDecoration(
                color: const Color(0xF010B981),
                borderRadius: BorderRadius.circular(12),
                boxShadow: const [
                  BoxShadow(color: Colors.black26, blurRadius: 4),
                ],
              ),
              child: const Text(
                'ETA: 14 MIN',
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 0.8,
                  color: Colors.black,
                ),
              ),
            ),
          ),

          // Zoom simulator buttons bottom-right
          Positioned(
            bottom: 8,
            right: 8,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 26,
                  height: 26,
                  decoration: BoxDecoration(
                    color: const Color(0xF0FFFFFF),
                    borderRadius: BorderRadius.circular(6),
                    boxShadow: const [BoxShadow(color: Colors.black12, blurRadius: 3)],
                  ),
                  child: const Center(child: Icon(Icons.add, size: 16, color: Colors.black87)),
                ),
                const SizedBox(height: 4),
                Container(
                  width: 26,
                  height: 26,
                  decoration: BoxDecoration(
                    color: const Color(0xF0FFFFFF),
                    borderRadius: BorderRadius.circular(6),
                    boxShadow: const [BoxShadow(color: Colors.black12, blurRadius: 3)],
                  ),
                  child: const Center(child: Icon(Icons.remove, size: 16, color: Colors.black87)),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _UberStyleMapPainter extends CustomPainter {
  final double pulseProgress;
  final String pickupName;
  final String dropoffName;

  _UberStyleMapPainter({
    required this.pulseProgress,
    required this.pickupName,
    required this.dropoffName,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width;
    final h = size.height;

    // 1. Base Map Background
    final bgPaint = Paint()..color = const Color(0xFFE8EEF5);
    canvas.drawRect(Rect.fromLTWH(0, 0, w, h), bgPaint);

    // 2. Water / Park Feature Contours
    final waterPaint = Paint()..color = const Color(0xFFD4E2EE);
    final waterPath = Path();
    waterPath.moveTo(w * 0.52, h * 0.22);
    waterPath.cubicTo(w * 0.58, h * 0.18, w * 0.68, h * 0.24, w * 0.72, h * 0.36);
    waterPath.cubicTo(w * 0.70, h * 0.44, w * 0.60, h * 0.48, w * 0.54, h * 0.40);
    waterPath.close();
    canvas.drawPath(waterPath, waterPaint);

    // 3. Road Network Grid (Streets & Arteries)
    final roadCasing = Paint()
      ..color = const Color(0xFFD5DCE6)
      ..strokeWidth = 3.5
      ..style = PaintingStyle.stroke;

    final roadSurface = Paint()
      ..color = Colors.white
      ..strokeWidth = 2.4
      ..style = PaintingStyle.stroke;

    final highwayPaint = Paint()
      ..color = const Color(0xFF9FB6CD)
      ..strokeWidth = 3.0
      ..style = PaintingStyle.stroke;

    // Highway NH-5 / I-95 Diagonal Arterial
    final highwayPath = Path();
    highwayPath.moveTo(w * 0.25, h * 1.05);
    highwayPath.lineTo(w * 0.85, h * 0.40);
    highwayPath.lineTo(w * 1.05, h * 0.30);
    canvas.drawPath(highwayPath, roadCasing);
    canvas.drawPath(highwayPath, highwayPaint);

    // Secondary street grid lines
    final streetLines = [
      [Offset(0, h * 0.35), Offset(w, h * 0.35)],
      [Offset(0, h * 0.65), Offset(w, h * 0.65)],
      [Offset(w * 0.25, 0), Offset(w * 0.25, h)],
      [Offset(w * 0.50, 0), Offset(w * 0.50, h)],
      [Offset(w * 0.78, 0), Offset(w * 0.78, h)],
      [Offset(w * 0.10, h * 0.85), Offset(w * 0.90, h * 0.15)],
      [Offset(w * 0.35, h * 0.95), Offset(w * 0.95, h * 0.45)],
    ];

    for (final line in streetLines) {
      canvas.drawLine(line[0], line[1], roadCasing);
      canvas.drawLine(line[0], line[1], roadSurface);
    }

    // 4. Map Geographic Labels & Highway Badges
    final textPainter = TextPainter(textDirection: TextDirection.ltr);

    void drawMapLabel(String text, Offset pos, {bool isHighway = false}) {
      textPainter.text = TextSpan(
        text: text,
        style: TextStyle(
          fontSize: isHighway ? 9 : 8.5,
          fontWeight: isHighway ? FontWeight.w800 : FontWeight.w600,
          color: isHighway ? const Color(0xFF334155) : const Color(0xFF64748B),
          letterSpacing: 0.2,
        ),
      );
      textPainter.layout();
      textPainter.paint(canvas, pos);
    }

    drawMapLabel('Metro Airport Hub (JFK / EWR)', Offset(w * 0.52, h * 0.44));
    drawMapLabel('Executive Corridor', Offset(w * 0.12, h * 0.28));
    drawMapLabel('NH5 / I-95 EXPRESS', Offset(w * 0.52, h * 0.78), isHighway: true);

    // 5. Route Polyline (High-Contrast Bold Black Path, Matching Uber Screenshot)
    final routeCasing = Paint()
      ..color = Colors.black.withOpacity(0.18)
      ..strokeWidth = 6.0
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round
      ..style = PaintingStyle.stroke;

    final routePaint = Paint()
      ..color = const Color(0xFF111827)
      ..strokeWidth = 3.6
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round
      ..style = PaintingStyle.stroke;

    final startPoint = Offset(w * 0.68, h * 0.80);
    final p1 = Offset(w * 0.58, h * 0.68);
    final p2 = Offset(w * 0.62, h * 0.54);
    final p3 = Offset(w * 0.44, h * 0.38);
    final p4 = Offset(w * 0.48, h * 0.28);
    final endPoint = Offset(w * 0.42, h * 0.16);

    final routePath = Path();
    routePath.moveTo(startPoint.dx, startPoint.dy);
    routePath.lineTo(p1.dx, p1.dy);
    routePath.lineTo(p2.dx, p2.dy);
    routePath.lineTo(p3.dx, p3.dy);
    routePath.lineTo(p4.dx, p4.dy);
    routePath.lineTo(endPoint.dx, endPoint.dy);

    canvas.drawPath(routePath, routeCasing);
    canvas.drawPath(routePath, routePaint);

    // 6. Start Pin (Circular Ring with Black Dot, exactly matching Uber style)
    final pickupHalo = Paint()..color = Colors.white;
    final pickupOuter = Paint()
      ..color = const Color(0xFF111827)
      ..strokeWidth = 2.4
      ..style = PaintingStyle.stroke;
    final pickupInner = Paint()..color = const Color(0xFF111827);

    canvas.drawCircle(startPoint, 7, pickupHalo);
    canvas.drawCircle(startPoint, 7, pickupOuter);
    canvas.drawCircle(startPoint, 2.5, pickupInner);

    // 7. Destination Pin (Black Solid Square with White Center Dot, matching Uber)
    final dropoffRect = Rect.fromCenter(center: endPoint, width: 12, height: 12);
    final dropoffOuter = Paint()..color = const Color(0xFF111827);
    final dropoffInner = Paint()..color = Colors.white;

    canvas.drawRect(dropoffRect, dropoffOuter);
    canvas.drawRect(Rect.fromCenter(center: endPoint, width: 4, height: 4), dropoffInner);

    // 8. Chauffeur Car Marker with Live Pulsing Radar Beacon
    final carPoint = Offset(w * 0.49, h * 0.44);

    final radarPaint = Paint()
      ..color = const Color(0xFF10B981).withOpacity((1.0 - pulseProgress) * 0.5)
      ..style = PaintingStyle.fill;
    canvas.drawCircle(carPoint, 10 + (pulseProgress * 14), radarPaint);

    final carHalo = Paint()..color = Colors.white;
    final carBg = Paint()..color = const Color(0xFF111827);
    canvas.drawCircle(carPoint, 8, carHalo);
    canvas.drawCircle(carPoint, 6.5, carBg);

    final carDot = Paint()..color = const Color(0xFFDFBE82);
    canvas.drawCircle(carPoint, 2.8, carDot);
  }

  @override
  bool shouldRepaint(covariant _UberStyleMapPainter oldDelegate) {
    return oldDelegate.pulseProgress != pulseProgress ||
        oldDelegate.pickupName != pickupName ||
        oldDelegate.dropoffName != dropoffName;
  }
}
