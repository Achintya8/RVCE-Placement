import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../shared/models.dart';
import '../chat_provider.dart';

class ChatInputWidget extends ConsumerStatefulWidget {
  const ChatInputWidget({
    required this.onSend,
    required this.isLoading,
    Key? key,
  }) : super(key: key);

  final Function(String) onSend;
  final bool isLoading;

  @override
  ConsumerState<ChatInputWidget> createState() => _ChatInputWidgetState();
}

class _ChatInputWidgetState extends ConsumerState<ChatInputWidget> {
  late TextEditingController _textController;
  late FocusNode _focusNode;

  List<ChatUser> _filteredUsers = [];
  bool _showSuggestions = false;

  /// Index of the '@' character that triggered the current suggestion list.
  /// Reset to -1 when suggestion is dismissed or inserted.
  int _mentionStartIndex = -1;

  @override
  void initState() {
    super.initState();
    _textController = TextEditingController();
    _focusNode = FocusNode();
    _textController.addListener(_onTextChanged);
  }

  @override
  void dispose() {
    _textController.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  // ── Mention detection ───────────────────────────────────────────────────────

  void _onTextChanged() {
    final text      = _textController.text;
    final selection = _textController.selection;

    if (!selection.isValid || selection.baseOffset < 0) {
      _hideSuggestions();
      return;
    }

    final cursorPos        = selection.baseOffset;
    final textBeforeCursor = text.substring(0, cursorPos);
    final lastAt           = textBeforeCursor.lastIndexOf('@');

    if (lastAt == -1) {
      _hideSuggestions();
      return;
    }

    final query = textBeforeCursor.substring(lastAt + 1);

    // Stop if the user moved past the mention (space = done / cancelled)
    if (query.contains(' ')) {
      _hideSuggestions();
      return;
    }

    // Require at least one character after '@' before showing suggestions
    if (query.isEmpty) {
      _hideSuggestions();
      return;
    }

    _mentionStartIndex = lastAt;
    _filterUsers(query);
  }

  void _filterUsers(String query) {
    final usersAsync = ref.read(usersForMentionProvider);
    usersAsync.whenData((users) {
      final q        = query.toLowerCase();
      final filtered = users
          .where((u) =>
              u.name.toLowerCase().contains(q) ||
              (u.email?.toLowerCase().contains(q) ?? false))
          .take(6)
          .toList();

      setState(() {
        _filteredUsers    = filtered;
        _showSuggestions  = filtered.isNotEmpty;
      });
    });
  }

  void _hideSuggestions() {
    if (_showSuggestions || _mentionStartIndex != -1) {
      setState(() {
        _showSuggestions   = false;
        _mentionStartIndex = -1;
        _filteredUsers     = [];
      });
    }
  }

  // ── Mention insertion ───────────────────────────────────────────────────────

  void _insertMention(ChatUser user) {
    if (_mentionStartIndex == -1) return;

    final text      = _textController.text;
    final cursorPos = _textController.selection.baseOffset
        .clamp(0, text.length);

    final before  = text.substring(0, _mentionStartIndex);
    final after   = text.substring(cursorPos);
    final newText = '$before@${user.name} $after';

    _textController.value = TextEditingValue(
      text:      newText,
      selection: TextSelection.fromPosition(
        // position right after "@Name "
        TextPosition(offset: before.length + user.name.length + 2),
      ),
    );

    setState(() {
      _showSuggestions   = false;
      _mentionStartIndex = -1;
      _filteredUsers     = [];
    });

    // Return focus to the text field after tapping a suggestion
    _focusNode.requestFocus();
  }

  // ── Send ────────────────────────────────────────────────────────────────────

  void _sendMessage() {
    final text = _textController.text.trim();
    if (text.isEmpty || widget.isLoading) return;

    widget.onSend(text);
    _textController.clear();
    _hideSuggestions();
  }

  // ── Build ───────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        // Suggestion dropdown — shown above the input bar
        if (_showSuggestions && _filteredUsers.isNotEmpty)
          _SuggestionList(
            users:           _filteredUsers,
            onSelectUser:    _insertMention,
          ),

        // Input bar
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.surface,
            border: Border(
              top: BorderSide(color: Colors.grey.shade300),
            ),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Expanded(
                child: TextField(
                  controller: _textController,
                  focusNode:  _focusNode,
                  enabled:    !widget.isLoading,
                  maxLines:   5,
                  minLines:   1,
                  textInputAction: TextInputAction.newline,
                  decoration: InputDecoration(
                    hintText: 'Message… type @ to mention',
                    hintStyle: TextStyle(color: Colors.grey.shade400),
                    filled:    true,
                    fillColor: Colors.grey.shade100,
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical:   10,
                    ),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(24),
                      borderSide:   BorderSide.none,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              _SendButton(
                isLoading: widget.isLoading,
                onTap:     _sendMessage,
              ),
            ],
          ),
        ),
      ],
    );
  }
}

// ── Sub-widgets ───────────────────────────────────────────────────────────────

class _SuggestionList extends StatelessWidget {
  const _SuggestionList({
    required this.users,
    required this.onSelectUser,
  });

  final List<ChatUser>       users;
  final ValueChanged<ChatUser> onSelectUser;

  @override
  Widget build(BuildContext context) {
    return Material(
      elevation: 4,
      color: Theme.of(context).colorScheme.surface,
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxHeight: 200),
        child: ListView.separated(
          shrinkWrap:    true,
          padding:       EdgeInsets.zero,
          itemCount:     users.length,
          separatorBuilder: (_, __) =>
              Divider(height: 1, color: Colors.grey.shade200),
          itemBuilder: (context, index) {
            final user = users[index];
            return InkWell(
              onTap: () => onSelectUser(user),
              child: Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical:    10,
                ),
                child: Row(
                  children: [
                    CircleAvatar(
                      radius:          18,
                      backgroundColor: Theme.of(context)
                          .colorScheme
                          .primaryContainer,
                      child: Text(
                        user.name.isNotEmpty
                            ? user.name[0].toUpperCase()
                            : '?',
                        style: TextStyle(
                          color: Theme.of(context)
                              .colorScheme
                              .onPrimaryContainer,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            user.name,
                            style: const TextStyle(
                              fontWeight: FontWeight.w600,
                              fontSize: 14,
                            ),
                          ),
                          if (user.email != null && user.email!.isNotEmpty)
                            Text(
                              user.email!,
                              style: TextStyle(
                                fontSize: 12,
                                color: Colors.grey.shade600,
                              ),
                              overflow: TextOverflow.ellipsis,
                            ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}

class _SendButton extends StatelessWidget {
  const _SendButton({required this.isLoading, required this.onTap});

  final bool     isLoading;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width:  44,
      height: 44,
      child: Material(
        color:        Theme.of(context).colorScheme.primary,
        borderRadius: BorderRadius.circular(22),
        child: InkWell(
          borderRadius: BorderRadius.circular(22),
          onTap:        isLoading ? null : onTap,
          child: Center(
            child: isLoading
                ? const SizedBox(
                    width:  20,
                    height: 20,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: Colors.white,
                    ),
                  )
                : const Icon(Icons.send, color: Colors.white, size: 20),
          ),
        ),
      ),
    );
  }
}