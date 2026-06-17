import { useEffect, useRef, useState } from "react";
import {
  ClipboardCheck,
  X,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Bot,
  Send,
  Loader2,
} from "lucide-react";
import api from "../../services/api";

export default function FloatingTodo() {
  const [menuOpen, setMenuOpen] = useState(false);
const [todoOpen, setTodoOpen] = useState(false);
const [aiOpen, setAiOpen] = useState(false);

const [aiConversationId, setAiConversationId] = useState(null);
const [aiMessages, setAiMessages] = useState([]);
const [aiInput, setAiInput] = useState("");
const [aiLoading, setAiLoading] = useState(false);
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(false);

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

  const [position, setPosition] = useState(() => {
  const saved = localStorage.getItem("floating_todo_position");

  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (err) {
      localStorage.removeItem("floating_todo_position");
    }
  }

  return {
    x: 320,
    y: 120,
  };
});

  const draggingRef = useRef(false);
  const movedRef = useRef(false);
  const suppressClickRef = useRef(false);

  const offsetRef = useRef({ x: 0, y: 0 });
  const positionRef = useRef(position);

useEffect(() => {
  positionRef.current = position;
}, [position]);

  const fetchTodos = async () => {
    try {
      setLoading(true);

      const res = await api.get("/todos/floating");

      const data = Array.isArray(res.data) ? res.data : [];

      const sorted = data.sort((a, b) => {
  const order = {
  MISSING_UNIT_MONTHLY_REPORT: 1,
  MISSING_MONTHLY_REPORT: 1,
  MY_MONTHLY_REPORT: 1,
  TASK_REMINDER: 2,
};

  return (order[a.type] || 99) - (order[b.type] || 99);
});

setTodos(sorted);
    } catch (err) {
      console.log("FETCH FLOATING TODOS ERROR:", err);
      setTodos([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
  fetchTodos();

  const interval = setInterval(() => {
    fetchTodos();
  }, 5 * 60 * 1000); // 5 phút cập nhật một lần

  return () => clearInterval(interval);
}, []);

useEffect(() => {
  const handleVisibilityChange = () => {
    if (!document.hidden) {
      fetchTodos();
    }
  };

  document.addEventListener(
    "visibilitychange",
    handleVisibilityChange
  );

  return () => {
    document.removeEventListener(
      "visibilitychange",
      handleVisibilityChange
    );
  };
}, []);

  const pendingCount = todos.length;

  const user =
  JSON.parse(localStorage.getItem("user")) || {};

const permissions = user?.permissions || [];

const canUseAI =
  permissions.includes("ai:chat");

const openTodoPanel = () => {
  setMenuOpen(false);
  setTodoOpen(true);
};

const openAiPanel = async () => {
  try {
    setMenuOpen(false);
    setAiOpen(true);

    if (aiConversationId) return;

    const res = await api.post("/ai/conversation");

    setAiConversationId(res.data.id);

    setAiMessages([
      {
        role: "assistant",
        content:
          "Xin chào, tôi có thể hỗ trợ tra cứu nhiệm vụ, văn bản, báo cáo và hồ sơ lưu trữ trong hệ thống.",
      },
    ]);
  } catch (err) {
    console.log("CREATE AI CONVERSATION ERROR:", err);
  }
};

const sendAiMessage = async () => {
  const content = aiInput.trim();

  if (!content || aiLoading) return;

  try {
    setAiLoading(true);

    let currentConversationId = aiConversationId;

    if (!currentConversationId) {
      const conversationRes = await api.post("/ai/conversation");
      currentConversationId = conversationRes.data.id;
      setAiConversationId(currentConversationId);
    }

    const userMessage = {
      role: "user",
      content,
    };

    setAiMessages((prev) => [...prev, userMessage]);
    setAiInput("");

    const res = await api.post("/ai/chat", {
      conversationId: currentConversationId,
      message: content,
    });

    setAiMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: res.data.reply,
        sources: res.data.sources,
        isAnswered: res.data.isAnswered,
      },
    ]);
  } catch (err) {
    console.log("SEND AI MESSAGE ERROR:", err);

    setAiMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content:
          "Có lỗi khi gọi trợ lý AI. Vui lòng thử lại sau.",
      },
    ]);
  } finally {
    setAiLoading(false);
  }
};

const actionDirection =
  position.y < 170 ? "down" : "up";

const getActionTop = (index) => {
  if (actionDirection === "down") {
    return position.y + 76 + index * 58;
  }

  return position.y - 58 * (index + 1);
};

const floatingActions = [
  ...(canUseAI
    ? [
        {
          key: "ai",
          title: "Trợ lý AI",
          icon: <Bot size={22} />,
          onClick: openAiPanel,
          badge: 0,
        },
      ]
    : []),
  {
    key: "todo",
    title: "Việc cần xử lý",
    icon: <ClipboardCheck size={22} />,
    onClick: openTodoPanel,
    badge: pendingCount,
  },
];

  const getSafePosition = (nextPosition) => {
  const isMobile = window.innerWidth < 768;

  const buttonSize = 64;
  const margin = 12;

  // mobile cần chừa BottomNav bên dưới
  const bottomSafe = isMobile ? 112 : margin;

  const maxX =
    window.innerWidth - buttonSize - margin;

  const maxY =
    window.innerHeight - buttonSize - bottomSafe;

  return {
    x: Math.max(
      margin,
      Math.min(nextPosition.x, maxX)
    ),
    y: Math.max(
      margin,
      Math.min(nextPosition.y, maxY)
    ),
  };
};

useEffect(() => {
  const syncPosition = () => {
    setPosition((prev) => {
      const safe = getSafePosition(prev);

      localStorage.setItem(
        "floating_todo_position",
        JSON.stringify(safe)
      );

      return safe;
    });
  };

  syncPosition();

  window.addEventListener("resize", syncPosition);
  window.addEventListener("orientationchange", syncPosition);

  return () => {
    window.removeEventListener("resize", syncPosition);
    window.removeEventListener(
      "orientationchange",
      syncPosition
    );
  };
}, []);

  const handlePointerDown = (e) => {
  e.currentTarget.setPointerCapture?.(e.pointerId);

  draggingRef.current = true;
  movedRef.current = false;
  suppressClickRef.current = false;

  offsetRef.current = {
    x: e.clientX - position.x,
    y: e.clientY - position.y,
  };
};

  useEffect(() => {
  const handlePointerMove = (e) => {
    if (!draggingRef.current) return;

    const nextX = e.clientX - offsetRef.current.x;
    const nextY = e.clientY - offsetRef.current.y;

    const distanceX = Math.abs(nextX - positionRef.current.x);
    const distanceY = Math.abs(nextY - positionRef.current.y);

    if (distanceX > 4 || distanceY > 4) {
      movedRef.current = true;
      suppressClickRef.current = true;
    }

    const newPosition = getSafePosition({
      x: nextX,
      y: nextY,
    });

    setPosition(newPosition);
  };

  const handlePointerUp = () => {
    if (!draggingRef.current) return;

    draggingRef.current = false;

    localStorage.setItem(
      "floating_todo_position",
      JSON.stringify(positionRef.current)
    );

    setTimeout(() => {
      suppressClickRef.current = false;
    }, 80);
  };

  window.addEventListener("pointermove", handlePointerMove);
  window.addEventListener("pointerup", handlePointerUp);
  window.addEventListener("pointercancel", handlePointerUp);

  return () => {
    window.removeEventListener("pointermove", handlePointerMove);
    window.removeEventListener("pointerup", handlePointerUp);
    window.removeEventListener("pointercancel", handlePointerUp);
  };
}, []);

  return (
    <>
      {/* FLOATING BUTTON */}
      {/* FLOATING ACTIONS */}
{menuOpen &&
  floatingActions.map((action, index) => (
    <button
      key={action.key}
      onClick={action.onClick}
      style={{
        left: `${position.x + 8}px`,
        top: `${getActionTop(index)}px`,
      }}
      className={`
        fixed
        z-[9999]
        w-12 h-12
        rounded-full
        border
        shadow-xl
        flex
        items-center
        justify-center
        transition
        hover:scale-110
        ${
          isDark
            ? "bg-slate-900 border-slate-700 text-white shadow-slate-950/50"
            : "bg-white border-gray-200 text-gray-900 shadow-gray-300/70"
        }
      `}
      title={action.title}
    >
      {action.icon}

      {action.badge > 0 && (
        <span
          className={`
            absolute
            -top-1
            -right-1
            min-w-5
            h-5
            px-1
            rounded-full
            bg-red-500
            text-white
            text-[10px]
            font-bold
            flex
            items-center
            justify-center
            border-2
            ${isDark ? "border-slate-900" : "border-white"}
          `}
        >
          {action.badge > 99 ? "99+" : action.badge}
        </span>
      )}
    </button>
  ))}

{/* FLOATING MAIN BUTTON */}
<button
  onPointerDown={handlePointerDown}
  onClick={() => {
    if (suppressClickRef.current) return;
    setMenuOpen((prev) => !prev);
  }}
  style={{
    left: `${position.x}px`,
    top: `${position.y}px`,
  }}
  className={`
    fixed
    z-[9999]
    w-16 h-16
    rounded-full
    border
    shadow-xl
    flex
    items-center
    justify-center
    hover:scale-105
    transition
    cursor-move
    touch-none
    select-none
    ${
      isDark
        ? "bg-slate-900 border-slate-700 shadow-slate-950/50"
        : "bg-white border-gray-200 shadow-gray-300/70"
    }
  `}
  title="Menu nhanh"
>
  {menuOpen ? (
    <X
      size={30}
      className={isDark ? "text-white" : "text-gray-900"}
    />
  ) : (
    <ClipboardCheck
      size={28}
      className="text-blue-600"
    />
  )}

  {pendingCount > 0 && (
    <span
      className={`
        absolute
        -top-1
        -right-1
        min-w-6
        h-6
        px-1.5
        rounded-full
        bg-red-500
        text-white
        text-xs
        font-bold
        flex
        items-center
        justify-center
        border-2
        ${isDark ? "border-slate-900" : "border-white"}
      `}
    >
      {pendingCount > 99 ? "99+" : pendingCount}
    </span>
  )}
</button>

      {/* TODO PANEL */}
      {todoOpen && (
        <div
          className="
            fixed
            inset-0
            bg-black/30
            backdrop-blur-sm
            z-[10000]
            flex
            items-start
            justify-center
            pt-4
            px-4
          "
          onClick={() => setTodoOpen(false)}
        >
          <div
            className={`
              w-[520px]
              max-w-[95vw]
              h-[85vh] md:h-[82vh]
              rounded-[34px]
              shadow-2xl
              overflow-hidden
              animate-fadeIn
              flex
              flex-col

              ${
                isDark
                  ? "bg-slate-900 text-gray-100"
                  : "bg-white text-gray-900"
              }
            `}
            onClick={(e) => e.stopPropagation()}
          >
            {/* HEADER */}
            <div
              className="
                px-6 py-5
                bg-gradient-to-br
                from-gray-950
                via-gray-900
                to-blue-950
                text-white
              "
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <ClipboardCheck size={22} />

                    <h2 className="text-xl font-bold">
                      Việc cần xử lý
                    </h2>
                  </div>

                  <p className="text-sm text-gray-300 mt-2">
                    Nhắc báo cáo, nhiệm vụ đến kỳ và các việc cần xử lý
                  </p>
                </div>

                <button
                  onClick={() => setTodoOpen(false)}
                  className="
                    w-10 h-10
                    rounded-full
                    bg-white/10
                    hover:bg-white/20
                    flex items-center justify-center
                    transition
                  "
                >
                  <X size={18} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-5">
                <div className="rounded-2xl bg-white/10 border border-white/10 px-4 py-3">
                  <p className="text-xs text-gray-300">
                    Cần xử lý
                  </p>

                  <p className="text-2xl font-bold mt-1">
                    {pendingCount}
                  </p>
                </div>

                <div className="rounded-2xl bg-white/10 border border-white/10 px-4 py-3">
                  <p className="text-xs text-gray-300">
                    Tổng nhắc việc
                  </p>

                  <p className="text-2xl font-bold mt-1">
                    {todos.length}
                  </p>
                </div>
              </div>
            </div>

            {/* BODY */}
            <div
              className={`
                flex-1
                p-5
                pr-3
                overflow-y-auto
                ${
                  isDark ? "bg-slate-900" : "bg-white"
                }
              `}
            >
              {loading ? (
                <div
                    className={`text-sm text-center py-10 ${
                      isDark ? "text-gray-400" : "text-gray-500"
                    }`}
                  >
                  Đang tải việc cần xử lý...
                </div>
              ) : todos.length === 0 ? (
                <div className="text-center py-10">
                  <CheckCircle2
                    size={42}
                    className="mx-auto text-green-500 mb-3"
                  />

                  <p
                    className={`text-sm font-semibold ${
                      isDark ? "text-gray-300" : "text-gray-600"
                    }`}
                  >
                    Hiện chưa có việc cần xử lý
                  </p>
                </div>
              ) : (
                <div className="space-y-3 pb-4">
                  {todos.map((item, index) => (
                    <TodoItem
                    key={`${item.type}-${item.task_id}-${item.subtask_id || index}`}
                    item={item}
                    isDark={isDark}
                  />
                  ))}
                </div>
              )}
            </div>

            {/* FOOTER */}
            <div
              className={`
                px-5 py-4 pb-safe
                border-t
                flex
                justify-between
                items-center
                shrink-0
                  ${
                    isDark
                      ? "bg-slate-950 border-slate-800"
                      : "bg-gray-50 border-gray-100"
                  }
                `}
              >
              <button
                onClick={fetchTodos}
                className={`
                  px-4 py-2
                  rounded-2xl
                  border
                  text-sm
                  font-semibold
                  transition

                  ${
                    isDark
                      ? "bg-slate-900 border-slate-700 text-gray-200 hover:bg-slate-800"
                      : "bg-white border-gray-200 text-gray-700 hover:bg-gray-100"
                  }
                `}
              >
                Làm mới
              </button>

              <a
                href="/app/reports"
                className="
                  px-4 py-2
                  rounded-2xl
                  bg-blue-500
                  text-white
                  text-sm
                  font-semibold
                  hover:bg-blue-600
                  transition
                "
              >
                Xem trang báo cáo
              </a>
            </div>
          </div>
        </div>

      )}

      {/* AI CHAT PANEL */}
{aiOpen && (
  <div
    className="
      fixed
      inset-0
      bg-black/30
      backdrop-blur-sm
      z-[10000]
      flex
      items-center
      justify-center
      px-4
    "
    onClick={() => setAiOpen(false)}
  >
    <div
      className={`
        w-[520px]
        max-w-[95vw]
        h-[76vh]
        rounded-[34px]
        shadow-2xl
        overflow-hidden
        animate-fadeIn
        flex
        flex-col
        ${
          isDark
            ? "bg-slate-900 text-gray-100"
            : "bg-white text-gray-900"
        }
      `}
      onClick={(e) => e.stopPropagation()}
    >
      {/* HEADER */}
      <div
        className="
          px-6 py-5
          bg-gradient-to-br
          from-gray-950
          via-gray-900
          to-blue-950
          text-white
        "
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Bot size={22} />

              <h2 className="text-xl font-bold">
                Trợ lý AI
              </h2>
            </div>

            <p className="text-sm text-gray-300 mt-2">
              Hỏi đáp theo dữ liệu nhiệm vụ, văn bản và báo cáo trong hệ thống
            </p>
          </div>

          <button
            onClick={() => setAiOpen(false)}
            className="
              w-10 h-10
              rounded-full
              bg-white/10
              hover:bg-white/20
              flex items-center justify-center
              transition
            "
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* BODY */}
      <div
        className={`
          flex-1
          overflow-y-auto
          p-5
          space-y-3
          ${
            isDark ? "bg-slate-900" : "bg-white"
          }
        `}
      >
        {aiMessages.length === 0 ? (
          <div
            className={`text-center py-12 text-sm ${
              isDark ? "text-gray-400" : "text-gray-500"
            }`}
          >
            Nhập câu hỏi để bắt đầu trao đổi với trợ lý AI.
          </div>
        ) : (
          aiMessages.map((msg, index) => (
            <div
              key={index}
              className={`
                flex
                ${
                  msg.role === "user"
                    ? "justify-end"
                    : "justify-start"
                }
              `}
            >
              <div
                className={`
                  max-w-[82%]
                  rounded-3xl
                  px-4 py-3
                  text-sm
                  whitespace-pre-line
                  ${
                    msg.role === "user"
                      ? "bg-blue-500 text-white"
                      : isDark
                      ? "bg-slate-800 text-gray-100"
                      : "bg-gray-100 text-gray-800"
                  }
                `}
              >
                {msg.content}

                {msg.role === "assistant" && msg.sources && (
                  <div
                    className={`
                      mt-3
                      pt-2
                      border-t
                      text-[11px]
                      opacity-70
                      ${
                        isDark
                          ? "border-slate-700"
                          : "border-gray-200"
                      }
                    `}
                  >
                    Nguồn dữ liệu:
                    {msg.sources.tasks?.length > 0 && (
                      <span> Tasks: {msg.sources.tasks.join(", ")}</span>
                    )}
                    {msg.sources.documents?.length > 0 && (
                      <span> Văn bản: {msg.sources.documents.join(", ")}</span>
                    )}
                    {msg.sources.knowledge?.length > 0 && (
                      <span> Tri thức: {msg.sources.knowledge.join(", ")}</span>
                    )}
                    {!msg.sources.tasks?.length &&
                      !msg.sources.documents?.length &&
                      !msg.sources.knowledge?.length && (
                        <span> Không có nguồn phù hợp</span>
                      )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}

        {aiLoading && (
          <div className="flex justify-start">
            <div
              className={`
                rounded-3xl
                px-4 py-3
                text-sm
                flex items-center gap-2
                ${
                  isDark
                    ? "bg-slate-800 text-gray-300"
                    : "bg-gray-100 text-gray-600"
                }
              `}
            >
              <Loader2 size={15} className="animate-spin" />
              AI đang xử lý...
            </div>
          </div>
        )}
      </div>

      {/* INPUT */}
      <div
        className={`
          p-4
          border-t
          ${
            isDark
              ? "bg-slate-950 border-slate-800"
              : "bg-gray-50 border-gray-100"
          }
        `}
      >
        <div
          className={`
            flex items-center gap-2
            rounded-2xl
            border
            px-3 py-2
            ${
              isDark
                ? "bg-slate-900 border-slate-700"
                : "bg-white border-gray-200"
            }
          `}
        >
          <input
            value={aiInput}
            onChange={(e) => setAiInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                sendAiMessage();
              }
            }}
            placeholder="Hỏi AI về nhiệm vụ, văn bản, báo cáo..."
            className={`
              flex-1
              bg-transparent
              outline-none
              text-sm
              ${
                isDark
                  ? "text-gray-100 placeholder:text-gray-500"
                  : "text-gray-900 placeholder:text-gray-400"
              }
            `}
          />

          <button
            onClick={sendAiMessage}
            disabled={aiLoading || !aiInput.trim()}
            className="
              w-10 h-10
              rounded-xl
              bg-blue-500
              text-white
              flex items-center justify-center
              hover:bg-blue-600
              disabled:opacity-50
              disabled:cursor-not-allowed
              transition
            "
          >
            {aiLoading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Send size={18} />
            )}
          </button>
        </div>
      </div>
    </div>
  </div>
)}
    </>
  );
}

function TodoItem({ item, isDark }) {
  const done = item.is_reported;
  const isReport =
  item.type === "MISSING_MONTHLY_REPORT" ||
  item.type === "MY_MONTHLY_REPORT" ||
  item.type === "MISSING_UNIT_MONTHLY_REPORT";

const isTask = item.type === "TASK_REMINDER";

const title =
  item.type === "MISSING_UNIT_MONTHLY_REPORT"
    ? item.unit_name
    : item.task_title || item.title || "Việc cần xử lý";

  return (
    <div
      className={`
          rounded-3xl
          border
          p-4
          transition-all
          duration-300
          ${
            done
              ? isDark
                ? "bg-green-950/20 border-green-900/40 opacity-90"
                : "bg-green-50 border-green-100 opacity-90"
              : isDark
              ? "bg-red-950/20 border-red-900/40"
              : "bg-red-50 border-red-100"
          }
        `}
    >
      <div className="flex gap-3">
        <div
          className={`
            w-11 h-11
            rounded-2xl
            flex
            items-center
            justify-center
            shrink-0
            transition-all
            duration-300
            ${
              done
                ? isDark
                  ? "bg-green-900/40 text-green-400"
                  : "bg-green-100 text-green-600"
                : isDark
                ? "bg-red-900/40 text-red-400"
                : "bg-red-100 text-red-600"
            }
          `}
        >
          {done ? (
            <CheckCircle2 size={20} />
          ) : (
            <AlertTriangle size={20} />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span
              className={`
                px-2.5 py-1
                rounded-full
                text-[11px]
                font-bold
                ${
                  done
                    ? isDark
                      ? "bg-green-900/50 text-green-300"
                      : "bg-green-100 text-green-700"
                    : isDark
                    ? "bg-red-900/50 text-red-300"
                    : "bg-red-100 text-red-700"
                }
              `}
            >
              {done ? "Đã xử lý" : "Cần xử lý"}
            </span>

            <span
            className={`
              px-2.5 py-1
              rounded-full
              text-[11px]
              font-semibold
              ${
                isDark
                  ? "bg-slate-800 text-gray-300"
                  : "bg-white text-gray-600"
              }
            `}
          >
            {isReport ? "Báo cáo tháng" : "Nhiệm vụ"}
          </span>
          </div>

          {/* TÊN TASK CÓ GẠCH NGANG ANIMATION */}
          <div className="relative w-fit max-w-full">
            <p
              className={`
                text-sm
                font-bold
                line-clamp-1
                transition-colors
                duration-300
                ${
                  done
                    ? isDark
                      ? "text-gray-500"
                      : "text-gray-400"
                    : isDark
                    ? "text-gray-100"
                    : "text-gray-900"
                }
              `}
            >
              {title}
            </p>

            {done && (
              <span
                className="
                  absolute
                  left-0
                  top-1/2
                  h-[2px]
                  bg-gray-400
                  rounded-full
                  animate-strike
                "
              />
            )}
          </div>

          {/* TÊN PHẦN VIỆC CÓ GẠCH NGANG ANIMATION */}
          {item.subtask_title && (
            <div className="relative w-fit max-w-full mt-1">
              <p
                className={`
                  text-xs
                  line-clamp-1
                  transition-colors
                  duration-300
                  ${done ? "text-purple-300" : "text-purple-600"}
                `}
              >
                Phần việc: {item.subtask_title}
              </p>

              {done && (
                <span
                  className="
                    absolute
                    left-0
                    top-1/2
                    h-[1.5px]
                    bg-purple-300
                    rounded-full
                    animate-strike
                  "
                />
              )}
            </div>
          )}

          {item.reporter_name && (
            <p
              className={`text-xs mt-1 ${
                isDark ? "text-gray-400" : "text-gray-500"
              }`}
            >
              Nhân viên:{" "}
              <b>{item.reporter_name}</b>
            </p>
          )}

          <p
            className={`
              text-sm
              mt-2
              transition-colors
              duration-300
              ${
                done
                  ? isDark
                    ? "text-gray-500"
                    : "text-gray-400"
                  : isDark
                  ? "text-gray-300"
                  : "text-gray-600"
              }
            `}
          >
            {item.message}
          </p>

          <div
              className={`flex items-center gap-1 text-xs mt-2 ${
                isDark ? "text-gray-500" : "text-gray-400"
              }`}
            >
            <Clock size={13} />

            <span>
              Hạn:{" "}
              {item.han_chot
                ? new Date(item.han_chot).toLocaleDateString()
                : "-"}
            </span>

            {item.unit_name && (
              <span>• {item.unit_name}</span>
            )}
          </div>

          {isTask ? (
  <a
  href={`/app/tasks?taskId=${item.task_id}`}
  className={`
  inline-flex
  mt-3
  px-3 py-1.5
  rounded-xl
  border
  text-xs
  font-semibold
  transition
  ${
    isDark
      ? "bg-slate-900 border-slate-700 text-blue-400 hover:bg-slate-800"
      : "bg-white border-gray-200 text-blue-600 hover:bg-blue-50"
  }
`}
>
  Xem chi tiết nhiệm vụ
</a>
) : (
  <a
  href="/app/reports"
  className={`
    inline-flex
    mt-3
    px-3 py-1.5
    rounded-xl
    border
    text-xs
    font-semibold
    transition
    ${
      isDark
        ? "bg-slate-900 border-slate-700 text-blue-400 hover:bg-slate-800"
        : "bg-white border-gray-200 text-blue-600 hover:bg-blue-50"
    }
  `}
>
  Xem báo cáo tháng
</a>
)}
        </div>
      </div>
    </div>
  );
}