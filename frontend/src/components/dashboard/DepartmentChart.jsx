import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";

import { hasPermission } from "../../utils/permission";

export default function DepartmentChart({
  departments = [],
  user,
  scope,
  setSelectedDept,
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
  const progressBgClass = isDark ? "bg-slate-800" : "bg-gray-100";

  const canViewDepartmentTasks =
    hasPermission(user, "task:view_all") ||
    hasPermission(user, "task:view_unit");

  const getPercent = (done, total) => {
    if (!total || Number(total) === 0) return 0;

    return Math.round(
      (Number(done || 0) / Number(total || 0)) * 100
    );
  };

  const chartData = departments.map((d) => {
    const total = Number(d.total || 0);
    const done = Number(d.done || 0);
    const overdue = Number(d.overdue || 0);

    return {
      ...d,
      total,
      done,
      overdue,
      doing: Math.max(total - done - overdue, 0),
    };
  });

  const currentDepartment = chartData[0];

  const axisColor = isDark ? "#94a3b8" : "#6b7280";
  const gridColor = isDark ? "#334155" : "#e5e7eb";

  // =========================
  // UNIT DASHBOARD
  // =========================
  if (scope === "unit") {
    if (!currentDepartment) {
      return (
        <div className={`${panelClass} items-center justify-center`}>
          <p className={`text-sm ${softMutedClass}`}>
            Chưa có dữ liệu phòng ban
          </p>
        </div>
      );
    }

    const total = Number(currentDepartment.total || 0);
    const done = Number(currentDepartment.done || 0);
    const doing = Number(currentDepartment.doing || 0);
    const overdue = Number(currentDepartment.overdue || 0);
    const percent = getPercent(done, total);

    return (
      <div className={panelClass}>
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <h3 className={`font-bold ${titleClass}`}>
              Tổng quan phòng ban
            </h3>

            <p className={`text-xs mt-1 ${softMutedClass}`}>
              {currentDepartment.department}
            </p>
          </div>

          {canViewDepartmentTasks && (
            <button
              onClick={() =>
                setSelectedDept(currentDepartment.department)
              }
              className="
                px-3 py-2
                rounded-xl
                bg-blue-500/10
                text-blue-500
                text-xs
                font-semibold
                hover:bg-blue-500/20
                transition
              "
            >
              Xem nhiệm vụ
            </button>
          )}
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <p className={`text-sm ${mutedClass}`}>
              Tỷ lệ hoàn thành
            </p>

            <p className={`text-sm font-bold ${titleClass}`}>
              {percent}%
            </p>
          </div>

          <div
            className={`w-full h-3 rounded-full ${progressBgClass} overflow-hidden`}
          >
            <div
              className="h-full rounded-full bg-green-400 transition-all"
              style={{
                width: `${percent}%`,
              }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-auto">
          <StatBox
            label="Tổng nhiệm vụ"
            value={total}
            valueClassName={titleClass}
            isDark={isDark}
          />

          <StatBox
            label="Hoàn thành"
            value={done}
            valueClassName="text-green-600"
            isDark={isDark}
          />

          <StatBox
            label="Đang xử lý"
            value={doing}
            valueClassName="text-blue-600"
            isDark={isDark}
          />

          <StatBox
            label="Quá hạn"
            value={overdue}
            valueClassName="text-red-600"
            isDark={isDark}
          />
        </div>
      </div>
    );
  }

  // =========================
  // LEADER DASHBOARD
  // =========================
  return (
    <div className={panelClass}>
      <div className="mb-3">
        <h3 className={`font-bold ${titleClass}`}>
          Tiến độ theo phòng ban
        </h3>

        <p className={`text-xs mt-1 ${softMutedClass}`}>
          So sánh số nhiệm vụ hoàn thành, đang xử lý và quá hạn theo từng phòng ban.
        </p>
      </div>

      {chartData.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p className={`text-sm ${softMutedClass}`}>
            Chưa có dữ liệu phòng ban
          </p>
        </div>
      ) : (
        <div className="flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout={chartData.length >= 5 ? "vertical" : "horizontal"}
              margin={{
                top: 10,
                right: 20,
                left: chartData.length >= 5 ? 60 : 0,
                bottom: 10,
              }}
              onClick={(state) => {
                if (!canViewDepartmentTasks) return;

                if (state?.activeLabel) {
                  setSelectedDept(state.activeLabel);
                }
              }}
            >
              {chartData.length >= 5 ? (
                <>
                  <XAxis
                    type="number"
                    tick={{ fontSize: 12, fill: axisColor }}
                    axisLine={{ stroke: gridColor }}
                    tickLine={{ stroke: gridColor }}
                  />
                  <YAxis
                    type="category"
                    dataKey="department"
                    width={90}
                    tick={{ fontSize: 12, fill: axisColor }}
                    axisLine={{ stroke: gridColor }}
                    tickLine={{ stroke: gridColor }}
                  />
                </>
              ) : (
                <>
                  <XAxis
                    dataKey="department"
                    tick={{ fontSize: 12, fill: axisColor }}
                    axisLine={{ stroke: gridColor }}
                    tickLine={{ stroke: gridColor }}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: axisColor }}
                    axisLine={{ stroke: gridColor }}
                    tickLine={{ stroke: gridColor }}
                  />
                </>
              )}

              <Tooltip
                formatter={(value, name) => {
                  const labelMap = {
                    done: "Hoàn thành",
                    doing: "Đang xử lý",
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

              <Legend
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

              <Bar
                dataKey="done"
                name="Hoàn thành"
                stackId="a"
                fill="#86efac"
                radius={[4, 4, 0, 0]}
              />

              <Bar
                dataKey="doing"
                name="Đang xử lý"
                stackId="a"
                fill="#93c5fd"
                radius={[4, 4, 0, 0]}
              />

              <Bar
                dataKey="overdue"
                name="Quá hạn"
                stackId="a"
                fill="#fca5a5"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function StatBox({ label, value, valueClassName, isDark }) {
  return (
    <div
      className={`rounded-2xl p-4 ${
        isDark ? "bg-slate-950 border border-slate-800" : "bg-gray-50"
      }`}
    >
      <p className={isDark ? "text-xs text-gray-500" : "text-xs text-gray-400"}>
        {label}
      </p>

      <p className={`text-2xl font-bold mt-1 ${valueClassName}`}>
        {value}
      </p>
    </div>
  );
}