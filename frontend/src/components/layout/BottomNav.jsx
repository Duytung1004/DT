import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Home,
  FileText,
  ClipboardList,
  BarChart3,
  MessageSquare,
  Trash2,
  Activity,
  UserCog,
  Building2,
  Settings,
  ShieldCheck,
  ListChecks,
  SlidersHorizontal,
  LockKeyhole,
} from "lucide-react";

export default function BottomNav() {
  const location = useLocation();

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

  const user =
    JSON.parse(localStorage.getItem("user")) || {};

  const isAdmin =
    user?.role === "admin" ||
    user?.roleId === 1 ||
    user?.role_id === 1;

  const isAdminRoute =
    location.pathname.startsWith("/admin");

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

  const canViewChat =
    hasPerm("chat:access");

  const canViewTrash =
    hasPerm("trash:view");

  const isEmployee =
    user?.role === "nhan_vien" ||
    user?.roleId === 4 ||
    user?.role_id === 4;

  const reportPath = isEmployee
    ? "/app/employee-reports"
    : "/app/reports";

  const userNavItems = [
    ...(canViewDashboard
      ? [
          {
            label: "Home",
            path: "/app",
            icon: Home,
            end: true,
          },
        ]
      : []),

    ...(canViewTasks
      ? [
          {
            label: "Tasks",
            path: "/app/tasks",
            icon: ClipboardList,
          },
        ]
      : []),

    ...(canViewDocuments
      ? [
          {
            label: "Văn bản",
            path: "/app/documents",
            icon: FileText,
          },
        ]
      : []),

    ...(canViewAnalytics
      ? [
          {
            label: "Analytics",
            path: "/app/analytics",
            icon: Activity,
          },
        ]
      : []),

    ...(canViewReports || canViewEmployeeReports
      ? [
          {
            label: "Báo cáo",
            path: reportPath,
            icon: BarChart3,
            customActive:
              location.pathname.startsWith("/app/reports") ||
              location.pathname.startsWith("/app/employee-reports"),
          },
        ]
      : []),

    ...(canViewChat
      ? [
          {
            label: "Chat",
            path: "/app/chat",
            icon: MessageSquare,
          },
        ]
      : []),

    ...(canViewTrash
      ? [
          {
            label: "Trash",
            path: "/app/trash",
            icon: Trash2,
          },
        ]
      : []),
  ];

  const adminNavItems = [
    {
      label: "Tài khoản",
      path: "/admin/users",
      icon: UserCog,
    },
    {
      label: "Phòng ban",
      path: "/admin/units",
      icon: Building2,
    },
    {
      label: "Cài đặt",
      path: "/admin/settings",
      icon: Settings,
    },
    {
      label: "Vai trò",
      path: "/admin/roles",
      icon: ShieldCheck,
    },
    {
      label: "Trạng thái",
      path: "/admin/statuses",
      icon: ListChecks,
    },
    {
      label: "Hệ thống",
      path: "/admin/system-info",
      icon: SlidersHorizontal,
    },
    {
      label: "Bảo mật",
      path: "/admin/security",
      icon: LockKeyhole,
    },
  ];

  const navItems =
    isAdmin && isAdminRoute
      ? adminNavItems
      : userNavItems;

  if (navItems.length === 0) return null;

  return (
    <div
      className="
        fixed
        bottom-3
        left-3
        right-3
        z-[60]
        md:hidden
      "
    >
      <div
        className={`
          h-[78px]
          backdrop-blur-xl
          border
          rounded-[30px]
          px-3
          flex
          items-center
          justify-between
          gap-1.5
          transition-colors
          duration-300
          overflow-x-auto

          ${
            isDark
              ? "bg-slate-900/95 border-slate-800 shadow-[0_18px_45px_rgba(2,6,23,0.55)]"
              : "bg-white/95 border-gray-200 shadow-[0_18px_45px_rgba(15,23,42,0.18)]"
          }
        `}
      >
        {navItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) => {
                const active =
                  isActive || item.customActive;

                return `
                  group
                  relative
                  min-w-[52px]
                  flex
                  items-center
                  justify-center
                  h-12
                  rounded-2xl
                  transition-all
                  duration-300

                  ${
                    active
                      ? isDark
                        ? "bg-blue-600 text-white flex-[1.65] px-3 gap-2 shadow-lg shadow-blue-950/40"
                        : "bg-gray-900 text-white flex-[1.65] px-3 gap-2 shadow-lg shadow-gray-300/60"
                      : isDark
                      ? "text-gray-400 hover:text-gray-100 hover:bg-slate-800 flex-1"
                      : "text-gray-500 hover:text-gray-900 hover:bg-gray-100 flex-1"
                  }
                `;
              }}
            >
              {({ isActive }) => {
                const active =
                  isActive || item.customActive;

                return (
                  <>
                    <Icon
                      size={22}
                      strokeWidth={2.4}
                      className="shrink-0"
                    />

                    {active && (
                      <span
                        className="
                          text-sm
                          font-semibold
                          whitespace-nowrap
                          overflow-hidden
                          text-ellipsis
                          hidden
                          min-[430px]:inline
                        "
                      >
                        {item.label}
                      </span>
                    )}
                  </>
                );
              }}
            </NavLink>
          );
        })}
      </div>
    </div>
  );
}