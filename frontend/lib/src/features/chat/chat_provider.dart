import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../auth/auth_controller.dart';
import '../shared/models.dart';
import '../shared/placement_repository.dart';

final placementRepositoryProvider = Provider<PlacementRepository>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return PlacementRepository(apiClient);
});

final usersForMentionProvider = FutureProvider<List<ChatUser>>((ref) async {
  final repo = ref.watch(placementRepositoryProvider);
  return repo.getAllUsersForMention();
});

class ChatState {
  ChatState({
    required this.messages,
    required this.isLoading,
    required this.error,
  });

  final List<ChatMessage> messages;
  final bool isLoading;
  final String? error;

  ChatState copyWith({
    List<ChatMessage>? messages,
    bool? isLoading,
    String? error,
  }) {
    return ChatState(
      messages: messages ?? this.messages,
      isLoading: isLoading ?? this.isLoading,
      error: error ?? this.error,
    );
  }
}

class ChatNotifier extends StateNotifier<ChatState> {
  ChatNotifier(this._repository) : super(ChatState(messages: [], isLoading: false, error: null));

  final PlacementRepository _repository;

  Future<void> sendMessage(String messageText) async {
    try {
      state = state.copyWith(isLoading: true, error: null);
      final message = await _repository.sendMessage(messageText);
      state = state.copyWith(
        messages: [...state.messages, message],
        isLoading: false,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
    }
  }

  Future<void> loadMessages() async {
    try {
      state = state.copyWith(isLoading: true, error: null);
      final response = await _repository.getMessages();
      state = state.copyWith(
        messages: response.messages.reversed.toList(),
        isLoading: false,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
    }
  }
}

final chatControllerProvider = StateNotifierProvider<ChatNotifier, ChatState>((ref) {
  final repository = ref.watch(placementRepositoryProvider);
  return ChatNotifier(repository);
});