import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../shared/models.dart';
import 'chat_provider.dart';
import 'widgets/chat_input_widget.dart';
import 'widgets/message_list_widget.dart';

class ChatScreen extends ConsumerStatefulWidget {
  const ChatScreen({Key? key}) : super(key: key);

  @override
  ConsumerState<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends ConsumerState<ChatScreen> {
  @override
  void initState() {
    super.initState();
    Future.microtask(() {
      ref.read(chatControllerProvider.notifier).loadMessages();
    });
  }

  @override
  Widget build(BuildContext context) {
    final chatState = ref.watch(chatControllerProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Global Chat'),
        elevation: 1,
      ),
      body: Column(
        children: [
          Expanded(
            child: chatState.error != null
                ? Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.error_outline, color: Colors.red, size: 32),
                        const SizedBox(height: 8),
                        Text(
                          chatState.error!,
                          style: const TextStyle(color: Colors.red),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 8),
                        TextButton(
                          onPressed: () =>
                              ref.read(chatControllerProvider.notifier).loadMessages(),
                          child: const Text('Retry'),
                        ),
                      ],
                    ),
                  )
                : chatState.messages.isEmpty
                    ? Center(
                        child: Text(
                          chatState.isLoading ? 'Loading messages...' : 'No messages yet',
                          style: const TextStyle(color: Colors.grey),
                        ),
                      )
                    : MessageListWidget(messages: chatState.messages),
          ),
          ChatInputWidget(
            onSend: (text) {
              ref.read(chatControllerProvider.notifier).sendMessage(text);
            },
            isLoading: chatState.isLoading,
          ),
        ],
      ),
    );
  }
}