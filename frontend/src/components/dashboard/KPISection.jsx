import { useEffect, useState } from "react";

export default function KPISection({ summary, scope }) {
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

  const scopeLabel =
    scope === "leader"
      ? "toàn hệ thống"
      : scope === "unit"
        ? "phòng ban"
        : scope === "own"
          ? "cá nhân"
          : "";

  const total = Number(summary?.total || 0);
  const done = Number(summary?.done || 0);
  const overdue = Number(summary?.overdue || 0);

  // Tránh đếm chồng quá hạn vào đang xử lý
  const doing = Math.max(total - done - overdue, 0);

  const cardClass = `
    p-5
    rounded-2xl
    shadow-sm
    border
    hover:shadow-md
    transition
    ${
      isDark
        ? "bg-slate-900 border-slate-800"
        : "bg-white border-gray-100"
    }
  `;

  const mutedClass = isDark ? "text-gray-400" : "text-gray-500";
  const totalColor = isDark ? "text-gray-100" : "text-gray-900";

  const cards = [
    {
      label:
        scope === "own"
          ? "Nhiệm vụ của tôi"
          : `Tổng nhiệm vụ ${scopeLabel}`,
      value: total,
      color: totalColor,
      bg: isDark ? "bg-slate-800" : "bg-gray-50",
    },
    {
      label: "Hoàn thành",
      value: done,
      color: "text-green-600",
      bg: isDark ? "bg-green-500/10" : "bg-green-50",
    },
    {
      label: "Đang xử lý",
      value: doing,
      color: "text-blue-600",
      bg: isDark ? "bg-blue-500/10" : "bg-blue-50",
    },
    {
      label: "Quá hạn",
      value: overdue,
      color: "text-red-600",
      bg: isDark ? "bg-red-500/10" : "bg-red-50",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {cards.map((item) => (
        <div key={item.label} className={cardClass}>
          <div
            className={`
              w-11 h-11
              rounded-2xl
              ${item.bg}
              flex
              items-center
              justify-center
              mb-4
            `}
          >
            <span className={`text-xl font-bold ${item.color}`}>
              {item.value}
            </span>
          </div>

          <p className={`text-sm ${mutedClass}`}>
            {item.label}
          </p>

          <h2 className={`text-2xl font-bold mt-1 ${item.color}`}>
            {item.value}
          </h2>
        </div>
      ))}
    </div>
  );
}