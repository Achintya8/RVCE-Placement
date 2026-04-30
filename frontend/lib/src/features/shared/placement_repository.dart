import 'dart:io';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/foundation.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:path_provider/path_provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:universal_html/html.dart' as html;

import '../../core/config/app_config.dart';
import '../../core/network/api_client.dart';
import 'models.dart';

const _tokenKey = 'auth_token';

class AuthRepository {
  AuthRepository(this._apiClient);

  final ApiClient _apiClient;
  final GoogleSignIn _googleSignIn = GoogleSignIn(
    scopes: const ['email'],
    clientId: AppConfig.googleClientId,
  );

  Future<Session> loginWithGoogle() async {
    // On web, try to reuse an existing silent session first
    GoogleSignInAccount? account = await _googleSignIn.signInSilently();
    account ??= await _googleSignIn.signIn();

    if (account == null) {
      throw Exception('Google sign-in was cancelled.');
    }

    final authentication = await account.authentication;
    final idToken = authentication.idToken;
    if (idToken == null) {
      throw Exception(
        'Google did not return an ID token.\n'
        'Please ensure third-party cookies are enabled in Chrome and try again.',
      );
    }

    final json = await _apiClient.postJson('/auth/google', {
      'idToken': idToken,
    });
    final session = Session.fromJson(json);
    await _persistToken(session.token);
    _apiClient.setToken(session.token);
    return session;
  }

  Future<Session> loginWithSpc({
    required String username,
    required String password,
  }) async {
    final json = await _apiClient.postJson('/auth/spc/login', {
      'username': username,
      'password': password,
    });
    final session = Session.fromJson(json);
    await _persistToken(session.token);
    _apiClient.setToken(session.token);
    return session;
  }

  Future<Session?> restoreSession() async {
    final preferences = await SharedPreferences.getInstance();
    final token = preferences.getString(_tokenKey);
    if (token == null || token.isEmpty) {
      return null;
    }

    _apiClient.setToken(token);
    final json = await _apiClient.getJson('/auth/me');
    return Session.fromJson(json);
  }

  Future<void> logout() async {
    _apiClient.setToken(null);
    await _googleSignIn.signOut();
    final preferences = await SharedPreferences.getInstance();
    await preferences.remove(_tokenKey);
  }

  Future<void> _persistToken(String token) async {
    final preferences = await SharedPreferences.getInstance();
    await preferences.setString(_tokenKey, token);
  }
}

class PlacementRepository {
  PlacementRepository(this._apiClient);

  final ApiClient _apiClient;

  Future<AppUser> getProfile() async {
    return AppUser.fromJson(await _apiClient.getJson('/users/me'));
  }

  Future<AppUser> updateProfile(Map<String, dynamic> data) async {
    return AppUser.fromJson(await _apiClient.putJson('/users/me', data));
  }

  Future<AppUser> uploadResume(PlatformFile file) async {
    final multipart = file.bytes != null
        ? MultipartFile.fromBytes(file.bytes!, filename: file.name)
        : await MultipartFile.fromFile(file.path!, filename: file.name);

    final json = await _apiClient.postFormData(
      '/users/me/resume',
      FormData.fromMap({'resume': multipart}),
    );
    return AppUser.fromJson(json);
  }

  Future<List<Company>> getCompanies() async {
    final json = await _apiClient.getList('/companies');
    return json
        .map((item) => Company.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  Future<void> saveApplication({
    required int companyId,
    bool? consent,
    bool? tracker,
  }) async {
    final payload = <String, dynamic>{};
    if (consent != null) {
      payload['consent'] = consent;
    }
    if (tracker != null) {
      payload['tracker'] = tracker;
    }

    await _apiClient.putJson('/applications/company/$companyId', payload);
  }

  Future<List<PlacementFormSummary>> getAssignedForms() async {
    final json = await _apiClient.getList('/forms/assigned/me');
    return json
        .map(
          (item) => PlacementFormSummary.fromJson(item as Map<String, dynamic>),
        )
        .toList();
  }

  Future<List<PlacementFormSummary>> getAllForms() async {
    final json = await _apiClient.getList('/forms');
    return json
        .map(
          (item) => PlacementFormSummary.fromJson(item as Map<String, dynamic>),
        )
        .toList();
  }

  Future<PlacementFormDetail> getForm(int formId) async {
    return PlacementFormDetail.fromJson(
      await _apiClient.getJson('/forms/$formId'),
    );
  }

  Future<void> submitFormResponses({
    required int formId,
    required Map<int, dynamic> answers,
  }) async {
    await _apiClient.postJson('/responses/forms/$formId', {
      'answers': answers.entries
          .map((entry) => {'questionId': entry.key, 'answer': entry.value})
          .toList(),
    });
  }

  Future<List<FormQuestion>> getQuestions() async {
    final json = await _apiClient.getList('/questions');
    return json
        .map((item) => FormQuestion.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  Future<void> createQuestion({
    required String questionText,
    required String fieldType,
    List<String> options = const [],
  }) async {
    await _apiClient.postJson('/questions', {
      'questionText': questionText,
      'fieldType': fieldType,
      if (options.isNotEmpty) 'options': options,
    });
  }

  Future<void> createForm({
    required String title,
    required String type,
    int? companyId,
  }) async {
    await _apiClient.postJson('/forms', {
      'title': title,
      'type': type,
      'companyId': companyId,
    });
  }

  Future<void> mapQuestionsToForm({
    required int formId,
    required List<Map<String, dynamic>> questions,
  }) async {
    await _apiClient.postJson('/forms/$formId/questions', {
      'questions': questions,
    });
  }

  Future<void> sendForm(int formId) async {
    await _apiClient.postJson('/forms/$formId/send', const {});
  }

  Future<void> createCompany({
    required String name,
    required double minCgpa,
    required String package,
    required String stipend,
    String? testDate,
    String? interviewDate,
  }) async {
    await _apiClient.postJson('/companies', {
      'name': name,
      'minCgpa': minCgpa,
      'package': package,
      'stipend': stipend,
      'testDate': testDate,
      'interviewDate': interviewDate,
    });
  }

  Future<List<StudentSummary>> getStudents() async {
    final json = await _apiClient.getList('/users/students');
    return json
        .map((item) => StudentSummary.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  Future<void> verifyStudent(int studentId) async {
    await _apiClient.postJson('/users/students/$studentId/verify', const {});
  }

  Future<List<FormResponseRecord>> getFormResponses(int formId) async {
    final json = await _apiClient.getList('/responses/forms/$formId');
    return json
        .map(
          (item) => FormResponseRecord.fromJson(item as Map<String, dynamic>),
        )
        .toList();
  }

  Future<Uint8List> exportFormResponses(int formId) async {
    return _apiClient.getBytes('/responses/forms/$formId/export');
  }

  Future<Uint8List> exportCompany(int companyId, {List<String>? fields}) async {
    final queryParams = fields != null && fields.isNotEmpty
        ? '?fields=${fields.join(',')}'
        : '';
    return _apiClient.getBytes('/companies/$companyId/export$queryParams');
  }

  Future<String> persistExportFile({
    required int companyId,
    required Uint8List bytes,
  }) async {
    if (kIsWeb) {
      final blob = html.Blob([bytes]);
      final url = html.Url.createObjectUrlFromBlob(blob);
      final anchor = html.document.createElement('a') as html.AnchorElement
        ..href = url
        ..style.display = 'none'
        ..download = 'company_$companyId.xlsx';
      html.document.body?.children.add(anchor);
      anchor.click();
      html.document.body?.children.remove(anchor);
      html.Url.revokeObjectUrl(url);
      return 'Downloads folder';
    } else {
      final directory = await getApplicationDocumentsDirectory();
      final file = File('${directory.path}/company_$companyId.xlsx');
      await file.writeAsBytes(bytes);
      return file.path;
    }
  }
}
