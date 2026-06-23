import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';
import {
  Bot,
  Menu,
  MessageCircle,
  Moon,
  Search,
  Send,
  Settings,
  Sparkles,
  Sun,
  X,
} from 'lucide-react';
import { useEmitTyping } from '../hooks/useRealtimeSocket';
import {
  useAISuggestions,
  useConversations,
  useMarkAsRead,
  useMessages,
  useSendMessage,
  useStartConversation,
  useUsers,
} from '../hooks/useQueryHooks';
import { useAuthStore } from '../store/useAuthStore';
import { useChatStore } from '../store/useChatStore';
import { useThemeStore } from '../store/useThemeStore';
import { useUIStore } from '../store/useUIStore';
import type { Conversation, Message, PresenceStatus, User } from '../types/types';
import styles from './ChatPage.module.css';

const EMPTY_CONVERSATIONS: Conversation[] = [];
const EMPTY_USERS: User[] = [];
const EMPTY_MESSAGES: Message[] = [];

function formatTime(value: string) {
  const date = new Date(value);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  return isToday
    ? date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function statusClass(status: PresenceStatus) {
  if (status === 'online') return styles.statusOnline;
  if (status === 'away') return styles.statusAway;
  return styles.statusOffline;
}

function getOtherUser(conversation: Conversation, users: User[], currentUserId?: string) {
  const otherId = conversation.participantIds.find((id) => id !== currentUserId);
  return users.find((user) => user.id === otherId);
}


function getAvatarSrc(user: { id: string; avatarUrl: string }) {
  return (
    user.avatarUrl ||
    `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(user.id)}`
  );
}

export default function ChatPage() {
  const user = useAuthStore((s) => s.user);
  const activeConversationId = useChatStore((s) => s.activeConversationId);
  const setActiveConversation = useChatStore((s) => s.setActiveConversation);
  const setUnreadCounts = useChatStore((s) => s.setUnreadCounts);
  const unreadCounts = useChatStore((s) => s.unreadCounts);
  const typingUsers = useChatStore((s) => s.typingUsers);
  const mobileSidebarOpen = useUIStore((s) => s.mobileSidebarOpen);
  const setMobileSidebarOpen = useUIStore((s) => s.setMobileSidebarOpen);
  const toggleMode = useThemeStore((s) => s.toggleMode);
  const mode = useThemeStore((s) => s.mode);

  const conversationsQuery = useConversations();
  const usersQuery = useUsers();
  const messagesQuery = useMessages(activeConversationId);
  const sendMessage = useSendMessage();
  const { mutate: markConversationAsRead } = useMarkAsRead();
  const aiSuggestions = useAISuggestions();
  const startConversation = useStartConversation();

  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const emitTyping = useEmitTyping();
  const typingStopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const conversations = conversationsQuery.data ?? EMPTY_CONVERSATIONS;
  const users = usersQuery.data ?? EMPTY_USERS;
  const messages = messagesQuery.data?.items ?? EMPTY_MESSAGES;
  const activeConversation = conversations.find((item) => item.id === activeConversationId);
  const activeUser = activeConversation
    ? getOtherUser(activeConversation, users, user?.id)
    : undefined;
  const isTyping = activeConversationId ? typingUsers[activeConversationId] : false;

  useEffect(() => {
    if (!conversations.length) return;
    const counts = Object.fromEntries(
      conversations.map((conversation) => [conversation.id, conversation.unreadCount])
    );
    setUnreadCounts(counts);
  }, [conversations, setUnreadCounts]);

  useEffect(() => {
    if (!activeConversationId) return;
    markConversationAsRead(activeConversationId);
  }, [activeConversationId, markConversationAsRead]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, isTyping]);

  const searchTerm = search.trim().toLowerCase();

  // Sidebar shows every user, not just ones with an existing conversation.
  // For users with a real conversation, use its actual data (lastMessage,
  // updatedAt, unreadCount). For users with no conversation yet, synthesize
  // a lightweight placeholder so they still render in the list — selecting
  // one creates the real conversation on first click (see handleSelect).
  const conversationByOtherUserId = new Map(
    conversations.map((conversation) => [
      conversation.participantIds.find((id) => id !== user?.id),
      conversation,
    ])
  );

  const sidebarItems = users
    .filter((otherUser) => otherUser.name.toLowerCase().includes(searchTerm))
    .map((otherUser) => {
      const conversation = conversationByOtherUserId.get(otherUser.id);
      return {
        otherUser,
        conversation,
        unreadCount: conversation
          ? unreadCounts[conversation.id] ?? conversation.unreadCount
          : 0,
        // Users with no conversation yet sort to the bottom (oldest
        // possible date); real conversations sort by actual updatedAt.
        sortKey: conversation ? new Date(conversation.updatedAt).getTime() : 0,
      };
    })
    .sort((a, b) => b.sortKey - a.sortKey);

  function handleSelect(otherUserId: string, existingConversationId?: string) {
    setMobileSidebarOpen(false);

    if (existingConversationId) {
      setActiveConversation(existingConversationId);
      return;
    }

    // No conversation exists with this user yet — create it, then switch
    // to it once the server responds. getOrCreateConversation is
    // idempotent, so this is safe even if one was created concurrently
    // (e.g. the other user messaged first) between page load and this click.
    startConversation.mutate(otherUserId, {
      onSuccess: (newConversation) => {
        setActiveConversation(newConversation.id);
      },
    });
  }

  function handleSuggest() {
    const trimmed = draft.trim();
    if (!trimmed || !activeConversationId) return;
    aiSuggestions.mutate({ conversationId: activeConversationId, draftText: trimmed });
  }

  function handleDraftChange(value: string) {
    setDraft(value);

    if (!activeConversationId || !activeUser) return;

    emitTyping(activeConversationId, true, activeUser.id);

    // Debounce the "stopped typing" signal: reset the timer on every
    // keystroke, only actually emit isTyping: false once the user has
    // paused for 2s. This avoids spamming the socket on every character.
    if (typingStopTimeoutRef.current) {
      clearTimeout(typingStopTimeoutRef.current);
    }
    typingStopTimeoutRef.current = setTimeout(() => {
      emitTyping(activeConversationId, false, activeUser.id);
    }, 2000);
  }

  function handleSend() {
    const trimmed = draft.trim();
    if (!trimmed || !activeConversationId) return;

    // Sending immediately implies "done typing" — no need to wait for the
    // debounce timeout to fire.
    if (typingStopTimeoutRef.current) {
      clearTimeout(typingStopTimeoutRef.current);
    }
    if (activeUser) {
      emitTyping(activeConversationId, false, activeUser.id);
    }

    sendMessage.mutate(
      { conversationId: activeConversationId, text: trimmed },
      {
        onSuccess: () => {
          setDraft('');
          aiSuggestions.reset();
        },
      }
    );
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  }

  return (
    <div className={styles.layout}>
      <button
        className={`${styles.mobileOverlay} ${
          mobileSidebarOpen ? styles.mobileOverlayVisible : ''
        }`}
        aria-label="Close conversation list"
        onClick={() => setMobileSidebarOpen(false)}
      />

      <aside className={`${styles.sidebar} ${mobileSidebarOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.sidebarHeader}>
          <div className={styles.sidebarTopRow}>
            <div className={styles.sidebarTitle}>
              <MessageCircle size={20} />
              Relay
            </div>
            <div className={styles.sidebarActions}>
              <button className={styles.iconBtn} type="button" onClick={toggleMode} aria-label="Toggle theme mode">
                {mode === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <Link className={styles.iconBtn} to="/settings" aria-label="Open settings">
                <Settings size={18} />
              </Link>
              <button
                className={`${styles.iconBtn} ${styles.mobileMenuBtn}`}
                type="button"
                onClick={() => setMobileSidebarOpen(false)}
                aria-label="Close sidebar"
              >
                <X size={18} />
              </button>
            </div>
          </div>
          <div className={styles.searchWrapper}>
            <Search className={styles.searchIcon} />
            <input
              className={styles.searchInput}
              placeholder="Search conversations"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </div>

        <LayoutGroup>
          <div className={styles.conversationList}>
            {sidebarItems.map(({ conversation, otherUser, unreadCount }) => {
              const active = conversation?.id === activeConversationId;
              const typing = conversation ? typingUsers[conversation.id] : false;
              return (
                <motion.button
                  layout
                  key={otherUser.id}
                  type="button"
                  className={`${styles.conversationItem} ${
                    active ? styles.conversationItemActive : ''
                  } ${unreadCount > 0 && !active ? styles.conversationItemUnread : ''}`}
                  onClick={() => handleSelect(otherUser.id, conversation?.id)}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className={styles.avatarWrapper}>
                    <img className={styles.avatar} src={getAvatarSrc(otherUser)} alt="" />
                    <span className={`${styles.statusDot} ${statusClass(otherUser.status)}`} />
                  </div>
                  <div className={styles.convInfo}>
                    <div className={styles.convTopRow}>
                      <span className={styles.convName}>{otherUser.name}</span>
                      {conversation && (
                        <span className={styles.convTime}>{formatTime(conversation.updatedAt)}</span>
                      )}
                    </div>
                    <div className={styles.convBottomRow}>
                      <span className={`${styles.convPreview} ${typing ? styles.convTyping : ''}`}>
                        {typing
                          ? 'typing...'
                          : conversation?.lastMessage?.text || 'No messages yet'}
                      </span>
                      {unreadCount > 0 && !active && (
                        <span className={styles.unreadBadge}>
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </LayoutGroup>
      </aside>

      <main className={styles.mainContent}>
        {!activeConversation || !activeUser ? (
          <div className={styles.emptyState}>
            <Bot className={styles.emptyIcon} />
            <h1 className={styles.emptyTitle}>Select a chat to start messaging</h1>
            <p className={styles.emptySubtext}>Your conversations and AI suggestions are ready when you are.</p>
          </div>
        ) : (
          <>
            <header className={styles.chatHeader}>
              <button
                className={`${styles.iconBtn} ${styles.mobileMenuBtn}`}
                type="button"
                onClick={() => setMobileSidebarOpen(true)}
                aria-label="Open conversation list"
              >
                <Menu size={20} />
              </button>
              <div className={styles.avatarWrapper}>
                <img className={styles.avatar} src={getAvatarSrc(activeUser)} alt="" />
                <span className={`${styles.statusDot} ${statusClass(activeUser.status)}`} />
              </div>
              <div className={styles.chatHeaderInfo}>
                <h1 className={styles.chatHeaderName}>{activeUser.name}</h1>
                <div className={styles.chatHeaderStatus}>
                  <span className={`${styles.statusDotSmall} ${statusClass(activeUser.status)}`} />
                  {isTyping ? 'typing...' : activeUser.status}
                </div>
              </div>
            </header>

            <section className={styles.messageArea} aria-live="polite">
              <AnimatePresence initial={false}>
                {messages.map((message: Message) => {
                  const sent = message.senderId === user?.id;
                  return (
                    <motion.div
                      key={message.id}
                      className={`${styles.messageRow} ${
                        sent ? styles.messageRowSent : styles.messageRowReceived
                      }`}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                    >
                      <div className={`${styles.messageBubble} ${sent ? styles.bubbleSent : styles.bubbleReceived}`}>
                        {message.text}
                        <div className={styles.messageTime}>{formatTime(message.createdAt)}</div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              {isTyping && (
                <div className={styles.typingIndicator}>
                  <div className={styles.typingDots}>
                    <span className={styles.typingDot} />
                    <span className={styles.typingDot} />
                    <span className={styles.typingDot} />
                  </div>
                  <span className={styles.typingText}>{activeUser.name} is typing</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </section>

            <footer className={styles.inputArea}>
              {aiSuggestions.isPending && (
                <div className={styles.suggestionsLoading}>
                  <span className={styles.suggestionSkeleton} style={{ width: 160 }} />
                  <span className={styles.suggestionSkeleton} style={{ width: 220 }} />
                  <span className={styles.suggestionSkeleton} style={{ width: 140 }} />
                </div>
              )}
              {!!aiSuggestions.data?.suggestions.length && (
                <div className={styles.suggestionsRow}>
                  {aiSuggestions.data.suggestions.map((suggestion) => (
                    <button
                      key={suggestion.id}
                      type="button"
                      className={styles.suggestionChip}
                      onClick={() => setDraft(suggestion.text)}
                    >
                      <span className={styles.suggestionLabel}>{suggestion.tone}</span>
                      {suggestion.text}
                    </button>
                  ))}
                </div>
              )}
              <div className={styles.inputRow}>
                <button className={styles.suggestBtn} type="button" onClick={handleSuggest} aria-label="Suggest replies">
                  <Sparkles size={18} />
                </button>
                <textarea
                  className={styles.messageInput}
                  rows={1}
                  placeholder={`Message ${activeUser.name}`}
                  value={draft}
                  onChange={(event) => handleDraftChange(event.target.value)}
                  onKeyDown={handleKeyDown}
                />
                <button
                  className={styles.sendBtn}
                  type="button"
                  onClick={handleSend}
                  disabled={!draft.trim() || sendMessage.isPending}
                  aria-label="Send message"
                >
                  <Send size={18} />
                </button>
              </div>
            </footer>
          </>
        )}
      </main>
    </div>
  );
}
