import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class TokenStore {
  static const FlutterSecureStorage _storage = FlutterSecureStorage();

  final String key;

  TokenStore({required this.key});

  static TokenStore customer = TokenStore(key: 'archer_customer_token');
  static TokenStore driver = TokenStore(key: 'archer_driver_token');

  static Future<String?> read(String key) async {
    try {
      return await _storage.read(key: key);
    } catch (_) {
      return null;
    }
  }

  static Future<void> write(String key, String value) async {
    await _storage.write(key: key, value: value);
  }

  static Future<void> remove(String key) async {
    await _storage.delete(key: key);
  }

  Future<String?> get() async {
    try {
      return await _storage.read(key: key);
    } catch (_) {
      return null;
    }
  }

  Future<void> set(String token) async {
    await _storage.write(key: key, value: token);
  }

  Future<void> clear() async {
    await _storage.delete(key: key);
  }
}
