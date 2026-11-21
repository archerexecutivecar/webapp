import 'package:flutter_test/flutter_test.dart';
import 'package:archer_customer/main.dart';

void main() {
  testWidgets('Customer app renders splash and root navigator', (WidgetTester tester) async {
    await tester.pumpWidget(const ArcherCustomerApp());
    expect(find.byType(CustomerRootNavigator), findsOneWidget);
  });
}
