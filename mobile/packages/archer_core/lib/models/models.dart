class CustomerUser {
  final int id;
  final String name;
  final String email;
  final String? phone;
  final String? homeAddress;

  CustomerUser({
    required this.id,
    required this.name,
    required this.email,
    this.phone,
    this.homeAddress,
  });

  factory CustomerUser.fromJson(Map<String, dynamic> json) {
    final prefs = (json['preferences'] as Map<String, dynamic>?) ?? {};
    return CustomerUser(
      id: json['id'] is int ? json['id'] : int.tryParse(json['id']?.toString() ?? '0') ?? 0,
      name: json['name']?.toString() ?? '',
      email: json['email']?.toString() ?? '',
      phone: json['phone']?.toString(),
      homeAddress: json['home_address']?.toString() ?? prefs['home_address']?.toString(),
    );
  }
}

class DriverStats {
  final int totalRides;
  final int pendingRides;
  final int completedRides;
  final int unreadNotifications;

  DriverStats({
    this.totalRides = 0,
    this.pendingRides = 0,
    this.completedRides = 0,
    this.unreadNotifications = 0,
  });

  factory DriverStats.fromJson(Map<String, dynamic> json) {
    return DriverStats(
      totalRides: json['total_rides'] is int ? json['total_rides'] : 0,
      pendingRides: json['pending_rides'] is int ? json['pending_rides'] : 0,
      completedRides: json['completed_rides'] is int ? json['completed_rides'] : 0,
      unreadNotifications: json['unread_notifications'] is int ? json['unread_notifications'] : 0,
    );
  }
}

class DriverProfile {
  final String id;
  final String name;
  final String email;
  final String? phone;
  final bool isOnline;
  final String tier;
  final DriverStats stats;

  DriverProfile({
    required this.id,
    required this.name,
    required this.email,
    this.phone,
    this.isOnline = false,
    this.tier = 'Executive Chauffeur',
    required this.stats,
  });

  factory DriverProfile.fromJson(Map<String, dynamic> json) {
    final driver = (json['driver'] as Map<String, dynamic>?) ?? json;
    final statsJson = (json['stats'] as Map<String, dynamic>?) ?? {};
    final tierJson = driver['tier'] as Map<String, dynamic>?;

    return DriverProfile(
      id: driver['id']?.toString() ?? '',
      name: driver['name']?.toString() ?? (driver['first_name'] != null ? '${driver['first_name']} ${driver['last_name']}' : 'Chauffeur'),
      email: driver['email']?.toString() ?? '',
      phone: driver['phone']?.toString(),
      isOnline: driver['is_online'] == true || driver['presence_status'] == 'online',
      tier: tierJson?['name']?.toString() ?? 'Executive Tier',
      stats: DriverStats.fromJson(statsJson),
    );
  }
}

class Ride {
  final String id;
  final String reference;
  final String status;
  final String pickupAddress;
  final String dropoffAddress;
  final DateTime? pickupTime;
  final String? vehicleClass;
  final String? tierName;
  final double? distanceMiles;
  final double? totalAmount;
  final String? driverName;
  final String? driverPhone;
  final String? driverBio;
  final String? driverAvatarUrl;
  final String? vehicleModel;
  final String? vehiclePlate;
  final double? pickupLat;
  final double? pickupLng;
  final double? dropoffLat;
  final double? dropoffLng;
  final bool canCancel;

  Ride({
    required this.id,
    required this.reference,
    required this.status,
    required this.pickupAddress,
    required this.dropoffAddress,
    this.pickupTime,
    this.vehicleClass,
    this.tierName,
    this.distanceMiles,
    this.totalAmount,
    this.driverName,
    this.driverPhone,
    this.driverBio,
    this.driverAvatarUrl,
    this.vehicleModel,
    this.vehiclePlate,
    this.pickupLat,
    this.pickupLng,
    this.dropoffLat,
    this.dropoffLng,
    this.canCancel = false,
  });

  factory Ride.fromJson(Map<String, dynamic> json) {
    final chauffeur = json['chauffeur'] as Map<String, dynamic>?;
    final assignedDriver = json['assigned_driver'] as Map<String, dynamic>?;
    final driver = chauffeur ?? assignedDriver;
    final summary = json['summary'] as Map<String, dynamic>?;

    DateTime? parsedTime;
    if (json['pickup_time'] != null) {
      parsedTime = DateTime.tryParse(json['pickup_time'].toString());
    }

    final ref = json['reference']?.toString() ?? (json['id']?.toString() ?? '');
    final plateSuffix = ref.length >= 4 ? ref.substring(ref.length - 4) : 'VIP';

    return Ride(
      id: json['id']?.toString() ?? '',
      reference: ref,
      status: json['status']?.toString() ?? 'pending',
      pickupAddress: json['pickup_address']?.toString() ?? json['pickup_location']?.toString() ?? '',
      dropoffAddress: json['dropoff_address']?.toString() ?? json['dropoff_location']?.toString() ?? '',
      pickupTime: parsedTime,
      vehicleClass: json['vehicle_class']?.toString() ?? json['vehicle_type']?.toString() ?? summary?['vehicle_size_label']?.toString(),
      tierName: json['tier_name']?.toString() ?? summary?['tier_title']?.toString(),
      distanceMiles: (json['distance_miles'] as num?)?.toDouble(),
      totalAmount: (json['total_amount'] as num?)?.toDouble() ?? (json['fare'] as num?)?.toDouble(),
      driverName: driver?['name']?.toString() ?? json['driver_name']?.toString(),
      driverPhone: driver?['phone']?.toString() ?? json['driver_phone']?.toString(),
      driverBio: driver?['bio']?.toString() ?? json['driver_bio']?.toString(),
      driverAvatarUrl: driver?['avatar_url']?.toString(),
      vehicleModel: driver?['vehicle_model']?.toString() ?? summary?['vehicle_model']?.toString() ?? json['vehicle_class']?.toString(),
      vehiclePlate: driver?['vehicle_plate']?.toString() ?? 'ARC-$plateSuffix',
      pickupLat: (json['pickup_lat'] as num?)?.toDouble(),
      pickupLng: (json['pickup_lng'] as num?)?.toDouble(),
      dropoffLat: (json['dropoff_lat'] as num?)?.toDouble(),
      dropoffLng: (json['dropoff_lng'] as num?)?.toDouble(),
      canCancel: json['can_cancel'] == true,
    );
  }

  String get formattedStatus {
    switch (status) {
      case 'on_my_way':
        return 'Chauffeur En Route';
      case 'at_doorstep':
        return 'Chauffeur Arrived';
      case 'in_progress':
        return 'Trip In Progress';
      case 'completed':
        return 'Completed';
      case 'dispatched':
        return 'Chauffeur Assigned';
      case 'pending':
        return 'Confirmed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status.replaceAll('_', ' ').toUpperCase();
    }
  }
}

class DriverOffer {
  final String rideId;
  final String reference;
  final String pickupAddress;
  final String dropoffAddress;
  final DateTime? pickupTime;
  final double? estimatedPayout;
  final String? vehicleClass;

  DriverOffer({
    required this.rideId,
    required this.reference,
    required this.pickupAddress,
    required this.dropoffAddress,
    this.pickupTime,
    this.estimatedPayout,
    this.vehicleClass,
  });

  factory DriverOffer.fromJson(Map<String, dynamic> json) {
    return DriverOffer(
      rideId: json['ride_id']?.toString() ?? json['id']?.toString() ?? '',
      reference: json['reference']?.toString() ?? '',
      pickupAddress: json['pickup_address']?.toString() ?? '',
      dropoffAddress: json['dropoff_address']?.toString() ?? '',
      pickupTime: json['pickup_time'] != null ? DateTime.tryParse(json['pickup_time'].toString()) : null,
      estimatedPayout: (json['estimated_payout'] as num?)?.toDouble() ?? (json['driver_pay'] as num?)?.toDouble(),
      vehicleClass: json['vehicle_class']?.toString(),
    );
  }
}
