import { Bell, Repeat2 } from "lucide-react";
import { useEffect, useState } from "react";
import ThemeToggle from "./common/ThemeToggle";
import {
  useNavigate,
  useLocation,
} from "react-router-dom";

import api from "../services/api";
import socket from "../socket/socket";

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();

const pageTitleMap = {
  "/app": "Dashboard",
  "/app/tasks": "Tasks",
  "/app/tasks/create": "Tạo nhiệm vụ",
  "/app/documents": "Văn bản",
  "/app/analytics": "Analytics",
  "/app/reports": "Báo cáo",
  "/app/employee-reports": "Báo cáo cá nhân",
  "/app/chat": "Chat",
  "/app/profile": "Hồ sơ cá nhân",
  "/app/trash": "Thùng rác",

  "/admin/users": "Quản lý tài khoản",
  "/admin/settings": "Cài đặt",
  "/admin/units": "Quản lý phòng ban",
  "/admin/roles": "Quản lý vai trò",
  "/admin/statuses": "Trạng thái công việc",
  "/admin/system-info": "Thông tin hệ thống",
  "/admin/security": "Bảo mật",
  "/admin/audit-logs": "Nhật ký hệ thống",
  "/admin/profile": "Hồ sơ cá nhân",
  
};

const pageTitle =
  pageTitleMap[location.pathname] || "Dashboard";

  const [open, setOpen] = useState(false);
  const [openNotifications, setOpenNotifications] = useState(false);
const [theme, setTheme] = useState(() => {
  return localStorage.getItem("theme") || "light";
});

const isDark = theme === "dark";
useEffect(() => {
  if (theme === "dark") {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
}, [theme]);

const handleToggleTheme = () => {
  const nextTheme = isDark ? "light" : "dark";

  setTheme(nextTheme);
  localStorage.setItem("theme", nextTheme);

  if (nextTheme === "dark") {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }

  window.dispatchEvent(new Event("theme-updated"));
};
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const [user, setUser] = useState(
    JSON.parse(localStorage.getItem("user")) || {}
  );

  const isAdmin =
  user?.role === "admin" ||
  user?.roleId === 1 ||
  user?.role_id === 1;

const isAdminRoute =
  location.pathname.startsWith("/admin");

  const userKey = user?.id || user?.userId || "default";

  const [avatar, setAvatar] = useState(
    localStorage.getItem(`profile_avatar_${userKey}`) || ""
  );
  useEffect(() => {
  const syncProfile = () => {
    const latestUser =
      JSON.parse(localStorage.getItem("user")) || {};

    const latestUserKey =
      latestUser?.id || latestUser?.userId || "default";

    setUser(latestUser);

    setAvatar(
      localStorage.getItem(
        `profile_avatar_${latestUserKey}`
      ) || ""
    );
  };

  window.addEventListener(
    "profile-updated",
    syncProfile
  );

  window.addEventListener(
    "storage",
    syncProfile
  );

  return () => {
    window.removeEventListener(
      "profile-updated",
      syncProfile
    );

    window.removeEventListener(
      "storage",
      syncProfile
    );
  };
}, []);

  // =======================
  // FETCH NOTIFICATIONS
  // =======================
  const fetchNotifications = async () => {
    try {
      const res = await api.get("/notifications");
      setNotifications(res.data || []);
    } catch (err) {
      console.log("FETCH NOTIFICATIONS ERROR:", err);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const res = await api.get("/notifications/unread-count");
      setUnreadCount(res.data.unread_count || 0);
    } catch (err) {
      console.log("FETCH NOTIFICATION COUNT ERROR:", err);
    }
  };

  useEffect(() => {
  if (!user?.userId && !user?.id) return;

  fetchNotifications();
  fetchUnreadCount();
}, [user?.userId, user?.id]);

  // =======================
  // SOCKET NOTIFICATION
  // =======================
  useEffect(() => {
  if (!user?.userId && !user?.id) return;

  const userId = user.userId || user.id;

  if (!socket.connected) {
    socket.connect();
  }

  socket.emit("join_user", userId);

  const handleNewNotification = async (payload) => {
    console.log("NEW NOTIFICATION RECEIVED:", payload);

    await fetchNotifications();
    await fetchUnreadCount();
  };

  socket.on("new_notification", handleNewNotification);

  return () => {
    socket.off("new_notification", handleNewNotification);
  };
}, [user?.userId, user?.id]);

  // =======================
  // ACTIONS
  // =======================

const handleSwitchInterface = () => {
  const target = isAdminRoute ? "/app" : "/admin/users";

  document.body.classList.add("route-switching");

  setTimeout(() => {
    navigate(target);

    setTimeout(() => {
      document.body.classList.remove("route-switching");
    }, 250);
  }, 120);
};

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  const handleMarkAsRead = async (notification) => {
  try {
    if (!notification.is_read) {
      await api.patch(`/notifications/${notification.id}/read`);
    }

    await fetchNotifications();
    await fetchUnreadCount();

    setOpenNotifications(false);

    // Thông báo chat
    if (notification.type === "chat_message") {
      navigate("/app/chat");
      return;
    }

    // Thông báo văn bản mới
    // Thông báo văn bản
if (notification.type?.startsWith("document_")) {
  if (notification.document_id) {
    navigate(
      `/app/documents?documentId=${notification.document_id}`
    );
  } else {
    navigate("/app/documents");
  }

  return;
}

// Thông báo báo cáo
// Thông báo báo cáo
if (notification.type?.startsWith("report_")) {
  navigate("/app/reports");
  return;
}

// Thông báo thùng rác
if (notification.type?.startsWith("trash_")) {
  navigate("/app/trash");
  return;
}

// Thông báo nhật ký hệ thống
if (notification.type?.startsWith("audit_")) {
  navigate("/admin/audit-logs");
  return;
}

// Thông báo nhiệm vụ / phần việc
if (
  notification.type?.startsWith("task_") ||
  notification.type?.startsWith("subtask_")
) {
  const taskId =
    notification.task_id ||
    notification.related_task_id ||
    notification.data?.task_id ||
    notification.data?.related_task_id ||
    notification.reference_id;

  if (taskId) {
  localStorage.setItem(
    "openTaskFromNotification",
    JSON.stringify({
      taskId,
      focusSubtasks:
        notification.type?.startsWith("subtask_"),
    })
  );
}

navigate("/app/tasks");

setTimeout(() => {
  window.dispatchEvent(
    new Event("open-task-from-notification")
  );
}, 80);

return;
}
  } catch (err) {
    console.log("MARK NOTIFICATION READ ERROR:", err);
  }
};

  const handleMarkAllAsRead = async () => {
    try {
      await api.patch("/notifications/read-all");

      await fetchNotifications();
      await fetchUnreadCount();
    } catch (err) {
      console.log("MARK ALL NOTIFICATIONS READ ERROR:", err);
    }
  };

  const formatTime = (dateString) => {
    if (!dateString) return "";

    return new Date(dateString).toLocaleString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
    });
  };
  const getNotificationIcon = (type) => {
  if (type === "chat_message") return "💬";
  if (type?.startsWith("task_")) return "📌";
  if (type?.startsWith("subtask_")) return "✅";
  if (type?.startsWith("document_")) return "📄";
  if (type?.startsWith("report_")) return "📊";
  if (type?.startsWith("trash_")) return "🗑️";
  if (type?.startsWith("audit_")) return "🧾";

  return "🔔";
};

return (
    <div
  className={`h-16 rounded-3xl shadow-sm border flex items-center justify-between px-4 md:px-6 relative z-40 shrink-0 transition-colors ${
    isDark
      ? "bg-slate-900 border-slate-800 text-white"
      : "bg-white border-gray-100 text-gray-900"
  }`}
>
      {/* LEFT */}
      <div
  className={`text-lg font-semibold ${
    isDark ? "text-white" : "text-gray-900"
  }`}
>
  {pageTitle}
</div>

      {/* RIGHT */}
      <div className="flex items-center gap-2 md:gap-6">
  {isAdmin && (
    <button
      onClick={handleSwitchInterface}
      className={`
        h-10
        px-3
        rounded-xl
        flex
        items-center
        gap-2
        text-sm
        font-semibold
        transition
        ${
          isDark
            ? "bg-blue-600 text-white hover:bg-blue-500"
            : "bg-blue-500 text-white hover:bg-blue-600"
        }
      `}
      title={
        isAdminRoute
          ? "Chuyển sang giao diện người dùng"
          : "Chuyển sang quản trị"
      }
    >
      <Repeat2 size={17} />

      <span className="hidden lg:inline">
        {isAdminRoute ? "Người dùng" : "Quản trị"}
      </span>
    </button>
  )}

  {/* Notification */}
        <div className="relative">
          <button
          onClick={() => setOpenNotifications(!openNotifications)}
          className={`
            relative
            w-10 h-10
            rounded-full
            flex
            items-center
            justify-center
            transition
            ${
              isDark
                ? "text-gray-200 hover:bg-slate-800"
                : "text-gray-700 hover:bg-gray-100"
            }
          `}
            title="Thông báo"
          >
            <Bell size={20} />

            {unreadCount > 0 && (
              <span
                className="
                  absolute
                  -top-1
                  -right-1
                  min-w-5
                  h-5
                  px-1.5
                  rounded-full
                  bg-red-500
                  text-white
                  text-[11px]
                  font-bold
                  flex
                  items-center
                  justify-center
                "
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>

          {openNotifications && (
            <div
            className={`
              fixed
              top-[76px]
              left-3
              right-3
              max-h-[70vh]
              border
              shadow-2xl
              rounded-2xl
              overflow-hidden
              z-[999]

              sm:absolute
              sm:top-full
              sm:left-auto
              sm:right-0
              sm:mt-3
              sm:w-[380px]
              sm:max-h-none

              ${
                isDark
                  ? "bg-slate-900 border-slate-800 text-white"
                  : "bg-white border-gray-100 text-gray-900"
              }
            `}
          >
              <div
                  className={`px-4 py-3 border-b flex items-center justify-between ${
                    isDark ? "border-slate-800" : "border-gray-100"
                  }`}
                >
                <div>
                  <h3
                    className={`font-bold ${
                      isDark ? "text-gray-100" : "text-gray-900"
                    }`}
                  >
                    Thông báo
                  </h3>

                  <p className="text-xs text-gray-400 mt-0.5">
                    {unreadCount > 0
                      ? `${unreadCount} thông báo chưa đọc`
                      : "Không có thông báo chưa đọc"}
                  </p>
                </div>

                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Đọc tất cả
                  </button>
                )}
              </div>

              <div className="max-h-[calc(70vh-76px)] sm:max-h-[420px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="py-10 text-center">
                    <div className="text-3xl mb-2">🔔</div>

                    <p
                      className={`text-sm font-semibold ${
                        isDark ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      Chưa có thông báo
                    </p>

                    <p className="text-xs text-gray-400 mt-1">
                      Thông báo mới sẽ hiển thị tại đây.
                    </p>
                  </div>
                ) : (
                  notifications.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleMarkAsRead(item)}
                      className={`
                        w-full
                        text-left
                        px-4 py-3
                        border-b
                        transition
                        ${
                          isDark
                            ? "border-slate-800 hover:bg-slate-800"
                            : "border-gray-50 hover:bg-gray-50"
                        }
                        ${
                          item.is_read
                            ? isDark
                              ? "bg-slate-900"
                              : "bg-white"
                            : isDark
                            ? "bg-blue-950/30"
                            : "bg-blue-50/70"
                        }
                      `}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`
                            w-9 h-9
                            rounded-xl
                            flex
                            items-center
                            justify-center
                            shrink-0
                            ${
                              item.is_read
                                ? isDark
                                  ? "bg-slate-800 text-gray-400"
                                  : "bg-gray-100 text-gray-500"
                                : "bg-blue-500 text-white"
                            }
                          `}
                        >
                          {getNotificationIcon(item.type)}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p
                              className={`
                                text-sm
                                line-clamp-1
                                ${
                                  item.is_read
                                ? isDark
                                  ? "font-medium text-gray-300"
                                  : "font-medium text-gray-700"
                                : isDark
                                ? "font-bold text-gray-100"
                                : "font-bold text-gray-900"
                                }
                              `}
                            >
                              {item.title || "Thông báo"}
                            </p>

                            {!item.is_read && (
                              <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1.5" />
                            )}
                          </div>

                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                            {item.content || "Không có nội dung"}
                          </p>

                          <p className="text-[11px] text-gray-400 mt-1">
                            {formatTime(item.created_at)}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
        <ThemeToggle
  theme={theme}
  onToggle={handleToggleTheme}
/>
        {/* User Info */}
        <div className="text-right hidden md:block">
  <div className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
  {user?.full_name || user?.username || "User"}
</div>

<div className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>
  {user?.role}
</div>
</div>

        {/* Avatar + Dropdown */}
        <div className="relative">
          <div
            onClick={() => setOpen(!open)}
            className="w-9 h-9 bg-blue-500 text-white flex items-center justify-center rounded-full cursor-pointer overflow-hidden"
          >
            {avatar ? (
              <img
                src={avatar}
                alt="avatar"
                className="w-full h-full object-cover"
              />
            ) : (
              user?.full_name?.charAt(0) ||
              user?.username?.charAt(0) ||
              "U"
            )}
          </div>

          {open && (
            <div
                className={`
                  absolute
                  right-0
                  mt-2
                  w-40
                  border
                  shadow
                  rounded-lg
                  py-2
                  z-50
                  ${
                    isDark
                      ? "bg-slate-900 border-slate-800"
                      : "bg-white border-gray-100"
                  }
                `}
              >
              <div
                onClick={() => {
                  setOpen(false);

                  if (window.location.pathname.startsWith("/admin")) {
                    navigate("/admin/profile");
                  } else {
                    navigate("/app/profile");
                  }
                }}
                className={`px-4 py-2 text-sm cursor-pointer ${
                isDark
                  ? "text-gray-200 hover:bg-slate-800"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
              >
                Hồ sơ
              </div>

              <div
                onClick={handleLogout}
                className={`px-4 py-2 text-sm text-red-500 cursor-pointer ${
                  isDark ? "hover:bg-slate-800" : "hover:bg-gray-100"
                }`}
              >
                Đăng xuất
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}