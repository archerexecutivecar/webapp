class ApiError implements Exception {
  final int status;
  final String code;
  final String message;
  final Map<String, dynamic> details;

  ApiError({
    required this.status,
    required this.code,
    required this.message,
    this.details = const {},
  });

  @override
  String toString() => message;

  String? get firstDetailError {
    if (details.isEmpty) return null;
    for (final val in details.values) {
      if (val is List && val.isNotEmpty) {
        return val.first.toString();
      }
      if (val is String) {
        return val;
      }
    }
    return null;
  }
}
