import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

export default function TimelineChart({
  timeline = [],
  scope,
}) {
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
    flex
    flex-col
    ${
      isDark
        ? "bg-slate-900 border-slate-800"
        : "bg-white border-gray-100"
    }
  `;

  const titleClass = isDark ? "text-gray-100" : "text-gray-900";
  const mutedClass = isDark ? "text-gray-400" : "text-gray-500";
  const softMutedClass = isDark ? "text-gray-500" : "text-gray-400";

  const axisColor = isDark ? "#94a3b8" : "#6b7280";
  const gridColor = isDark ? "#334155" : "#e5e7eb";

  const mapDay = {
    Mon: "T2",
    Tue: "T3",
    Wed: "T4",
    Thu: "T5",
    Fri: "T6",
    Sat: "T7",
    Sun: "CN",
  };

  const title =
    scope === "leader"
      ? "Tiến độ hoàn thành toàn hệ thống"
      : scope === "unit"
        ? "Tiến độ hoàn thành của phòng ban"
        : scope === "own"
          ? "Tiến độ hoàn thành cá nhân"
          : "Tiến độ hoàn thành theo thời gian";

  const description =
    scope === "leader"
      ? "Số nhiệm vụ được tạo và hoàn thành trong toàn hệ thống theo thời gian."
      : scope === "unit"
        ? "Số nhiệm vụ được tạo và hoàn thành trong phòng ban theo thời gian."
        : scope === "own"
          ? "Số nhiệm vụ cá nhân được tạo và hoàn thành theo thời gian."
          : "Số nhiệm vụ theo thời gian.";

  const formatDay = (value) => {
    if (!value) return "";

    const key = String(value).trim();

    return mapDay[key] || key;
  };

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
        {timeline.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <p className={`text-sm font-medium ${mutedClass}`}>
                Chưa có dữ liệu thời gian
              </p>

              <p className={`text-xs mt-1 ${softMutedClass}`}>
                Biểu đồ sẽ hiển thị khi có nhiệm vụ phát sinh.
              </p>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={timeline}
              margin={{
                top: 10,
                right: 20,
                left: 5,
                bottom: 10,
              }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke={gridColor}
              />

              <XAxis
                dataKey="day"
                tickFormatter={formatDay}
                padding={{ left: 20, right: 20 }}
                tick={{
                  fontSize: 12,
                  fill: axisColor,
                }}
                axisLine={{
                  stroke: gridColor,
                }}
                tickLine={{
                  stroke: gridColor,
                }}
              />

              <YAxis
                allowDecimals={false}
                tick={{
                  fontSize: 12,
                  fill: axisColor,
                }}
                axisLine={{
                  stroke: gridColor,
                }}
                tickLine={{
                  stroke: gridColor,
                }}
              />

              <Tooltip
                labelFormatter={(value) =>
                  `Ngày ${formatDay(value)}`
                }
                formatter={(value, name) => {
                  const labelMap = {
                    total: "Tổng nhiệm vụ",
                    done: "Hoàn thành",
                    overdue: "Quá hạn",
                  };

                  return [
                    `${value} nhiệm vụ`,
                    labelMap[name] || name,
                  ];
                }}
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

              <Line
                type="monotone"
                dataKey="total"
                name="Tổng nhiệm vụ"
                stroke="#93c5fd"
                strokeWidth={2}
                dot={{
                  r: 3,
                }}
                activeDot={{
                  r: 5,
                }}
              />

              <Line
                type="monotone"
                dataKey="done"
                name="Hoàn thành"
                stroke="#22c55e"
                strokeWidth={2}
                dot={{
                  r: 3,
                }}
                activeDot={{
                  r: 5,
                }}
              />

              <Line
                type="monotone"
                dataKey="overdue"
                name="Quá hạn"
                stroke="#ef4444"
                strokeWidth={2}
                dot={{
                  r: 3,
                }}
                activeDot={{
                  r: 5,
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}