import { useEffect, useState } from "react";
import {
  ArrowLeft,
  MessageSquare,
  Search,
} from "lucide-react";

import api from "../services/api";
import TaskChatBox from "../components/chat/TaskChatBox";

export default function TaskChats() {
  const user = JSON.parse(localStorage.getItem("user"));

  const [conversations, setConversations] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const [theme, setTheme] = useState(
  localStorage.getItem("theme") || "light"
);

const isDark = theme === "dark";

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

const fetchConversations = async () => {
  try {
    setLoading(true);

    const res = await api.get("/conversations/my");

    let list = res.data;

    if (list.length > 0 && !selectedChat) {
      const firstChat = list[0];

      setSelectedChat({
        ...firstChat,
        unread_count: 0,
      });

      if (Number(firstChat.unread_count || 0) > 0) {
        await api.put(
          `/conversations/${firstChat.conversation_id}/read`
        );

        window.dispatchEvent(
          new Event("chat-unread-updated")
        );

        list = list.map((chat) =>
          chat.conversation_id === firstChat.conversation_id
            ? {
                ...chat,
                unread_count: 0,
              }
            : chat
        );
      }
    }

    setConversations(list);
  } catch (err) {
    console.log("FETCH MY CONVERSATIONS ERROR:", err);
  } finally {
    setLoading(false);
  }
};

const markConversationRead = async (conversationId) => {
  try {
    await api.put(
      `/conversations/${conversationId}/read`
    );

    setConversations((prev) =>
      prev.map((chat) =>
        chat.conversation_id === conversationId
          ? {
              ...chat,
              unread_count: 0,
            }
          : chat
      )
    );

    setSelectedChat((prev) =>
      prev?.conversation_id === conversationId
        ? {
            ...prev,
            unread_count: 0,
          }
        : prev
    );

    window.dispatchEvent(
      new Event("chat-unread-updated")
    );
  } catch (err) {
    console.log("MARK CHAT READ ERROR:", err);
  }
};

useEffect(() => {
  fetchConversations();
}, []);

const filteredConversations = conversations.filter((item) => {
  const keyword = search.toLowerCase();

  return (
    item.task_title?.toLowerCase().includes(keyword) ||
    String(item.task_id).includes(keyword) ||
    item.last_message?.toLowerCase().includes(keyword)
  );
});

const handleSelectChat = async (item) => {
  setSelectedChat({
    ...item,
    unread_count: 0,
  });

  await markConversationRead(item.conversation_id);
};

  return (
    <div
  className={`
    min-h-screen
    p-4 md:p-6
    ${
      isDark ? "bg-slate-950 text-gray-100" : "bg-gray-100 text-gray-900"
    }
  `}
>
      <div
  className={`
    rounded-[32px]
    shadow-sm
    border
    overflow-hidden
    h-[calc(100vh-48px)]
    flex
    ${
      isDark
        ? "bg-slate-900 border-slate-800"
        : "bg-white border-gray-200"
    }
  `}
>
        {/* LEFT: CHAT LIST */}
        <div
          className={`
  w-full
  lg:w-[380px]
  border-r
  flex
  flex-col
  ${
    isDark
      ? "bg-slate-900 border-slate-800"
      : "bg-white border-gray-100"
  }

  ${
    selectedChat
      ? "hidden lg:flex"
      : "flex"
  }
`}
        >
          {/* LIST HEADER */}
          <div className="px-5 py-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1
  className={`text-2xl font-bold ${
    isDark ? "text-gray-100" : "text-gray-900"
  }`}
>
  Chats
</h1>

              <p
  className={`text-sm mt-1 ${
    isDark ? "text-gray-500" : "text-gray-400"
  }`}
>
                  Trao đổi theo nhiệm vụ
                </p>
              </div>

              <div
                className="
                  w-11 h-11
                  rounded-2xl
                  bg-blue-500
                  text-white
                  flex
                  items-center
                  justify-center
                  shadow-md
                  shadow-blue-200
                "
              >
                <MessageSquare size={20} />
              </div>
            </div>

            {/* SEARCH */}
            <div
  className={`
    flex
    items-center
    gap-3
    rounded-2xl
    px-4
    py-3
    ${
      isDark ? "bg-slate-950 border border-slate-800" : "bg-gray-100"
    }
  `}
>
              <Search size={18} className="text-gray-400" />

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm theo nhiệm vụ, nội dung..."
                className={`
  bg-transparent
  outline-none
  text-sm
  flex-1
  ${
    isDark
      ? "text-gray-100 placeholder:text-gray-500"
      : "text-gray-700 placeholder:text-gray-400"
  }
`}
              />
            </div>
          </div>

          {/* CHAT LIST */}
          <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-2">
            {loading ? (
              <p
  className={`text-sm p-3 ${
    isDark ? "text-gray-400" : "text-gray-500"
  }`}
>
                Đang tải danh sách chat...
              </p>
            ) : filteredConversations.length === 0 ? (
              <div className="text-center py-12 px-4">
                <div
                  className={`
                  w-14 h-14
                  rounded-2xl
                  flex
                  items-center
                  justify-center
                  mx-auto
                  mb-3
                  text-2xl
                  ${
                    isDark ? "bg-slate-800" : "bg-gray-100"
                  }
                `}
                >
                  💬
                </div>

                <p
                  className={`text-sm font-semibold ${
                    isDark ? "text-gray-300" : "text-gray-700"
                  }`}
                >
                  Chưa có cuộc trao đổi
                </p>

                <p className="text-xs text-gray-400 mt-1">
                  Các nhiệm vụ bạn tham gia sẽ hiển thị tại đây.
                </p>
              </div>
            ) : (
              filteredConversations.map((item) => {
                const active =
                  selectedChat?.conversation_id ===
                  item.conversation_id;

                return (
                  <button
                    key={item.conversation_id}
                    onClick={() => handleSelectChat(item)}
                    className={`
                    w-full
                    rounded-3xl
                    p-4
                    text-left
                    transition-all
                    duration-300
                    ${
                      active
                        ? isDark
                          ? "bg-blue-950/40 border border-blue-900/50"
                          : "bg-blue-50"
                        : isDark
                        ? "bg-slate-900 hover:bg-slate-800"
                        : "bg-white hover:bg-gray-50"
                    }
                  `}
                  >
                    <div className="flex items-start gap-3">
                      {/* AVATAR */}
                      <div
                        className={`
                          w-12 h-12
                          rounded-2xl
                          flex
                          items-center
                          justify-center
                          text-white
                          font-bold
                          shrink-0
                          ${
                            active
                              ? "bg-blue-500"
                              : "bg-gray-800"
                          }
                        `}
                      >
                        {item.task_title
                          ? item.task_title.charAt(0).toUpperCase()
                          : "T"}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p
                            className={`text-sm font-bold line-clamp-1 ${
                              isDark ? "text-gray-100" : "text-gray-900"
                            }`}
                          >
                            {item.task_title ||
                              `Task #${item.task_id}`}
                          </p>

                          {item.last_message_at && (
                            <span className="text-[11px] text-gray-400 shrink-0">
                              {new Date(
                                item.last_message_at
                              ).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-gray-400 mt-0.5">
                          Task #{item.task_id}
                        </p>

                        <div className="flex items-center justify-between gap-2 mt-2">
                          <p
                            className={`text-xs line-clamp-1 ${
                              isDark ? "text-gray-400" : "text-gray-500"
                            }`}
                          >
                            {item.last_message
                              ? `${
                                  item.last_sender_name ||
                                  item.last_sender_username ||
                                  "Người dùng"
                                }: ${item.last_message}`
                              : "Chưa có tin nhắn"}
                          </p>

                          {Number(item.unread_count) > 0 && (
                            <span
                              className="
                                min-w-5
                                h-5
                                px-1.5
                                rounded-full
                                bg-red-500
                                text-white
                                text-[11px]
                                font-semibold
                                flex
                                items-center
                                justify-center
                                shrink-0
                              "
                            >
                              {Number(item.unread_count) > 99
                                ? "99+"
                                : item.unread_count}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT: CHAT DETAIL */}
        <div
          className={`
            flex-1
            flex
            flex-col
            ${
              isDark ? "bg-slate-950" : "bg-gray-50"
            }

            ${
              selectedChat
                ? "flex"
                : "hidden lg:flex"
            }
          `}
        >
          {selectedChat ? (
            <>
              {/* CHAT HEADER */}
              <div
                className={`
                  px-4
                  md:px-6
                  py-4
                  border-b
                  flex
                  items-center
                  justify-between
                  gap-3
                  ${
                    isDark
                      ? "bg-slate-900 border-slate-800"
                      : "bg-white border-gray-100"
                  }
                `}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* BACK ON MOBILE */}
                  <button
                    onClick={() => setSelectedChat(null)}
                    className={`
                      lg:hidden
                      w-10 h-10
                      rounded-full
                      flex
                      items-center
                      justify-center
                      ${
                        isDark
                          ? "bg-slate-800 text-gray-300"
                          : "bg-gray-100 text-gray-600"
                      }
                    `}
                  >
                    <ArrowLeft size={20} />
                  </button>

                  <div
                    className="
                      w-11 h-11
                      rounded-2xl
                      bg-blue-500
                      text-white
                      flex
                      items-center
                      justify-center
                      font-bold
                      shrink-0
                    "
                  >
                    {selectedChat.task_title
                      ? selectedChat.task_title.charAt(0).toUpperCase()
                      : "T"}
                  </div>

                  <div className="min-w-0">
                    <h2
                      className={`font-bold line-clamp-1 ${
                        isDark ? "text-gray-100" : "text-gray-900"
                      }`}
                    >
                      {selectedChat.task_title ||
                        `Task #${selectedChat.task_id}`}
                    </h2>

                    <p className="text-xs text-gray-400 mt-0.5">
                      Trao đổi theo nhiệm vụ #{selectedChat.task_id}
                    </p>
                  </div>
                </div>

                <span
                  className={`
  hidden
  md:inline-flex
  px-3 py-1
  rounded-full
  text-xs
  ${
    isDark
      ? "bg-slate-800 text-gray-400"
      : "bg-gray-100 text-gray-500"
  }
`}
                >
                  Task chat
                </span>
              </div>

             {/* CHAT BOX */}
<div className="flex-1 min-h-0 p-4 md:p-6 flex">
  <TaskChatBox
    key={selectedChat.conversation_id}
    taskId={selectedChat.task_id}
    conversationId={selectedChat.conversation_id || selectedChat.id}
    user={user}
    scope={selectedChat.scope || "leader_unit"}
  />
</div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center px-6">
              <div
                className={`
  w-16 h-16
  rounded-3xl
  border
  flex
  items-center
  justify-center
  text-3xl
  mb-4
  ${
    isDark
      ? "bg-slate-900 border-slate-800"
      : "bg-white border-gray-100"
  }
`}
              >
                💬
              </div>

              <p
  className={`font-semibold ${
    isDark ? "text-gray-300" : "text-gray-700"
  }`}
>
                Chọn một cuộc trao đổi
              </p>

              <p className="text-sm text-gray-400 mt-1">
                Nội dung trò chuyện sẽ hiển thị tại đây.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}