import 'package:flutter/material.dart';
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
        actions: [
          TextButton.icon(
            icon: const Icon(Icons.info_outline, size: 15, color: Color(0xFFC8A96A)),
            label: const Text(
              'Tutorial',
              style: TextStyle(
                color: Color(0xFFC8A96A),
                fontSize: 12,
                letterSpacing: 1.0,
                fontWeight: FontWeight.w500,
              ),
            ),
            onPressed: widget.onReplayTutorial,
          ),
          const SizedBox(width: 8),
        ],
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
  bool _isLoading = true;
  CustomerUser? _user;
  List<Ride> _rides = [];
  List<dynamic> _assistantProfiles = [];
  Ride? _nextRide;

  // Booking form state
  String _selectedService = 'airport';
  String _selectedVehicleClass = 'suv';
  final _pickupController = TextEditingController();
  final _dropoffController = TextEditingController();
  DateTime _pickupDateTime = DateTime.now().add(const Duration(hours: 4));
  bool _armedChauffeur = false;
  bool _convoyEscort = false;
  double? _estimatedPrice;
  bool _calculatingQuote = false;
  bool _bookingConfirmed = false;
  bool _submittingBooking = false;
  String? _bookingReference;
  String? _bookingMessage;

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

  Future<void> _calculateQuote() async {
    final pickup = _pickupController.text.trim();
    final dropoff = _dropoffController.text.trim();

    if (pickup.isEmpty || dropoff.isEmpty) {
      ArcherToast.show(
        context,
        message: 'Please specify both pickup and destination locations.',
        icon: Icons.edit_location_alt_rounded,
        isError: true,
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
          'service_type': _selectedService,
          'vehicle_class': _selectedVehicleClass,
          'armed_chauffeur': _armedChauffeur,
          'convoy_escort': _convoyEscort,
        },
      );

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

      if (mounted) setState(() => _estimatedPrice = total);
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
    if (dropoff.isEmpty) {
      ArcherToast.show(
        context,
        message: 'Please specify your destination arrival address.',
        icon: Icons.location_on_rounded,
        isError: true,
      );
      return;
    }

    setState(() => _submittingBooking = true);
    try {
      final parts = (_user?.name ?? 'Executive Client').trim().split(' ');
      final firstName = parts.first;
      final lastName = parts.length > 1 ? parts.sublist(1).join(' ') : 'Client';

      final res = await widget.api.post<Map<String, dynamic>>(
        '/booking-requests',
        data: {
          'request_type': _selectedService == 'airport'
              ? 'airport'
              : (_selectedService == 'point_to_point' ? 'point_to_point' : 'general'),
          'service': _selectedService == 'point_to_point' ? 'p2p' : _selectedService,
          'first_name': firstName,
          'last_name': lastName,
          'email': _user?.email ?? 'client@example.com',
          'phone': _user?.phone ?? '+18482319997',
          'pickup_address': pickup,
          'dropoff_address': dropoff,
          'date': _pickupDateTime.toIso8601String().split('T').first,
          'time': '${_pickupDateTime.hour.toString().padLeft(2, '0')}:${_pickupDateTime.minute.toString().padLeft(2, '0')}',
          'tier': 1,
          'vehicle_class': _selectedVehicleClass,
          'guards': _armedChauffeur ? 1 : 0,
          'terms_accepted': true,
        },
      );

      final ref = res['reference']?.toString() ?? 'CONFIRMED';
      final msg = res['message']?.toString() ?? 'Your executive reservation has been received by Archer Dispatch.';

      if (mounted) {
        setState(() {
          _bookingReference = ref;
          _bookingMessage = msg;
          _bookingConfirmed = true;
        });
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
      profileInitials: _getProfileInitials(_user?.name),
      onProfileTap: () {
        HapticFeedback.selectionClick();
        setState(() => _tabIndex = 4);
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
        const SizedBox(width: 4),
        IconButton(
          icon: const Icon(Icons.help_outline_rounded, size: 18, color: Color(0xFF9CA3AF)),
          constraints: const BoxConstraints(minWidth: 34, minHeight: 34),
          padding: EdgeInsets.zero,
          tooltip: 'Tutorial & Guide',
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
      return const ArcherLoaderWidget(tagline: 'Accessing Archer Vault');
    }

    final upcomingCount = _rides.where((r) => r.status != 'completed' && r.status != 'cancelled').length;

    return Scaffold(
      backgroundColor: const Color(0xFF07080B),
      extendBody: true,
      appBar: _buildTopNav(upcomingCount),
      body: GestureDetector(
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
      bottomNavigationBar: _buildModernLuxuryNavbar(upcomingCount),
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
      const _LuxuryNavItem(
        icon: Icons.person_outline_rounded,
        activeIcon: Icons.person_rounded,
        label: 'Profile',
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
                        setState(() => _tabIndex = index);
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

  // ----------------------------------------------------------------------
  // 1. HOME DASHBOARD TAB (HAUTE LUXURY MINIMALIST)
  // ----------------------------------------------------------------------
  Widget _buildHomeDashboardTab() {
    final firstName = _user?.name.trim().split(' ').first ?? 'Principal';

    return RefreshIndicator(
      onRefresh: _loadAllData,
      color: const Color(0xFFC8A96A),
      child: ListView(
        padding: const EdgeInsets.fromLTRB(20, 24, 20, 110),
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

          // Minimalist "Where to?" Search Bar
          GestureDetector(
            onTap: () => setState(() => _tabIndex = 1),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 15),
              decoration: BoxDecoration(
                color: const Color(0xFF0F121A),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: const Color(0x33C8A96A)),
              ),
              child: const Row(
                children: [
                  Icon(Icons.search_rounded, color: Color(0xFFC8A96A), size: 20),
                  SizedBox(width: 14),
                  Expanded(
                    child: Text(
                      'Destination, Private FBO, or As-Directed...',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w400,
                        color: Color(0xFF9CA3AF),
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  Icon(Icons.calendar_month_outlined, color: Color(0xFFC8A96A), size: 16),
                  SizedBox(width: 6),
                  Text(
                    'Schedule',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFFC8A96A),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 30),

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
  // ----------------------------------------------------------------------
  Widget _buildBookTab() {
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 24, 20, 110),
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
          'Select your itinerary, luxury vehicle class, and security enhancements.',
          style: TextStyle(fontSize: 13, color: Color(0xFF9CA3AF)),
        ),
        const SizedBox(height: 22),

        // Service Type Selector Chips
        const Text('Service Type', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF6B7280))),
        const SizedBox(height: 10),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            _buildLuxuryServiceChip('airport', 'Airport Transfer'),
            _buildLuxuryServiceChip('point_to_point', 'Point to Point'),
            _buildLuxuryServiceChip('hourly', 'Hourly As-Directed'),
            _buildLuxuryServiceChip('client_car', 'Client Vehicle Chauffeur'),
          ],
        ),
        const SizedBox(height: 22),

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
              labelText: 'Departure Location',
              labelStyle: TextStyle(color: Color(0xFF9CA3AF), fontSize: 13),
              hintText: 'Private FBO, hotel, or residence',
              hintStyle: TextStyle(color: Color(0xFF4B5563), fontSize: 12),
              prefixIcon: Icon(Icons.trip_origin_rounded, color: Color(0xFFC8A96A), size: 20),
              border: InputBorder.none,
              contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            ),
          ),
        ),
        const SizedBox(height: 12),

        // Destination Location Input
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
              labelText: 'Destination Location',
              labelStyle: TextStyle(color: Color(0xFF9CA3AF), fontSize: 13),
              hintText: 'Destination address or as directed',
              hintStyle: TextStyle(color: Color(0xFF4B5563), fontSize: 12),
              prefixIcon: Icon(Icons.location_on_rounded, color: Color(0xFFEF4444), size: 20),
              border: InputBorder.none,
              contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            ),
          ),
        ),
        const SizedBox(height: 24),

        // Vehicle Class Selection
        const Text('Executive Vehicle Class', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF6B7280))),
        const SizedBox(height: 10),
        Row(
          children: [
            Expanded(
              child: _buildLuxuryVehicleCard(
                keyName: 'suv',
                title: 'Cadillac Escalade ESV',
                specs: 'Up to 6 guests • 6 bags • Wi-Fi',
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _buildLuxuryVehicleCard(
                keyName: 'sedan',
                title: 'Mercedes S-Class',
                specs: 'Up to 3 guests • Executive seating',
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        Row(
          children: [
            Expanded(
              child: _buildLuxuryVehicleCard(
                keyName: 'sprinter',
                title: 'Executive Sprinter Jet',
                specs: 'Up to 12 guests • Boardroom layout',
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _buildLuxuryVehicleCard(
                keyName: 'armored',
                title: 'B6 Armored Suburban',
                specs: 'Ballistic armoring • Run-flat tires',
              ),
            ),
          ],
        ),
        const SizedBox(height: 22),

        // Security Add-ons
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
                  Icon(Icons.shield_rounded, color: Color(0xFFC8A96A), size: 16),
                  SizedBox(width: 8),
                  Text(
                    'SECURITY PROTOCOL ENHANCEMENTS',
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 1.5,
                      color: Color(0xFFC8A96A),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                activeColor: const Color(0xFFC8A96A),
                title: const Text('Armed Protection Specialist Chauffeur', style: TextStyle(fontSize: 13, color: Colors.white)),
                subtitle: const Text('Tier-1 licensed close protection specialist driver', style: TextStyle(fontSize: 11, color: Color(0xFF6B7280))),
                value: _armedChauffeur,
                onChanged: (v) => setState(() => _armedChauffeur = v),
              ),
              const Divider(color: Color(0x18C8A96A), height: 16),
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                activeColor: const Color(0xFFC8A96A),
                title: const Text('Convoy Chase / Escort Vehicle', style: TextStyle(fontSize: 13, color: Colors.white)),
                subtitle: const Text('Secondary escort vehicle with 2 tactical protection specialists', style: TextStyle(fontSize: 11, color: Color(0xFF6B7280))),
                value: _convoyEscort,
                onChanged: (v) => setState(() => _convoyEscort = v),
              ),
            ],
          ),
        ),
        const SizedBox(height: 24),

        // Calculate Guaranteed Fare Button
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

        // Dynamic Quote Result Card
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
                      'GUARANTEED EXECUTIVE FARE',
                      style: TextStyle(
                        fontSize: 10,
                        letterSpacing: 1.8,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFFC8A96A),
                      ),
                    ),
                    Icon(Icons.check_circle_rounded, color: Color(0xFF10B981), size: 18),
                  ],
                ),
                const SizedBox(height: 12),
                Text(
                  '£${_estimatedPrice!.toStringAsFixed(2)}',
                  style: const TextStyle(
                    fontSize: 34,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0.5,
                    color: Color(0xFFDFBE82),
                    fontFamily: 'serif',
                  ),
                ),
                const SizedBox(height: 6),
                const Text(
                  'All-inclusive: Chauffeur meet & greet, vehicle telemetry tracking, fuel, toll surcharges, and gratuity.',
                  style: TextStyle(fontSize: 12, height: 1.4, color: Color(0xFF9CA3AF)),
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
                    child: Row(
                      children: [
                        const Icon(Icons.check_circle, color: Color(0xFF10B981), size: 20),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            _bookingMessage != null
                                ? '${_bookingReference != null ? "[${_bookingReference}] " : ""}${_bookingMessage!}'
                                : 'Reservation confirmed. Archer Dispatch has assigned this itinerary.',
                            style: const TextStyle(fontSize: 12, color: Colors.white, height: 1.4),
                          ),
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
                        _submittingBooking ? 'DISPATCHING MISSION...' : 'CONFIRM EXECUTIVE RESERVATION',
                        style: const TextStyle(color: Colors.black, fontWeight: FontWeight.w700, fontSize: 12, letterSpacing: 1.0),
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
      onTap: () => setState(() => _selectedService = key),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: selected ? const Color(0x22C8A96A) : const Color(0xFF0F121A),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: selected ? const Color(0xFFC8A96A) : const Color(0x22C8A96A),
            width: selected ? 1.4 : 1.0,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 11,
            fontWeight: selected ? FontWeight.bold : FontWeight.w500,
            color: selected ? const Color(0xFFDFBE82) : const Color(0xFF9CA3AF),
          ),
        ),
      ),
    );
  }

  Widget _buildLuxuryVehicleCard({
    required String keyName,
    required String title,
    required String specs,
  }) {
    final selected = _selectedVehicleClass == keyName;
    return GestureDetector(
      onTap: () => setState(() => _selectedVehicleClass = keyName),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: selected ? const Color(0x18C8A96A) : const Color(0xFF0F121A),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: selected ? const Color(0xFFC8A96A) : const Color(0x22C8A96A),
            width: selected ? 1.5 : 1,
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.bold,
                color: selected ? const Color(0xFFDFBE82) : Colors.white,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              specs,
              style: const TextStyle(fontSize: 10, color: Color(0xFF6B7280), height: 1.3),
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
      padding: const EdgeInsets.fromLTRB(20, 24, 20, 110),
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
        padding: const EdgeInsets.fromLTRB(18, 18, 18, 110),
        itemCount: filtered.length,
        itemBuilder: (context, idx) {
          final ride = filtered[idx];
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
      backgroundColor: const Color(0xFF0F121A),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        side: BorderSide(color: Color(0x33C8A96A)),
      ),
      builder: (context) {
        return Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Mission #${ride.reference}',
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: const Color(0x22C8A96A),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      ride.formattedStatus.toUpperCase(),
                      style: const TextStyle(color: Color(0xFFDFBE82), fontWeight: FontWeight.w600, fontSize: 11),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 18),
              const Text('ITINERARY', style: TextStyle(fontSize: 10, letterSpacing: 1.8, color: Color(0xFFC8A96A), fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              Text('Departure: ${ride.pickupAddress}', style: const TextStyle(fontSize: 13, color: Color(0xFF9CA3AF))),
              const SizedBox(height: 4),
              Text('Arrival: ${ride.dropoffAddress}', style: const TextStyle(fontSize: 13, color: Color(0xFF9CA3AF))),
              const SizedBox(height: 16),
              const Text('ASSIGNED CHAUFFEUR SPECIALIST', style: TextStyle(fontSize: 10, letterSpacing: 1.8, color: Color(0xFFC8A96A), fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              Text(
                ride.driverName ?? 'Assigned prior to departure by Archer Dispatch',
                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Colors.white),
              ),
              const SizedBox(height: 22),
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
                    'CALL DISPATCH FOR LIVE TELEMETRY',
                    style: TextStyle(color: Colors.black, fontWeight: FontWeight.w700, fontSize: 11, letterSpacing: 1.0),
                  ),
                  onPressed: () {
                    Navigator.pop(context);
                    ArcherToast.show(
                      context,
                      message: 'Contacting Archer Dispatch for live telemetry: (848) 231-9997',
                      icon: Icons.phone_in_talk_rounded,
                    );
                  },
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  // ----------------------------------------------------------------------
  // 5. ACCOUNT TAB (EXECUTIVE PROFILE, DELEGATES, SETTINGS)
  // ----------------------------------------------------------------------
  Widget _buildAccountTab() {
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 24, 20, 110),
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
