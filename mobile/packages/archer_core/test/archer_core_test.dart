import 'package:flutter_test/flutter_test.dart';
import 'package:archer_core/archer_core.dart';

void main() {
  test('ArcherColors defines gold and dark theme colors', () {
    expect(ArcherColors.gold.value, isNotNull);
    expect(ArcherColors.background.value, isNotNull);
  });

  test('CustomerUser json parsing', () {
    final user = CustomerUser.fromJson({
      'id': 42,
      'name': 'Alexander Wright',
      'email': 'alexander@example.com',
      'preferences': {'home_address': 'Mayfair, London'}
    });
    expect(user.id, 42);
    expect(user.name, 'Alexander Wright');
    expect(user.homeAddress, 'Mayfair, London');
  });
}
