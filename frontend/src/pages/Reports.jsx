import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import socket from "../socket/socket";
import { fixVietnameseFileName } from "../utils/fileName";

const getCurrentPeriodKey = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");

  return `${year}-${month}`;
};
const formatPeriodLabel = (periodKey) => {
  const [year, month] = periodKey.split("-");

  return `Tháng ${Number(month)}/${year}`;
};

const addMonth = (periodKey, amount) => {
  const [year, month] = periodKey.split("-").map(Number);

  const date = new Date(
    year,
    month - 1 + amount,
    1
  );

  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}`;
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

const getReportSourceLabel = (source) => {
  switch (source) {
    case "task_report":
      return "Báo cáo phòng ban";
    case "employee_report":
      return "Báo cáo cá nhân";
    default:
      return "Báo cáo";
  }
};

const getReportSourceColor = (source, isDark = false) => {
  switch (source) {
    case "task_report":
      return isDark
        ? "bg-blue-500/15 text-blue-300 border border-blue-500/30"
        : "bg-blue-100 text-blue-700";

    case "employee_report":
      return isDark
        ? "bg-purple-500/15 text-purple-300 border border-purple-500/30"
        : "bg-purple-100 text-purple-700";

    default:
      return isDark
        ? "bg-slate-800 text-gray-300 border border-slate-700"
        : "bg-gray-100 text-gray-700";
  }
};

const getReportTitle = (report) => {
  if (report.report_source === "employee_report") {
    return `Báo cáo cá nhân tháng ${report.period_key || ""}`;
  }

  return report.task_title || `Báo cáo phòng ban tháng ${report.period_key || ""}`;
};

const getViewUrl = (filePath, fileName) => {
  if (!filePath) return "#";

  return `${import.meta.env.VITE_API_URL}/api/files/view?path=${encodeURIComponent(
    filePath
  )}&name=${encodeURIComponent(
    fixVietnameseFileName(fileName || "file")
  )}`;
};

const getAverage = (items, key) => {
  if (!items.length) return 0;

  const total = items.reduce(
    (sum, item) => sum + Number(item[key] || 0),
    0
  );

  return Math.round(total / items.length);
};

export default function Reports() {
  const [reports, setReports] = useState([]);

const [reportPage, setReportPage] = useState(1);
const [reportPagination, setReportPagination] = useState({
  page: 1,
  limit: 2,
  total: 0,
  totalPages: 1,
});

const [monthlyDue, setMonthlyDue] = useState(null);

  const [monthlyKpi, setMonthlyKpi] = useState(null);
  const [loadingReports, setLoadingReports] = useState(false);
  const [loadingDue, setLoadingDue] = useState(false);

  const [activeTab, setActiveTab] = useState("overview");

  const [keyword, setKeyword] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [selectedPeriod, setSelectedPeriod] = useState(
  getCurrentPeriodKey()
);

  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);

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

  const [selectedReport, setSelectedReport] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [loadingTask, setLoadingTask] = useState(false);
  const [showMonthlyReportModal, setShowMonthlyReportModal] =
  useState(false);

const currentUser = JSON.parse(
  localStorage.getItem("user") || "{}"
);

const isAdmin =
  currentUser?.role === "admin" ||
  currentUser?.role_id === 1 ||
  currentUser?.roleId === 1;

const isLeader =
  currentUser?.role === "lanh_dao" ||
  currentUser?.role_id === 2 ||
  currentUser?.roleId === 2;

const isUnitManager =
  currentUser?.role === "truong_phong" ||
  currentUser?.role_id === 3 ||
  currentUser?.roleId === 3;

  const fetchReports = async () => {
  try {
    setLoadingReports(true);

    const res = await api.get("/task-reports", {
      params: {
        period_key: selectedPeriod,
        page: reportPage,
        limit: 10,
      },
    });

    setReports(Array.isArray(res.data?.data) ? res.data.data : []);

    setReportPagination(
      res.data?.pagination || {
        page: reportPage,
        limit: 10,
        total: 0,
        totalPages: 1,
      }
    );
  } catch (err) {
    console.error("FETCH REPORTS ERROR:", err);

    alert(
      err.response?.data?.message ||
        "Không thể tải danh sách báo cáo"
    );
  } finally {
    setLoadingReports(false);
  }
};

  const fetchDueReports = async () => {
  if (isAdmin) {
    setMonthlyDue(null);
    setLoadingDue(false);
    return;
  }

  try {
    setLoadingDue(true);

    const res = await api.get(
      `/task-reports/monthly/due?period_key=${selectedPeriod}`
    );

    setMonthlyDue(res.data || null);
  } catch (err) {
    console.error("FETCH MONTHLY DUE REPORT ERROR:", err);
    setMonthlyDue(null);
  } finally {
    setLoadingDue(false);
  }
};

const fetchMonthlyKpi = async () => {
  try {
    const res = await api.get(
  `/kpi/monthly-overview?period_key=${selectedPeriod}`
);
    setMonthlyKpi(res.data || null);
  } catch (err) {
    console.error("FETCH MONTHLY KPI ERROR:", err);
    setMonthlyKpi(null);
  }
};

  const refreshAll = async () => {
  await Promise.all([
    fetchReports(),
    fetchDueReports(),
    fetchMonthlyKpi(),
  ]);

  setLastUpdatedAt(new Date());
};

  const handleExportExcel = async () => {
  try {
    const res = await api.get(
  `/task-reports/export/excel?period_key=${selectedPeriod}`,
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
link.download = `bao-cao-tong-hop-${selectedPeriod}.xlsx`;

    document.body.appendChild(link);
    link.click();

    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (err) {
    console.error("EXPORT REPORTS EXCEL ERROR:", err);

    alert(
      err.response?.data?.message ||
        "Không thể xuất báo cáo Excel"
    );
  }
};

  useEffect(() => {
  refreshAll();
}, [selectedPeriod, reportPage]);
  
useEffect(() => {
  const handleReportRealtime = async (payload) => {
    console.log("REPORT REALTIME RECEIVED:", payload);
    await refreshAll();
  };

  socket.on("report:changed", handleReportRealtime);

  return () => {
    socket.off("report:changed", handleReportRealtime);
  };
}, [selectedPeriod, reportPage]);

  const openTaskDetail = async (taskId) => {
    if (!taskId) return;

    try {
      setLoadingTask(true);

      const res = await api.get(`/tasks/${taskId}`);

      setSelectedTask(res.data);
    } catch (err) {
      console.error("GET TASK DETAIL ERROR:", err);

      alert(
        err.response?.data?.message ||
          "Không thể tải chi tiết nhiệm vụ"
      );
    } finally {
      setLoadingTask(false);
    }
  };

  const filteredReports = useMemo(() => {
    return reports.filter((report) => {
      const searchText = `
        ${report.task_title || ""}
        ${report.reporter_name || ""}
        ${report.reporter_username || ""}
        ${report.unit_name || ""}
        ${report.noi_dung || ""}
        ${report.kho_khan || ""}
        ${report.de_xuat || ""}
        ${report.period_key || ""}
      `.toLowerCase();

      const matchKeyword = searchText.includes(
        keyword.toLowerCase()
      );

      const matchSource =
        sourceFilter === "all" ||
        report.report_source === sourceFilter;

      const matchMonth =
        report.period_key === selectedPeriod;

      return matchKeyword && matchSource && matchMonth;
    });
  }, [reports, keyword, sourceFilter, selectedPeriod]);

  const monthlyDueReports = useMemo(() => {
  const tasks = monthlyDue?.tasks || [];

  return tasks.filter((item) => {
    const searchText = `
      ${item.task_title || ""}
      ${item.unit_name || ""}
      ${item.status_name || ""}
      ${item.mo_ta || ""}
    `.toLowerCase();

    return searchText.includes(keyword.toLowerCase());
  });
}, [monthlyDue, keyword]);

  const taskReportCount = filteredReports.filter(
    (item) => item.report_source === "task_report"
  ).length;

  const employeeReportCount = filteredReports.filter(
    (item) => item.report_source === "employee_report"
  ).length;

  const dueTotal = monthlyDueReports.length;

const dueReported = monthlyDueReports.filter(
  (item) => item.is_unit_reported
).length;

const dueNotReported = dueTotal - dueReported;

  const overdueCount = monthlyDueReports.filter((item) => {
  return (
    isOverdueDate(item.han_chot) &&
    item.status_code !== "hoan_thanh"
  );
}).length;

  const averageProgress = getAverage(
    filteredReports,
    "ti_le_hoan_thanh"
  );

  const unitSummaries = useMemo(() => {
  const map = {};

  monthlyDueReports.forEach((item) => {
    const unitName = item.unit_name || "Chưa xác định";

    if (!map[unitName]) {
  map[unitName] = {
    unit_name: unitName,
    total_tasks: 0,
    completed_tasks: 0,
    processing_tasks: 0,
    overdue_tasks: 0,
    is_reported: false,
    report_status: "Chưa gửi báo cáo tháng",
  };
}

if (item.is_unit_reported) {
  map[unitName].is_reported = true;
  map[unitName].report_status = "Đã gửi báo cáo tháng";
}
    map[unitName].total_tasks += 1;

    if (item.status_code === "hoan_thanh") {
      map[unitName].completed_tasks += 1;
    } else {
      map[unitName].processing_tasks += 1;
    }

    if (
      isOverdueDate(item.han_chot) &&
      item.status_code !== "hoan_thanh"
    ) {
      map[unitName].overdue_tasks += 1;
    }
  });

  return Object.values(map);
}, [monthlyDueReports, monthlyDue]);

  const employeeSummaries = useMemo(() => {
    const employeeReports = filteredReports.filter(
      (item) => item.report_source === "employee_report"
    );

    const map = {};

    employeeReports.forEach((item) => {
      const name =
        item.reporter_name ||
        item.reporter_username ||
        "Chưa xác định";

      if (!map[name]) {
        map[name] = {
          reporter_name: name,
          unit_name: item.unit_name || "-",
          report_count: 0,
          total_progress: 0,
        };
      }

      map[name].report_count += 1;
      map[name].total_progress += Number(
        item.ti_le_hoan_thanh || 0
      );
    });

    return Object.values(map).map((item) => ({
      ...item,
      avg_progress:
        item.report_count > 0
          ? Math.round(item.total_progress / item.report_count)
          : 0,
    }));
  }, [filteredReports]);

  const tabs = [
    {
      key: "overview",
      label: "Tổng quan tháng",
    },
    {
      key: "units",
      label: "Theo phòng ban",
    },
    {
      key: "employees",
      label: "Báo cáo cá nhân",
    },
    {
      key: "tasks",
      label: "Nhiệm vụ trong tháng",
    },
    {
      key: "reports",
      label: "Báo cáo đã gửi",
    },
  ];

  const getStatusLabel = (status) => {
  switch (status) {
    case "cho_nhan_viec":
      return "Chờ nhận việc";
    case "cho_xac_nhan_don_vi":
      return "Chờ xác nhận đơn vị";
    case "da_giao_nhiem_vu":
      return "Đã giao nhiệm vụ";
    case "dang_thuc_hien":
      return "Đang thực hiện";
    case "cho_duyet":
      return "Chờ duyệt";
    case "yeu_cau_chinh_sua":
      return "Yêu cầu chỉnh sửa";
    case "hoan_thanh":
      return "Hoàn thành";
    default:
      return status || "-";
  }
};

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

const inputClass = `
  px-4 py-3
  rounded-2xl
  border
  outline-none
  focus:ring-2
  focus:ring-blue-400
  transition
  ${
    isDark
      ? "bg-slate-950 border-slate-700 text-gray-100 placeholder:text-gray-500"
      : "bg-white border-gray-200 text-gray-900 placeholder:text-gray-400"
  }
`;

const mutedTextClass = isDark ? "text-gray-400" : "text-gray-500";
const titleTextClass = isDark ? "text-gray-100" : "text-gray-900";

const actionButtonClass = `
  px-4 py-2
  rounded-xl
  text-sm
  font-semibold
  transition
  shrink-0
  ${
    isDark
      ? "bg-blue-600 text-white hover:bg-blue-700"
      : "bg-gray-900 text-white hover:bg-black"
  }
`;

  return (
    <div className={pageClass}>
      {/* HEADER */}
      <div className={`${panelClass} p-6`}>
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span
  className={`px-3 py-1 rounded-full text-xs font-semibold ${
    isDark
      ? "bg-blue-500/15 text-blue-300 border border-blue-500/30"
      : "bg-blue-50 text-blue-700"
  }`}
>
  Báo cáo tháng
</span>

<span
  className={`px-3 py-1 rounded-full text-xs font-semibold ${
    isDark
      ? "bg-green-500/15 text-green-300 border border-green-500/30"
      : "bg-green-50 text-green-700"
  }`}
>
  ● Đang đồng bộ
</span>
            </div>

            <h1 className={`text-2xl font-bold ${titleTextClass}`}>
              Tổng hợp báo cáo {formatPeriodLabel(selectedPeriod)}
            </h1>

            <p className={`text-sm mt-1 ${mutedTextClass}`}>
              Theo dõi nhiệm vụ, báo cáo phòng ban và báo cáo cá nhân theo tháng.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>
              Cập nhật lần cuối:{" "}
              <b className={isDark ? "text-gray-300" : "text-gray-600"}>
                {lastUpdatedAt
                  ? lastUpdatedAt.toLocaleTimeString("vi-VN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "-"}
              </b>
            </div>

            <button
              onClick={refreshAll}
              className={`
  px-4 py-2
  rounded-xl
  text-sm
  font-semibold
  transition
  ${
    isDark
      ? "bg-slate-800 text-gray-100 hover:bg-slate-700"
      : "bg-gray-900 text-white hover:bg-black"
  }
`}
            >
              ↻ Tải lại
            </button>
            
            <button
              onClick={handleExportExcel}
              className="px-4 py-2 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition"
            >
              Xuất Excel
            </button>

{isUnitManager &&
  selectedPeriod === getCurrentPeriodKey() &&
  monthlyDue &&
  !monthlyDue.is_reported && (
  <button
    onClick={() => setShowMonthlyReportModal(true)}
    disabled={!monthlyDue.can_submit || monthlyDueReports.length === 0}
    className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
  >
    {monthlyDue.can_submit
      ? "Lập báo cáo tháng của phòng"
      : "Chưa đến thời gian nộp"}
  </button>
)}

{isUnitManager && monthlyDue?.is_reported && monthlyDue.report && (
  <button
    onClick={async () => {
      try {
        const res = await api.get(
          `/task-reports/monthly/${monthlyDue.report.id}`
        );

        setSelectedReport({
          ...res.data,
          report_source: "task_report",
          task_title: "Báo cáo tháng của phòng ban",
          period_start: res.data.ky_bao_cao_tu,
          period_end: res.data.ky_bao_cao_den,
        });
      } catch (err) {
        alert(
          err.response?.data?.message ||
            "Không thể xem báo cáo tháng"
        );
      }
    }}
    className="px-4 py-2 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition"
  >
    Xem báo cáo tháng đã gửi
  </button>
)}
{isLeader && (
  <button
    onClick={() => {
      setActiveTab("reports");
      setSourceFilter("task_report");
    }}
    className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition"
  >
    Xem danh sách báo cáo phòng ban
  </button>
)}  
  </div>
        </div>
      </div>
      {/* MONTH NAVIGATOR */}
<div className={`${panelClass} p-4`}>
  <div
    className={`
  inline-flex
  items-center
  gap-2
  border
  rounded-2xl
  p-1.5
  ${
    isDark
      ? "bg-slate-950 border-slate-700"
      : "bg-gray-50 border-gray-200"
  }
`}
  >
    <button
  type="button"
  onClick={() => {
  setReportPage(1);
  setSelectedPeriod((prev) => addMonth(prev, -1));
}}
  className={`
    w-9 h-9
    rounded-xl
    flex
    items-center
    justify-center
    transition
    ${
      isDark
        ? "text-gray-300 hover:bg-slate-800"
        : "text-gray-600 hover:bg-white"
    }
  `}
  title="Tháng trước"
>
  ‹
</button>

    <div
      className="
        min-w-[150px]
        text-center
        px-4 py-2
        rounded-xl
        bg-blue-600
        text-white
        text-sm
        font-bold
      "
    >
      {formatPeriodLabel(selectedPeriod)}
    </div>

    <button
  type="button"
  onClick={() => {
  setReportPage(1);
  setSelectedPeriod((prev) => addMonth(prev, 1));
}}
  className={`
    w-9 h-9
    rounded-xl
    flex
    items-center
    justify-center
    transition
    ${
      isDark
        ? "text-gray-300 hover:bg-slate-800"
        : "text-gray-600 hover:bg-white"
    }
  `}
  title="Tháng sau"
>
  ›
</button>

    {selectedPeriod !== getCurrentPeriodKey() && (
      <button
        type="button"
        onClick={() => {
  setReportPage(1);
  setSelectedPeriod(getCurrentPeriodKey());
}}
        className={`
  px-3 py-2
  rounded-xl
  text-sm
  font-semibold
  transition
  ${
    isDark
      ? "text-gray-300 hover:bg-slate-800"
      : "text-gray-600 hover:bg-white"
  }
`}
      >
        Tháng hiện tại
      </button>
    )}
  </div>
</div>
      {/* FILTER */}
      <div className={`${panelClass} p-4`}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            value={keyword}
            onChange={(e) => {
  setReportPage(1);
  setKeyword(e.target.value);
}}
            placeholder="Tìm nhiệm vụ, phòng ban, người báo cáo, nội dung..."
            className={`md:col-span-2 ${inputClass}`}
          />
          <select
            value={sourceFilter}
            onChange={(e) => {
  setReportPage(1);
  setSourceFilter(e.target.value);
}}
            className={inputClass}
          >
            <option value="all">Tất cả báo cáo</option>
            <option value="task_report">Báo cáo phòng ban</option>
            <option value="employee_report">Báo cáo cá nhân</option>
          </select>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        <div className={`${panelClass} p-5`}>
          <p className={`text-sm ${isDark ? "text-gray-500" : "text-gray-400"}`}>Nhiệm vụ cần tổng hợp</p>
          <p className={`text-3xl font-bold mt-2 ${titleTextClass}`}>
            {dueTotal}
          </p>
        </div>

        <div className={`${panelClass} p-5`}>
          <p className={`text-sm ${isDark ? "text-gray-500" : "text-gray-400"}`}>Đã ghi nhận trong báo cáo</p>
          <p className="text-3xl font-bold text-green-600 mt-2">
            {dueReported}
          </p>
        </div>

        <div className={`${panelClass} p-5`}>
          <p className={`text-sm ${isDark ? "text-gray-500" : "text-gray-400"}`}>Chưa lập báo cáo tháng</p>
          <p className="text-3xl font-bold text-orange-600 mt-2">
            {dueNotReported}
          </p>
        </div>

        <div className={`${panelClass} p-5`}>
          <p className={`text-sm ${isDark ? "text-gray-500" : "text-gray-400"}`}>Quá hạn xử lý</p>
          <p className="text-3xl font-bold text-red-600 mt-2">
            {overdueCount}
          </p>
        </div>

        <div className={`${panelClass} p-5`}>
  <p className={`text-sm ${isDark ? "text-gray-500" : "text-gray-400"}`}>
    Tiến độ TB báo cáo
  </p>

  <p className="text-3xl font-bold text-blue-600 mt-2">
    {averageProgress}%
  </p>
</div>
      </div>
      <MonthlyKpiCard monthlyKpi={monthlyKpi} isDark={isDark} />

      {/* TABS */}
      <div className={`${panelClass} p-2 overflow-x-auto`}>
        <div className="flex gap-2 min-w-max">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-2xl text-sm font-semibold transition ${
  activeTab === tab.key
    ? isDark
      ? "bg-blue-600 text-white"
      : "bg-gray-900 text-white"
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

      {/* TAB CONTENT */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className={`xl:col-span-2 ${panelClass} p-6`}>
            <h2 className={`font-bold ${titleTextClass}`}>
              Tổng quan tình hình tháng
            </h2>

            <p className={`text-sm mt-2 leading-relaxed ${mutedTextClass}`}>
            Trong{" "}
            <b>
              {formatPeriodLabel(selectedPeriod)}
            </b>
            , hệ thống đang theo dõi{" "}
            <b>{dueTotal}</b> nhiệm vụ cần tổng hợp vào báo cáo tháng.
            {dueNotReported === 0 ? (
              <>
                {" "}Phòng ban đã gửi báo cáo tháng, trong đó có{" "}
                <b>{dueReported}</b> nhiệm vụ đã được ghi nhận.
              </>
            ) : (
              <>
                {" "}Một số phòng ban chưa lập báo cáo tháng, còn{" "}
                <b>{dueNotReported}</b> nhiệm vụ chưa được ghi nhận.
              </>
            )}
            {" "}Có <b>{overdueCount}</b> nhiệm vụ quá hạn xử lý.
          </p>

            <div className="mt-6 space-y-4">
              <ProgressRow
  isDark={isDark}
                label="Tỷ lệ nhiệm vụ đã ghi nhận trong báo cáo"
                value={
                  dueTotal > 0
                    ? Math.round((dueReported / dueTotal) * 100)
                    : 0
                }
              />

              <ProgressRow
  isDark={isDark}
                label="Tỷ lệ nhiệm vụ chưa lập báo cáo tháng"
                value={
                  dueTotal > 0
                    ? Math.round((dueNotReported / dueTotal) * 100)
                    : 0
                }
              />

              <ProgressRow
  isDark={isDark}
                label="Tiến độ trung bình theo báo cáo đã gửi"
                value={averageProgress}
              />
            </div>
          </div>

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
            <h2 className={`font-bold ${titleTextClass}`}>
  Báo cáo đã ghi nhận
</h2>

            <div className="mt-5 space-y-4">
              <MiniStat
                isDark={isDark}
                label="Báo cáo phòng ban"
                value={taskReportCount}
                className="text-blue-600"
              />

              <MiniStat
                isDark={isDark}
                label="Báo cáo cá nhân"
                value={employeeReportCount}
                className="text-purple-600"
              />

              <MiniStat
                isDark={isDark}
                label="Tổng báo cáo"
                value={filteredReports.length}
                className={isDark ? "text-gray-100" : "text-gray-900"}
              />
            </div>
          </div>
        </div>
      )}

      {activeTab === "units" && (
        <Card title="Tổng hợp theo phòng ban" isDark={isDark}>
          {loadingDue ? (
            <EmptyState text="Đang tải dữ liệu phòng ban..." />
          ) : unitSummaries.length === 0 ? (
            <EmptyState text="Chưa có dữ liệu phòng ban" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr
  className={`text-left border-b ${
    isDark ? "text-gray-400 border-slate-800" : "text-gray-400 border-gray-100"
  }`}
>
                    <th className="py-3 pr-4">Phòng ban</th>
                    <th className="py-3 pr-4">Tổng nhiệm vụ</th>
                    <th className="py-3 pr-4">Hoàn thành</th>
                    <th className="py-3 pr-4">Đang xử lý</th>
                    <th className="py-3 pr-4">Quá hạn</th>
                    <th className="py-3 pr-4">Trạng thái báo cáo</th>
                  </tr>
                </thead>

                <tbody>
  {unitSummaries.map((unit) => (
    <tr
  key={unit.unit_name}
  className={`border-b last:border-b-0 ${
    isDark ? "border-slate-800" : "border-gray-100"
  }`}
>
      <td
  className={`py-4 pr-4 font-semibold ${
    isDark ? "text-gray-100" : "text-gray-800"
  }`}
>
  {unit.unit_name}
</td>

      <td className="py-4 pr-4">
        {unit.total_tasks}
      </td>

      <td className="py-4 pr-4 text-green-600 font-semibold">
        {unit.completed_tasks}
      </td>

      <td className="py-4 pr-4 text-blue-600 font-semibold">
        {unit.processing_tasks}
      </td>

      <td className="py-4 pr-4 text-red-600 font-semibold">
        {unit.overdue_tasks}
      </td>

      <td className="py-4 pr-4">
        <span
  className={`px-3 py-1 rounded-full text-xs font-semibold ${
  unit.is_reported
    ? isDark
      ? "bg-green-500/15 text-green-300 border border-green-500/30"
      : "bg-green-100 text-green-700"
    : isDark
    ? "bg-orange-500/15 text-orange-300 border border-orange-500/30"
    : "bg-orange-100 text-orange-700"
}`}
>
  {unit.report_status}
</span>
      </td>
    </tr>
  ))}
</tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {activeTab === "employees" && (
        <Card title="Báo cáo cá nhân của cán bộ" isDark={isDark}>
          {employeeSummaries.length === 0 ? (
            <EmptyState text="Chưa có báo cáo cá nhân trong tháng được chọn" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr
  className={`text-left border-b ${
    isDark ? "text-gray-400 border-slate-800" : "text-gray-400 border-gray-100"
  }`}
>
                    <th className="py-3 pr-4">Cán bộ</th>
                    <th className="py-3 pr-4">Phòng ban</th>
                    <th className="py-3 pr-4">Số báo cáo</th>
                    <th className="py-3 pr-4">Tiến độ TB</th>
                  </tr>
                </thead>

                <tbody>
                  {employeeSummaries.map((employee) => (
                    <tr
  key={employee.reporter_name}
  className={`border-b last:border-b-0 ${
    isDark ? "border-slate-800" : "border-gray-100"
  }`}
>
                      <td
  className={`py-4 pr-4 font-semibold ${
    isDark ? "text-gray-100" : "text-gray-800"
  }`}
>
  {employee.reporter_name}
</td>
                      <td className={`py-4 pr-4 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
  {employee.unit_name}
</td>

<td className={`py-4 pr-4 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
  {employee.report_count}
</td>
                      <td className="py-4 pr-4">
                        <span className="font-semibold text-green-600">
                          {employee.avg_progress}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {activeTab === "tasks" && (
        <Card title="Nhiệm vụ trong tháng" isDark={isDark}>
          {loadingDue ? (
            <EmptyState text="Đang tải nhiệm vụ..." />
          ) : monthlyDueReports.length === 0 ? (
            <EmptyState text="Không có nhiệm vụ trong tháng" />
          ) : (
            <div className={isDark ? "divide-y divide-slate-800" : "divide-y divide-gray-100"}>
              {monthlyDueReports.map((item) => (
                <div
                  key={item.task_id}
                  className="py-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span
  className={`
    px-3 py-1
    rounded-full
    text-xs
    font-semibold
    ${
      isDark
        ? "bg-slate-800 text-gray-200"
        : "bg-gray-100 text-gray-700"
    }
  `}
>
  {item.status_name || getStatusLabel(item.status_code)}
</span>

                      <span
  className={`
    px-3 py-1
    rounded-full
    text-xs
    font-semibold
    ${
      isDark
        ? "bg-slate-800 text-gray-300"
        : "bg-gray-100 text-gray-600"
    }
  `}
>
  Báo cáo hằng tháng
</span>
                    </div>

                    <h3
  className={`font-bold line-clamp-1 ${
    isDark ? "text-gray-100" : "text-gray-900"
  }`}
>
  {item.task_title || "Không có tên nhiệm vụ"}
</h3>

                    <div
  className={`flex flex-wrap gap-3 mt-2 text-sm ${
    isDark ? "text-gray-400" : "text-gray-500"
  }`}
>
                      <span>
                        Phòng ban:{" "}
                        <b className={isDark ? "text-gray-300" : "text-gray-700"}>
                          {item.unit_name || "-"}
                        </b>
                      </span>

                      <span>
                        Hạn chót:{" "}
                        <b className={isDark ? "text-gray-300" : "text-gray-700"}>
                          {formatDate(item.han_chot)}
                        </b>
                      </span>
                    </div>

                    <p className={`text-sm mt-2 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                      {item.status_code === "hoan_thanh"
  ? "Đã hoàn thành trong kỳ báo cáo"
  : item.han_chot && new Date(item.han_chot) > new Date(monthlyDue?.period_end)
  ? "Nhiệm vụ chuyển tiếp sang tháng sau"
  : "Nhiệm vụ cần tổng hợp vào báo cáo tháng"}
                    </p>
                  </div>

                  <button
  onClick={() => openTaskDetail(item.task_id)}
  className={actionButtonClass}
>
  {loadingTask ? "Đang mở..." : "Xem nhiệm vụ"}
</button>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {activeTab === "reports" && (
        <Card title="Danh sách báo cáo đã gửi" isDark={isDark}>
          {loadingReports ? (
            <EmptyState text="Đang tải báo cáo..." />
          ) : filteredReports.length === 0 ? (
            <EmptyState text="Chưa có báo cáo nào" />
          ) : (
          <>
            <div className={isDark ? "divide-y divide-slate-800" : "divide-y divide-gray-100"}>
              {filteredReports.map((report) => (
                <div
                  key={`${report.report_source}-${report.id}`}
                  className="py-4 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${getReportSourceColor(
                          report.report_source,
                          isDark
                        )}`}
                      >
                        {getReportSourceLabel(report.report_source)}
                      </span>

                      <span
  className={`
    px-3 py-1
    rounded-full
    text-xs
    font-semibold
    ${
      isDark
        ? "bg-slate-800 text-gray-300"
        : "bg-gray-100 text-gray-600"
    }
  `}
>
  Tháng {report.period_key || "-"}
</span>

                      <span className="text-xs text-gray-400">
                        {formatDateTime(report.created_at)}
                      </span>
                    </div>

                    <h3
  className={`font-bold line-clamp-1 ${
    isDark ? "text-gray-100" : "text-gray-900"
  }`}
>
  {getReportTitle(report)}
</h3>

                    <div
  className={`flex flex-wrap gap-3 mt-3 text-sm ${
    isDark ? "text-gray-400" : "text-gray-500"
  }`}
>
                      <span>
                        Người báo cáo:{" "}
                        <b className={isDark ? "text-gray-300" : "text-gray-700"}>
                          {report.reporter_name ||
                            report.reporter_username ||
                            "-"}
                        </b>
                      </span>

                      <span>
                        Phòng ban:{" "}
                        <b className={isDark ? "text-gray-300" : "text-gray-700"}>
                          {report.unit_name || "-"}
                        </b>
                      </span>
                    </div>

                   <p
  className={`text-sm mt-3 line-clamp-2 ${
    isDark ? "text-gray-400" : "text-gray-600"
  }`}
>
  {report.noi_dung || "Chưa có nội dung báo cáo"}
</p>
                  </div>

                  <div className="flex flex-col items-start lg:items-end gap-3 shrink-0">
                    <div className="text-left lg:text-right">
                      <p className="text-xs text-gray-400">
                        Tiến độ
                      </p>

                      <p className="text-2xl font-bold text-green-600">
                        {report.ti_le_hoan_thanh || 0}%
                      </p>
                    </div>

                    <button
  onClick={async () => {
    try {
      if (
        report.report_source === "task_report" &&
        report.task_id === null
      ) {
        const res = await api.get(
          `/task-reports/monthly/${report.id}`
        );

        setSelectedReport({
          ...res.data,
          report_source: "task_report",
          task_title: "Báo cáo tháng của phòng ban",
          period_start: res.data.ky_bao_cao_tu,
          period_end: res.data.ky_bao_cao_den,
        });

        return;
      }

      if (report.report_source === "employee_report") {
        const res = await api.get(
          `/employee-reports/${report.id}`
        );

        setSelectedReport({
          ...res.data,
          report_source: "employee_report",
          task_title: `Báo cáo cá nhân tháng ${res.data.period_key || ""}`,
        });

        return;
      }

      setSelectedReport(report);
    } catch (err) {
      alert(
        err.response?.data?.message ||
          "Không thể xem chi tiết báo cáo"
      );
    }
  }}
  className={actionButtonClass}
>
  Xem báo cáo
</button>
                  </div>
                </div>
                   ))}
    </div>

    {reportPagination.totalPages > 1 && (
      <div
        className={`
          mt-5
          pt-4
          border-t
          flex
          items-center
          justify-between
          gap-3
          ${
            isDark
              ? "border-slate-800 text-gray-300"
              : "border-gray-100 text-gray-600"
          }
        `}
      >
        <button
          type="button"
          disabled={reportPage <= 1}
          onClick={() =>
            setReportPage((prev) => Math.max(prev - 1, 1))
          }
          className={`
            px-4 py-2
            rounded-xl
            text-sm
            font-semibold
            transition
            disabled:opacity-40
            disabled:cursor-not-allowed
            ${
              isDark
                ? "bg-slate-800 hover:bg-slate-700"
                : "bg-gray-100 hover:bg-gray-200"
            }
          `}
        >
          ‹ Trước
        </button>

        <div className="text-sm font-semibold">
          Trang {reportPagination.page}/{reportPagination.totalPages}
          <span className="ml-2 text-xs opacity-70">
            ({reportPagination.total} báo cáo)
          </span>
        </div>

        <button
          type="button"
          disabled={reportPage >= reportPagination.totalPages}
          onClick={() =>
            setReportPage((prev) =>
              Math.min(prev + 1, reportPagination.totalPages)
            )
          }
          className={`
            px-4 py-2
            rounded-xl
            text-sm
            font-semibold
            transition
            disabled:opacity-40
            disabled:cursor-not-allowed
            ${
              isDark
                ? "bg-slate-800 hover:bg-slate-700"
                : "bg-gray-100 hover:bg-gray-200"
            }
          `}
        >
          Sau ›
        </button>
      </div>
    )}
  </>
)}
</Card>
      )}

      {/* REPORT DETAIL MODAL */}
      {selectedReport && (
        <div
  className="
    fixed inset-0
    bg-black/50
    backdrop-blur-sm
    flex
    items-center
    justify-center
    z-[10001]
    px-4
  "
  onClick={() => setSelectedReport(null)}
>
  <div
    className={`
      w-[720px]
      max-w-[95vw]
      max-h-[90vh]
      overflow-y-auto
      rounded-3xl
      shadow-2xl
      p-6
      border
      ${
        isDark
          ? "bg-slate-900 border-slate-800 text-gray-100"
          : "bg-white border-gray-100 text-gray-900"
      }
    `}
    onClick={(e) => e.stopPropagation()}
  >
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <span
  className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${getReportSourceColor(
    selectedReport.report_source,
    isDark
  )}`}
>
  {getReportSourceLabel(selectedReport.report_source)}
</span>

                <h2
                  className={`text-xl font-bold mt-3 ${
                    isDark ? "text-gray-100" : "text-gray-900"
                  }`}
                >
                  {getReportTitle(selectedReport)}
                </h2>

                <p className={`text-sm mt-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                  Báo cáo tháng {selectedReport.period_key || "-"}
                </p>
              </div>

              <button
  onClick={() => setSelectedReport(null)}
  className={`
    w-10 h-10
    rounded-full
    transition
    shrink-0
    ${
      isDark
        ? "bg-slate-800 text-gray-400 hover:bg-red-950/40 hover:text-red-400"
        : "bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-500"
    }
  `}
>
  ✕
</button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <InfoBox
  isDark={isDark}
  label="Người báo cáo"
  value={
    selectedReport.reporter_name ||
    selectedReport.reporter_username ||
    "-"
  }
/>

              <InfoBox
              isDark={isDark}
                label="Phòng ban"
                value={selectedReport.unit_name || "-"}
              />

              <InfoBox
              isDark={isDark}
                label="Tháng báo cáo"
                value={selectedReport.period_key || "-"}
              />

              <InfoBox
              isDark={isDark}
                label="Tỉ lệ hoàn thành"
                value={`${selectedReport.ti_le_hoan_thanh || 0}%`}
                valueClassName="text-green-600"
              />

              <InfoBox
  isDark={isDark}
  label="Từ ngày"
  value={formatDate(
    selectedReport.period_start ||
      selectedReport.ky_bao_cao_tu
  )}
/>

<InfoBox
  isDark={isDark}
  label="Đến ngày"
  value={formatDate(
    selectedReport.period_end ||
      selectedReport.ky_bao_cao_den
  )}
/>
            </div>

            <div className="space-y-3">
              <TextBlock
              isDark={isDark}
                label="Nội dung báo cáo"
                value={selectedReport.noi_dung}
              />

              <TextBlock
              isDark={isDark}
                label="Khó khăn, vướng mắc"
                value={selectedReport.kho_khan}
              />

              <TextBlock
              isDark={isDark}
                label="Đề xuất, kiến nghị"
                value={selectedReport.de_xuat}
              />
            </div>

            {selectedReport.file_path && (
              <a
                href={getViewUrl(
                  selectedReport.file_path,
                  selectedReport.file_name
                )}
                target="_blank"
                rel="noreferrer"
                className="inline-flex mt-4 px-4 py-2 rounded-xl bg-blue-500 text-white text-sm font-semibold hover:bg-blue-600 transition"
              >
                Xem file đính kèm
              </a>
            )}
            {selectedReport.items?.length > 0 && (
 <div
  className={`
    mt-4
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
    <p className="text-xs text-gray-400 mb-3">
      Nhiệm vụ được tổng hợp trong báo cáo
    </p>

    <div className="space-y-3">
      {selectedReport.items.map((item) => (
        <div
          key={item.id}
          className={`
  rounded-xl
  border
  p-3
  ${
    isDark
      ? "bg-slate-900 border-slate-800"
      : "bg-white border-gray-100"
  }
`}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p
  className={`font-semibold ${
    isDark ? "text-gray-100" : "text-gray-800"
  }`}
>
  {item.subtask_title || item.task_title || "-"}
</p>

<p className="text-xs text-gray-500 mt-1">
  {item.subtask_title && item.task_title
    ? `Thuộc nhiệm vụ: ${item.task_title} · `
    : ""}
  Trạng thái:{" "}
  {getStatusLabel(
    item.subtask_status || item.status_snapshot
  )}
  {item.deadline_snapshot
    ? ` · Hạn: ${formatDate(item.deadline_snapshot)}`
    : ""}
</p>
            </div>

            <span className="text-xs px-3 py-1 rounded-full bg-blue-50 text-blue-700 font-semibold">
              {item.progress_snapshot || 0}%
            </span>
          </div>

          {item.note && (
            <p
  className={`text-sm mt-2 ${
    isDark ? "text-gray-400" : "text-gray-600"
  }`}
>
              Ghi chú: {item.note}
            </p>
          )}
        </div>
      ))}
    </div>
  </div>
)}
          </div>
        </div>
      )}
      {showMonthlyReportModal && (
  <MonthlyUnitReportModal
  isDark={isDark}
  monthlyDue={monthlyDue}
  tasks={monthlyDueReports}
  onClose={() => setShowMonthlyReportModal(false)}
  onSubmitted={async () => {
    setShowMonthlyReportModal(false);
    await refreshAll();
  }}
/>
)}
      {/* TASK DETAIL MODAL */}
      {selectedTask && (
        <div
  className="
    fixed inset-0
    bg-black/50
    backdrop-blur-sm
    flex
    items-center
    justify-center
    z-[10001]
    px-4
  "
  onClick={() => setSelectedTask(null)}
>
  <div
    className={`
      w-[760px]
      max-w-[95vw]
      max-h-[90vh]
      overflow-y-auto
      rounded-3xl
      shadow-2xl
      p-6
      border
      ${
        isDark
          ? "bg-slate-900 border-slate-800 text-gray-100"
          : "bg-white border-gray-100 text-gray-900"
      }
    `}
    onClick={(e) => e.stopPropagation()}
  >
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <span
  className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${
    isDark
      ? "bg-blue-500/15 text-blue-300 border border-blue-500/30"
      : "bg-blue-100 text-blue-700"
  }`}
>
  Chi tiết nhiệm vụ
</span>

                <h2
  className={`text-xl font-bold mt-3 ${
    isDark ? "text-gray-100" : "text-gray-900"
  }`}
>
  {selectedTask.tieu_de || "Nhiệm vụ"}
</h2>

                <p className={`text-sm mt-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                  Phòng ban:{" "}
                  <b className={isDark ? "text-gray-300" : "text-gray-700"}>
  {selectedTask.unit_name || "-"}
</b>
                </p>
              </div>

              <button
  onClick={() => setSelectedTask(null)}
  className={`
    w-10 h-10
    rounded-full
    transition
    shrink-0
    ${
      isDark
        ? "bg-slate-800 text-gray-400 hover:bg-red-950/40 hover:text-red-400"
        : "bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-500"
    }
  `}
>
  ✕
</button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <InfoBox
              isDark={isDark}
                label="Trạng thái"
                value={
                  selectedTask.status_name ||
                  selectedTask.status_code ||
                  "-"
                }
              />

              <InfoBox
              isDark={isDark}
                label="Hạn chót"
                value={formatDate(selectedTask.han_chot)}
              />

              <InfoBox
              isDark={isDark}
                label="Người thực hiện"
                value={selectedTask.assignee_name || "-"}
              />

              <InfoBox
              isDark={isDark}
                label="Mã nhiệm vụ"
                value={`#${selectedTask.id}`}
              />
            </div>

            <TextBlock
            isDark={isDark}
              label="Mô tả nhiệm vụ"
              value={selectedTask.mo_ta}
            />

            {selectedTask.documents?.length > 0 && (
              <div
  className={`
    mt-4
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
                <p className="text-xs text-gray-400 mb-3">
                  Văn bản liên quan
                </p>

                <div className="space-y-2">
                  {selectedTask.documents.map((doc) => (
                    <div
                      key={doc.id}
                      className={`
  rounded-xl
  border
  p-3
  ${
    isDark
      ? "bg-slate-900 border-slate-800"
      : "bg-white border-gray-100"
  }
`}
                    >
                      <p
  className={`font-semibold ${
    isDark ? "text-gray-100" : "text-gray-800"
  }`}
>
                        {doc.tieu_de || "-"}
                      </p>

                      <p className="text-xs text-gray-500 mt-1">
                        Số ký hiệu: {doc.so_ky_hieu || "-"}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
function MonthlyUnitReportModal({
  isDark,
  monthlyDue,
  tasks,
  onClose,
  onSubmitted,
}) {
  const [noiDung, setNoiDung] = useState("");
  const [khoKhan, setKhoKhan] = useState("");
  const [deXuat, setDeXuat] = useState("");
  const [itemNotes, setItemNotes] = useState({});
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const modalInputClass = `
  w-full
  px-4 py-3
  rounded-2xl
  border
  outline-none
  focus:ring-2
  focus:ring-blue-400
  transition
  ${
    isDark
      ? "bg-slate-950 border-slate-700 text-gray-100 placeholder:text-gray-500"
      : "bg-white border-gray-200 text-gray-900 placeholder:text-gray-400"
  }
`;

const modalFileInputClass = `
  w-full
  px-4 py-3
  rounded-2xl
  border
  text-sm
  transition
  ${
    isDark
      ? "bg-slate-950 border-slate-700 text-gray-300 file:bg-slate-800 file:text-gray-200 file:border-0 file:rounded-lg file:px-3 file:py-1.5 file:mr-3"
      : "bg-white border-gray-200 text-gray-700 file:bg-gray-100 file:text-gray-700 file:border-0 file:rounded-lg file:px-3 file:py-1.5 file:mr-3"
  }
`;
  
  const averageProgress =
    tasks.length > 0
      ? Math.round(
          tasks.reduce(
            (sum, item) =>
              sum + Number(item.progress_snapshot || 0),
            0
          ) / tasks.length
        )
      : 0;

  const handleSubmit = async () => {
    if (!noiDung.trim()) {
      alert("Vui lòng nhập nội dung báo cáo");
      return;
    }

    try {
      setSubmitting(true);

      const formData = new FormData();

      formData.append("noi_dung", noiDung.trim());
      formData.append("kho_khan", khoKhan.trim());
      formData.append("de_xuat", deXuat.trim());

      formData.append(
        "task_ids",
        JSON.stringify(tasks.map((item) => item.task_id))
      );

      formData.append(
        "item_notes",
        JSON.stringify(itemNotes)
      );

      if (file) {
        formData.append("file", file);
      }

      await api.post("/task-reports/monthly", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      alert("Đã gửi báo cáo tháng của phòng");

      await onSubmitted();
    } catch (err) {
      alert(
        err.response?.data?.message ||
          "Không thể gửi báo cáo tháng của phòng"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
  className="
    fixed inset-0
    bg-black/50
    backdrop-blur-sm
    flex
    items-center
    justify-center
    z-[10001]
    px-4
  "
  onClick={onClose}
>
  <div
    className={`
      w-[860px]
      max-w-[96vw]
      max-h-[92vh]
      overflow-y-auto
      rounded-3xl
      shadow-2xl
      p-6
      border
      ${
        isDark
          ? "bg-slate-900 border-slate-800 text-gray-100"
          : "bg-white border-gray-100 text-gray-900"
      }
    `}
    onClick={(e) => e.stopPropagation()}
  >
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <span
  className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${
    isDark
      ? "bg-blue-500/15 text-blue-300 border border-blue-500/30"
      : "bg-blue-100 text-blue-700"
  }`}
>
  Báo cáo tháng của phòng ban
</span>

            <h2
  className={`text-xl font-bold mt-3 ${
    isDark ? "text-gray-100" : "text-gray-900"
  }`}
>
  Lập báo cáo tháng {monthlyDue?.period_key || ""}
</h2>

            <p className={`text-sm mt-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
              Tổng hợp {tasks.length} nhiệm vụ trong tháng. Tiến độ trung bình:{" "}
              <b>{averageProgress}%</b>
            </p>
          </div>

          <button
  onClick={onClose}
  className={`
    w-10 h-10
    rounded-full
    transition
    ${
      isDark
        ? "bg-slate-800 text-gray-400 hover:bg-red-950/40 hover:text-red-400"
        : "bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-500"
    }
  `}
>
  ✕
</button>
        </div>

        <div className="space-y-4">
          <textarea
            value={noiDung}
            onChange={(e) => setNoiDung(e.target.value)}
            rows={4}
            placeholder="Nội dung báo cáo tháng của phòng..."
            className={modalInputClass}
          />

          <textarea
            value={khoKhan}
            onChange={(e) => setKhoKhan(e.target.value)}
            rows={3}
            placeholder="Khó khăn, vướng mắc nếu có..."
            className={modalInputClass}
          />

          <textarea
            value={deXuat}
            onChange={(e) => setDeXuat(e.target.value)}
            rows={3}
            placeholder="Đề xuất, kiến nghị nếu có..."
            className={modalInputClass}
          />

          <input
  type="file"
  onChange={(e) => setFile(e.target.files?.[0] || null)}
  className={modalFileInputClass}
/>

          <div
  className={`
    rounded-2xl
    border
    divide-y
    ${
      isDark
        ? "border-slate-800 divide-slate-800"
        : "border-gray-100 divide-gray-100"
    }
  `}
>
            {tasks.map((task) => (
              <div key={task.task_id} className="p-4">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                  <div>
                    <p
  className={`font-semibold ${
    isDark ? "text-gray-100" : "text-gray-900"
  }`}
>
  {task.task_title}
</p>

                    <p className="text-xs text-gray-400 mt-1">
                      Trạng thái: {task.status_name || task.status_code} · Hạn:{" "}
                      {formatDate(task.han_chot)}
                    </p>
                  </div>

                  <span
  className={`
    text-xs
    px-3 py-1
    rounded-full
    font-semibold
    ${
      isDark
        ? "bg-slate-800 text-gray-200"
        : "bg-gray-100 text-gray-700"
    }
  `}
>
  {task.progress_snapshot || 0}%
</span>
                </div>

                <textarea
                  value={itemNotes[task.task_id] || ""}
                  onChange={(e) =>
                    setItemNotes((prev) => ({
                      ...prev,
                      [task.task_id]: e.target.value,
                    }))
                  }
                  rows={2}
                  placeholder="Ghi chú riêng cho nhiệm vụ này nếu có..."
                  className={`mt-3 ${modalInputClass}`}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
  onClick={onClose}
  disabled={submitting}
  className={`
    px-4 py-2
    rounded-xl
    transition
    disabled:opacity-60
    ${
      isDark
        ? "bg-slate-800 text-gray-200 hover:bg-slate-700"
        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
    }
  `}
>
  Hủy
</button>

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-5 py-2 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition disabled:bg-gray-300"
          >
            {submitting ? "Đang gửi..." : "Gửi báo cáo tháng"}
          </button>
        </div>
      </div>
    </div>
  );
}


function Card({ title, children, isDark }) {
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

function MiniStat({ label, value, className = "", isDark }) {
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
      <p className={`text-sm ${isDark ? "text-gray-500" : "text-gray-400"}`}>
        {label}
      </p>

      <p className={`text-2xl font-bold mt-1 ${className}`}>
        {value}
      </p>
    </div>
  );
}

function MonthlyKpiCard({ monthlyKpi, isDark }) {
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
          <p
  className={`text-xs font-semibold px-3 py-1 rounded-full w-fit mb-3 ${
    isDark
      ? "bg-purple-500/15 text-purple-300 border border-purple-500/30"
      : "bg-purple-50 text-purple-600"
  }`}
>
  KPI tháng {monthlyKpi.period_key}
</p>

          <h2
  className={`text-xl font-bold ${
    isDark ? "text-gray-100" : "text-gray-900"
  }`}
>
            Đánh giá hiệu quả thực hiện nhiệm vụ tháng
          </h2>

          <p className={`text-sm mt-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
            Tính theo tỷ lệ hoàn thành, đúng hạn, tiến độ xử lý và minh chứng thực hiện nhiệm vụ.
          </p>
        </div>

        <div className="text-left lg:text-right">
          <p className="text-4xl font-bold text-purple-600">
            {monthlyKpi.scores.total_score}
          </p>

          <p
  className={`text-sm font-semibold mt-1 ${
    isDark ? "text-gray-300" : "text-gray-700"
  }`}
>
            {monthlyKpi.level}
          </p>

          <p className="text-xs text-gray-400 mt-1">
            Thang điểm 100
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiMiniBox
         isDark={isDark}
          label="Hoàn thành"
          value={`${monthlyKpi.scores.completion_score}/40`}
          sub={`${monthlyKpi.rates.completion_rate}%`}
          subClassName="text-green-600"
        />

        <KpiMiniBox
         isDark={isDark}
          label="Đúng hạn"
          value={`${monthlyKpi.scores.on_time_score}/30`}
          sub={`${monthlyKpi.rates.on_time_rate}%`}
          subClassName="text-blue-600"
        />

        <KpiMiniBox
         isDark={isDark}
          label="Tiến độ"
          value={`${monthlyKpi.scores.progress_score}/20`}
          sub={`TB ${monthlyKpi.summary.avg_progress}%`}
          subClassName="text-purple-600"
        />

        <KpiMiniBox
         isDark={isDark}
          label="Minh chứng xử lý"
          value={`${monthlyKpi.scores.report_score}/10`}
          sub={`${monthlyKpi.rates.report_rate}%`}
          subClassName="text-orange-600"
        />
      </div>

      <div className="mt-5">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Tổng điểm KPI tháng</span>
          <span>{monthlyKpi.scores.total_score}/100</span>
        </div>

        <div
  className={`h-3 rounded-full overflow-hidden ${
    isDark ? "bg-slate-800" : "bg-gray-100"
  }`}
>
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
}) {
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
    <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>
      {label}
    </p>

    <p
      className={`text-lg font-bold mt-2 ${
        isDark ? "text-gray-100" : "text-gray-900"
      }`}
    >
      {value}
    </p>

    <p className={`text-xs mt-1 ${subClassName}`}>
      {sub}
    </p>
  </div>
);
}


function ProgressRow({ label, value, isDark }) {
  return (
  <div>
    <div className="flex items-center justify-between text-sm mb-2">
      <span className={isDark ? "text-gray-400" : "text-gray-500"}>
        {label}
      </span>

      <span
        className={`font-semibold ${
          isDark ? "text-gray-200" : "text-gray-800"
        }`}
      >
        {value}%
      </span>
    </div>

    <div
      className={`w-full h-2 rounded-full overflow-hidden ${
        isDark ? "bg-slate-800" : "bg-gray-100"
      }`}
    >
      <div
        className={`h-full rounded-full ${
          isDark ? "bg-blue-500" : "bg-gray-900"
        }`}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  </div>
);
}

function InfoBox({
  label,
  value,
  valueClassName,
  isDark,
}) {
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
    <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>
      {label}
    </p>

    <p
      className={`font-semibold mt-1 ${
        valueClassName ||
        (isDark ? "text-gray-100" : "text-gray-800")
      }`}
    >
      {value || "-"}
    </p>
  </div>
);
}

function TextBlock({ label, value, isDark }) {
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
    <p className={`text-xs mb-2 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
      {label}
    </p>

    <p
      className={`text-sm whitespace-pre-wrap leading-relaxed ${
        isDark ? "text-gray-300" : "text-gray-700"
      }`}
    >
      {value || "-"}
    </p>
  </div>
);
}