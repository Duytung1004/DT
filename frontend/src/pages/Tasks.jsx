import { useEffect, useState, useRef } from "react";
import api from "../services/api";
import { hasPermission } from "../utils/permission";
import {
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import TaskDetailModal from "../components/dashboard/TaskDetailModal";
import socket from "../socket/socket";
  
import {
  getStatusLabel,
} from "../utils/statusLabel";

import {
  getStatusColor,
} from "../utils/statusColor";
import {
  getPriorityLabel,
  getPriorityColor,
  getPriorityDotColor,
} from "../utils/priorityColor";

const getFilterOptions = (user) => {
  if (user.role === "lanh_dao") {
    return [
      {
        label: "Tất cả",
        value: "all",
      },
      {
        label: "Chờ đơn vị xác nhận",
        value: "cho_xac_nhan_don_vi",
      },
      {
        label: "Đơn vị đã tiếp nhận",
        value: "da_giao_nhiem_vu",
      },
      {
        label: "Đã phân công cán bộ",
        value: "cho_nhan_viec",
      },
      {
        label: "Đang thực hiện",
        value: "dang_thuc_hien",
      },
      {
        label: "Chờ trưởng phòng duyệt",
        value: "cho_duyet_cap_1",
      },
      {
        label: "Chờ lãnh đạo duyệt",
        value: "cho_duyet_cap_2",
      },
      {
        label: "Yêu cầu chỉnh sửa",
        value: "yeu_cau_chinh_sua",
      },
      {
        label: "Hoàn thành",
        value: "hoan_thanh",
      },
      {
        label: "Quá hạn",
        value: "qua_han",
      },
    ];
  }

  if (user.role === "truong_phong") {
    return [
      {
        label: "Tất cả",
        value: "all",
      },
      {
        label: "Nhiệm vụ mới cần tiếp nhận",
        value: "cho_xac_nhan_don_vi",
      },
      {
        label: "Đã tiếp nhận",
        value: "da_giao_nhiem_vu",
      },
      {
        label: "Chờ nhân viên nhận",
        value: "cho_nhan_viec",
      },
      {
        label: "Đang thực hiện",
        value: "dang_thuc_hien",
      },
      {
        label: "Chờ duyệt phần việc",
        value: "cho_duyet",
      },
      {
        label: "Chờ trưởng phòng duyệt",
        value: "cho_duyet_cap_1",
      },
      {
        label: "Đã duyệt, chờ lãnh đạo",
        value: "cho_duyet_cap_2",
      },
      {
        label: "Yêu cầu chỉnh sửa",
        value: "yeu_cau_chinh_sua",
      },
      {
        label: "Hoàn thành",
        value: "hoan_thanh",
      },
      {
        label: "Quá hạn",
        value: "qua_han",
      },
    ];
  }

  if (user.role === "nhan_vien") {
    return [
      {
        label: "Tất cả",
        value: "all",
      },
      {
        label: "Nhiệm vụ mới",
        value: "cho_nhan_viec",
      },
      {
        label: "Đang thực hiện",
        value: "dang_thuc_hien",
      },
      {
        label: "Đã nộp phần việc",
        value: "cho_duyet",
      },
      {
        label: "Chờ trưởng phòng duyệt",
        value: "cho_duyet_cap_1",
      },
      {
        label: "Chờ lãnh đạo duyệt",
        value: "cho_duyet_cap_2",
      },
      {
        label: "Cần chỉnh sửa",
        value: "yeu_cau_chinh_sua",
      },
      {
        label: "Hoàn thành",
        value: "hoan_thanh",
      },
      {
        label: "Quá hạn",
        value: "qua_han",
      },
    ];
  }

  return [
    {
      label: "Tất cả",
      value: "all",
    },
  ];
};


const getCurrentMonth = () => {
  const now = new Date();

  return `${now.getFullYear()}-${String(
    now.getMonth() + 1
  ).padStart(2, "0")}`;
};

const formatMonthLabel = (monthValue) => {
  const [year, month] = monthValue.split("-");

  return `Tháng ${Number(month)}/${year}`;
};

const addMonth = (monthValue, amount) => {
  const [year, month] = monthValue
    .split("-")
    .map(Number);

  const date = new Date(
    year,
    month - 1 + amount,
    1
  );

  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}`;
};

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [focusSubtasks, setFocusSubtasks] = useState(false);
  const [filter, setFilter] = useState("all");
  const [searchText, setSearchText] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(
  getCurrentMonth()
);

 const [sortConfig, setSortConfig] = useState({
  key: "priority_score",
  direction: "desc",
});
  const [showFilters, setShowFilters] = useState(false);

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

  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState([]);

  const [user, setUser] = useState(
  JSON.parse(localStorage.getItem("user")) || {}
);

const navigate = useNavigate();
const [searchParams] = useSearchParams();

const canViewTasks =
  hasPermission(user, "task:view_all") ||
  hasPermission(user, "task:view_unit") ||
  hasPermission(user, "task:view_own");

const canCreateTask =
  hasPermission(user, "task:create");

const canDeleteTask =
  hasPermission(user, "task:delete");


    // =====================
  // LOAD TASK
  // =====================
  const fetchTasks = async () => {
  try {
    const res = await api.get(
      `/tasks?month=${selectedMonth}`
    );

    setTasks(res.data);
  } catch (err) {
    console.error(err);
  }
};

useEffect(() => {
  const syncUser = () => {
    setUser(
      JSON.parse(localStorage.getItem("user")) || {}
    );
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

  const filterOptions = getFilterOptions(user);
  const filterVideoRef = useRef(null);

useEffect(() => {
  if (canViewTasks) {
    fetchTasks();
  }
}, [canViewTasks, selectedMonth]);
useEffect(() => {
  if (!canViewTasks) return;

  const taskId = searchParams.get("taskId");

  if (!taskId) return;

  const openTaskFromQuery = async () => {
    try {
      const res = await api.get(`/tasks/${taskId}`);

      setFocusSubtasks(false);
      setSelectedTask(res.data);
    } catch (err) {
      console.error("OPEN TASK FROM QUERY ERROR:", err);

      alert(
        err.response?.data?.message ||
          "Không tải được chi tiết nhiệm vụ"
      );
    }
  };

  openTaskFromQuery();
}, [canViewTasks, searchParams]);

useEffect(() => {
  if (!canViewTasks) return;

  const openTaskFromNotification = () => {
    const raw = localStorage.getItem(
      "openTaskFromNotification"
    );

    if (!raw) return;

    try {
      const data = JSON.parse(raw);

      localStorage.removeItem(
        "openTaskFromNotification"
      );

      if (!data?.taskId) return;

      handleOpenTask(data.taskId, {
        focusSubtasks: Boolean(data.focusSubtasks),
      });
    } catch (err) {
      console.error(
        "OPEN TASK FROM NOTIFICATION ERROR:",
        err
      );

      localStorage.removeItem(
        "openTaskFromNotification"
      );
    }
  };

  openTaskFromNotification();

  window.addEventListener(
    "open-task-from-notification",
    openTaskFromNotification
  );

  return () => {
    window.removeEventListener(
      "open-task-from-notification",
      openTaskFromNotification
    );
  };
}, [canViewTasks]);

useEffect(() => {
  if (!canViewTasks) return;

  const handleTaskRealtime = async (payload) => {
    console.log("TASK REALTIME RECEIVED:", payload);

    await fetchTasks();

    if (
      selectedTask?.id &&
      Number(payload?.taskId) === Number(selectedTask.id)
    ) {
      try {
        const res = await api.get(`/tasks/${selectedTask.id}`);
        setSelectedTask(res.data);
      } catch (err) {
        console.log("REFRESH SELECTED TASK ERROR:", err);
      }
    }
  };

  socket.on("task:changed", handleTaskRealtime);

  return () => {
    socket.off("task:changed", handleTaskRealtime);
  };
}, [canViewTasks, selectedTask?.id]);

  if (!canViewTasks) {
  return (
    <div
      className={`
        p-6
        min-h-full
        ${
          isDark
            ? "bg-slate-950 text-gray-100"
            : "bg-gray-100 text-gray-900"
        }
      `}
    >
      <div
        className={`
          rounded-2xl
          p-6
          shadow-sm
          border
          ${
            isDark
              ? "bg-slate-900 border-slate-800"
              : "bg-white border-gray-100"
          }
        `}
      >
        <h2 className={`text-lg font-bold ${isDark ? "text-gray-100" : "text-gray-900"}`}>
          Không có quyền xem nhiệm vụ
        </h2>

        <p className={`text-sm mt-2 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
          Tài khoản của bạn chưa được cấp quyền task:view_all, task:view_unit hoặc task:view_own.
        </p>
      </div>
    </div>
  );
}

  const handleOpenTask = async (
  taskId,
  options = {}
) => {
  try {
    const res = await api.get(`/tasks/${taskId}`);

    setFocusSubtasks(Boolean(options.focusSubtasks));
    setSelectedTask(res.data);
  } catch (err) {
    console.error("GET TASK DETAIL ERROR:", err);

    alert(
      err.response?.data?.message ||
        "Không tải được chi tiết nhiệm vụ"
    );
  }
};

  

  // =====================
  // FILTER + SORT
  // =====================
  const filteredTasks = tasks
    .filter((t) => {
      const displayStatus =
  t.display_status_code || t.status_code;

  const matchFilter =
    filter === "all" || displayStatus === filter;

      const keyword = searchText.trim().toLowerCase();

      const matchSearch =
        keyword === "" ||
        t.tieu_de?.toLowerCase().includes(keyword) ||
        t.mo_ta?.toLowerCase().includes(keyword) ||
        t.unit_name?.toLowerCase().includes(keyword) ||
        t.assignee_name?.toLowerCase().includes(keyword);

      return matchFilter && matchSearch;
    })
    .sort((a, b) => {
      const { key, direction } = sortConfig;

      let valueA = a[key];
      let valueB = b[key];
      if (key === "display_status_code") {
  valueA = a.display_status_code || a.status_code;
  valueB = b.display_status_code || b.status_code;
}

      if (key === "han_chot") {
  valueA = valueA ? new Date(valueA).getTime() : 0;
  valueB = valueB ? new Date(valueB).getTime() : 0;
} else if (key === "priority_score") {
  valueA = Number(valueA || 0);
  valueB = Number(valueB || 0);
} else {
  valueA = valueA
    ? valueA.toString().toLowerCase()
    : "";
  valueB = valueB
    ? valueB.toString().toLowerCase()
    : "";
}

      if (valueA < valueB) {
        return direction === "asc" ? -1 : 1;
      }

      if (valueA > valueB) {
        return direction === "asc" ? 1 : -1;
      }

      return 0;
    });

  // =====================
  // SORT
  // =====================
  const handleSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return {
          key,
          direction:
            prev.direction === "asc" ? "desc" : "asc",
        };
      }

      return {
        key,
        direction: "asc",
      };
    });
  };

  const SortIcon = ({ column }) => {
    const isActive = sortConfig.key === column;
    const isAsc = sortConfig.direction === "asc";
    const isDesc = sortConfig.direction === "desc";

    return (
      <span className="flex flex-col items-center justify-center gap-[2px] ml-1">
        <span
          className={`
            w-0 h-0
            border-l-[5px]
            border-r-[5px]
            border-b-[7px]
            border-l-transparent
            border-r-transparent
            ${
              isActive && isAsc
                ? "border-b-blue-500"
                : "border-b-gray-300"
            }
          `}
        />

        <span
          className={`
            w-0 h-0
            border-l-[5px]
            border-r-[5px]
            border-t-[7px]
            border-l-transparent
            border-r-transparent
            ${
              isActive && isDesc
                ? "border-t-blue-500"
                : "border-t-gray-300"
            }
          `}
        />
      </span>
    );
  };

  // =====================
  // DELETE MODE
  // =====================
  const toggleSelectTask = (taskId) => {
    setSelectedTaskIds((prev) => {
      if (prev.includes(taskId)) {
        return prev.filter((id) => id !== taskId);
      }

      return [...prev, taskId];
    });
  };

  const toggleSelectAll = () => {
    const visibleIds = filteredTasks.map((task) => task.id);

    const isAllSelected =
      visibleIds.length > 0 &&
      visibleIds.every((id) =>
        selectedTaskIds.includes(id)
      );

    if (isAllSelected) {
      setSelectedTaskIds((prev) =>
        prev.filter((id) => !visibleIds.includes(id))
      );
    } else {
      setSelectedTaskIds((prev) => [
        ...new Set([...prev, ...visibleIds]),
      ]);
    }
  };

  const handleDeleteSelectedTasks = async () => {
    if (selectedTaskIds.length === 0) {
      alert("Vui lòng chọn nhiệm vụ cần xóa");
      return;
    }

    const confirmDelete = window.confirm(
      `Bạn có chắc muốn xóa ${selectedTaskIds.length} nhiệm vụ đã chọn không?`
    );

    if (!confirmDelete) return;

    try {
      await Promise.all(
        selectedTaskIds.map((id) =>
          api.delete(`/tasks/${id}`)
        )
      );

      alert("Đã xóa nhiệm vụ đã chọn");

      setSelectedTaskIds([]);
      setDeleteMode(false);

      await fetchTasks();
    } catch (err) {
      console.error("DELETE TASKS ERROR:", err);

      alert(
        err.response?.data?.message ||
          "Xóa nhiệm vụ thất bại"
      );
    }
  };

  // =====================
  // APPROVE
  // =====================
const handleApprove = async (decision, note = "") => {
  try {
    await api.post(`/tasks/${selectedTask.id}/approve`, {
      quyet_dinh: decision,
      ghi_chu: note,
    });

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
  // =====================
  // UI
  // =====================
  return (
      <div
        className={`
          p-4
          sm:p-6
          min-h-full
          transition-colors
          duration-300
          ${
            isDark
              ? "bg-slate-950 text-gray-100"
              : "bg-gray-100 text-gray-900"
          }
        `}
      >

      {/* HEADER */}
<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
    <h1
      className={`
        text-xl
        font-bold
        flex
        items-center
        gap-2
        ${isDark ? "text-gray-100" : "text-gray-900"}
      `}
    >
    <img
      src="/icons/tasks-list-svgrepo-com.svg"
      alt="Task icon"
      className="w-6 h-6 object-contain opacity-80"
    />

    Danh sách nhiệm vụ
  </h1>

  <div className="flex items-center gap-3">
    {/* SEARCH */}
<div
  className={`
    relative
    flex
    items-center
    transition-all
    duration-500
    ease-in-out
    ${
      showSearch
        ? "w-[280px]"
        : "w-11"
    }
  `}
>
  <div
    className={`
        flex
        items-center
        border
        shadow-sm
        overflow-hidden
        transition-all
        duration-500
        ease-in-out
        ${
          isDark
            ? "bg-slate-900 border-slate-800"
            : "bg-white border-gray-200"
        }
        ${
          showSearch
            ? "w-[280px] rounded-full pl-4 pr-2"
            : "w-11 h-11 rounded-full justify-center"
        }
      `}
    >
    {showSearch && (
      <input
        autoFocus
        value={searchText}
        onChange={(e) =>
          setSearchText(e.target.value)
        }
        placeholder="Tìm nhiệm vụ..."
        className={`
          flex-1
          h-11
          bg-transparent
          outline-none
          text-sm
          ${
            isDark
              ? "text-gray-100 placeholder:text-gray-500"
              : "text-gray-700 placeholder:text-gray-400"
          }
        `}
      />
    )}

    <button
  type="button"
  onClick={() => {
    if (!showSearch) {
      setShowSearch(true);
    } else if (searchText) {
      setSearchText("");
    } else {
      setShowSearch(false);
    }
  }}
  className={`
    w-9 h-9
    rounded-full
    flex
    items-center
    justify-center
    transition
    ${
      showSearch
        ? isDark
          ? "bg-blue-600 text-white hover:bg-blue-700"
          : "bg-gray-900 text-white hover:bg-black"
        : isDark
        ? "text-gray-300 hover:bg-slate-800"
        : "text-gray-900 hover:bg-gray-100"
    }
  `}
  title="Tìm kiếm"
>
  {showSearch && searchText ? (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="w-4 h-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  ) : (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="w-5 h-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  )}
</button>
  </div>
</div>
    {/* FILTER BUTTON */}

    <button
      onClick={() =>
  setShowFilters((prev) => !prev)
}
      onMouseEnter={() => {
        filterVideoRef.current?.play();
      }}
      onMouseLeave={() => {
        if (filterVideoRef.current) {
          filterVideoRef.current.pause();
          filterVideoRef.current.currentTime = 0;
        }
      }}
      className={`
        w-11 h-11
        rounded-xl
        shadow
        border
        flex
        items-center
        justify-center
        hover:shadow-md
        transition-all
        duration-300
        ${
          isDark
            ? "bg-slate-900 border-slate-800 hover:bg-slate-800"
            : "bg-white border-gray-200 hover:bg-gray-50"
        }
      `}
      title="Bộ lọc"
    >
      <video
        ref={filterVideoRef}
        src="/filter-icon.mp4"
        muted
        playsInline
        className={`
          w-7 h-7 object-contain
          transition-transform
          duration-300

          ${
            showFilters
              ? "rotate-90"
              : "rotate-0"
          }
        `}
      />
    </button>
    {canDeleteTask && (
  <>
    {!deleteMode ? (
      <button
        onClick={() => {
          setDeleteMode(true);
          setSelectedTaskIds([]);
        }}
        className={`
        px-4
        py-2.5
        rounded-xl
        transition
        font-medium
        ${
          isDark
            ? "bg-slate-800 text-gray-300 hover:bg-slate-700"
            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
        }
      `}
      >
        Xóa
      </button>
    ) : (
      <>
        <button
          onClick={handleDeleteSelectedTasks}
          className="
            bg-red-500
            text-white
            px-4
            py-2.5
            rounded-xl
            hover:bg-red-600
            transition
            font-medium
          "
        >
          Xóa đã chọn ({selectedTaskIds.length})
        </button>

        <button
          onClick={() => {
            setDeleteMode(false);
            setSelectedTaskIds([]);
          }}
          className="
            bg-gray-100
            text-gray-600
            px-4
            py-2.5
            rounded-xl
            hover:bg-gray-200
            transition
            font-medium
          "
        >
          Hủy
        </button>
      </>
    )}
  </>
)}
    {canCreateTask && (
      <button
        onClick={() => navigate("/app/tasks/create")}
        className="
          bg-blue-500
          text-white
          px-4
          py-2.5
          rounded-xl
          hover:bg-blue-600
          transition
        "
      >
        + Tạo nhiệm vụ
      </button>
    )}
  </div>
</div>

    {/* MONTH NAVIGATOR */}
<div className="mb-4">
  <div
    className={`
      inline-flex
      items-center
      gap-2
      border
      rounded-2xl
      p-1.5
      shadow-sm
      ${
        isDark
          ? "bg-slate-900 border-slate-800"
          : "bg-white border-gray-200"
      }
    `}
  >
    <button
      type="button"
      onClick={() => {
        setSelectedMonth((prev) =>
          addMonth(prev, -1)
        );
        setFilter("all");
        setSelectedTaskIds([]);
        setDeleteMode(false);
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
      : "text-gray-600 hover:bg-gray-100"
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
      {formatMonthLabel(selectedMonth)}
    </div>

    <button
      type="button"
      onClick={() => {
        setSelectedMonth((prev) =>
          addMonth(prev, 1)
        );
        setFilter("all");
        setSelectedTaskIds([]);
        setDeleteMode(false);
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
            : "text-gray-600 hover:bg-gray-100"
        }
      `}
      title="Tháng sau"
    >
      ›
    </button>

    {selectedMonth !== getCurrentMonth() && (
      <button
        type="button"
        onClick={() => {
          setSelectedMonth(getCurrentMonth());
          setFilter("all");
          setSelectedTaskIds([]);
          setDeleteMode(false);
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
              : "text-gray-600 hover:bg-gray-100"
          }
        `}
      >
        Tháng hiện tại
      </button>
    )}
  </div>
</div>

    {/* FILTER OPTIONS */}
<div
  className={`
    overflow-hidden
    transition-all
    duration-300
    ease-in-out
    mb-5

    ${
      showFilters
        ? "max-h-[260px] opacity-100 mt-2"
        : "max-h-0 opacity-0"
    }
  `}
>
  <div className="flex flex-wrap gap-2 max-w-full">
    {filterOptions.map((item) => (
      <button
        key={item.value}
        onClick={() => {
          setFilter(item.value);
          setShowFilters(false);
        }}
        className={`
          px-4 py-2
          rounded-full
          text-sm
          font-medium
          transition
          whitespace-nowrap

          ${
            filter === item.value
              ? isDark
                ? "bg-blue-600 text-white shadow"
                : "bg-black text-white shadow"
              : isDark
              ? "bg-slate-900 text-gray-300 border border-slate-800 hover:bg-slate-800"
              : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
          }
        `}
      >
        {item.label}
      </button>
    ))}
  </div>
</div>



      {/* TABLE */}
      <div
        className={`
          rounded-2xl
          shadow-md
          border
          overflow-hidden
          ${
            isDark
              ? "bg-slate-900 border-slate-800"
              : "bg-white border-gray-300"
          }
        `}
      >

  <div className="w-full overflow-x-auto">

    <table className="min-w-[1050px] w-full border-collapse table-fixed">

    <thead
  className={`
    border-b
    ${
      isDark
        ? "bg-slate-950 border-slate-800"
        : "bg-gray-50 border-gray-300"
    }
  `}
>
  <tr>
    {deleteMode && (
      <th className="w-[5%] px-4 py-4 text-center">
        <input
          type="checkbox"
          checked={
            filteredTasks.length > 0 &&
            filteredTasks.every((task) =>
              selectedTaskIds.includes(task.id)
            )
          }
          onChange={toggleSelectAll}
          className="w-4 h-4 cursor-pointer"
        />
      </th>
    )}

    <th
      className={`${
        deleteMode ? "w-[31%]" : "w-[36%]"
      } px-5 py-4 text-left text-sm font-semibold text-gray-600`}
    >
      <button
        onClick={() => handleSort("tieu_de")}
        className="flex items-center gap-1 hover:text-blue-600"
      >
        Tên nhiệm vụ
        <SortIcon column="tieu_de" />
      </button>
    </th>

    <th className="w-[16%] px-4 py-4 text-center text-sm font-semibold text-gray-600">
  <button
    onClick={() => handleSort("display_status_code")}
    className="mx-auto flex items-center gap-1 hover:text-blue-600"
  >
    Trạng thái
    <SortIcon column="display_status_code" />
  </button>
</th>

<th className="w-[13%] px-4 py-4 text-center text-sm font-semibold text-gray-600">
  <button
    onClick={() => handleSort("priority_score")}
    className="mx-auto flex items-center gap-1 hover:text-blue-600"
  >
    Ưu tiên
    <SortIcon column="priority_score" />
  </button>
</th>

<th className="w-[11%] px-4 py-4 text-center text-sm font-semibold text-gray-600">
  <button
    onClick={() => handleSort("han_chot")}
    className="mx-auto flex items-center gap-1 hover:text-blue-600"
  >
    Hạn chót
    <SortIcon column="han_chot" />
  </button>
</th>

    <th className="w-[18%] px-5 py-4 text-left text-sm font-semibold text-gray-600">
      <button
        onClick={() => handleSort("unit_name")}
        className="flex items-center gap-1 hover:text-blue-600"
      >
        Phòng ban
        <SortIcon column="unit_name" />
      </button>
    </th>

    <th className="w-[16%] px-5 py-4 text-left text-sm font-semibold text-gray-600">
      <button
        onClick={() => handleSort("assignee_name")}
        className="flex items-center gap-1 hover:text-blue-600"
      >
        Người thực hiện
        <SortIcon column="assignee_name" />
      </button>
    </th>
  </tr>
</thead>

    <tbody>

      {filteredTasks.length === 0 ? (

        <tr>
          <td
  colSpan={deleteMode ? 7 : 6}
  className="text-center py-12 text-gray-400"
>
            {searchText || filter !== "all"
              ? "Không tìm thấy nhiệm vụ phù hợp"
              : "Chưa có nhiệm vụ"}
          </td>
        </tr>

      ) : (

        filteredTasks.map((task) => {
  const displayStatus =
    task.display_status_code || task.status_code;

  return (
    <tr
      key={task.id}
      onClick={() => {
        if (deleteMode) {
          toggleSelectTask(task.id);
        } else {
          handleOpenTask(task.id);
        }
      }}
      className={`
        border-b
        last:border-b-0
        cursor-pointer
        transition
        ${
          isDark ? "border-slate-800" : "border-gray-200"
        }
        ${
          selectedTaskIds.includes(task.id)
            ? isDark
              ? "bg-red-950/30"
              : "bg-red-50"
            : isDark
            ? "hover:bg-slate-800/70"
            : "hover:bg-blue-50/50"
        }
      `}
    >
      {deleteMode && (
        <td
          className="px-4 py-4 text-center"
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="checkbox"
            checked={selectedTaskIds.includes(task.id)}
            onChange={() => toggleSelectTask(task.id)}
            className="w-4 h-4 cursor-pointer"
          />
        </td>
      )}

      <td className="px-5 py-4">
        <div
            className={`font-medium ${
              isDark ? "text-gray-100" : "text-gray-800"
            }`}
          >
          {task.tieu_de}
        </div>

        <div className="text-xs text-gray-400 mt-1 line-clamp-1">
          {task.mo_ta || "Không có mô tả"}
        </div>
      </td>

      <td className="px-4 py-4 text-center">
  <span
    className={`
      inline-flex items-center justify-center
      px-3 py-1 rounded-full
      text-xs font-semibold
      whitespace-nowrap
      ${getStatusColor(displayStatus)}
    `}
  >
    {getStatusLabel(displayStatus, user)}
  </span>
</td>

<td className="px-4 py-4 text-center">
  <span
    title={task.priority_reason || "Chưa có lý do ưu tiên"}
    className={`
      inline-flex
      items-center
      justify-center
      gap-2
      px-3 py-1
      rounded-full
      border
      text-xs
      font-semibold
      whitespace-nowrap
      ${getPriorityColor(task.priority_level)}
    `}
  >
    <span
      className={`
        w-2 h-2
        rounded-full
        ${getPriorityDotColor(task.priority_level)}
      `}
    />

    {getPriorityLabel(task.priority_level)}
  </span>
</td>

<td
  className={`px-4 py-4 text-sm whitespace-nowrap text-center ${
    isDark ? "text-gray-300" : "text-gray-600"
  }`}
>
  {task.han_chot
    ? new Date(task.han_chot).toLocaleDateString()
    : "-"}
</td>

      <td
  className={`px-5 py-4 text-sm ${
    isDark ? "text-gray-300" : "text-gray-700"
  }`}
>
        {task.unit_name || "-"}
      </td>

      <td
  className={`px-5 py-4 text-sm ${
    isDark ? "text-gray-300" : "text-gray-700"
  }`}
>
        {task.assignee_name || "-"}
      </td>
    </tr>
  );
})

      )}

    </tbody>

      </table>

  </div>

</div>

      <TaskDetailModal
  selectedTask={selectedTask}
  setSelectedTask={(task) => {
    setSelectedTask(task);

    if (!task) {
      setFocusSubtasks(false);
    }
  }}
  handleApprove={handleApprove}
  user={user}
  fetchTasks={fetchTasks}
  focusSubtasks={focusSubtasks}
/>
    </div>
  );
}