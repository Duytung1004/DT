import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import EmployeeReportModal from "../components/reports/EmployeeReportModal";
import { fixVietnameseFileName } from "../utils/fileName";
import socket from "../socket/socket";
const getCurrentPeriodKey = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");

  return `${year}-${month}`;
};

const formatDate = (value) => {
  if (!value) return "-";

  return new Date(value).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const formatDateTime = (value) => {
  if (!value) return "-";

  return new Date(value).toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const isOverdueDate = (deadline) => {
  if (!deadline) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const deadlineDate = new Date(deadline);
  deadlineDate.setHours(0, 0, 0, 0);

  return deadlineDate < today;
};

const getStatusLabel = (status) => {
  const map = {
    cho_nhan_viec: "Chờ nhận việc",
    dang_thuc_hien: "Đang thực hiện",
    cho_duyet: "Chờ duyệt",
    yeu_cau_chinh_sua: "Yêu cầu chỉnh sửa",
    hoan_thanh: "Hoàn thành",
  };

  return map[status] || status || "-";
};

const getStatusColor = (status) => {
  const map = {
    cho_nhan_viec: "bg-gray-100 text-gray-700",
    dang_thuc_hien: "bg-blue-100 text-blue-700",
    cho_duyet: "bg-yellow-100 text-yellow-700",
    yeu_cau_chinh_sua: "bg-red-100 text-red-700",
    hoan_thanh: "bg-green-100 text-green-700",
  };

  return map[status] || "bg-gray-100 text-gray-700";
};

const getViewUrl = (filePath, fileName) => {
  if (!filePath) return "#";

  return `http://localhost:3000/api/files/view?path=${encodeURIComponent(
    filePath
  )}&name=${encodeURIComponent(
    fixVietnameseFileName(fileName || "file")
  )}`;
};

export default function EmployeeReports() {
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

  const [dueReports, setDueReports] = useState([]);

  const [reports, setReports] = useState([]);
  const [monthlyKpi, setMonthlyKpi] = useState(null);

  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);

  const [loading, setLoading] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);

  const [activeTab, setActiveTab] = useState(() => {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const role = user.role || user.role_code || user.roleName || "";
  const roleId = Number(user.roleId || user.role_id || 0);

  if (
    role === "lanh_dao" ||
    role === "admin" ||
    role === "truong_phong" ||
    roleId === 1 ||
    roleId === 2 ||
    roleId === 3
  ) {
    return "overview";
  }

  return "current";
});
  const [keyword, setKeyword] = useState("");
  const user = JSON.parse(localStorage.getItem("user") || "{}");

const currentRole =
  user.role || user.role_code || user.roleName || "";

const currentRoleId =
  Number(user.roleId || user.role_id || 0);

const isLeader =
  currentRole === "lanh_dao" ||
  currentRole === "admin" ||
  currentRoleId === 1 ||
  currentRoleId === 2;

const isManager =
  currentRole === "truong_phong" ||
  currentRoleId === 3;

const isEmployee =
  currentRole === "nhan_vien" ||
  currentRoleId === 4;

const canSubmitPersonalReport = isEmployee;
const canViewUnitReports = isManager || isLeader;

  const fetchDueReports = async () => {
  if (!canSubmitPersonalReport) {
    setDueReports([]);
    return;
  }

  try {
    const res = await api.get("/employee-reports/due");
    setDueReports(Array.isArray(res.data) ? res.data : []);
  } catch (err) {
    console.error("FETCH DUE EMPLOYEE REPORTS ERROR:", err);
    setDueReports([]);
  }
};

  const fetchReports = async () => {
    try {
      const res = await api.get("/employee-reports");
      setReports(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("FETCH EMPLOYEE REPORTS ERROR:", err);
      setReports([]);
    }
  };

  const fetchMonthlyKpi = async () => {
  try {
    const res = await api.get("/kpi/monthly-overview");
    setMonthlyKpi(res.data || null);
  } catch (err) {
    console.error("FETCH MONTHLY KPI ERROR:", err);
    setMonthlyKpi(null);
  }
};

  const fetchAll = async () => {
    try {
      setLoading(true);

      await Promise.all([
  fetchDueReports(),
  fetchReports(),
  fetchMonthlyKpi(),
]);
      setLastUpdatedAt(new Date());
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = async () => {
  try {
    const res = await api.get(
      "/employee-reports/export/excel",
      {
        responseType: "blob",
      }
    );

    const blob = new Blob([res.data], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const url = window.URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `bao-cao-ca-nhan-${Date.now()}.xlsx`;

    document.body.appendChild(link);
    link.click();

    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (err) {
    console.error("EXPORT EMPLOYEE REPORTS EXCEL ERROR:", err);

    alert(
      err.response?.data?.message ||
        "Không thể xuất báo cáo cá nhân Excel"
    );
  }
};

  useEffect(() => {
    fetchAll();
  }, []);

  useEffect(() => {
  const handleReportRealtime = async (payload) => {
    console.log("EMPLOYEE REPORT REALTIME:", payload);
    await fetchAll();
  };

  socket.on("report:changed", handleReportRealtime);

  return () => {
    socket.off("report:changed", handleReportRealtime);
  };
}, []);

  const currentGroup = dueReports[0] || null;
  const currentItems = currentGroup?.items || [];

  const summary = useMemo(() => {
    const total = currentItems.length;

    const done = currentItems.filter(
      (item) => item.subtask_status === "hoan_thanh"
    ).length;

    const doing = currentItems.filter(
      (item) => item.subtask_status === "dang_thuc_hien"
    ).length;

    const pendingReview = currentItems.filter(
      (item) => item.subtask_status === "cho_duyet"
    ).length;

    const revision = currentItems.filter(
      (item) => item.subtask_status === "yeu_cau_chinh_sua"
    ).length;

    const overdue = currentItems.filter((item) => {
      if (!item.subtask_deadline) return false;

      return (
        isOverdueDate(item.subtask_deadline) &&
        item.subtask_status !== "hoan_thanh"
      );
    }).length;

    const averageProgress =
      total > 0
        ? Math.round(
            currentItems.reduce(
              (sum, item) =>
                sum + Number(item.progress_snapshot || 0),
              0
            ) / total
          )
        : 0;

    return {
      total,
      done,
      doing,
      pendingReview,
      revision,
      overdue,
      averageProgress,
    };
  }, [currentItems]);

  const filteredItems = useMemo(() => {
    return currentItems.filter((item) => {
      const searchText = `
        ${item.subtask_title || ""}
        ${item.task_title || ""}
        ${item.subtask_description || ""}
        ${item.unit_name || ""}
      `.toLowerCase();

      return searchText.includes(keyword.toLowerCase());
    });
  }, [currentItems, keyword]);

  const filteredReports = useMemo(() => {
    return reports.filter((report) => {
      const searchText = `
        ${report.period_key || ""}
        ${report.unit_name || ""}
        ${report.noi_dung || ""}
        ${report.kho_khan || ""}
        ${report.de_xuat || ""}
      `.toLowerCase();

      return searchText.includes(keyword.toLowerCase());
    });
  }, [reports, keyword]);

  const reportOverview = useMemo(() => {
  const totalReports = filteredReports.length;

  const totalSubtasks = filteredReports.reduce(
    (sum, item) => sum + Number(item.tong_phan_viec || 0),
    0
  );

  const doneSubtasks = filteredReports.reduce(
    (sum, item) => sum + Number(item.so_hoan_thanh || 0),
    0
  );

  const doingSubtasks = filteredReports.reduce(
    (sum, item) => sum + Number(item.so_dang_thuc_hien || 0),
    0
  );

  const pendingSubtasks = filteredReports.reduce(
    (sum, item) => sum + Number(item.so_cho_duyet || 0),
    0
  );

  const overdueSubtasks = filteredReports.reduce(
    (sum, item) => sum + Number(item.so_qua_han || 0),
    0
  );

  const avgProgress =
    totalReports > 0
      ? Math.round(
          filteredReports.reduce(
            (sum, item) => sum + Number(item.ti_le_hoan_thanh || 0),
            0
          ) / totalReports
        )
      : 0;

  const staffSet = new Set(
    filteredReports
      .map(
        (item) =>
          item.reporter_id ||
          item.reporter_username ||
          item.reporter_name
      )
      .filter(Boolean)
  );

  const unitSet = new Set(
    filteredReports.map((item) => item.unit_name).filter(Boolean)
  );

  return {
    totalReports,
    totalSubtasks,
    doneSubtasks,
    doingSubtasks,
    pendingSubtasks,
    overdueSubtasks,
    avgProgress,
    totalStaff: staffSet.size,
    totalUnits: unitSet.size,
  };
}, [filteredReports]);

const staffSummaries = useMemo(() => {
  const map = {};

  filteredReports.forEach((report) => {
    const key =
      report.reporter_id ||
      report.reporter_username ||
      report.reporter_name ||
      "unknown";

    if (!map[key]) {
      map[key] = {
        reporter_id: report.reporter_id,
        reporter_name:
          report.reporter_name ||
          report.reporter_username ||
          "Chưa xác định",
        unit_name: report.unit_name || "-",
        report_count: 0,
        total_tasks: 0,
        done: 0,
        doing: 0,
        pending: 0,
        overdue: 0,
        total_progress: 0,
      };
    }

    map[key].report_count += 1;
    map[key].total_tasks += Number(report.tong_phan_viec || 0);
    map[key].done += Number(report.so_hoan_thanh || 0);
    map[key].doing += Number(report.so_dang_thuc_hien || 0);
    map[key].pending += Number(report.so_cho_duyet || 0);
    map[key].overdue += Number(report.so_qua_han || 0);
    map[key].total_progress += Number(report.ti_le_hoan_thanh || 0);
  });

  return Object.values(map).map((item) => ({
    ...item,
    avg_progress:
      item.report_count > 0
        ? Math.round(item.total_progress / item.report_count)
        : 0,
  }));
}, [filteredReports]);

const unitSummaries = useMemo(() => {
  const map = {};

  filteredReports.forEach((report) => {
    const key = report.unit_name || "Chưa xác định";

    if (!map[key]) {
      map[key] = {
        unit_name: key,
        report_count: 0,
        staff: new Set(),
        total_tasks: 0,
        done: 0,
        doing: 0,
        pending: 0,
        overdue: 0,
        total_progress: 0,
      };
    }

    map[key].report_count += 1;
    map[key].staff.add(
      report.reporter_id ||
        report.reporter_username ||
        report.reporter_name
    );
    map[key].total_tasks += Number(report.tong_phan_viec || 0);
    map[key].done += Number(report.so_hoan_thanh || 0);
    map[key].doing += Number(report.so_dang_thuc_hien || 0);
    map[key].pending += Number(report.so_cho_duyet || 0);
    map[key].overdue += Number(report.so_qua_han || 0);
    map[key].total_progress += Number(report.ti_le_hoan_thanh || 0);
  });

  return Object.values(map).map((item) => ({
    ...item,
    staff_count: item.staff.size,
    avg_progress:
      item.report_count > 0
        ? Math.round(item.total_progress / item.report_count)
        : 0,
  }));
}, [filteredReports]);

  const handleViewReport = async (reportId) => {
    try {
      const res = await api.get(`/employee-reports/${reportId}`);
      setSelectedReport(res.data);
    } catch (err) {
      console.error("GET EMPLOYEE REPORT DETAIL ERROR:", err);

      alert(
        err.response?.data?.message ||
          "Không thể xem chi tiết báo cáo"
      );
    }
  };

  const tabs = canViewUnitReports
  ? [
      {
        key: "overview",
        label: isLeader
          ? "Tổng quan toàn hệ thống"
          : "Tổng quan phòng tôi",
      },
      {
        key: "staff",
        label: "Theo cán bộ",
      },
      {
        key: "history",
        label: "Danh sách báo cáo",
      },
    ]
  : [
      {
        key: "current",
        label: "Báo cáo tháng này",
      },
      {
        key: "tasks",
        label: "Phần việc của tôi",
      },
      {
        key: "history",
        label: "Lịch sử báo cáo",
      },
    ];

    const pageClass = `
  p-6
  min-h-screen
  space-y-6
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

const softPanelClass = `
  rounded-2xl
  border
  ${
    isDark
      ? "bg-slate-950 border-slate-800"
      : "bg-gray-50 border-gray-100"
  }
`;

const titleClass = isDark ? "text-gray-100" : "text-gray-900";
const mutedClass = isDark ? "text-gray-400" : "text-gray-500";
const softMutedClass = isDark ? "text-gray-500" : "text-gray-400";
const inputClass = `
  w-full
  px-4 py-3
  rounded-2xl
  border
  outline-none
  focus:ring-2
  focus:ring-purple-400
  ${
    isDark
      ? "bg-slate-950 border-slate-700 text-gray-100 placeholder:text-gray-500"
      : "bg-white border-gray-200 text-gray-900"
  }
`;

  return (
    <div className={pageClass}>
      {/* HEADER */}
      <div className={`${panelClass} p-6`}>
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-semibold">
                Báo cáo cá nhân
              </span>

              <span className="px-3 py-1 rounded-full bg-green-50 text-green-700 text-xs font-semibold">
                ● Đang đồng bộ
              </span>
            </div>

            <h1 className={`text-2xl font-bold ${titleClass}`}>
            {isLeader
                ? `Tổng hợp báo cáo cá nhân toàn hệ thống tháng ${getCurrentPeriodKey()}`
                : isManager
                ? `Báo cáo cá nhân cán bộ trong phòng tháng ${getCurrentPeriodKey()}`
                : `Báo cáo cá nhân tháng ${
                    currentGroup?.period_key || getCurrentPeriodKey()
                }`}
            </h1>

            <p className={`text-sm mt-1 ${mutedClass}`}>
            {isLeader
                ? "Theo dõi báo cáo cá nhân của cán bộ tại các phòng ban."
                : isManager
                ? "Theo dõi báo cáo cá nhân của cán bộ trong phòng mình."
                : "Tổng hợp các phần việc được giao trong tháng và gửi báo cáo cá nhân một lần mỗi tháng."}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className={`text-xs ${softMutedClass}`}>
              Cập nhật lần cuối:{" "}
              <b className={mutedClass}>
                {lastUpdatedAt
                  ? lastUpdatedAt.toLocaleTimeString("vi-VN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "-"}
              </b>
            </div>

            <button
              onClick={fetchAll}
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-black transition disabled:opacity-60"
            >
              {loading ? "Đang tải..." : "↻ Tải lại"}
            </button>

            <button
  onClick={handleExportExcel}
  className="px-4 py-2 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition"
>
  Xuất Excel
</button>
          </div>
        </div>
      </div>
    
      {/* CURRENT REPORT STATUS */}
      {isEmployee && (
      <div className={`${panelClass} p-5`}>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className={`font-bold ${titleClass}`}>
              Trạng thái báo cáo tháng hiện tại
            </h2>

            <p className={`text-sm mt-1 ${mutedClass}`}>
            {currentGroup?.is_reported
                ? "Bạn đã gửi báo cáo cá nhân trong tháng này."
                : currentGroup?.can_submit
                ? "Đã đến thời gian nộp báo cáo cá nhân tháng này."
                : `Chưa đến thời gian nộp báo cáo. Có thể nộp từ ngày ${formatDate(
                    currentGroup?.report_open_at
                )}.`}
            </p>
          </div>

          {currentGroup?.is_reported ? (
            <button
              onClick={() => handleViewReport(currentGroup.report_id)}
              className="px-4 py-2 rounded-xl bg-green-50 text-green-700 text-sm font-semibold hover:bg-green-100 transition"
            >
              Xem báo cáo đã gửi
            </button>
          ) : currentGroup ? (
            <button
                onClick={() => setSelectedGroup(currentGroup)}
                disabled={
                summary.total === 0 ||
                !currentGroup.can_submit
                }
                className="px-4 py-2 rounded-xl bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
                {currentGroup.can_submit
                ? "Gửi báo cáo tháng"
                : "Chưa đến thời gian nộp"}
            </button>
            ) : null}
        </div>
      </div>
    )}
    
      {/* STATS */}
      {isEmployee && (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-4">
        <StatCard
          label="Tổng phần việc"
          value={summary.total}
         valueClassName={titleClass}
        />

        <StatCard
          label="Hoàn thành"
          value={summary.done}
          valueClassName="text-green-600"
        />

        <StatCard
          label="Đang thực hiện"
          value={summary.doing}
          valueClassName="text-blue-600"
        />

        <StatCard
          label="Chờ duyệt"
          value={summary.pendingReview}
          valueClassName="text-yellow-600"
        />

        <StatCard
          label="Quá hạn"
          value={summary.overdue}
          valueClassName="text-red-600"
        />

        <StatCard
          label="Tiến độ TB"
          value={`${summary.averageProgress}%`}
          valueClassName="text-purple-600"
        />
      </div>
     )}      
      <MonthlyKpiCard
  monthlyKpi={monthlyKpi}
  isDark={isDark}
  titleClass={titleClass}
  mutedClass={mutedClass}
  softPanelClass={softPanelClass}
/>

      {/* FILTER */}
      <div className={`${panelClass} p-4`}>
        <input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="Tìm theo phần việc, nhiệm vụ, nội dung báo cáo..."
          className={inputClass}
        />
      </div>

      {/* TABS */}
      <div className={`${panelClass} p-2 overflow-x-auto`}>
        <div className="flex gap-2 min-w-max">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-2xl text-sm font-semibold transition ${
                activeTab === tab.key
  ? "bg-purple-600 text-white"
  : isDark
  ? "text-gray-400 hover:bg-slate-800 hover:text-gray-100"
  : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {canViewUnitReports && activeTab === "overview" && (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-4">
      {isLeader && (
        <StatCard
          label="Phòng ban có báo cáo"
          value={reportOverview.totalUnits}
          valueClassName="text-blue-600"
        />
      )}

      <StatCard
        label="Cán bộ đã báo cáo"
        value={reportOverview.totalStaff}
        valueClassName="text-purple-600"
      />

      <StatCard
        label="Tổng báo cáo"
        value={reportOverview.totalReports}
        valueClassName={titleClass}
      />

      <StatCard
        label="Tổng phần việc"
        value={reportOverview.totalSubtasks}
        valueClassName={titleClass}
      />

      <StatCard
        label="Hoàn thành"
        value={reportOverview.doneSubtasks}
        valueClassName="text-green-600"
      />

      <StatCard
        label="Quá hạn"
        value={reportOverview.overdueSubtasks}
        valueClassName="text-red-600"
      />
    </div>
    

    <Card
      title={
        isLeader
          ? "Tổng hợp báo cáo cá nhân theo phòng ban"
          : "Tổng hợp báo cáo cá nhân trong phòng"
      }
    >
      {isLeader ? (
        unitSummaries.length === 0 ? (
          <EmptyState text="Chưa có dữ liệu báo cáo theo phòng ban" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 border-b">
                  <th className="py-3 pr-4">Phòng ban</th>
                  <th className="py-3 pr-4">Cán bộ đã báo cáo</th>
                  <th className="py-3 pr-4">Số báo cáo</th>
                  <th className="py-3 pr-4">Tổng phần việc</th>
                  <th className="py-3 pr-4">Hoàn thành</th>
                  <th className="py-3 pr-4">Đang làm</th>
                  <th className="py-3 pr-4">Quá hạn</th>
                  <th className="py-3 pr-4">Tiến độ TB</th>
                </tr>
              </thead>

              <tbody>
                {unitSummaries.map((unit) => (
                  <tr
  key={unit.unit_name}
  className="border-b border-gray-100 dark:border-slate-800 last:border-b-0 hover:bg-gray-50 dark:hover:bg-slate-800/60"
>
  <td className="py-4 pr-4 font-semibold text-gray-800 dark:text-gray-100">
    {unit.unit_name}
  </td>
                    <td className="py-4 pr-4">{unit.staff_count}</td>
                    <td className="py-4 pr-4">{unit.report_count}</td>
                    <td className="py-4 pr-4">{unit.total_tasks}</td>
                    <td className="py-4 pr-4 text-green-600 font-semibold">
                      {unit.done}
                    </td>
                    <td className="py-4 pr-4 text-blue-600 font-semibold">
                      {unit.doing}
                    </td>
                    <td className="py-4 pr-4 text-red-600 font-semibold">
                      {unit.overdue}
                    </td>
                    <td className="py-4 pr-4">
                      <span className="text-xs px-3 py-1 rounded-full bg-purple-50 text-purple-700 font-semibold">
                        {unit.avg_progress}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : staffSummaries.length === 0 ? (
        <EmptyState text="Chưa có báo cáo cá nhân của cán bộ trong phòng" />
      ) : (
        <StaffReportTable
          staffSummaries={staffSummaries}
        />
      )}
    </Card>
  </div>
)}

{canViewUnitReports && activeTab === "staff" && (
  <Card title="Tổng hợp theo cán bộ">
    {staffSummaries.length === 0 ? (
      <EmptyState text="Chưa có báo cáo cá nhân của cán bộ" />
    ) : (
      <StaffReportTable staffSummaries={staffSummaries} />
    )}
  </Card>
)}

      {/* TAB CURRENT */}
      {isEmployee && activeTab === "current" && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className={`xl:col-span-2 ${panelClass} p-6`}>
            <h2 className={`font-bold ${titleClass}`}>
              Tổng quan báo cáo cá nhân tháng
            </h2>

            {summary.total === 0 ? (
              <div className="mt-5 rounded-2xl bg-green-50 border border-green-100 p-5">
                <p className="font-semibold text-green-700">
                  Hiện không có phần việc cần báo cáo
                </p>

                <p className="text-sm text-green-600 mt-1">
                  Bạn chưa có phần việc đang theo dõi trong tháng này
                  hoặc các phần việc đã được xử lý xong.
                </p>
              </div>
            ) : (
              <>
                <p className={`text-sm mt-2 leading-relaxed ${mutedClass}`}>
                  Trong tháng{" "}
                  <b>{currentGroup?.period_key || getCurrentPeriodKey()}</b>,
                  bạn có <b>{summary.total}</b> phần việc thuộc diện
                  theo dõi. Trong đó có <b>{summary.done}</b> phần việc
                  hoàn thành, <b>{summary.doing}</b> phần việc đang
                  thực hiện, <b>{summary.pendingReview}</b> phần việc
                  chờ duyệt và <b>{summary.overdue}</b> phần việc quá
                  hạn.
                </p>

                <div className="mt-6 space-y-4">
                  <ProgressRow
                    label="Tiến độ trung bình"
                    value={summary.averageProgress}
                  />

                  <ProgressRow
                    label="Tỷ lệ hoàn thành"
                    value={
                      summary.total > 0
                        ? Math.round((summary.done / summary.total) * 100)
                        : 0
                    }
                  />
                </div>
              </>
            )}
          </div>

          <div className={`${panelClass} p-6`}>
            <h2 className={`font-bold ${titleClass}`}>
              Trạng thái gửi báo cáo
            </h2>

            <div className={`${softPanelClass} mt-5 p-4`}>
  <p className={`text-sm ${softMutedClass}`}>Tháng báo cáo</p>

  <p className={`text-2xl font-bold mt-1 ${titleClass}`}>
    {currentGroup?.period_key || getCurrentPeriodKey()}
  </p>
</div>

           <div className={`${softPanelClass} mt-4 p-4`}>
  <p className={`text-sm ${softMutedClass}`}>Tình trạng</p>

  <p
    className={`text-lg font-bold mt-1 ${
      currentGroup?.is_reported
        ? "text-green-500"
        : currentGroup?.can_submit
        ? "text-orange-500"
        : isDark
        ? "text-gray-300"
        : "text-gray-600"
    }`}
  >
    {currentGroup?.is_reported
      ? "Đã báo cáo"
      : currentGroup?.can_submit
      ? "Đến kỳ nộp"
      : "Chưa đến kỳ nộp"}
  </p>

  {!currentGroup?.is_reported && (
    <p className={`text-xs mt-1 ${softMutedClass}`}>
      Có thể nộp từ: {formatDate(currentGroup?.report_open_at)}
    </p>
  )}
</div>
          </div>
        </div>
      )}

      {/* TAB TASKS */}
      {isEmployee && activeTab === "tasks" && (
        <Card title="Danh sách phần việc trong tháng">
          {loading ? (
            <EmptyState text="Đang tải dữ liệu..." />
          ) : filteredItems.length === 0 ? (
            <EmptyState text="Không có phần việc phù hợp" />
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredItems.map((item) => (
                <div
                  key={item.subtask_id}
                  className="py-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                          item.subtask_status
                        )}`}
                      >
                        {getStatusLabel(item.subtask_status)}
                      </span>

                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
                        {item.progress_snapshot || 0}%
                      </span>
                    </div>

                    <h3 className="font-bold text-gray-900 line-clamp-1">
                      {item.subtask_title || "Phần việc"}
                    </h3>

                    <p className="text-sm text-gray-500 mt-1 line-clamp-1">
                      Thuộc nhiệm vụ:{" "}
                      <b className="text-gray-700">
                        {item.task_title || "-"}
                      </b>
                    </p>

                    <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-500">
                      <span>
                        Hạn chót:{" "}
                        <b className="text-gray-700">
                          {formatDate(item.subtask_deadline)}
                        </b>
                      </span>

                      <span>
                        Phòng ban:{" "}
                        <b className="text-gray-700">
                          {item.unit_name || "-"}
                        </b>
                      </span>
                    </div>
                  </div>

                  <div className="w-full lg:w-48">
                    <div className={`flex justify-between text-xs mb-1 ${mutedClass}`}>
                      <span>Tiến độ</span>
                      <span>{item.progress_snapshot || 0}%</span>
                    </div>

                    <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                      <div
                        className="h-full bg-purple-500 rounded-full"
                        style={{
                          width: `${item.progress_snapshot || 0}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* TAB HISTORY */}
      {activeTab === "history" && (
        <Card title="Lịch sử báo cáo cá nhân">
          {filteredReports.length === 0 ? (
            <EmptyState text="Chưa có báo cáo nào" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-400 border-b">
                    <th className="py-3 pr-4">Tháng</th>
                    <th className="py-3 pr-4">Phòng ban</th>
                    <th className="py-3 pr-4">Phần việc</th>
                    <th className="py-3 pr-4">Hoàn thành</th>
                    <th className="py-3 pr-4">Quá hạn</th>
                    <th className="py-3 pr-4">Tiến độ</th>
                    <th className="py-3 pr-4">Ngày gửi</th>
                    <th className="py-3 pr-4 text-right">
                      Thao tác
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredReports.map((report) => (
                    <tr
                      key={report.id}
                      className="border-b border-gray-100 dark:border-slate-800 last:border-b-0 hover:bg-gray-50 dark:hover:bg-slate-800/60"
                    >
                      <td className="py-4 pr-4 font-semibold text-gray-800 dark:text-gray-100">
                        {report.period_key}
                      </td>

                      <td className="py-4 pr-4 text-gray-600 dark:text-gray-400">
                        {report.unit_name || "-"}
                      </td>

                      <td className="py-4 pr-4 text-gray-600 dark:text-gray-400">
                        {report.tong_phan_viec ?? 0}
                      </td>

                      <td className="py-4 pr-4 text-green-600 font-semibold">
                        {report.so_hoan_thanh ?? 0}
                      </td>

                      <td className="py-4 pr-4 text-red-600 font-semibold">
                        {report.so_qua_han ?? 0}
                      </td>

                      <td className="py-4 pr-4">
                        <span
  className={`
    text-xs px-3 py-1
    rounded-full
    font-semibold
    ${
      isDark
        ? "bg-purple-500/10 text-purple-300"
        : "bg-purple-50 text-purple-700"
    }
  `}
>
  {report.ti_le_hoan_thanh ?? 0}%
</span>
                      </td>

                      <td className={`py-4 pr-4 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
  {formatDateTime(report.created_at)}
</td>

                      <td className="py-4 pr-4 text-right">
                        <button
  onClick={() => handleViewReport(report.id)}
  className={`
    px-3 py-1.5
    rounded-xl
    text-xs
    font-semibold
    transition
    ${
      isDark
        ? "bg-purple-500/10 text-purple-300 hover:bg-purple-500/20 border border-purple-500/20"
        : "bg-gray-900 text-white hover:bg-black"
    }
  `}
>
  Xem chi tiết
</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* CREATE MODAL */}
      <EmployeeReportModal
        reportGroup={selectedGroup}
        onClose={() => setSelectedGroup(null)}
        onSubmitted={fetchAll}
      />

      {/* DETAIL MODAL */}
      {selectedReport && (
        <ReportDetailModal
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
          isDark={isDark}
        />
      )}
    </div>
  );
}

function ReportDetailModal({ report, onClose, isDark }) {
  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[90] px-4"
      onClick={onClose}
    >
      <div
        className={`
  w-[780px]
  max-w-[96vw]
  max-h-[92vh]
  rounded-3xl
  shadow-2xl
  overflow-hidden
  flex flex-col
  ${
    isDark
      ? "bg-slate-900 text-gray-100"
      : "bg-white text-gray-900"
  }
`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`
  px-6 py-5
  border-b
  flex justify-between gap-4
  ${
    isDark
      ? "bg-slate-950 border-slate-800"
      : "bg-gray-50 border-gray-100"
  }
`}>
          <div>
            <h2 className={isDark ? "text-xl font-bold text-gray-100" : "text-xl font-bold text-gray-900"}>
              Chi tiết báo cáo cá nhân
            </h2>

            <p className="text-sm text-gray-500 mt-1">
              Tháng báo cáo:{" "}
              <span className="font-semibold text-purple-600">
                {report.period_key || "-"}
              </span>
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 transition"
          >
            ✕
          </button>
        </div>

        <div className="px-6 py-5 overflow-y-auto space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <StatBox
              label="Tổng phần việc"
              value={report.tong_phan_viec}
            />

            <StatBox
              label="Hoàn thành"
              value={report.so_hoan_thanh}
            />

            <StatBox
              label="Đang thực hiện"
              value={report.so_dang_thuc_hien}
            />

            <StatBox
              label="Chờ duyệt"
              value={report.so_cho_duyet}
            />

            <StatBox
              label="Quá hạn"
              value={report.so_qua_han}
            />
          </div>

          <div
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
  <p
    className={`text-xs font-medium ${
      isDark ? "text-gray-500" : "text-gray-400"
    }`}
  >
    Người báo cáo
  </p>

  <p
    className={`font-semibold mt-1 ${
      isDark ? "text-gray-100" : "text-gray-900"
    }`}
  >
    {report.reporter_name ||
      report.reporter_username ||
      "-"}
  </p>

  <p
    className={`text-xs mt-1 ${
      isDark ? "text-gray-500" : "text-gray-400"
    }`}
  >
    Phòng ban: {report.unit_name || "-"} · Ngày gửi:{" "}
    {formatDateTime(report.created_at)}
  </p>
</div>

          <ContentBlock
            title="Nội dung đã thực hiện"
            content={report.noi_dung}
          />

          <ContentBlock
            title="Khó khăn, vướng mắc"
            content={report.kho_khan}
          />

          <ContentBlock
            title="Đề xuất, kiến nghị"
            content={report.de_xuat}
          />

          {report.file_path && (
            <a
              href={getViewUrl(report.file_path, report.file_name)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex px-4 py-2 rounded-xl bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 transition"
            >
              Xem file đính kèm
            </a>
          )}

          <div>
            <h3
  className={`font-bold mb-3 ${
    isDark ? "text-gray-100" : "text-gray-900"
  }`}
>
  Phần việc trong báo cáo
</h3>

            {!report.items || report.items.length === 0 ? (
              <EmptyState text="Không có chi tiết phần việc" />
            ) : (
              <div className="space-y-3">
                {report.items.map((item) => (
                  <div
  key={item.id}
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
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p
  className={`font-semibold ${
    isDark ? "text-gray-100" : "text-gray-900"
  }`}
>
                          {item.subtask_title || "-"}
                        </p>

                        <p
  className={`text-xs mt-1 ${
    isDark ? "text-gray-500" : "text-gray-400"
  }`}
>
                          Thuộc nhiệm vụ: {item.task_title || "-"}
                        </p>
                      </div>

                      <span
                        className={`text-xs px-3 py-1 rounded-full font-semibold ${getStatusColor(
                          item.subtask_status
                        )}`}
                      >
                        {getStatusLabel(item.subtask_status)}
                      </span>
                    </div>

                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Mức ghi nhận</span>
                        <span>{item.progress_snapshot || 0}%</span>
                      </div>

                      <div
  className={`h-2 rounded-full overflow-hidden ${
    isDark ? "bg-slate-800" : "bg-gray-200"
  }`}
>
                        <div
                          className="h-full bg-purple-500 rounded-full"
                          style={{
                            width: `${
                              item.progress_snapshot || 0
                            }%`,
                          }}
                        />
                      </div>
                    </div>

                    {item.note && (
                      <p
  className={`text-sm mt-3 ${
    isDark ? "text-gray-400" : "text-gray-600"
  }`}
>
  Ghi chú: {item.note}
</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div
  className={`
    px-6 py-4
    border-t
    flex justify-end
    ${
      isDark
        ? "bg-slate-900 border-slate-800"
        : "bg-white border-gray-100"
    }
  `}
>
          <button
            onClick={onClose}
            className={`
  px-4 py-2
  rounded-xl
  transition
  ${
    isDark
      ? "bg-slate-800 text-gray-200 hover:bg-slate-700"
      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
  }
`}
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

function Card({ title, children }) {
  const theme = localStorage.getItem("theme") || "light";
  const isDark = theme === "dark";

  return (
    <div
      className={`
        rounded-3xl
        border
        p-6
        shadow-sm
        ${
          isDark
            ? "bg-slate-900 border-slate-800"
            : "bg-white border-gray-100"
        }
      `}
    >
      <h2
        className={`font-bold mb-4 ${
          isDark ? "text-gray-100" : "text-gray-900"
        }`}
      >
        {title}
      </h2>

      {children}
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div className="p-8 text-center text-gray-500 text-sm">
      {text}
    </div>
  );
}
function StaffReportTable({ staffSummaries }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-400 border-b border-gray-100 dark:border-slate-800">
            <th className="py-3 pr-4">Cán bộ</th>
            <th className="py-3 pr-4">Phòng ban</th>
            <th className="py-3 pr-4">Số báo cáo</th>
            <th className="py-3 pr-4">Tổng phần việc</th>
            <th className="py-3 pr-4">Hoàn thành</th>
            <th className="py-3 pr-4">Đang làm</th>
            <th className="py-3 pr-4">Chờ duyệt</th>
            <th className="py-3 pr-4">Quá hạn</th>
            <th className="py-3 pr-4">Tiến độ TB</th>
          </tr>
        </thead>

        <tbody>
          {staffSummaries.map((staff) => (
            <tr
              key={`${staff.reporter_id || staff.reporter_name}`}
              className="border-b border-gray-100 dark:border-slate-800 last:border-b-0 hover:bg-gray-50 dark:hover:bg-slate-800/60"
            >
              <td className="py-4 pr-4 font-semibold text-gray-800">
                {staff.reporter_name}
              </td>

              <td className="py-4 pr-4 text-gray-600">
                {staff.unit_name}
              </td>

              <td className="py-4 pr-4">
                {staff.report_count}
              </td>

              <td className="py-4 pr-4">
                {staff.total_tasks}
              </td>

              <td className="py-4 pr-4 text-green-600 font-semibold">
                {staff.done}
              </td>

              <td className="py-4 pr-4 text-blue-600 font-semibold">
                {staff.doing}
              </td>

              <td className="py-4 pr-4 text-yellow-600 font-semibold">
                {staff.pending}
              </td>

              <td className="py-4 pr-4 text-red-600 font-semibold">
                {staff.overdue}
              </td>

              <td className="py-4 pr-4">
                <span className="text-xs px-3 py-1 rounded-full bg-purple-50 text-purple-700 font-semibold">
                  {staff.avg_progress}%
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatCard({ label, value, valueClassName = "" }) {
  const theme = localStorage.getItem("theme") || "light";
  const isDark = theme === "dark";

  return (
    <div
      className={`
        rounded-3xl
        border
        p-5
        shadow-sm
        ${
          isDark
            ? "bg-slate-900 border-slate-800"
            : "bg-white border-gray-100"
        }
      `}
    >
      <p className={isDark ? "text-sm text-gray-500" : "text-sm text-gray-400"}>
        {label}
      </p>

      <p className={`text-3xl font-bold mt-2 ${valueClassName}`}>
        {value}
      </p>
    </div>
  );
}

function StatBox({ label, value }) {
  const theme = localStorage.getItem("theme") || "light";
  const isDark = theme === "dark";

  return (
    <div
      className={`
        rounded-2xl
        border
        p-4
        ${
          isDark
            ? "bg-purple-500/10 border-purple-500/20"
            : "bg-purple-50 border-purple-100"
        }
      `}
    >
      <p
        className={`text-xs font-medium ${
          isDark ? "text-purple-300" : "text-purple-500"
        }`}
      >
        {label}
      </p>

      <p
        className={`text-xl font-bold mt-1 ${
          isDark ? "text-gray-100" : "text-gray-900"
        }`}
      >
        {value ?? 0}
      </p>
    </div>
  );
}
function MonthlyKpiCard({
  monthlyKpi,
  isDark,
  titleClass,
  mutedClass,
  softPanelClass,
}) {
  if (!monthlyKpi) return null;

  return (
    <div
  className={`
    rounded-3xl
    border
    p-6
    shadow-sm
    ${
      isDark
        ? "bg-slate-900 border-slate-800"
        : "bg-white border-gray-100"
    }
  `}
>
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div>
          <p className="text-xs font-semibold text-purple-600 bg-purple-50 px-3 py-1 rounded-full w-fit mb-3">
            KPI tháng {monthlyKpi.period_key}
          </p>

          <h2 className={`text-xl font-bold ${titleClass}`}>
            Đánh giá KPI báo cáo cá nhân
          </h2>

          <p className={`text-sm mt-1 ${mutedClass}`}>
            Tính theo phần việc được giao, tiến độ xử lý và báo cáo/minh chứng trong tháng.
          </p>
        </div>

        <div className="text-left lg:text-right">
          <p className="text-4xl font-bold text-purple-600">
            {monthlyKpi.scores.total_score}
          </p>

          <p className={`text-sm font-semibold mt-1 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
            {monthlyKpi.level}
          </p>

          <p className="text-xs text-gray-400 mt-1">
            Thang điểm 100
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiMiniBox
  label="Hoàn thành"
  value={`${monthlyKpi.scores.completion_score}/40`}
  sub={`${monthlyKpi.rates.completion_rate}%`}
  subClassName="text-green-600"
  isDark={isDark}
  titleClass={titleClass}
  softPanelClass={softPanelClass}
/>

        <KpiMiniBox
  label="Đúng hạn"
  value={`${monthlyKpi.scores.on_time_score}/30`}
  sub={`${monthlyKpi.rates.on_time_rate}%`}
  subClassName="text-blue-600"
  isDark={isDark}
  titleClass={titleClass}
  softPanelClass={softPanelClass}
/>

<KpiMiniBox
  label="Tiến độ"
  value={`${monthlyKpi.scores.progress_score}/20`}
  sub={`TB ${monthlyKpi.summary.avg_progress}%`}
  subClassName="text-purple-600"
  isDark={isDark}
  titleClass={titleClass}
  softPanelClass={softPanelClass}
/>

<KpiMiniBox
  label="Báo cáo / minh chứng"
  value={`${monthlyKpi.scores.report_score}/10`}
  sub={`${monthlyKpi.rates.report_rate}%`}
  subClassName="text-orange-600"
  isDark={isDark}
  titleClass={titleClass}
  softPanelClass={softPanelClass}
/>
      </div>

      <div className="mt-5">
        <div className={`flex justify-between text-xs mb-1 ${mutedClass}`}>
          <span>Tổng điểm KPI tháng</span>
          <span>{monthlyKpi.scores.total_score}/100</span>
        </div>

        <div className={`h-3 rounded-full overflow-hidden ${isDark ? "bg-slate-800" : "bg-gray-100"}`}>
          <div
            className="h-full bg-purple-500 rounded-full transition-all"
            style={{
              width: `${monthlyKpi.scores.total_score}%`,
            }}
          />
        </div>
      </div>
    </div>
  );
}

function KpiMiniBox({
  label,
  value,
  sub,
  subClassName = "text-gray-500",
  isDark,
  titleClass,
  softPanelClass,
}) {
  return (
    <div className={`${softPanelClass} p-4`}>
      <p className={isDark ? "text-xs text-gray-500" : "text-xs text-gray-400"}>
        {label}
      </p>

      <p className={`text-lg font-bold mt-2 ${titleClass}`}>
        {value}
      </p>

      <p className={`text-xs mt-1 ${subClassName}`}>
        {sub}
      </p>
    </div>
  );
}

function ProgressRow({ label, value }) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-2">
        <span className="text-gray-500">{label}</span>
        <span className="font-semibold text-gray-800">{value}%</span>
      </div>

      <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
        <div
          className="h-full rounded-full bg-purple-500"
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  );
}

function ContentBlock({ title, content }) {
  const theme = localStorage.getItem("theme") || "light";
  const isDark = theme === "dark";

  return (
    <div
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
      <p
        className={`text-xs font-medium ${
          isDark ? "text-gray-500" : "text-gray-400"
        }`}
      >
        {title}
      </p>

      <p
        className={`text-sm mt-2 whitespace-pre-line ${
          isDark ? "text-gray-300" : "text-gray-700"
        }`}
      >
        {content || "Không có"}
      </p>
    </div>
  );
}