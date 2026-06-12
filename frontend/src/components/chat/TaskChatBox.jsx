import { useEffect, useRef, useState } from "react";
import api from "../../services/api";
import socket from "../../socket/socket";

export default function TaskChatBox({
  taskId,
  conversationId,
  user,
  scope = "leader_unit",
}) {
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [isOtherTyping, setIsOtherTyping] = useState(false);

  const [theme, setTheme] = useState(
    localStorage.getItem("theme") || "light"
  );

  const isDark = theme === "dark";

  const bottomRef = useRef(null);

  const currentUserId = user?.userId || user?.id;

  useEffect(() => {
    const syncTheme = () => {
      setTheme(localStorage.getItem("theme") || "light");
    };

    window.addEventListener("theme-updated", syncTheme);
    window.addEventListener("storage", syncTheme);

    return () => {
      window.removeEventListener("theme-updated", syncTheme);
      window.removeEventListener("storage", syncTheme);
    };
  }, []);

  const fetchConversation = async () => {
    try {
      console.log("TASK CHAT BOX PROPS:", {
        taskId,
        conversationId,
        scope,
      });

      if (conversationId) {
        const convo = {
          id: conversationId,
          task_id: taskId,
          scope,
        };

        setConversation(convo);

        return convo;
      }

      const res = await api.get(
        `/conversations/task/${taskId}`,
        {
          params: {
            scope,
          },
        }
      );

      setConversation(res.data);

      return res.data;
    } catch (err) {
      console.log("FETCH CONVERSATION ERROR:", err);
      setConversation(null);
      return null;
    }
  };

  const fetchMessages = async (conversationId) => {
    try {
      const res = await api.get(
        `/chat/messages/${conversationId}`
      );

      setMessages(res.data);
    } catch (err) {
      console.log("FETCH CHAT MESSAGES ERROR:", err);
      setMessages([]);
    }
  };

  const markConversationRead = async (conversationId) => {
    if (!conversationId) return;

    try {
      await api.put(
        `/conversations/${conversationId}/read`
      );

      window.dispatchEvent(
        new Event("chat-unread-updated")
      );
    } catch (err) {
      console.log("MARK CONVERSATION READ ERROR:", err);
    }
  };

  const markActive = async (conversationId) => {
    try {
      await api.post("/chat/active", {
        conversation_id: conversationId,
      });
    } catch (err) {
      console.log("MARK ACTIVE ERROR:", err);
    }
  };

  const markInactive = async (conversationId) => {
    try {
      await api.post("/chat/inactive", {
        conversation_id: conversationId,
      });
    } catch (err) {
      console.log("MARK INACTIVE ERROR:", err);
    }
  };

  useEffect(() => {
    if (!taskId && !conversationId) return;

    let activeConversationId = null;

    const initChat = async () => {
      setLoading(true);

      const convo = await fetchConversation();

      if (convo?.id) {
        activeConversationId = convo.id;

        await fetchMessages(convo.id);
        await markConversationRead(convo.id);
        await markActive(convo.id);
      }

      setLoading(false);
    };

    initChat();

    return () => {
      if (activeConversationId) {
        markInactive(activeConversationId);
      }
    };
  }, [taskId, scope, conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  useEffect(() => {
    if (!conversation?.id) return;

    socket.emit("join_conversation", conversation.id);

    const handleReceiveMessage = async (message) => {
      if (
        Number(message.conversation_id) !==
        Number(conversation.id)
      ) {
        return;
      }

      setMessages((prev) => {
        const exists = prev.some(
          (m) => Number(m.id) === Number(message.id)
        );

        if (exists) return prev;

        return [...prev, message];
      });

      setIsOtherTyping(false);

      if (
        Number(message.sender_id) !== Number(currentUserId)
      ) {
        await markConversationRead(conversation.id);
      }
    };

    let typingTimeout = null;

    const handleUserTyping = () => {
      setIsOtherTyping(true);

      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }

      typingTimeout = setTimeout(() => {
        setIsOtherTyping(false);
      }, 1500);
    };

    socket.on(
      "receive_message",
      handleReceiveMessage
    );

    socket.on(
      "user_typing",
      handleUserTyping
    );

    return () => {
      socket.emit(
        "leave_conversation",
        conversation.id
      );

      socket.off(
        "receive_message",
        handleReceiveMessage
      );

      socket.off(
        "user_typing",
        handleUserTyping
      );

      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }
    };
  }, [conversation?.id, currentUserId]);

  const handleSend = async () => {
    if (!conversation?.id) {
      alert("Chưa có cuộc trò chuyện cho nhiệm vụ này");
      return;
    }

    if (!content.trim()) return;

    try {
      await api.post("/chat/send", {
        conversation_id: conversation.id,
        content: content.trim(),
      });

      await markConversationRead(conversation.id);

      setContent("");
      setIsOtherTyping(false);
    } catch (err) {
      console.log("SEND MESSAGE ERROR:", err);

      alert(
        err.response?.data?.message ||
          "Gửi tin nhắn thất bại"
      );
    }
  };

  if (loading) {
    return (
      <div
        className={`
          rounded-2xl
          border
          p-4
          ${
            isDark
              ? "bg-slate-900 border-slate-700"
              : "bg-white border-gray-100"
          }
        `}
      >
        <p
          className={`text-sm ${
            isDark ? "text-gray-400" : "text-gray-500"
          }`}
        >
          Đang tải trao đổi nhiệm vụ...
        </p>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div
        className={`
          rounded-2xl
          border
          p-4
          ${
            isDark
              ? "bg-slate-900 border-slate-700"
              : "bg-white border-gray-100"
          }
        `}
      >
        <h3
          className={`font-semibold mb-2 ${
            isDark ? "text-gray-100" : "text-gray-800"
          }`}
        >
          💬 Trao đổi nhiệm vụ
        </h3>

        <p
          className={`text-sm ${
            isDark ? "text-gray-400" : "text-gray-500"
          }`}
        >
          Bạn chưa thuộc cuộc trò chuyện của nhiệm vụ này hoặc nhiệm vụ chưa có phòng chat.
        </p>
      </div>
    );
  }

  return (
    <div
  className={`
    w-full
    h-full
    min-h-0
    rounded-[28px]
    border
    p-4
    shadow-sm
    flex
    flex-col
    ${
      isDark
        ? "bg-gradient-to-br from-slate-900 to-slate-950 border-slate-700"
        : "bg-gradient-to-br from-gray-50 to-white border-gray-100"
    }
  `}
>
      {/* CHAT HEADER */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className={`
              w-11 h-11
              rounded-2xl
              flex
              items-center
              justify-center
              shadow
              ${
                isDark
                  ? "bg-blue-600 text-white"
                  : "bg-black text-white"
              }
            `}
          >
            💬
          </div>

          <div>
            <h3
              className={`font-bold ${
                isDark ? "text-gray-100" : "text-gray-900"
              }`}
            >
              Trao đổi nhiệm vụ
            </h3>

            <p
              className={`text-xs mt-0.5 ${
                isDark ? "text-gray-500" : "text-gray-400"
              }`}
            >
              Chat nội bộ theo nhiệm vụ
            </p>
          </div>
        </div>

        <span
          className={`
            px-3 py-1
            rounded-full
            border
            text-xs
            shadow-sm
            ${
              isDark
                ? "bg-slate-900 border-slate-700 text-gray-400"
                : "bg-white border-gray-100 text-gray-500"
            }
          `}
        >
          {messages.length} tin nhắn
        </span>
      </div>

      {/* MESSAGE AREA */}
      <div
  className={`
    flex-1
    min-h-0
    overflow-y-auto
    rounded-[26px]
    border
    p-4
    space-y-4
    shadow-inner
    ${
      isDark
        ? "bg-slate-950 border-slate-700"
        : "bg-white border-gray-100"
    }
  `}
>
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <div
              className={`
                w-14 h-14
                rounded-2xl
                flex
                items-center
                justify-center
                text-2xl
                mb-3
                ${
                  isDark ? "bg-slate-800" : "bg-gray-100"
                }
              `}
            >
              💭
            </div>

            <p
              className={`text-sm font-semibold ${
                isDark ? "text-gray-300" : "text-gray-700"
              }`}
            >
              Chưa có tin nhắn trao đổi
            </p>

            <p
              className={`text-xs mt-1 max-w-[260px] ${
                isDark ? "text-gray-500" : "text-gray-400"
              }`}
            >
              Bắt đầu trao đổi với những người liên quan trong nhiệm vụ này.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMine =
              Number(msg.sender_id) === Number(currentUserId);

            return (
              <div
                key={msg.id}
                className={`flex gap-2 ${
                  isMine ? "justify-end" : "justify-start"
                }`}
              >
                {!isMine && (
                  <div
                    className={`
                      w-8 h-8
                      rounded-full
                      flex
                      items-center
                      justify-center
                      text-xs
                      font-bold
                      shrink-0
                      mt-1
                      ${
                        isDark
                          ? "bg-slate-800 text-gray-300"
                          : "bg-gray-200 text-gray-600"
                      }
                    `}
                  >
                    {(msg.full_name || msg.username || "U")
                      .charAt(0)
                      .toUpperCase()}
                  </div>
                )}

                <div
                  className={`
                    max-w-[76%]
                    flex
                    flex-col
                    ${isMine ? "items-end" : "items-start"}
                  `}
                >
                  {!isMine && (
                    <p
                      className={`text-[11px] font-semibold mb-1 px-1 ${
                        isDark ? "text-gray-400" : "text-gray-500"
                      }`}
                    >
                      {msg.full_name ||
                        msg.username ||
                        "Người dùng"}
                    </p>
                  )}

                  <div
                    className={`
                      px-4
                      py-3
                      text-sm
                      leading-relaxed
                      shadow-sm
                      ${
                        isMine
                          ? "bg-blue-500 text-white rounded-2xl rounded-br-md"
                          : isDark
                          ? "bg-slate-800 text-gray-200 rounded-2xl rounded-bl-md"
                          : "bg-gray-100 text-gray-700 rounded-2xl rounded-bl-md"
                      }
                    `}
                  >
                    <p className="whitespace-pre-wrap break-words">
                      {msg.content}
                    </p>
                  </div>

                  <p
                    className={`
                      text-[10px]
                      mt-1
                      px-1
                      ${
                        isDark ? "text-gray-500" : "text-gray-400"
                      }
                      ${isMine ? "text-right" : ""}
                    `}
                  >
                    {msg.created_at
                      ? new Date(msg.created_at).toLocaleString()
                      : ""}
                  </p>
                </div>
              </div>
            );
          })
        )}

        {isOtherTyping && (
          <div className="flex justify-start gap-2">
            <div
              className={`
                w-8 h-8
                rounded-full
                flex
                items-center
                justify-center
                text-xs
                ${
                  isDark
                    ? "bg-slate-800 text-gray-300"
                    : "bg-gray-200 text-gray-600"
                }
              `}
            >
              …
            </div>

            <div
              className={`
                text-sm
                px-4
                py-2
                rounded-2xl
                rounded-bl-md
                ${
                  isDark
                    ? "bg-slate-800 text-gray-400"
                    : "bg-gray-100 text-gray-500"
                }
              `}
            >
              Đang nhập...
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* INPUT */}
      <div
  className={`
    mt-4
    shrink-0
    border
    rounded-[24px]
          p-2
          flex
          items-end
          gap-2
          shadow-sm
          ${
            isDark
              ? "bg-slate-950 border-slate-700"
              : "bg-white border-gray-100"
          }
        `}
      >
        <textarea
          value={content}
          onChange={(e) => {
            setContent(e.target.value);

            if (conversation?.id) {
              socket.emit("typing", conversation.id);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          rows={1}
          placeholder="Nhập nội dung trao đổi..."
          className={`
            flex-1
            resize-none
            rounded-2xl
            px-4
            py-3
            text-sm
            bg-transparent
            focus:outline-none
            max-h-28
            ${
              isDark
                ? "text-gray-100 placeholder:text-gray-500"
                : "text-gray-900 placeholder:text-gray-400"
            }
          `}
        />

        <button
          onClick={handleSend}
          disabled={!content.trim()}
          className={`
            w-11
            h-11
            rounded-2xl
            text-white
            flex
            items-center
            justify-center
            active:scale-95
            transition
            disabled:opacity-40
            disabled:cursor-not-allowed
            shrink-0
            ${
              isDark
                ? "bg-blue-600 hover:bg-blue-700"
                : "bg-black hover:bg-gray-800"
            }
          `}
          title="Gửi tin nhắn"
        >
          ➤
        </button>
      </div>

      <p
  className={`text-[11px] mt-2 px-2 shrink-0 ${
    isDark ? "text-gray-500" : "text-gray-400"
  }`}
>
  Enter để gửi • Shift + Enter để xuống dòng
</p>
    </div>
  );
}