import 'package:flutter/material.dart';
import '../../shared/models.dart';
import 'package:intl/intl.dart';

class MessageBubble extends StatelessWidget {
  const MessageBubble({
    required this.message,
    Key? key,
  }) : super(key: key);

  final ChatMessage message;

  // ── Mention highlighting ──────────────────────────────────────────────────

  /// Builds a rich-text span list that highlights every @Name that actually
  /// belongs to one of the [mentionedUsers] returned by the backend.
  ///
  /// Rather than a generic @\w+ regex, we build the pattern from the real
  /// user names so multi-word names ("John Doe") are highlighted correctly.
  List<TextSpan> _buildHighlightedText(
    String text,
    List<ChatUser> mentionedUsers,
  ) {
    if (mentionedUsers.isEmpty) return [TextSpan(text: text)];

    // Build a regex that matches "@AnyMentionedName" (case-insensitive)
    final escapedNames = mentionedUsers
        .map((u) => RegExp.escape(u.name))
        .join('|');
    final mentionRegex = RegExp('@($escapedNames)', caseSensitive: false);

    final spans     = <TextSpan>[];
    int   lastIndex = 0;

    for (final match in mentionRegex.allMatches(text)) {
      // Normal text before this mention
      if (match.start > lastIndex) {
        spans.add(TextSpan(text: text.substring(lastIndex, match.start)));
      }

      // Highlighted mention chip
      spans.add(
        TextSpan(
          text:  match.group(0),
          style: const TextStyle(
            color:      Colors.blue,
            fontWeight: FontWeight.bold,
          ),
        ),
      );

      lastIndex = match.end;
    }

    // Remaining text after the last mention
    if (lastIndex < text.length) {
      spans.add(TextSpan(text: text.substring(lastIndex)));
    }

    return spans;
  }

  // ── Time formatting ───────────────────────────────────────────────────────

  String _formatTime(String createdAt) {
    try {
      final dt = DateTime.parse(createdAt).toLocal();
      return DateFormat('HH:mm').format(dt);
    } catch (_) {
      return '';
    }
  }

  // ── Build ─────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    final timeStr = _formatTime(message.createdAt);
    final initial = message.sender.name.isNotEmpty
        ? message.sender.name[0].toUpperCase()
        : '?';

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Avatar
          CircleAvatar(
            radius:          18,
            backgroundColor: Theme.of(context).colorScheme.primaryContainer,
            child: Text(
              initial,
              style: TextStyle(
                fontSize:   13,
                fontWeight: FontWeight.bold,
                color: Theme.of(context).colorScheme.onPrimaryContainer,
              ),
            ),
          ),
          const SizedBox(width: 8),

          // Bubble
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Header: name + timestamp
                Row(
                  crossAxisAlignment: CrossAxisAlignment.baseline,
                  textBaseline:       TextBaseline.alphabetic,
                  children: [
                    Text(
                      message.sender.name,
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize:   14,
                      ),
                    ),
                    const SizedBox(width: 6),
                    Text(
                      timeStr,
                      style: TextStyle(
                        fontSize: 11,
                        color:    Colors.grey.shade500,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 2),

                // Message body
                RichText(
                  text: TextSpan(
                    style: const TextStyle(
                      color:    Colors.black87,
                      fontSize: 14,
                      height:   1.45,
                    ),
                    children: _buildHighlightedText(
                      message.messageText,
                      message.mentionedUsers,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}