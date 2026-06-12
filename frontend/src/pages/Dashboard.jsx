import { useState, useEffect } from "react";
import api from "../services/api";
import socket from "../socket/socket";
import { hasPermission } from "../utils/permission";
import KPISection from "../components/dashboard/KPISection";
import DepartmentChart from "../components/dashboard/DepartmentChart";
import OverviewPie from "../components/dashboard/OverViewPie";
import TimelineChart from "../components/dashboard/TimeLineChart";
import TaskListModal from "../components/dashboard/TaskListModal";
import TaskDetailModal from "../components/dashboard/TaskDetailModal";


export default function Dashboard() {
  const [selectedDept, setSelectedDept] = useState(null);

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
  const [data, setData] = useState(null);
  const [kpiData, setKpiData] = useState(null);
  const [kpiRankings, setKpiRankings] = useState(null);
  const [tasks, setTasks] = useState([]);

  const [selectedTask, setSelectedTask] = useState(null);
  const [user, setUser] = useState(
  JSON.parse(localStorage.getItem("user")) || {}
);
const canViewLeaderDashboard =
  hasPermission(user, "dashboard:leader");

const canViewUnitDashboard =
  hasPermission(user, "dashboard:unit");

const canViewOwnDashboard =
  hasPermission(user, "dashboard:own") ||
  hasPermission(user, "task:view_own");



const dashboardScope =
  canViewLeaderDashboard
    ? "leader"
    : canViewUnitDashboard
      ? "unit"
      : canViewOwnDashboard
        ? "own"
        : null;
const fetchDashboardData = async ({ silent = false } = {}) => {
  try {
    if (!dashboardScope) {
      setData(null);
      return null;
    }

    if (!silent) {
      setData(null);
    }

    const res = await api.get(
      `/dashboard?scope=${dashboardScope}`
    );

    setData(res.data);
    return res.data;
  } catch (err) {
    console.error("FETCH DASHBOARD ERROR:", err);
    setData(null);
    return null;
  }
};

const fetchKpiData = async ({ silent = false } = {}) => {
  try {
    if (!dashboardScope) {
      setKpiData(null);
      return null;
    }

    if (!silent) {
      setKpiData(null);
    }

    const res = await api.get("/kpi/overview");

    setKpiData(res.data);
    return res.data;
  } catch (err) {
    console.error("FETCH KPI ERROR:", err);
    setKpiData(null);
    return null;
  }
};

const fetchKpiRankings = async ({ silent = false } = {}) => {
  try {
    if (!dashboardScope) {
      setKpiRankings(null);
      return null;
    }

    if (dashboardScope === "own") {
      setKpiRankings(null);
      return null;
    }

    if (!silent) {
      setKpiRankings(null);
    }

    const res = await api.get("/kpi/rankings");

    setKpiRankings(res.data);
    return res.data;
  } catch (err) {
    console.error("FETCH KPI RANKINGS ERROR:", err);
    setKpiRankings(null);
    return null;
  }
};

  useEffect(() => {
  const token = localStorage.getItem("token");

  if (!token) {
    window.location.href = "/login";
  }
}, []);

useEffect(() => {
  const syncUser = () => {
    setUser(
      JSON.parse(localStorage.getItem("user")) || {}
    );

    setData(null);
    setKpiData(null);
    setKpiRankings(null);
    setSelectedDept(null);
    setTasks([]);
  };

  window.addEventListener(
    "permission-updated",
    syncUser
  );

  window.addEventListener(
    "profile-updated",
    syncUser
  );

  return () => {
    window.removeEventListener(
      "permission-updated",
      syncUser
    );

    window.removeEventListener(
      "profile-updated",
      syncUser
    );
  };
}, []);
  const fetchTasks = async () => {
  try {
    if (!selectedDept || !data) return;

    const dept = (data.departments || []).find(
  (d) => d.department === selectedDept
);

    if (!dept) return;

    const res = await api.get(
      `/tasks/by-unit?unit_id=${dept.unit_id}`
    );

    setTasks(res.data);
  } catch (err) {
    console.error("FETCH TASKS ERROR:", err);
  }
};
  useEffect(() => {
  fetchTasks();
}, [selectedDept, data, dashboardScope]);

useEffect(() => {
  fetchDashboardData();
  fetchKpiData();
  fetchKpiRankings();
}, [dashboardScope]);

useEffect(() => {
  if (!dashboardScope) return;

  const handleDashboardRealtime = async (payload) => {
    console.log("DASHBOARD REALTIME RECEIVED:", payload);

    const newData = await fetchDashboardData({
      silent: true,
    });

    await fetchKpiData({
    silent: true,
    });
    await fetchKpiRankings({
    silent: true,
    });

    if (selectedDept && newData?.departments) {
      const dept = newData.departments.find(
        (d) => d.department === selectedDept
      );

      if (dept) {
        try {
          const res = await api.get(
            `/tasks/by-unit?unit_id=${dept.unit_id}`
          );

          setTasks(res.data);
        } catch (err) {
          console.error("REFRESH DASHBOARD TASKS ERROR:", err);
        }
      }
    }

    if (
      selectedTask?.id &&
      payload?.taskId &&
      Number(payload.taskId) === Number(selectedTask.id)
    ) {
      try {
        const res = await api.get(`/tasks/${selectedTask.id}`);
        setSelectedTask(res.data);
      } catch (err) {
        console.error("REFRESH DASHBOARD SELECTED TASK ERROR:", err);
      }
    }
  };

  socket.on("task:changed", handleDashboardRealtime);
  socket.on("report:changed", handleDashboardRealtime);
  socket.on("document:changed", handleDashboardRealtime);

  return () => {
    socket.off("task:changed", handleDashboardRealtime);
    socket.off("report:changed", handleDashboardRealtime);
    socket.off("document:changed", handleDashboardRealtime);
  };
}, [dashboardScope, selectedDept, selectedTask?.id]);

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

const softPanelClass = `
  rounded-2xl
  border
  ${
    isDark
      ? "bg-slate-950 border-slate-800"
      : "bg-gray-50 border-gray-100"
  }
`;

const progressBgClass = isDark ? "bg-slate-800" : "bg-gray-100";

if (!dashboardScope) {
  return (
    <div className={pageClass}>
      <div className={`${panelClass} p-6`}>
        <h2 className={`text-lg font-bold ${titleClass}`}>
          Không có quyền xem Dashboard
        </h2>

        <p className={`text-sm mt-2 ${mutedClass}`}>
          Tài khoản của bạn chưa được cấp quyền dashboard:leader, dashboard:unit hoặc dashboard:own.
        </p>
      </div>
    </div>
  );
}
if (!data) {
  return (
    <div className={pageClass}>
      <div className={`${panelClass} p-6 text-center ${mutedClass}`}>
        Đang tải dữ liệu...
      </div>
    </div>
  );
}
const departments = data.departments || [];
const timeline = data.timeline || [];
const summary = data.summary || {};

const handleApprove = async (decision, note = "") => {
  try {
    await api.post(`/tasks/${selectedTask.id}/approve`, {
      quyet_dinh: decision,
      ghi_chu: note,
    });

    alert("Đã xử lý");

    await fetchDashboardData({ silent: true });
    await fetchTasks();

    const detail = await api.get(
      `/tasks/${selectedTask.id}`
    );

    setSelectedTask(detail.data);
  } catch (err) {
    console.error(err);

    alert(
      err.response?.data?.message ||
        "Lỗi duyệt"
    );
  }
};

  return (
    <div className={pageClass}>
      <div className="flex items-center justify-between">
  <div>
    <h1 className={`text-2xl font-bold ${titleClass}`}>
  Dashboard
</h1>

<p className={`text-sm mt-1 ${mutedClass}`}>
      {dashboardScope === "leader" &&
        "Tổng quan toàn hệ thống"}

      {dashboardScope === "unit" &&
        "Tổng quan phòng ban của bạn"}

      {dashboardScope === "own" &&
        "Tổng quan nhiệm vụ cá nhân"}
    </p>
  </div>
</div>

      {/* KPI */}
<KPISection
  summary={summary}
  scope={dashboardScope}
/>

{dashboardScope === "unit" ? (
  <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-stretch">
    {kpiData && (
      <div className={`xl:col-span-2 ${panelClass} p-6`}>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <p className="text-xs font-semibold text-purple-600 bg-purple-50 px-3 py-1 rounded-full w-fit mb-3">
              KPI hiệu quả
            </p>

            <h2 className={`text-xl font-bold ${titleClass}`}>
                Đánh giá hiệu quả thực hiện nhiệm vụ
              </h2>

            <p className={`text-sm mt-1 ${mutedClass}`}>
              Tính theo tỷ lệ hoàn thành, đúng hạn, tiến độ trung bình và báo cáo/minh chứng.
            </p>
          </div>

          <div className="text-left lg:text-right">
            <p className="text-4xl font-bold text-purple-600">
              {kpiData.scores.total_score}
            </p>

            <p className={`text-sm font-semibold mt-1 ${softTextClass}`}>
              {kpiData.level}
            </p>

            <p className="text-xs text-gray-400 mt-1">
              Thang điểm 100
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className={`${softPanelClass} p-4`}>
            <p className="text-xs text-gray-400">Hoàn thành</p>
            <p className={`text-lg font-bold mt-2 ${titleClass}`}>
              {kpiData.scores.completion_score}/40
            </p>
            <p className="text-xs text-green-600 mt-1">
              {kpiData.rates.completion_rate}%
            </p>
          </div>

          <div className={`${softPanelClass} p-4`}>
            <p className="text-xs text-gray-400">Đúng hạn</p>
            <p className={`text-lg font-bold mt-2 ${titleClass}`}>
              {kpiData.scores.on_time_score}/30
            </p>
            <p className="text-xs text-blue-600 mt-1">
              {kpiData.rates.on_time_rate}%
            </p>
          </div>

          <div className={`${softPanelClass} p-4`}>
            <p className="text-xs text-gray-400">Tiến độ</p>
            <p className={`text-lg font-bold mt-2 ${titleClass}`}>
              {kpiData.scores.progress_score}/20
            </p>
            <p className="text-xs text-purple-600 mt-1">
              TB {kpiData.summary.avg_progress}%
            </p>
          </div>

          <div className={`${softPanelClass} p-4`}>
            <p className="text-xs text-gray-400">Báo cáo / minh chứng</p>
           <p className={`text-lg font-bold mt-2 ${titleClass}`}>
              {kpiData.scores.report_score}/10
            </p>
            <p className="text-xs text-orange-600 mt-1">
              {kpiData.rates.report_rate}%
            </p>
          </div>
        </div>

        <div className="mt-5">
          <div className={`flex justify-between text-xs mb-1 ${mutedClass}`}>
            <span>Tổng điểm KPI</span>
            <span>{kpiData.scores.total_score}/100</span>
          </div>

          <div className={`h-3 ${progressBgClass} rounded-full overflow-hidden`}>
            <div
              className="h-full bg-purple-500 rounded-full transition-all"
              style={{
                width: `${kpiData.scores.total_score}%`,
              }}
            />
          </div>
        </div>
      </div>
    )}

    {kpiRankings && (
      <div className={`${panelClass} p-6`}>
        <div className="mb-5">
          <p className="text-xs font-semibold text-purple-600 bg-purple-50 px-3 py-1 rounded-full w-fit mb-3">
            Xếp hạng cá nhân
          </p>

          <h2 className={`text-lg font-bold ${titleClass}`}>
            KPI theo cán bộ
          </h2>

          <p className={`text-sm mt-1 ${mutedClass}`}>
            Đánh giá theo phần việc được giao và kết quả xử lý.
          </p>
        </div>

        <div className="space-y-3">
          {(kpiRankings.users || []).map((item) => (
            <div
              key={item.user_id}
              className={`flex items-center justify-between gap-4 ${softPanelClass} px-4 py-3`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
  className={`w-9 h-9 rounded-full border flex items-center justify-center text-sm font-bold shrink-0 ${
    isDark
      ? "bg-slate-900 border-slate-700 text-gray-200"
      : "bg-white border-gray-100 text-gray-700"
  }`}
>
                  {item.rank}
                </div>

                <div className="min-w-0">
                  <p className={`text-sm font-semibold truncate ${titleClass}`}>
                    {item.full_name}
                  </p>

                  <p className="text-xs text-gray-400 truncate">
                    {item.unit_name || "-"} · {item.completed_tasks}/{item.total_tasks} hoàn thành
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0">
                <p className="text-lg font-bold text-purple-600">
                  {item.total_score}
                </p>

                <p className={`text-xs ${mutedClass}`}>
  {item.level}
</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    )}
  </div>
) : (
  <>
    {kpiData && (
      <div className={`${panelClass} p-6`}>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <p className="text-xs font-semibold text-purple-600 bg-purple-50 px-3 py-1 rounded-full w-fit mb-3">
              KPI hiệu quả
            </p>

            <h2 className={`text-xl font-bold ${titleClass}`}>
              Đánh giá hiệu quả thực hiện nhiệm vụ
            </h2>

            <p className={`text-sm mt-1 ${mutedClass}`}>
  Tính theo tỷ lệ hoàn thành, đúng hạn, tiến độ trung bình và báo cáo/minh chứng.
</p>
          </div>

          <div className="text-left lg:text-right">
            <p className="text-4xl font-bold text-purple-600">
              {kpiData.scores.total_score}
            </p>

            <p className={`text-sm font-semibold mt-1 ${softTextClass}`}>
  {kpiData.level}
</p>

            <p className="text-xs text-gray-400 mt-1">
              Thang điểm 100
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className={`${softPanelClass} p-4`}>
            <p className="text-xs text-gray-400">Hoàn thành</p>
            <p className={`text-lg font-bold mt-2 ${titleClass}`}>
              {kpiData.scores.completion_score}/40
            </p>
            <p className="text-xs text-green-600 mt-1">
              {kpiData.rates.completion_rate}%
            </p>
          </div>

          <div className={`${softPanelClass} p-4`}>
            <p className="text-xs text-gray-400">Đúng hạn</p>
            <p className={`text-lg font-bold mt-2 ${titleClass}`}>
              {kpiData.scores.on_time_score}/30
            </p>
            <p className="text-xs text-blue-600 mt-1">
              {kpiData.rates.on_time_rate}%
            </p>
          </div>

          <div className={`${softPanelClass} p-4`}>
            <p className="text-xs text-gray-400">Tiến độ</p>
            <p className={`text-lg font-bold mt-2 ${titleClass}`}>
              {kpiData.scores.progress_score}/20
            </p>
            <p className="text-xs text-purple-600 mt-1">
              TB {kpiData.summary.avg_progress}%
            </p>
          </div>

          <div className={`${softPanelClass} p-4`}>
            <p className="text-xs text-gray-400">Báo cáo / minh chứng</p>
            <p className={`text-lg font-bold mt-2 ${titleClass}`}>
              {kpiData.scores.report_score}/10
            </p>
            <p className="text-xs text-orange-600 mt-1">
              {kpiData.rates.report_rate}%
            </p>
          </div>
        </div>

        <div className="mt-5">
          <div className={`flex justify-between text-xs mb-1 ${mutedClass}`}>
            <span>Tổng điểm KPI</span>
            <span>{kpiData.scores.total_score}/100</span>
          </div>

          <div className={`h-3 ${progressBgClass} rounded-full overflow-hidden`}>
            <div
              className="h-full bg-purple-500 rounded-full transition-all"
              style={{
                width: `${kpiData.scores.total_score}%`,
              }}
            />
          </div>
        </div>
      </div>
    )}

    {kpiRankings && dashboardScope !== "own" && (
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {dashboardScope === "leader" && (
          <div className={`${panelClass} p-6`}>
            <div className="mb-5">
              <p className="text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-full w-fit mb-3">
                Xếp hạng phòng ban
              </p>

              <h2 className={`text-lg font-bold ${titleClass}`}>
                KPI theo phòng ban
              </h2>

              <p className={`text-sm mt-1 ${mutedClass}`}>
                Sắp xếp theo tổng điểm KPI từ cao đến thấp.
              </p>
            </div>

            <div className="space-y-3">
              {(kpiRankings.departments || []).map((item) => (
                <div
                  key={item.unit_id}
                  className={`flex items-center justify-between gap-4 ${softPanelClass} px-4 py-3`}
                >
                  <div className="min-w-0">
                    <p className={`text-sm font-semibold truncate ${titleClass}`}>
                      #{item.rank} {item.unit_name}
                    </p>

                    <p className="text-xs text-gray-400">
                      {item.completed_tasks}/{item.total_tasks} hoàn thành · {item.overdue_tasks} quá hạn
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-lg font-bold text-purple-600">
                      {item.total_score}
                    </p>

                    <p className={`text-xs ${mutedClass}`}>
                    {item.level}
                  </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className={`${panelClass} p-6`}>
          <div className="mb-5">
            <p className="text-xs font-semibold text-purple-600 bg-purple-50 px-3 py-1 rounded-full w-fit mb-3">
              Xếp hạng cá nhân
            </p>

            <h2 className={`text-lg font-bold ${titleClass}`}>
              KPI theo cán bộ
            </h2>

            <p className={`text-sm mt-1 ${mutedClass}`}>
              Đánh giá theo phần việc được giao và kết quả xử lý.
            </p>
          </div>

          <div className="space-y-3">
            {(kpiRankings.users || []).map((item) => (
              <div
                key={item.user_id}
                className={`flex items-center justify-between gap-4 ${softPanelClass} px-4 py-3`}
              >
                <div className="min-w-0">
                  <p className={`text-sm font-semibold truncate ${titleClass}`}>
                    #{item.rank} {item.full_name}
                  </p>

                  <p className="text-xs text-gray-400 truncate">
                    {item.unit_name || "-"} · {item.completed_tasks}/{item.total_tasks} hoàn thành
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <p className="text-lg font-bold text-purple-600">
                    {item.total_score}
                  </p>

                  <p className={`text-xs ${mutedClass}`}>
                    {item.level}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )}
  </>
)}

{/* GRID */}
<div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
  <DashboardCard>
    <OverviewPie
  summary={summary}
  scope={dashboardScope}
/>
  </DashboardCard>

  {dashboardScope !== "own" && (
    <DashboardCard>
      <DepartmentChart
        departments={departments}
        user={user}
        scope={dashboardScope}
        setSelectedDept={setSelectedDept}
      />
    </DashboardCard>
  )}

  <DashboardCard>
    <div className={`${panelClass} p-5 h-full min-h-0 flex flex-col overflow-hidden`}>
      <div className="shrink-0">
        <h3 className={`font-bold mb-2 ${titleClass}`}>
          {dashboardScope === "leader"
            ? "Phòng ban chậm tiến độ"
            : dashboardScope === "unit"
              ? "Nhiệm vụ quá hạn của phòng ban"
              : "Nhiệm vụ cá nhân quá hạn"}
        </h3>

        <p className={`text-xs mb-4 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
          {dashboardScope === "leader"
            ? "Danh sách phòng ban đang có nhiệm vụ quá hạn."
            : dashboardScope === "unit"
              ? "Tổng hợp nhiệm vụ quá hạn trong phòng ban của bạn."
              : "Theo dõi các nhiệm vụ quá hạn được giao cho bạn."}
        </p>
      </div>

      {departments.filter((d) => Number(d.overdue) > 0).length === 0 ? (
        <div
  className={`
    rounded-2xl
    border
    p-4
    ${
      isDark
        ? "bg-green-500/10 border-green-500/30"
        : "bg-green-50 border-green-100"
    }
  `}
>
          <p className="text-green-700 text-sm font-semibold">
            Không có nhiệm vụ quá hạn
          </p>

          <p className="text-xs text-green-600 mt-1">
            Tiến độ hiện tại đang ổn định.
          </p>
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto pr-2 space-y-3">
          {departments
  .filter((d) => Number(d.overdue) > 0)
            .map((d, i) => (
              <div
  key={i}
  className={`
    rounded-2xl
    border
    p-4
    ${
      isDark
        ? "bg-red-500/10 border-red-500/30"
        : "bg-red-50 border-red-100"
    }
  `}
>
  <p
    className={`text-sm font-semibold ${
      isDark ? "text-red-300" : "text-red-700"
    }`}
  >
                  {dashboardScope === "leader"
                    ? d.department
                    : dashboardScope === "unit"
                      ? "Phòng ban của bạn"
                      : "Nhiệm vụ của bạn"}
                </p>

                <p className="text-xs text-red-600 mt-1">
                  Có {d.overdue} nhiệm vụ quá hạn cần xử lý.
                </p>
              </div>
            ))}
        </div>
      )}
    </div>
  </DashboardCard>

  <DashboardCard
    className={dashboardScope === "own" ? "xl:col-span-2" : ""}
  >
    <TimelineChart
  timeline={timeline}
  scope={dashboardScope}
/>
  </DashboardCard>
</div>

{/* POPUP */}
<TaskListModal
  selectedDept={selectedDept}
  tasks={tasks}
  setTasks={setTasks}
  setSelectedDept={setSelectedDept}
  setSelectedTask={setSelectedTask}
  user={user}
/>

{/* ================= POPUP TASK DETAIL ================= */}
<TaskDetailModal
  selectedTask={selectedTask}
  setSelectedTask={setSelectedTask}
  handleApprove={handleApprove}
  user={user}
  fetchTasks={fetchTasks}
/>
    </div>
  );
}

function DashboardCard({ children, className = "" }) {
  return (
    <div className={`h-[360px] min-h-0 ${className}`}>
      {children}
    </div>
  );
}