import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import FloatingTodo from "../components/todo/FloatingTodo";
import BottomNav from "../components/layout/BottomNav";

export default function DashboardLayout() {
  const [theme, setTheme] = useState(
    localStorage.getItem("theme") || "light"
  );

  const isDark = theme === "dark";
  const location = useLocation();

const token = localStorage.getItem("token");
const user = JSON.parse(localStorage.getItem("user") || "{}");

const isProfilePage = location.pathname === "/app/profile";

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

  if (!token) {
  return <Navigate to="/login" replace />;
}

if (user.must_change_password && !isProfilePage) {
  return (
    <Navigate
      to="/app/profile?forcePassword=1"
      replace
    />
  );
}

  return (
    <div
      className={`
        h-screen
        p-0
        md:p-3
        flex
        gap-3
        overflow-hidden
        relative
        transition-colors
        duration-300

        ${
          isDark
            ? "bg-slate-950"
            : "bg-gray-100"
        }
      `}
    >
      <Sidebar />

      <div className="flex-1 min-w-0 flex flex-col gap-3">
        <Header />

        <main
          className={`
            flex-1
            overflow-y-auto
            overflow-x-hidden
            pb-36
            md:pb-0
            transition-colors
            duration-300

            ${
              isDark
                ? "bg-slate-950"
                : "bg-gray-100"
            }
          `}
        >
          <div className="animate-pageFade">
            <Outlet />
          </div>
        </main>
      </div>

      <FloatingTodo />

      <BottomNav />
    </div>
  );
}