import { useEffect, useState } from "react";
import {
  NavLink,
  useNavigate,
  useLocation,
} from "react-router-dom";
import api from "../services/api";

import socket from "../socket/socket";
import {
  LayoutDashboard,
  BarChart,
  FileText,
  MessageSquare,
  Trash2,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Settings,
  UserCog,
  Building2,
  ShieldCheck,
  ListChecks,
  SlidersHorizontal,
  LockKeyhole,
  Repeat2,
  Archive,
} from "lucide-react";

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const [user, setUser] = useState(
    JSON.parse(localStorage.getItem("user")) || {}
  );

  const isAdminRoute =
    location.pathname.startsWith("/admin");

  const userKey =
    user?.id || user?.userId || "default";

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
  "permission-updated",
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
    "permission-updated",
    syncProfile
  );

  window.removeEventListener(
    "storage",
    syncProfile
  );
};
}, []);

  const isAdmin =
    user?.role === "admin" ||
    user?.roleId === 1 ||
    user?.role_id === 1;

const permissions = user?.permissions || [];

const hasPerm = (permission) =>
  permissions.includes(permission);

const canViewDashboard =
  hasPerm("dashboard:leader") ||
  hasPerm("dashboard:unit") ||
  hasPerm("dashboard:own");

const canViewTasks =
  hasPerm("task:view_all") ||
  hasPerm("task:view_unit") ||
  hasPerm("task:view_own");

const canViewDocuments =
  hasPerm("document:read") ||
  hasPerm("document:view_all") ||
  hasPerm("document:view_unit") ||
  hasPerm("document:view_related");

const canViewAnalytics =
  hasPerm("analytics:view");

const canViewReports =
  hasPerm("report:view");

const canViewEmployeeReports =
  hasPerm("task:submit");

const isEmployee =
  user?.role === "nhan_vien" ||
  user?.roleId === 4 ||
  user?.role_id === 4;

const canViewAnyReport =
  canViewReports || canViewEmployeeReports;

const reportPath = isEmployee
  ? "/app/employee-reports"
  : "/app/reports";

const canViewChat =
  hasPerm("chat:access");

const canViewTrash =
  hasPerm("trash:view");

const canViewArchives =
  hasPerm("archive:view_all") ||
  hasPerm("archive:view_unit") ||
  hasPerm("archive:view_related") ||
  hasPerm("document:read") ||
  hasPerm("task:view_all") ||
  hasPerm("task:view_unit") ||
  hasPerm("task:view_own");

  const [collapsed, setCollapsed] =
    useState(false);

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


const [chatUnread, setChatUnread] = useState(0);

const fetchChatUnread = async () => {
  try {
    if (!canViewChat) {
      setChatUnread(0);
      return;
    }

    const res = await api.get("/conversations/unread-count");

    setChatUnread(res.data.total_unread || 0);
  } catch (err) {
    console.log("FETCH CHAT UNREAD ERROR:", err);
  }
};

useEffect(() => {
  fetchChatUnread();

  const handleUpdateUnread = () => {
    fetchChatUnread();
  };

  window.addEventListener(
    "chat-unread-updated",
    handleUpdateUnread
  );

  return () => {
    window.removeEventListener(
      "chat-unread-updated",
      handleUpdateUnread
    );
  };
}, [canViewChat]);

useEffect(() => {
  if (!canViewChat) return;
  if (!user?.userId && !user?.id) return;

  const userId = user.userId || user.id;

  socket.emit("join_user", userId);

  const handleNewNotification = (data) => {
  if (data?.type !== "chat_message") return;

  fetchChatUnread();
};

  socket.on("new_notification", handleNewNotification);

  return () => {
    socket.off("new_notification", handleNewNotification);
  };
}, [user?.userId, user?.id, canViewChat]);


const [systemInfo, setSystemInfo] = useState({
  system_name: "Hệ thống quản lý",
  organization_name: "Work Management",
});
useEffect(() => {
  const fetchSystemInfo = async () => {
    try {
      const res = await api.get("/system-settings");

      setSystemInfo({
        system_name:
          res.data.system_name || "Hệ thống quản lý",
        organization_name:
          res.data.organization_name || "Work Management",
      });
    } catch (err) {
      console.log("FETCH SYSTEM INFO ERROR:", err);
    }
  };

  fetchSystemInfo();
}, []);
  const adminMenu = [
  {
    name: "Tài khoản",
    path: "/admin/users",
    icon: <UserCog size={18} />,
  },
  {
    name: "Phòng ban",
    path: "/admin/units",
    icon: <Building2 size={18} />,
  },
  {
    name: "Settings",
    path: "/admin/settings",
    icon: <Settings size={18} />,
  },
  {
    name: "Vai trò",
    path: "/admin/roles",
    icon: <ShieldCheck size={18} />,
  },
  {
    name: "Trạng thái công việc",
    path: "/admin/statuses",
    icon: <ListChecks size={18} />,
  },
  {
    name: "Hệ thống",
    path: "/admin/system-info",
    icon: <SlidersHorizontal size={18} />,
  },
  {
    name: "Bảo mật",
    path: "/admin/security",
    icon: <LockKeyhole size={18} />,
  },
];

const userMenu = [
  ...(canViewDashboard
    ? [
        {
          name: "Dashboard",
          path: "/app",
          icon: <LayoutDashboard size={18} />,
        },
      ]
    : []),

  ...(canViewTasks
    ? [
        {
          name: "Tasks",
          path: "/app/tasks",
          icon: <ClipboardList size={18} />,
        },
      ]
    : []),

  ...(canViewDocuments
    ? [
        {
          name: "Văn bản",
          path: "/app/documents",
          icon: <FileText size={18} />,
        },
      ]
    : []),
  ...(canViewArchives
  ? [
      {
        name: "Kho lưu trữ",
        path: "/app/archives",
        icon: <Archive size={18} />,
      },
    ]
  : []),

  ...(canViewAnalytics
    ? [
        {
          name: "Analytics",
          path: "/app/analytics",
          icon: <BarChart size={18} />,
        },
      ]
    : []),

    ...(canViewAnyReport
  ? [
      {
        name: "Báo cáo",
        path: reportPath,
        icon: <BarChart size={18} />,
      },
    ]
  : []),

  ...(canViewChat
    ? [
        {
          name: "Chat",
          path: "/app/chat",
          icon: <MessageSquare size={18} />,
        },
      ]
    : []),

  ...(canViewTrash
    ? [
        {
          name: "Trash",
          path: "/app/trash",
          icon: <Trash2 size={18} />,
        },
      ]
    : []),
];

const menu =
  isAdmin && isAdminRoute
    ? adminMenu
    : userMenu;

  return (
    <aside
  className={`
    hidden md:flex
    shrink-0
    h-full
    rounded-3xl
    shadow-xl
    flex-col
    justify-between
    transition-all
    duration-300
    ease-in-out
    relative
    overflow-visible

    ${
      isDark
        ? "bg-slate-900 text-gray-100 border border-slate-800 shadow-slate-950/40"
        : "bg-white text-gray-900 shadow-gray-200/70"
    }

    ${
      collapsed
        ? "w-[88px]"
        : "w-[260px]"
    }
  `}
>
      {/* TOGGLE */}
      <button
        onClick={() =>
          setCollapsed(!collapsed)
        }
        className={`
          absolute
          -right-3
          top-8
          w-7 h-7
          rounded-full
          border
          shadow
          flex
          items-center
          justify-center
          transition
          z-20
          ${
            isDark
              ? "bg-slate-800 border-slate-700 text-gray-100 hover:bg-slate-700"
              : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
          }
        `}
        >
        {collapsed ? (
          <ChevronRight size={16} />
        ) : (
          <ChevronLeft size={16} />
        )}
      </button>

      {/* TOP */}
      <div className="p-4">
        {/* LOGO */}
        <div
          className={`
            flex items-center
            mb-8
            transition-all
            duration-300

            ${
              collapsed
                ? "justify-center"
                : "gap-3"
            }
          `}
        >
          <div
            className={`
            w-10 h-10
            rounded-2xl
            text-white
            flex
            items-center
            justify-center
            font-bold
            shadow
            shrink-0
            ${
              isDark
                ? "bg-blue-600"
                : "bg-black"
            }
          `}
          >
  {systemInfo.system_name?.charAt(0)?.toUpperCase() || "H"}
</div>

{!collapsed && (
  <div className="min-w-0">
            <h1
          className={`text-lg font-semibold leading-none truncate max-w-[150px] ${
            isDark ? "text-white" : "text-gray-900"
          }`}
        >
      {systemInfo.system_name}
    </h1>

    <p className="text-xs text-gray-400 mt-1 truncate max-w-[150px]">
      {systemInfo.organization_name}
    </p>
  </div>
)}
        </div>

        {/* MENU */}
        <div className="space-y-2">
          {menu.map((item) => (
            <NavLink
  to={item.path}
  key={item.path}
  end={item.path === "/" || item.path === "/app"}
  title={
    collapsed
      ? item.name
      : ""
  }
  className={({ isActive }) => {
  const isReportActive =
    item.name === "Báo cáo" &&
    (
      location.pathname.startsWith("/app/reports") ||
      location.pathname.startsWith("/app/employee-reports")
    );

  const active = isActive || isReportActive;

  return `
    group
    relative
    flex
    items-center
    rounded-2xl
    transition-all
    duration-300
    overflow-hidden

    ${
      collapsed
        ? "justify-center px-0 py-3"
        : "gap-3 px-4 py-3"
    }

      ${
        active
          ? isDark
            ? "bg-blue-600 text-white shadow-md shadow-blue-950/40"
            : "bg-blue-500 text-white shadow-md shadow-blue-200"
          : isDark
          ? "text-gray-300 hover:bg-slate-800 hover:text-white"
          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
      }
  `;
}}
            >
              <div
                className="
                  flex items-center justify-center
                  shrink-0
                  transition-transform
                  duration-300
                  group-hover:scale-110
                "
              >
                {item.icon}
              </div>
              {collapsed && item.name === "Chat" && chatUnread > 0 && (
  <span
    className={`
      absolute
      top-1
      right-1
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
    {chatUnread > 99 ? "99+" : chatUnread}
  </span>
)}

              {!collapsed && (
  <>
    <span
      className="
        text-sm
        font-medium
        whitespace-nowrap
        transition-all
        duration-300
      "
    >
      {item.name}
    </span>

    {item.name === "Chat" && chatUnread > 0 && (
      <span
        className="
          ml-auto
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
        "
      >
        {chatUnread > 99 ? "99+" : chatUnread}
      </span>
    )}
  </>
)}
            </NavLink>
          ))}
        </div>
      </div>

      {/* BOTTOM */}
      <div className="p-4 space-y-3">
          {isAdmin && (
  <button
    onClick={() => {
  const target = isAdminRoute
    ? "/app"
    : "/admin/users";

  document.body.classList.add("route-switching");

  setTimeout(() => {
    navigate(target);

    setTimeout(() => {
      document.body.classList.remove("route-switching");
    }, 250);
  }, 120);
}}
    className={`
      w-full
      flex
      items-center
      rounded-2xl
      transition-all
      duration-300
      bg-gradient-to-r
      from-blue-500
      to-indigo-500
      text-white
      shadow-md
      hover:shadow-lg
      hover:scale-[1.02]

      ${isDark ? "shadow-blue-950/40" : "shadow-blue-200"}

      ${
        collapsed
          ? "justify-center py-3"
          : "gap-3 px-4 py-3"
      }
    `}
    title={
      isAdminRoute
        ? "Chuyển sang giao diện người dùng"
        : "Chuyển sang quản trị"
    }
  >
    <Repeat2 size={18} />

    {!collapsed && (
      <span className="text-sm font-semibold">
        {isAdminRoute
          ? "Giao diện người dùng"
          : "Giao diện quản trị"}
      </span>
    )}
  </button>
)}

        

        {/* USER */}
        <div
          className={`
            border-t
            pt-4
            flex
            items-center
            transition-all
            duration-300

            ${isDark ? "border-slate-800" : "border-gray-200"}

            ${
              collapsed
                ? "justify-center"
                : "gap-3"
            }
          `}
        >
          <div
  className="
    w-10 h-10
    bg-blue-500
    text-white
    flex
    items-center
    justify-center
    rounded-full
    font-semibold
    shrink-0
    overflow-hidden
  "
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

          {!collapsed && (
            <div className="min-w-0">
              <p
                className={`text-sm font-medium truncate ${
                  isDark ? "text-gray-100" : "text-gray-900"
                }`}
              >
                {user?.full_name ||
                  user?.username ||
                  "User"}
              </p>
              <p
                className={`text-xs truncate ${
                  isDark ? "text-gray-400" : "text-gray-500"
                }`}
              >
                {user?.role_name || user?.role}
              </p>
            </div>
          )}
        </div>

        {/* LOGOUT */}
        <button
  onClick={() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  }}
  className={`
  w-full
  flex
  items-center
  rounded-2xl
  transition-all
  duration-300

  ${
    isDark
      ? "text-gray-400 hover:bg-red-950/30 hover:text-red-400"
      : "text-gray-500 hover:bg-red-50 hover:text-red-500"
  }

  ${
    collapsed
      ? "justify-center py-3"
      : "gap-3 px-4 py-3"
  }
`}
>
          <LogOut size={18} />

          {!collapsed && (
            <span className="text-sm font-medium">
              Log out
            </span>
          )}
        </button>
      </div>
    </aside>
  );
}