import { useEffect, useState } from "react";
import {
  BarChart,
  ClipboardList,
  CheckCircle2,
  Clock3,
  AlertTriangle,
  FileText,
  RefreshCcw,
  Filter,
  RotateCcw,
} from "lucide-react";

import api from "../services/api";
import socket from "../socket/socket";

const StatCard = ({
  title,
  value,
  icon,
  sub,
  isDark,
}) => {
  return (
    <div
      className={`
        rounded-3xl
        border
        shadow-sm
        p-5
        ${
          isDark
            ? "bg-slate-900 border-slate-800"
            : "bg-white border-gray-100"
        }
      `}
    >
      <div className="flex items-center justify-between">
        <div>
          <p
            className={`text-sm ${
              isDark ? "text-gray-400" : "text-gray-500"
            }`}
          >
            {title}
          </p>

          <p
            className={`text-3xl font-bold mt-2 ${
              isDark ? "text-gray-100" : "text-gray-900"
            }`}
          >
            {value}
          </p>

          {sub && (
            <p
              className={`text-xs mt-1 ${
                isDark ? "text-gray-500" : "text-gray-400"
              }`}
            >
              {sub}
            </p>
          )}
        </div>

        <div
          className={`
            w-12 h-12
            rounded-2xl
            flex
            items-center
            justify-center
            ${
              isDark
                ? "bg-blue-500/15 text-blue-300"
                : "bg-blue-50 text-blue-600"
            }
          `}
        >
          {icon}
        </div>
      </div>
    </div>
  );
};

const ProgressBar = ({ value, isDark }) => {
  const percent = Math.min(
    Math.max(Number(value || 0), 0),
    100
  );

  return (
    <div
      className={`w-full h-2 rounded-full overflow-hidden ${
        isDark ? "bg-slate-800" : "bg-gray-100"
      }`}
    >
      <div
        className="h-full bg-blue-500 rounded-full"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
};
export default function Analytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

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

const [riskTasks, setRiskTasks] = useState([]);
const [riskLoading, setRiskLoading] = useState(false);

const [units, setUnits] = useState([]);

const [filters, setFilters] = useState({
  from: "",
  to: "",
  unit_id: "all",
});

  const fetchAnalytics = async (customFilters = filters) => {
  try {
    setLoading(true);

    const params = {};

    if (customFilters.from) {
      params.from = customFilters.from;
    }

    if (customFilters.to) {
      params.to = customFilters.to;
    }

    if (
      customFilters.unit_id &&
      customFilters.unit_id !== "all"
    ) {
      params.unit_id = customFilters.unit_id;
    }

    const res = await api.get("/analytics", {
      params,
    });

    setData(res.data);
  } catch (err) {
    console.error("FETCH ANALYTICS ERROR:", err);
    alert(
      err.response?.data?.message ||
        "Lỗi tải dữ liệu Analytics"
    );
  } finally {
    setLoading(false);
  }
};

const fetchRiskTasks = async (customFilters = filters) => {
  try {
    setRiskLoading(true);

    const params = {};

    if (customFilters.from) {
      params.from = customFilters.from;
    }

    if (customFilters.to) {
      params.to = customFilters.to;
    }

    if (
      customFilters.unit_id &&
      customFilters.unit_id !== "all"
    ) {
      params.unit_id = customFilters.unit_id;
    }

    const res = await api.get("/analytics/risk", {
      params,
    });

    setRiskTasks(res.data.riskTasks || []);
  } catch (err) {
    console.error("FETCH RISK TASKS ERROR:", err);
  } finally {
    setRiskLoading(false);
  }
};

const fetchUnits = async () => {
  try {
    const res = await api.get("/units");

    setUnits(res.data || []);
  } catch (err) {
    console.log("FETCH UNITS ERROR:", err);

    // fallback: lấy tên phòng ban từ dữ liệu Analytics nếu API /units chưa có
    const fallbackUnits = (data?.unitChart || []).map(
      (item, index) => ({
        id: item.unit_id || item.unit_name || index,
        name: item.unit_name,
      })
    );

    setUnits(fallbackUnits);
  }
};

useEffect(() => {
  fetchAnalytics();
  fetchRiskTasks();
  fetchUnits();
}, []);

  useEffect(() => {
  const handleRealtime = () => {
  fetchAnalytics(filters);
  fetchRiskTasks(filters);
};
  socket.on("task:changed", handleRealtime);
  socket.on("report:changed", handleRealtime);
  socket.on("document:changed", handleRealtime);

  return () => {
    socket.off("task:changed", handleRealtime);
    socket.off("report:changed", handleRealtime);
    socket.off("document:changed", handleRealtime);
  };
}, [filters]);

const isInvalidDateRange =
  filters.from &&
  filters.to &&
  filters.from > filters.to;

  const handleApplyFilter = () => {
  if (isInvalidDateRange) {
    alert("Ngày bắt đầu không được lớn hơn ngày kết thúc");
    return;
  }

  fetchAnalytics(filters);
  fetchRiskTasks(filters);
};
const handleResetFilter = () => {
  const resetFilters = {
    from: "",
    to: "",
    unit_id: "all",
  };

  setFilters(resetFilters);
fetchAnalytics(resetFilters);
fetchRiskTasks(resetFilters);
};
  const summary = data?.summary || {};
  const statusChart = data?.statusChart || [];
  const unitChart = data?.unitChart || [];
  const overdueTasks = data?.overdueTasks || [];
  const reportSummary = data?.reportSummary || {};

  const monthlyTrend = data?.monthlyTrend || [];
  const topDepartments = data?.topDepartments || [];
  const topUsers = data?.topUsers || [];
  const riskUnits = data?.riskUnits || [];


  const getRiskBadgeClass = (level) => {
  if (level === "high") {
    return "bg-red-50 text-red-600 border-red-100";
  }

  if (level === "medium") {
    return "bg-yellow-50 text-yellow-700 border-yellow-100";
  }

  return "bg-green-50 text-green-600 border-green-100";
};

const formatDate = (dateString) => {
  if (!dateString) return "Không có hạn";

  return new Date(dateString).toLocaleDateString("vi-VN");
};


const pageClass = `
  p-6
  space-y-6
  min-h-full
  transition-colors
  ${
    isDark
      ? "bg-slate-950 text-gray-100"
      : "bg-gray-50 text-gray-900"
  }
`;

const panelClass = `
  rounded-3xl
  border
  shadow-sm
  ${
    isDark
      ? "bg-slate-900 border-slate-800"
      : "bg-white border-gray-100"
  }
`;

const titleClass = isDark ? "text-gray-100" : "text-gray-900";
const mutedClass = isDark ? "text-gray-400" : "text-gray-500";
const softTextClass = isDark ? "text-gray-300" : "text-gray-600";

const inputClass = `
  mt-1
  w-full
  rounded-2xl
  border
  px-4 py-2.5
  text-sm
  outline-none
  focus:border-blue-500
  ${
    isDark
      ? "bg-slate-950 border-slate-700 text-gray-100"
      : "bg-white border-gray-200 text-gray-900"
  }
`;

return (
  <div className={pageClass}>
      {/* HEADER */}
<div className="flex items-start justify-between gap-4">
  <div>
    <h1 className={`text-2xl font-bold ${titleClass}`}>
  Analytics
</h1>

<p className={`text-sm mt-1 ${mutedClass}`}>
  Phân tích tiến độ nhiệm vụ, phòng ban và báo cáo định kỳ.
</p>
  </div>

  <button
    onClick={() => {
  fetchAnalytics(filters);
  fetchRiskTasks(filters);
}}
    className={`
  flex items-center gap-2
  px-4 py-2
  rounded-2xl
  border
  shadow-sm
  transition
  ${
    isDark
      ? "bg-slate-900 border-slate-800 text-gray-200 hover:bg-slate-800"
      : "bg-white border-gray-100 text-gray-600 hover:bg-gray-50"
  }
`}
  >
    <RefreshCcw size={16} />
    Làm mới
  </button>
</div>

{/* FILTER */}
<div className={`${panelClass} p-5`}>
  <div className="flex items-center gap-2 mb-4">
    <Filter size={18} className="text-blue-600" />

    <h2 className={`font-semibold ${titleClass}`}>
  Bộ lọc phân tích
</h2>
  </div>

  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
    <div>
      <label className={`text-xs font-medium ${mutedClass}`}>
        Từ ngày
      </label>

      <input
  type="date"
  value={filters.from}
  max={filters.to || undefined}
  style={{
    colorScheme: isDark ? "dark" : "light",
  }}
  onChange={(e) =>
    setFilters((prev) => ({
      ...prev,
      from: e.target.value,
    }))
  }
  className={inputClass}
/>
    </div>

    <div>
      <label className={`text-xs font-medium ${mutedClass}`}>
        Đến ngày
      </label>

      <input
  type="date"
  value={filters.to}
  min={filters.from || undefined}
  onChange={(e) =>
    setFilters((prev) => ({
      ...prev,
      to: e.target.value,
    }))
  }
  className={inputClass}
/>
    </div>

    <div>
      <label className={`text-xs font-medium ${mutedClass}`}>
        Phòng ban
      </label>

      <select
        value={filters.unit_id}
        onChange={(e) =>
          setFilters((prev) => ({
            ...prev,
            unit_id: e.target.value,
          }))
        }
        className={inputClass}
      >
        <option value="all">
          Tất cả phòng ban
        </option>

        {units.map((unit) => (
          <option
            key={unit.id}
            value={unit.id}
          >
            {unit.name}
          </option>
        ))}
      </select>
    </div>

    <div className="flex items-end gap-2">
      <button
        onClick={handleApplyFilter}
        className="
          flex-1
          px-4 py-2.5
          rounded-2xl
          bg-blue-500
          text-white
          text-sm
          font-medium
          hover:bg-blue-600
          transition
        "
      >
        Áp dụng
      </button>

      <button
        onClick={handleResetFilter}
        className={`
  px-4 py-2.5
  rounded-2xl
  transition
  ${
    isDark
      ? "bg-slate-800 text-gray-300 hover:bg-slate-700"
      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
  }
`}
        title="Đặt lại bộ lọc"
      >
        <RotateCcw size={16} />
      </button>
    </div>
  </div>
</div>

      {loading ? (
        <div className={`${panelClass} p-8 text-center ${mutedClass}`}>
  Đang tải dữ liệu...
</div>
      ) : (
        <>
          {/* SUMMARY CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
            <StatCard
            isDark={isDark}
              title="Tổng nhiệm vụ"
              value={summary.total_tasks || 0}
              icon={<ClipboardList size={22} />}
            />

            <StatCard
            isDark={isDark}
              title="Hoàn thành"
              value={summary.completed_tasks || 0}
              icon={<CheckCircle2 size={22} />}
              sub={`${summary.completion_rate || 0}% hoàn thành`}
            />

            <StatCard
            isDark={isDark}
              title="Đang thực hiện"
              value={summary.doing_tasks || 0}
              icon={<Clock3 size={22} />}
            />

            <StatCard
            isDark={isDark}
              title="Quá hạn"
              value={summary.overdue_tasks || 0}
              icon={<AlertTriangle size={22} />}
            />

            <StatCard
            isDark={isDark}
              title="Báo cáo"
              value={summary.total_reports || 0}
              icon={<FileText size={22} />}
            />
          </div>

          {/* CHARTS */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* STATUS CHART */}
            <div className={`${panelClass} p-6`}>
              <div className="flex items-center gap-2 mb-5">
                <BarChart size={20} className="text-blue-600" />

                <h2 className={`font-semibold ${titleClass}`}>
                  Nhiệm vụ theo trạng thái
                </h2>
              </div>

              <div className="space-y-4">
                {statusChart.length === 0 ? (
                  <p className={`text-sm ${mutedClass}`}>
                    Chưa có dữ liệu trạng thái.
                  </p>
                ) : (
                  statusChart.map((item) => (
                    <div key={item.status_code}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className={softTextClass}>
  {item.status_name}
</span>

<span className={`font-semibold ${titleClass}`}>
  {item.total}
</span>
                      </div>

                      <ProgressBar
  isDark={isDark}
  value={
    summary.total_tasks
      ? (item.total / summary.total_tasks) * 100
      : 0
  }
/>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* UNIT CHART */}
            <div className={`${panelClass} p-6`}>
              <div className="flex items-center gap-2 mb-5">
                <BarChart size={20} className="text-blue-600" />

                <h2 className={`font-semibold ${titleClass}`}>
  Tiến độ theo phòng ban
</h2>
              </div>

              <div className="space-y-4">
                {unitChart.length === 0 ? (
                  <p className={`text-sm ${mutedClass}`}>
  Chưa có dữ liệu phòng ban.
</p>
                ) : (
                  unitChart.map((item) => (
                    <div key={item.unit_name}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className={softTextClass}>
  {item.unit_name}
</span>

<span className={`font-semibold ${titleClass}`}>
  {item.completion_rate}%
</span>
                      </div>

                      <ProgressBar
                        isDark={isDark}
                        value={item.completion_rate}
                      />

                      <p className={`text-xs mt-1 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                        Tổng {item.total_tasks} nhiệm vụ, quá hạn{" "}
                        {item.overdue_tasks}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
          
          {/* MONTHLY KPI TREND */}
<div className={`${panelClass} p-6`}>
  <h2 className={`font-semibold mb-5 ${titleClass}`}>
    Xu hướng KPI theo tháng
  </h2>

  {monthlyTrend.length === 0 ? (
    <p className={`text-sm ${mutedClass}`}>
      Chưa có dữ liệu KPI theo tháng.
    </p>
  ) : (
    <div className="space-y-4">
      {monthlyTrend.map((item) => (
        <div key={item.month}>
          <div className="flex justify-between text-sm mb-1">
            <span className={softTextClass}>
              Tháng {item.month} - {item.level}
            </span>

            <span className="font-semibold text-purple-500">
              {item.kpi_score}/100
            </span>
          </div>

          <ProgressBar
            isDark={isDark}
            value={item.kpi_score}
          />

          <p
            className={`text-xs mt-1 ${
              isDark ? "text-gray-500" : "text-gray-400"
            }`}
          >
            Tổng {item.total_tasks} nhiệm vụ · Hoàn thành{" "}
            {item.completed_tasks} · Quá hạn {item.overdue_tasks} ·
            Tiến độ TB {item.avg_progress}%
          </p>
        </div>
      ))}
    </div>
  )}
</div>

{/* TOP + RISK UNITS */}
<div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
  <div className={`${panelClass} p-6`}>
    <h2 className={`font-semibold mb-5 ${titleClass}`}>
        Top phòng ban
      </h2>

    <div className="space-y-3">
      {topDepartments.length === 0 ? (
        <p className={`text-sm ${mutedClass}`}>
          Chưa có dữ liệu phòng ban.
        </p>
      ) : (
        topDepartments.map((item, index) => (
          <div
            key={item.unit_name}
            className={`
  rounded-2xl
  border
  p-4
  ${
    isDark
      ? "bg-slate-950 border-slate-800"
      : "bg-gray-50 border-gray-100"
  }
`}
          >
            <div className="flex justify-between gap-3">
              <div>
                <p className={`font-semibold ${titleClass}`}>
  #{index + 1} {item.unit_name}
</p>

                <p className="text-xs text-gray-400 mt-1">
                  {item.completed_tasks}/{item.total_tasks} hoàn thành ·{" "}
                  {item.overdue_tasks} quá hạn
                </p>
              </div>

              <p className="font-bold text-blue-600">
                {item.completion_rate}%
              </p>
            </div>
          </div>
        ))
      )}
    </div>
  </div>

  <div className={`${panelClass} p-6`}>
  <h2 className={`font-semibold mb-5 ${titleClass}`}>
    Top cán bộ KPI
  </h2>

    <div className="space-y-3">
      {topUsers.length === 0 ? (
        <p className={`text-sm ${mutedClass}`}>
          Chưa có dữ liệu cán bộ.
        </p>
      ) : (
        topUsers.map((item) => (
          <div
            key={item.user_id}
            className={`
  rounded-2xl
  border
  p-4
  ${
    isDark
      ? "bg-slate-950 border-slate-800"
      : "bg-gray-50 border-gray-100"
  }
`}
          >
            <div className="flex justify-between gap-3">
              <div>
                <p className={`font-semibold ${titleClass}`}>
                  #{item.rank} {item.full_name}
                </p>

                <p className="text-xs text-gray-400 mt-1">
                  {item.unit_name} · {item.completed_tasks}/
                  {item.total_tasks} hoàn thành
                </p>
              </div>

              <div className="text-right">
                <p className="font-bold text-purple-600">
                  {item.kpi_score}
                </p>

                <p className="text-xs text-gray-400">
                  {item.level}
                </p>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  </div>

    <div className={`${panelClass} p-6`}>
      <h2 className={`font-semibold mb-5 ${titleClass}`}>
        Phòng ban có nguy cơ
      </h2>

    <div className="space-y-3">
      {riskUnits.length === 0 ? (
        <p className={`text-sm ${mutedClass}`}>
          Chưa có dữ liệu nguy cơ.
        </p>
      ) : (
        riskUnits.map((item) => (
          <div
            key={item.unit_name}
            className={`
  rounded-2xl
  border
  p-4
  ${
    isDark
      ? "bg-slate-950 border-slate-800"
      : "bg-gray-50 border-gray-100"
  }
`}
          >
            <div className="flex justify-between gap-3">
              <div>
                <p className={`font-semibold ${titleClass}`}>
                  {item.unit_name}
                </p>

                <p className="text-xs text-gray-400 mt-1">
                  {item.overdue_tasks}/{item.total_tasks} nhiệm vụ quá hạn
                </p>
              </div>

              <span
                className={`h-fit px-3 py-1 rounded-full text-xs font-semibold border ${getRiskBadgeClass(
                  item.risk_level
                )}`}
              >
                {item.risk_label}
              </span>
            </div>

            <div className="mt-3">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Tỷ lệ quá hạn</span>
                <span>{item.overdue_rate}%</span>
              </div>

              <ProgressBar
  isDark={isDark}
  value={item.overdue_rate}
/>
            </div>
          </div>
        ))
      )}
    </div>
  </div>
</div>


          {/* REPORT + OVERDUE */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* REPORT SUMMARY */}
            <div className={`${panelClass} p-6`}>
              <h2 className={`font-semibold mb-5 ${titleClass}`}>
                Thống kê báo cáo
              </h2>

              <div className="space-y-4">
                <div
                  className={`
                    flex justify-between items-center
                    p-4 rounded-2xl
                    ${
                      isDark ? "bg-slate-950 border border-slate-800" : "bg-gray-50"
                    }
                  `}
                >
                  <span className={`text-sm ${softTextClass}`}>
                    Báo cáo nhiệm vụ/phòng ban
                  </span>

                  <span className={`font-bold ${titleClass}`}>
                    {reportSummary.task_reports || 0}
                  </span>
                </div>

                <div
                  className={`
                    flex justify-between items-center
                    p-4 rounded-2xl
                    ${
                      isDark ? "bg-slate-950 border border-slate-800" : "bg-gray-50"
                    }
                  `}
                >
                  <span className={`text-sm ${softTextClass}`}>
                    Báo cáo cá nhân
                  </span>

                  <span className={`font-bold ${titleClass}`}>
                    {reportSummary.employee_reports || 0}
                  </span>
                </div>
              </div>
            </div>

            
            {/* OVERDUE TASKS */}
            <div className={`xl:col-span-2 ${panelClass} p-6`}>
              <div className="flex items-center gap-2 mb-5">
                <AlertTriangle
                  size={20}
                  className="text-orange-500"
                />

                <h2 className={`font-semibold ${titleClass}`}>
                  Nhiệm vụ quá hạn cần chú ý
                </h2>
              </div>

              {overdueTasks.length === 0 ? (
                <p className={`text-sm ${mutedClass}`}>
                  Không có nhiệm vụ quá hạn.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr
                        className={`text-left border-b ${
                          isDark
                            ? "text-gray-500 border-slate-800"
                            : "text-gray-400 border-gray-100"
                        }`}
                      >
                        <th className="py-3 font-medium">
                          Nhiệm vụ
                        </th>
                        <th className="py-3 font-medium">
                          Phòng ban
                        </th>
                        <th className="py-3 font-medium">
                          Trạng thái
                        </th>
                        <th className="py-3 font-medium text-right">
                          Quá hạn
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {overdueTasks.map((task) => (
                        <tr
                            key={task.id}
                            className={`border-b last:border-0 ${
                              isDark ? "border-slate-800" : "border-gray-100"
                            }`}
                          >
                          <td className={`py-3 font-medium ${titleClass}`}>
                            {task.tieu_de}
                          </td>

                          <td className={`py-3 ${mutedClass}`}>
                            {task.unit_name}
                          </td>

                          <td className={`py-3 ${mutedClass}`}>
                            {task.status_name}
                          </td>

                          <td className="py-3 text-right text-red-500 font-semibold">
                            {task.overdue_days} ngày
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
          {/* RISK PREDICTION */}
<div className={`${panelClass} p-6`}>
  <div className="flex items-center gap-2 mb-5">
    <AlertTriangle
      size={20}
      className="text-red-500"
    />

    <div>
      <h2 className={`font-semibold ${titleClass}`}>
        Dự báo nguy cơ trễ hạn
      </h2>

      <p
        className={`text-xs mt-0.5 ${
          isDark ? "text-gray-500" : "text-gray-400"
        }`}
      >
        Hệ thống đánh giá nguy cơ dựa trên hạn chót, tiến độ, phần việc và mức độ ưu tiên.
      </p>
    </div>
  </div>

  {riskLoading ? (
    <div className={`py-8 text-center text-sm ${mutedClass}`}>
      Đang phân tích nguy cơ...
    </div>
  ) : riskTasks.length === 0 ? (
    <p className={`text-sm ${mutedClass}`}>
      Chưa có nhiệm vụ cần cảnh báo nguy cơ.
    </p>
  ) : (
    <div className="space-y-4">
      {riskTasks.map((task) => (
        <div
          key={task.task_id}
          className={`
            rounded-2xl
            border
            p-4
            transition
            ${
              isDark
                ? "bg-slate-950 border-slate-800 hover:bg-slate-900"
                : "bg-gray-50/60 border-gray-100 hover:bg-gray-50"
            }
          `}
        >
          <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className={`font-semibold ${titleClass}`}>
                  {task.task_title}
                </h3>

                <span
                  className={`
                    inline-flex items-center
                    px-3 py-1
                    rounded-full
                    border
                    text-xs
                    font-semibold
                    ${getRiskBadgeClass(task.risk_level)}
                  `}
                >
                  {task.risk_label} · {task.risk_score}
                </span>
              </div>

              <div className={`flex flex-wrap gap-x-5 gap-y-1 mt-2 text-xs ${mutedClass}`}>
                <span>
                  Phòng ban:{" "}
                  <b className={softTextClass}>
                    {task.unit_name}
                  </b>
                </span>

                <span>
                  Trạng thái:{" "}
                  <b className={softTextClass}>
                    {task.status_name}
                  </b>
                </span>

                <span>
                  Hạn chót:{" "}
                  <b className={softTextClass}>
                    {formatDate(task.deadline)}
                  </b>
                </span>

                {task.overdue_days > 0 ? (
                  <span className="text-red-500 font-medium">
                    Quá hạn {task.overdue_days} ngày
                  </span>
                ) : (
                  <span className={mutedClass}>
                    Còn {task.days_left} ngày
                  </span>
                )}
              </div>

              <div className="mt-4 max-w-xl">
                <div className="flex justify-between text-xs mb-1">
                  <span className={mutedClass}>
                    Tiến độ thực hiện
                  </span>

                  <span className={`font-semibold ${titleClass}`}>
                    {task.progress}%
                  </span>
                </div>

                <ProgressBar
                  isDark={isDark}
                  value={task.progress}
                />
              </div>
            </div>

            <div
              className={`
                xl:w-[360px]
                rounded-2xl
                border
                p-3
                ${
                  isDark
                    ? "bg-slate-900 border-slate-800"
                    : "bg-white border-gray-100"
                }
              `}
            >
              <p className={`text-xs font-semibold mb-2 ${softTextClass}`}>
                Lý do cảnh báo
              </p>

              <ul className="space-y-1">
                {(task.risk_reasons || [])
                  .slice(0, 4)
                  .map((reason, index) => (
                    <li
                      key={index}
                      className={`text-xs leading-relaxed ${mutedClass}`}
                    >
                      • {reason}
                    </li>
                  ))}
              </ul>
            </div>
          </div>
        </div>
      ))}
    </div>
  )}
</div>
        </>
      )}
    </div>
  );
}