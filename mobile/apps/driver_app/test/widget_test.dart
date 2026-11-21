import 'package:flutter_test/flutter_test.dart';
import 'package:archer_driver/main.dart';

void main() {
  testWidgets('Driver app renders splash and root navigator', (WidgetTester tester) async {
    await tester.pumpWidget(const ArcherDriverApp());
    expect(find.byType(DriverRootNavigator), findsOneWidget);
  });
}
