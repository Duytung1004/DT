import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts";

export default function OverviewPie({ summary, scope }) {
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

  const panelClass = `
    p-5
    rounded-2xl
    shadow-sm
    border
    h-full
    min-h-0
    flex
    flex-col
    overflow-hidden
    ${
      isDark
        ? "bg-slate-900 border-slate-800"
        : "bg-white border-gray-100"
    }
  `;

  const titleClass = isDark ? "text-gray-100" : "text-gray-900";
  const mutedClass = isDark ? "text-gray-400" : "text-gray-500";
  const softMutedClass = isDark ? "text-gray-500" : "text-gray-400";

  const title =
    scope === "leader"
      ? "Tổng quan trạng thái toàn hệ thống"
      : scope === "unit"
        ? "Tổng quan trạng thái phòng ban"
        : scope === "own"
          ? "Tổng quan trạng thái nhiệm vụ cá nhân"
          : "Tổng quan trạng thái";

  const description =
    scope === "leader"
      ? "Tỷ lệ nhiệm vụ theo trạng thái trên toàn hệ thống."
      : scope === "unit"
        ? "Tỷ lệ nhiệm vụ theo trạng thái trong phòng ban của bạn."
        : scope === "own"
          ? "Tỷ lệ nhiệm vụ theo trạng thái của riêng bạn."
          : "Tỷ lệ nhiệm vụ theo trạng thái.";

  const total = Number(summary?.total || 0);
  const done = Number(summary?.done || 0);
  const overdue = Number(summary?.overdue || 0);

  // Tránh đếm chồng quá hạn vào đang xử lý
  const doing = Math.max(total - done - overdue, 0);

  const pieData = [
    {
      name: "Hoàn thành",
      value: done,
    },
    {
      name: "Đang xử lý",
      value: doing,
    },
    {
      name: "Quá hạn",
      value: overdue,
    },
  ].filter((item) => item.value > 0);

  const COLORS = ["#86efac", "#93c5fd", "#fca5a5"];

  return (
    <div className={panelClass}>
      <div className="mb-3">
        <h3 className={`font-bold ${titleClass}`}>
          {title}
        </h3>

        <p className={`text-xs mt-1 ${softMutedClass}`}>
          {description}
        </p>
      </div>

      <div className="flex-1 min-h-0">
        {total === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <p className={`text-sm font-medium ${mutedClass}`}>
                Chưa có dữ liệu nhiệm vụ
              </p>

              <p className={`text-xs mt-1 ${softMutedClass}`}>
                Biểu đồ sẽ hiển thị khi có nhiệm vụ phát sinh.
              </p>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart margin={{ top: 8, bottom: 8 }}>
              <Legend
                verticalAlign="top"
                height={36}
                iconType="circle"
                formatter={(value) => (
                  <span
                    className={
                      isDark ? "text-gray-300" : "text-gray-600"
                    }
                  >
                    {value}
                  </span>
                )}
              />

              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                outerRadius={82}
                innerRadius={42}
                paddingAngle={3}
                label={({ percent }) =>
                  `${(percent * 100).toFixed(0)}%`
                }
              >
                {pieData.map((entry, i) => (
                  <Cell
                    key={entry.name}
                    fill={COLORS[i % COLORS.length]}
                  />
                ))}
              </Pie>

              <Tooltip
                formatter={(value, name) => [
                  `${value} nhiệm vụ`,
                  name,
                ]}
                contentStyle={{
                  backgroundColor: isDark ? "#0f172a" : "#ffffff",
                  borderColor: isDark ? "#334155" : "#e5e7eb",
                  borderRadius: "14px",
                  color: isDark ? "#e5e7eb" : "#111827",
                }}
                itemStyle={{
                  color: isDark ? "#e5e7eb" : "#111827",
                }}
                labelStyle={{
                  color: isDark ? "#e5e7eb" : "#111827",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}