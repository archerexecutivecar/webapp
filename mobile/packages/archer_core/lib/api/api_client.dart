import 'package:flutter/foundation.dart';
import 'package:dio/dio.dart';
import '../storage/token_store.dart';
import 'api_error.dart';

class ArcherApiClient {
  final Dio dio;
  final TokenStore tokenStore;

  static const String liveApiUrl = 'https://api.archerexecutivecar.com/api/v1';
  static const String localApiUrl = 'http://localhost:8000/api/v1';

  static String get defaultBaseUrl {
    const fromEnv = String.fromEnvironment('API_BASE_URL');
    if (fromEnv.isNotEmpty) return fromEnv;
    // On native mobile APKs (Android/iOS), connect to live production API
    // On web running locally, default to local backend
    if (kIsWeb) {
      return localApiUrl;
    }
    return liveApiUrl;
  }

  ArcherApiClient({
    String? baseUrl,
    required this.tokenStore,
  }) : dio = Dio(
          BaseOptions(
            baseUrl: baseUrl ?? defaultBaseUrl,
            connectTimeout: const Duration(seconds: 15),
            receiveTimeout: const Duration(seconds: 15),
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
            },
          ),
        ) {
    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await tokenStore.get();
          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          return handler.next(options);
        },
        onError: (DioException e, handler) {
          final response = e.response;
          if (response != null && response.data is Map<String, dynamic>) {
            final map = response.data as Map<String, dynamic>;
            final errorMap = map['error'] as Map<String, dynamic>?;
            final code = errorMap?['code']?.toString() ?? 'API_ERROR';
            final message = errorMap?['message']?.toString() ??
                (response.statusCode == 401 ? 'Unauthorized session expired' : 'Request failed');
            final details = (errorMap?['details'] as Map<String, dynamic>?) ?? {};

            return handler.reject(
              DioException(
                requestOptions: e.requestOptions,
                response: response,
                type: e.type,
                error: ApiError(
                  status: response.statusCode ?? 500,
                  code: code,
                  message: message,
                  details: details,
                ),
              ),
            );
          }

          final fallbackMessage = e.type == DioExceptionType.connectionTimeout ||
                  e.type == DioExceptionType.receiveTimeout
              ? 'Unable to reach Archer. Request timed out.'
              : 'Unable to reach Archer. Check connection and try again.';

          return handler.reject(
            DioException(
              requestOptions: e.requestOptions,
              response: response,
              type: e.type,
              error: ApiError(
                status: 0,
                code: 'NETWORK_ERROR',
                message: fallbackMessage,
              ),
            ),
          );
        },
      ),
    );
  }

  Future<T> get<T>(String path, {Map<String, dynamic>? queryParameters}) async {
    try {
      final res = await dio.get(path, queryParameters: queryParameters);
      return _extractData<T>(res.data);
    } on DioException catch (e) {
      if (e.error is ApiError) {
        throw e.error as ApiError;
      }
      throw ApiError(status: 0, code: 'UNKNOWN', message: e.message ?? 'Unknown error');
    }
  }

  Future<T> post<T>(String path, {dynamic data}) async {
    try {
      final res = await dio.post(path, data: data);
      return _extractData<T>(res.data);
    } on DioException catch (e) {
      if (e.error is ApiError) {
        throw e.error as ApiError;
      }
      throw ApiError(status: 0, code: 'UNKNOWN', message: e.message ?? 'Unknown error');
    }
  }

  Future<T> put<T>(String path, {dynamic data}) async {
    try {
      final res = await dio.put(path, data: data);
      return _extractData<T>(res.data);
    } on DioException catch (e) {
      if (e.error is ApiError) {
        throw e.error as ApiError;
      }
      throw ApiError(status: 0, code: 'UNKNOWN', message: e.message ?? 'Unknown error');
    }
  }

  Future<T> delete<T>(String path) async {
    try {
      final res = await dio.delete(path);
      return _extractData<T>(res.data);
    } on DioException catch (e) {
      if (e.error is ApiError) {
        throw e.error as ApiError;
      }
      throw ApiError(status: 0, code: 'UNKNOWN', message: e.message ?? 'Unknown error');
    }
  }

  T _extractData<T>(dynamic raw) {
    if (raw is Map<String, dynamic> && raw.containsKey('data')) {
      return raw['data'] as T;
    }
    return raw as T;
  }
}
