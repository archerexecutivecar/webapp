# Archer Mobile Applications (Flutter)

This directory contains the production-grade Flutter applications for Archer Executive Services, organized in a scalable monorepo structure.

## Repository Structure

```text
mobile/
├── packages/
│   └── archer_core/             # Shared Dart/Flutter package
│       ├── lib/
│       │   ├── api/             # ArcherApiClient (Dio, Bearer interceptor, error unwrapping)
│       │   ├── models/          # Strongly-typed models (CustomerUser, DriverProfile, Ride, etc.)
│       │   ├── storage/         # TokenStore (flutter_secure_storage for iOS Keychain / Android Keystore)
│       │   ├── theme/           # ArcherTheme & ArcherColors (Gold/Jet-Black luxury theme)
│       │   └── archer_core.dart # Package library exports
│       └── test/                # Unit tests
│
└── apps/
    ├── customer_app/            # Archer Executive Passenger App (iOS & Android)
    │   ├── lib/main.dart        # Email-code OTP auth, dynamic quoting, trip history
    │   └── test/widget_test.dart
    │
    └── driver_app/              # Archer Chauffeur Partner App (iOS & Android)
        ├── lib/main.dart        # Driver login, Online/Offline presence, trip state stepper
        └── test/widget_test.dart
```

---

## Getting Started

### Prerequisites
- Flutter SDK 3.38+ with Dart 3.10+
- Android Studio / Xcode configured for physical device or simulator testing
- Running Archer Laravel backend (`http://localhost:8000` or production API `https://api.archerexecutivecar.com`)

### 1. Running the Chauffeur Driver App
```bash
cd mobile/apps/driver_app
flutter run
```

### 2. Running the Executive Customer App
```bash
cd mobile/apps/customer_app
flutter run
```

### 3. Running Automated Tests
```bash
# In core package:
cd mobile/packages/archer_core
flutter test

# In customer app:
cd mobile/apps/customer_app
flutter test

# In driver app:
cd mobile/apps/driver_app
flutter test
```

---

## Backend Integration Details

Both apps communicate directly with the authoritative Laravel backend:
- **Authentication**:
  - Customer: `POST /api/v1/customer/auth/code` and `POST /api/v1/customer/auth/code/verify`
  - Driver: `POST /api/v1/auth/login` (checks role `driver.portal`)
- **Driver State Machine**:
  - `PUT /api/v1/driver/presence` (`online` / `offline`)
  - `PUT /api/v1/driver/rides/{id}/status` (`on_my_way` → `at_doorstep` → `in_progress` → `completed`)
- **Customer Booking**:
  - `POST /api/v1/quotes` (instant quotes)
  - `GET /api/v1/customer/rides` (real-time customer ride tracking)
