class AppUser {
  const AppUser({
    required this.id,
    required this.name,
    required this.collegeEmailId,
    required this.personalEmailId,
    required this.ugCgpa,
    required this.firstSemSgpa,
    required this.tenthMarks,
    required this.twelfthMarks,
    required this.verified,
    this.phoneNumber,
    this.aadhar,
    this.linkedIn,
    this.gitHub,
    this.usn,
    this.resumeUrl,
  });

  final int id;
  final String name;
  final String collegeEmailId;
  final String personalEmailId;
  final double ugCgpa;
  final double firstSemSgpa;
  final double tenthMarks;
  final double twelfthMarks;
  final bool verified;
  final String? phoneNumber;
  final String? aadhar;
  final String? linkedIn;
  final String? gitHub;
  final String? usn;
  final String? resumeUrl;

  factory AppUser.fromJson(Map<String, dynamic> json) {
    return AppUser(
      id: (json['id'] as num?)?.toInt() ?? 0,
      name: json['name'] as String? ?? '',
      collegeEmailId: json['collegeEmailId'] as String? ?? '',
      personalEmailId: json['personalEmailId'] as String? ?? '',
      ugCgpa: (json['ugCgpa'] as num?)?.toDouble() ?? 0,
      firstSemSgpa: (json['firstSemSgpa'] as num?)?.toDouble() ?? 0,
      tenthMarks: (json['tenthMarks'] as num?)?.toDouble() ?? 0,
      twelfthMarks: (json['twelfthMarks'] as num?)?.toDouble() ?? 0,
      verified: json['verified'] as bool? ?? false,
      phoneNumber: json['phoneNumber'] as String?,
      aadhar: json['aadhar']?.toString(),
      linkedIn: json['linkedIn'] as String?,
      gitHub: json['gitHub'] as String?,
      usn: json['usn'] as String?,
      resumeUrl: json['resumeUrl'] as String?,
    );
  }
}

class Session {
  const Session({
    required this.token,
    required this.isSpc,
    required this.notificationTopic,
    required this.user,
  });

  final String token;
  final bool isSpc;
  final String notificationTopic;
  final AppUser user;

  factory Session.fromJson(Map<String, dynamic> json) {
    return Session(
      token: json['token'] as String? ?? '',
      isSpc: json['isSpc'] as bool? ?? false,
      notificationTopic: json['notificationTopic'] as String? ?? '',
      user: AppUser.fromJson(json['user'] as Map<String, dynamic>? ?? const {}),
    );
  }
}

class Company {
  const Company({
    required this.id,
    required this.name,
    required this.minCgpa,
    required this.package,
    required this.stipend,
    this.testDate,
    this.interviewDate,
    this.consent,
    this.tracker,
  });

  final int id;
  final String name;
  final double minCgpa;
  final String package;
  final String stipend;
  final String? testDate;
  final String? interviewDate;
  final bool? consent;
  final bool? tracker;

  factory Company.fromJson(Map<String, dynamic> json) {
    return Company(
      id: (json['id'] as num?)?.toInt() ?? 0,
      name: json['name'] as String? ?? '',
      minCgpa: (json['minCgpa'] as num?)?.toDouble() ?? 0,
      package: json['package'] as String? ?? '',
      stipend: json['stipend'] as String? ?? '',
      testDate: json['testDate'] as String?,
      interviewDate: json['interviewDate'] as String?,
      consent: json['consent'] as bool?,
      tracker: json['tracker'] as bool?,
    );
  }
}

class PlacementFormSummary {
  const PlacementFormSummary({
    required this.id,
    required this.title,
    required this.type,
    this.companyId,
    this.companyName,
    this.questionCount,
    this.responseCount,
  });

  final int id;
  final String title;
  final String type;
  final int? companyId;
  final String? companyName;
  final int? questionCount;
  final int? responseCount;

  factory PlacementFormSummary.fromJson(Map<String, dynamic> json) {
    return PlacementFormSummary(
      id: (json['id'] as num?)?.toInt() ?? 0,
      title: json['title'] as String? ?? '',
      type: json['type'] as String? ?? '',
      companyId: (json['companyId'] as num?)?.toInt(),
      companyName: json['companyName'] as String?,
      questionCount: (json['questionCount'] as num?)?.toInt(),
      responseCount: (json['responseCount'] as num?)?.toInt(),
    );
  }
}

class FormQuestion {
  const FormQuestion({
    required this.id,
    required this.questionText,
    required this.fieldType,
    required this.options,
    this.isRequired = false,
    this.answer,
  });

  final int id;
  final String questionText;
  final String fieldType;
  final List<String> options;
  final bool isRequired;
  final String? answer;

  factory FormQuestion.fromJson(Map<String, dynamic> json) {
    return FormQuestion(
      id: (json['id'] as num?)?.toInt() ?? 0,
      questionText: json['questionText'] as String? ?? '',
      fieldType: json['fieldType'] as String? ?? 'text',
      options: (json['options'] as List<dynamic>? ?? const []).cast<String>(),
      isRequired: json['isRequired'] as bool? ?? false,
      answer: json['answer'] as String?,
    );
  }
}

class PlacementFormDetail {
  const PlacementFormDetail({required this.summary, required this.questions});

  final PlacementFormSummary summary;
  final List<FormQuestion> questions;

  factory PlacementFormDetail.fromJson(Map<String, dynamic> json) {
    return PlacementFormDetail(
      summary: PlacementFormSummary.fromJson(json),
      questions: (json['questions'] as List<dynamic>? ?? const [])
          .map((item) => FormQuestion.fromJson(item as Map<String, dynamic>))
          .toList(),
    );
  }
}

class StudentSummary {
  const StudentSummary({
    required this.id,
    required this.name,
    required this.collegeEmailId,
    required this.verified,
    this.ugCgpa,
    this.resumeUrl,
  });

  final int id;
  final String name;
  final String collegeEmailId;
  final bool verified;
  final double? ugCgpa;
  final String? resumeUrl;

  factory StudentSummary.fromJson(Map<String, dynamic> json) {
    return StudentSummary(
      id: (json['id'] as num?)?.toInt() ?? 0,
      name: json['name'] as String? ?? '',
      collegeEmailId: json['collegeEmailId'] as String? ?? '',
      verified: json['verified'] as bool? ?? false,
      ugCgpa: (json['ugCgpa'] as num?)?.toDouble(),
      resumeUrl: json['resumeUrl'] as String?,
    );
  }
}

class FormResponseRecord {
  const FormResponseRecord({
    required this.studentName,
    required this.usn,
    required this.collegeEmailId,
    required this.answers,
  });

  final String studentName;
  final String usn;
  final String collegeEmailId;
  final List<FormQuestion> answers;

  factory FormResponseRecord.fromJson(Map<String, dynamic> json) {
    return FormResponseRecord(
      studentName: json['studentName'] as String? ?? '',
      usn: json['usn'] as String? ?? '',
      collegeEmailId: json['collegeEmailId'] as String? ?? '',
      answers: (json['answers'] as List<dynamic>? ?? const [])
          .map((item) => FormQuestion.fromJson(item as Map<String, dynamic>))
          .toList(),
    );
  }
}

class ChatUser {
  const ChatUser({
    required this.id,
    required this.name,
    this.email,
  });

  final int id;
  final String name;
  final String? email;

  factory ChatUser.fromJson(Map<String, dynamic> json) {
    return ChatUser(
      id: (json['id'] as num?)?.toInt() ?? 0,
      name: json['name'] as String? ?? '',
      email: json['email'] as String?,
    );
  }
}

class ChatMessage {
  const ChatMessage({
    required this.id,
    required this.sender,
    required this.messageText,
    required this.createdAt,
    this.mentionedUsers = const [],
  });

  final int id;
  final ChatUser sender;
  final String messageText;
  final String createdAt;
  final List<ChatUser> mentionedUsers;

  factory ChatMessage.fromJson(Map<String, dynamic> json) {
    return ChatMessage(
      id: (json['id'] as num?)?.toInt() ?? 0,
      sender: ChatUser.fromJson(json['sender'] as Map<String, dynamic>? ?? const {}),
      messageText: json['messageText'] as String? ?? '',
      createdAt: json['createdAt'] as String? ?? '',
      mentionedUsers: (json['mentionedUsers'] as List<dynamic>? ?? const [])
          .map((item) => ChatUser.fromJson(item as Map<String, dynamic>))
          .toList(),
    );
  }
}

class ChatMessagesResponse {
  const ChatMessagesResponse({
    required this.messages,
    required this.total,
  });

  final List<ChatMessage> messages;
  final int total;

  factory ChatMessagesResponse.fromJson(Map<String, dynamic> json) {
    return ChatMessagesResponse(
      messages: (json['messages'] as List<dynamic>? ?? const [])
          .map((item) => ChatMessage.fromJson(item as Map<String, dynamic>))
          .toList(),
      total: (json['total'] as num?)?.toInt() ?? 0,
    );
  }
}
