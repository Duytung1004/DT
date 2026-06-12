import { hasPermission } from "../../utils/permission";
import { useEffect, useRef, useState } from "react";
import api from "../../services/api";
import TaskChatBox from "../chat/TaskChatBox";
import { fixVietnameseFileName } from "../../utils/fileName";
import EditTaskModal from "./EditTaskModal";
import SubtaskAssignModal from "./SubtaskAssignModal";
import EditSubtaskModal from "./EditSubtaskModal";
import SubmitSubtaskModal from "./SubmitSubtaskModal";

import { STATUS } from "../../constants/status";
import { getStatusColor } from "../../utils/statusColor";
import { getStatusLabel } from "../../utils/statusLabel";
import {
  getPriorityLabel,
  getPriorityColor,
  getPriorityDotColor,
} from "../../utils/priorityColor";
import {
  Info,
  MessageCircle,
  Eye,
  EyeOff,
} from "lucide-react";


const getReportCycleLabel = (value) => {
  switch (value) {
    case "mot_lan":
      return "Nộp một lần";
    case "hang_ngay":
      return "Báo cáo hằng ngày";
    case "hang_tuan":
      return "Báo cáo hằng tuần";
    case "hang_thang":
      return "Báo cáo hằng tháng";
    case "hang_quy":
      return "Báo cáo hằng quý";
    case "dot_xuat":
      return "Báo cáo đột xuất";
    default:
      return "-";
  }
};

export default function TaskDetailModal({
  selectedTask,
  setSelectedTask,
  handleApprove,
  user,
  fetchTasks,
  focusSubtasks = false,
}) {
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [subtasks, setSubtasks] = useState([]);
  const subtaskSectionRef = useRef(null);
const [flashSubtasks, setFlashSubtasks] = useState(false);
  const [loadingSubtasks, setLoadingSubtasks] = useState(false);
  const [showSubtasks, setShowSubtasks] = useState(false);
  const [showSubtaskAssign, setShowSubtaskAssign] =
  useState(false);
  const [editingSubtask, setEditingSubtask] = useState(null);
  const [submittingSubtask, setSubmittingSubtask] = useState(null);
  const [showEditTask, setShowEditTask] = useState(false);
  const [activeTab, setActiveTab] = useState("info");
  const [activeChatScope, setActiveChatScope] =
  useState("leader_unit");

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

  useEffect(() => {
  if (user?.role === "nhan_vien" || user?.roleId === 4) {
    setActiveChatScope("unit_employee");
  } else {
    setActiveChatScope("leader_unit");
  }
}, [selectedTask?.id, user?.role, user?.roleId]);

const fetchLogs = async () => {
  if (!selectedTask?.id) return;

  try {
    setLoadingLogs(true);

    const res = await api.get(
      `/tasks/${selectedTask.id}/logs`
    );

    setLogs(res.data);
  } catch (err) {
    console.log("FETCH LOGS ERROR:", err);
  } finally {
    setLoadingLogs(false);
  }
};

const fetchSubtasks = async () => {
  if (!selectedTask?.id) return;

  try {
    setLoadingSubtasks(true);

    const res = await api.get(
      `/tasks/${selectedTask.id}/subtasks`
    );

    setSubtasks(res.data);
  } catch (err) {
    console.log(
  "FETCH SUBTASKS ERROR:",
  err.response?.data || err
);
    setSubtasks([]);
  } finally {
    setLoadingSubtasks(false);
  }
};


useEffect(() => {
  fetchLogs();
  fetchSubtasks();
}, [selectedTask?.id]);

useEffect(() => {
  if (!selectedTask?.id) return;
  if (!focusSubtasks) return;

  setShowSubtasks(true);

  setTimeout(() => {
    subtaskSectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, 300);

  setFlashSubtasks(true);

  setTimeout(() => {
    setFlashSubtasks(false);
  }, 1600);
}, [selectedTask?.id, focusSubtasks]);

if (!selectedTask) return null;

const currentUserId = Number(user?.userId || user?.id);

const canUpdateTask =
  hasPermission(user, "task:update");

const canSubmitTask =
  hasPermission(user, "task:submit");

const canUseChat =
  hasPermission(user, "chat:access");

const canUnitHandleTask =
  (
    user?.role === "truong_phong" ||
    user?.roleId === 3 ||
    hasPermission(user, "approve_level_1")
  );

const canLeaderHandleTask =
  (
    user?.role === "lanh_dao" ||
    user?.roleId === 2 ||
    hasPermission(user, "approve_level_2")
  );

const isAdmin =
  user?.role === "admin" ||
  user?.roleId === 1;

const isLeader =
  user?.role === "lanh_dao" ||
  user?.roleId === 2;

const isTaskCreator =
  Number(
    selectedTask.nguoi_tao_id ||
      selectedTask.creator_id ||
      selectedTask.created_by ||
      selectedTask.created_by_id
  ) === currentUserId;

const canEditMainTask =
  canUpdateTask &&
  selectedTask.status_code !== "hoan_thanh" &&
  (
    isAdmin ||
    isLeader ||
    isTaskCreator
  );

const canShowFooterEdit =
  selectedTask.status_code !== "hoan_thanh" &&
  (
    canEditMainTask ||
    canUnitHandleTask
  );

const canCreateSubtask =
  hasPermission(user, "subtask:create");

const documentsWithFile =
  selectedTask.documents?.filter(
    (doc) => doc.file_path
  ) || [];



const closeModal = () => {
  setSelectedTask(null);
};

const reloadSelectedTask = async () => {
  await fetchTasks();

  const detail = await api.get(
    `/tasks/${selectedTask.id}`
  );

  setSelectedTask(detail.data);

    await fetchLogs();
    await fetchSubtasks();
};

const handleConfirmUnitTask = async () => {
  try {
    await api.put(
      `/tasks/${selectedTask.id}/confirm-unit`
    );

    await reloadSelectedTask();
  } catch (err) {
    alert(err.response?.data?.message);
  }
};

const handleConfirmAssigned = async () => {
  try {
    await api.put(
      `/tasks/${selectedTask.id}/confirm-assigned`
    );

    alert("Đã nhận nhiệm vụ. Vui lòng bắt đầu xử lý phần việc được giao.");

    await reloadSelectedTask();

    focusSubtaskSection();
  } catch (err) {
    alert(
      err.response?.data?.message ||
        "Không thể nhận nhiệm vụ"
    );
  }
};
const getViewUrl = (filePath, fileName) => {
  return `http://localhost:3000/api/files/view?path=${encodeURIComponent(
    filePath
  )}&name=${encodeURIComponent(
    fixVietnameseFileName(fileName || "file")
  )}`;
};

const getSubtaskProgress = (status) => {
  switch (status) {
    case "cho_nhan_viec":
      return 0;
    case "dang_thuc_hien":
      return 50;
    case "cho_duyet":
      return 80;
    case "yeu_cau_chinh_sua":
      return 60;
    case "hoan_thanh":
      return 100;
    default:
      return 0;
  }
};
const taskProgress =
  subtasks.length > 0
    ? Math.round(
        subtasks.reduce(
          (total, subtask) =>
            total + getSubtaskProgress(subtask.trang_thai),
          0
        ) / subtasks.length
      )
    : 0;

const allSubtasksCompleted =
  subtasks.length > 0 &&
  subtasks.every(
    (item) => item.trang_thai === "hoan_thanh"
  );

  const getTaskDisplayStatus = () => {
  const isOverdue =
    selectedTask.han_chot &&
    new Date(selectedTask.han_chot) < new Date() &&
    selectedTask.status_code !== "hoan_thanh";

  if (isOverdue) {
    return "qua_han";
  }

  // Lãnh đạo/admin xem trạng thái task chính
  if (
    user?.role === "lanh_dao" ||
    user?.role === "admin" ||
    user?.roleId === 2 ||
    user?.roleId === 1
  ) {
    return selectedTask.status_code;
  }

  // Không có subtask thì dùng trạng thái task chính
  if (subtasks.length === 0) {
    return selectedTask.status_code;
  }

  const statuses = subtasks.map((item) => item.trang_thai);

  // Trưởng phòng: giữ trạng thái task chính nếu đang ở các bước quan trọng
  if (
    user?.role === "truong_phong" ||
    user?.roleId === 3
  ) {
    if (
      [
        "cho_xac_nhan_don_vi",
        "da_giao_nhiem_vu",
        "cho_duyet_cap_1",
        "cho_duyet_cap_2",
        "hoan_thanh",
        "yeu_cau_chinh_sua",
      ].includes(selectedTask.status_code)
    ) {
      return selectedTask.status_code;
    }

    if (statuses.includes("cho_duyet")) {
      return "cho_duyet";
    }

    if (statuses.includes("yeu_cau_chinh_sua")) {
      return "yeu_cau_chinh_sua";
    }

    if (statuses.includes("dang_thuc_hien")) {
      return "dang_thuc_hien";
    }

    if (statuses.includes("cho_nhan_viec")) {
      return "cho_nhan_viec";
    }

    return selectedTask.status_code;
  }

  // Nhân viên: subtasks trong API đã được lọc theo chính nhân viên đó
  if (
    user?.role === "nhan_vien" ||
    user?.roleId === 4
  ) {
    if (
      [
        "cho_duyet_cap_1",
        "cho_duyet_cap_2",
        "hoan_thanh",
        "yeu_cau_chinh_sua",
      ].includes(selectedTask.status_code)
    ) {
      return selectedTask.status_code;
    }

    if (statuses.includes("cho_duyet")) {
      return "cho_duyet";
    }

    if (statuses.includes("yeu_cau_chinh_sua")) {
      return "yeu_cau_chinh_sua";
    }

    if (statuses.includes("dang_thuc_hien")) {
      return "dang_thuc_hien";
    }

    if (statuses.includes("cho_nhan_viec")) {
      return "cho_nhan_viec";
    }

    if (statuses.every((status) => status === "hoan_thanh")) {
      return "hoan_thanh";
    }

    return selectedTask.status_code;
  }

  return selectedTask.status_code;
};

const displayStatus = getTaskDisplayStatus();


const focusSubtaskSection = () => {
  setShowSubtasks(true);

  setTimeout(() => {
    subtaskSectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, 100);

  setFlashSubtasks(true);

  setTimeout(() => {
    setFlashSubtasks(false);
  }, 1400);
};

const handleFooterEdit = () => {
  if (canEditMainTask) {
    setShowEditTask(true);
    return;
  }

  if (canUnitHandleTask) {
    focusSubtaskSection();
  }
};


  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[10000] px-4"
      onClick={closeModal}
    >
      <div
        className={`
          w-[820px]
          max-w-[95vw]
          max-h-[90vh]
          rounded-[32px]
          shadow-2xl
          shadow-black/20
          overflow-hidden
          animate-fadeIn
          ${
            isDark
              ? "bg-slate-900 text-gray-100"
              : "bg-white text-gray-900"
          }
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div
          className={`
            px-6 py-5
            border-b
            ${
              isDark
                ? "bg-gradient-to-b from-slate-900 to-slate-950 border-slate-800"
                : "bg-gradient-to-b from-gray-50 to-white border-gray-100"
            }
          `}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-2">
  <span
    className={`
      px-3 py-1
      rounded-full
      text-xs
      font-semibold
      ${getStatusColor(displayStatus)}
    `}
  >
    {getStatusLabel(displayStatus, user)}
  </span>

  <span
    title={selectedTask.priority_reason || "Chưa có lý do ưu tiên"}
    className={`
      inline-flex
      items-center
      gap-2
      px-3 py-1
      rounded-full
      border
      text-xs
      font-semibold
      ${getPriorityColor(selectedTask.priority_level)}
    `}
  >
    <span
      className={`
        w-2 h-2
        rounded-full
        ${getPriorityDotColor(selectedTask.priority_level)}
      `}
    />

    Ưu tiên: {getPriorityLabel(selectedTask.priority_level)}
  </span>

  <span
  className={`text-xs ${
    isDark ? "text-gray-500" : "text-gray-400"
  }`}
>
  Task #{selectedTask.id}
</span>
</div>

              <h2
                className={`text-xl font-bold line-clamp-2 ${
                  isDark ? "text-gray-100" : "text-gray-900"
                }`}
              >
                {selectedTask.tieu_de}
              </h2>
                          </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* TAB ICONS */}
<div
  className={`
    flex
    items-center
    gap-2
    border
    rounded-full
    p-2
    shadow-lg
    backdrop-blur
    ${
      isDark
        ? "bg-slate-800/90 border-slate-700 shadow-slate-950/40"
        : "bg-white/90 border-gray-100 shadow-gray-200/70"
    }
  `}
>
  <button
    onClick={() => setActiveTab("info")}
    title="Thông tin nhiệm vụ"
    className={`
      w-10 h-10
      rounded-full
      flex
      items-center
      justify-center
      transition-all
      duration-300
      ${
        activeTab === "info"
          ? isDark
            ? "bg-blue-600 text-white shadow-md scale-105"
            : "bg-black text-white shadow-md scale-105"
          : isDark
          ? "bg-slate-900 text-gray-400 hover:bg-slate-700 hover:text-gray-100"
          : "bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
      }
    `}
  >
    <Info size={17} />
  </button>

  {canUseChat && (
  <button
    onClick={() => setActiveTab("chat")}
    title="Trao đổi nhiệm vụ"
    className={`
      w-10 h-10
      rounded-full
      flex
      items-center
      justify-center
      transition-all
      duration-300
      ${
        activeTab === "chat"
          ? isDark
            ? "bg-blue-600 text-white shadow-md scale-105"
            : "bg-black text-white shadow-md scale-105"
          : isDark
          ? "bg-slate-900 text-gray-400 hover:bg-slate-700 hover:text-gray-100"
          : "bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
      }
    `}
  >
    <MessageCircle size={17} />
  </button>
)}
</div>

              {/* CLOSE */}
              <button
                onClick={closeModal}
                className={`
                  w-10 h-10
                  rounded-full
                  flex items-center justify-center
                  transition
                  shrink-0
                  ${
                    isDark
                      ? "text-gray-400 hover:text-red-400 hover:bg-red-950/30"
                      : "text-gray-400 hover:text-red-500 hover:bg-red-50"
                  }
                `}
              >
                ✕
              </button>
            </div>
          </div>
        </div>

        {/* BODY */}
      <div
        className={`
          px-6 py-5
          overflow-y-auto
          max-h-[68vh]
          ${
            isDark ? "bg-slate-900" : "bg-white"
          }
        `}
      >
  {activeTab === "info" || !canUseChat ? (
    <div className="space-y-5">
      {selectedTask.status_code === "hoan_thanh" && (
        <div
            className={`
              rounded-2xl
              border
              px-4 py-3
              ${
                isDark
                  ? "bg-green-950/30 border-green-900/50"
                  : "bg-green-50 border-green-100"
              }
            `}
          >
          <p
              className={`text-sm font-semibold ${
                isDark ? "text-green-300" : "text-green-700"
              }`}
            >
            ✅ Nhiệm vụ đã hoàn thành
          </p>

          <p
            className={`text-xs mt-1 ${
              isDark ? "text-green-400" : "text-green-600"
            }`}
          >
            Nhiệm vụ này đã được lãnh đạo duyệt hoàn thành. Bạn chỉ có thể xem lại thông tin, minh chứng và nhật ký xử lý.
          </p>
        </div>
      )}
          {/* TASK INFO */}
    <div
      className={`
        rounded-3xl
        border
        p-4
        ${
          isDark
            ? "bg-slate-800/70 border-slate-700"
            : "bg-gray-50/70 border-gray-100"
        }
      `}
    >
  <div className="flex items-center justify-between mb-4">
    <div>
      <h3
          className={`font-bold ${
            isDark ? "text-gray-100" : "text-gray-900"
          }`}
        >
        📋 Thông tin nhiệm vụ
      </h3>

      <p className="text-xs text-gray-400 mt-1">
        Thông tin chung, mô tả và văn bản liên quan đến nhiệm vụ
      </p>
    </div>

      <span
        className={`
          text-xs
          font-semibold
          px-3 py-1
          rounded-full
          border
          ${
            isDark
              ? "text-gray-300 bg-slate-900 border-slate-700"
              : "text-gray-500 bg-white border-gray-100"
          }
        `}
      >
      Task #{selectedTask.id}
    </span>
  </div>

  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
    <div
        className={`
          rounded-2xl
          border
          px-4 py-3
          ${
            isDark
              ? "bg-slate-900 border-slate-700"
              : "bg-white border-gray-100"
          }
        `}
      >
      <p className="text-[11px] text-gray-400 mb-1">
        Hạn chót
      </p>

      <p
  className={`text-sm font-semibold ${
    isDark ? "text-gray-100" : "text-gray-800"
  }`}
>
        {selectedTask.han_chot
          ? new Date(selectedTask.han_chot).toLocaleDateString()
          : "-"}
      </p>
    </div>

    <div
      className={`
        rounded-2xl
        border
        px-4 py-3
        ${
          isDark
            ? "bg-slate-900 border-slate-700"
            : "bg-white border-gray-100"
        }
      `}
    >
      <p className="text-[11px] text-gray-400 mb-1">
        Chu kỳ báo cáo
      </p>

      <p
  className={`text-sm font-semibold ${
    isDark ? "text-gray-100" : "text-gray-800"
  }`}
>
        {getReportCycleLabel(selectedTask.chu_ky_bao_cao)}
      </p>
    </div>

    <div
        className={`
          rounded-2xl
          border
          px-4 py-3
          ${
            isDark
              ? "bg-slate-900 border-slate-700"
              : "bg-white border-gray-100"
          }
        `}
      >
  <p className="text-[11px] text-gray-400 mb-1">
    Độ ưu tiên
  </p>

  <div
    title={selectedTask.priority_reason || "Chưa có lý do ưu tiên"}
    className={`
      inline-flex
      items-center
      gap-2
      px-3 py-1
      rounded-full
      border
      text-xs
      font-semibold
      ${getPriorityColor(selectedTask.priority_level)}
    `}
  >
    <span
      className={`
        w-2 h-2
        rounded-full
        ${getPriorityDotColor(selectedTask.priority_level)}
      `}
    />

    {getPriorityLabel(selectedTask.priority_level)}
  </div>
</div>
<div
  className={`
    rounded-2xl
    border
    px-4 py-3
    ${
      isDark
        ? "bg-slate-900 border-slate-700"
        : "bg-white border-gray-100"
    }
  `}
>
  <p className="text-[11px] text-gray-400 mb-1">
    Điểm ưu tiên
  </p>

    <p
      className={`text-sm font-semibold ${
        isDark ? "text-gray-100" : "text-gray-800"
      }`}
    >
    {selectedTask.priority_score ?? 0} điểm
  </p>
</div>
    <div
  className={`
    rounded-2xl
    border
    px-4 py-3
    ${
      isDark
        ? "bg-slate-900 border-slate-700"
        : "bg-white border-gray-100"
    }
  `}
>
      <p className="text-[11px] text-gray-400 mb-1">
        Phòng ban
      </p>

      <p
        className={`text-sm font-semibold ${
          isDark ? "text-gray-100" : "text-gray-800"
        }`}
      >
        {selectedTask.unit_name || "-"}
      </p>
    </div>

    <div
  className={`
    rounded-2xl
    border
    px-4 py-3
    ${
      isDark
        ? "bg-slate-900 border-slate-700"
        : "bg-white border-gray-100"
    }
  `}
>
      <p className="text-[11px] text-gray-400 mb-1">
        Người thực hiện
      </p>

      <p
          className={`text-sm font-semibold ${
            isDark ? "text-gray-100" : "text-gray-800"
          }`}
        >
        {selectedTask.assignee_name || "-"}
      </p>
    </div>
  </div>

    <div
    className={`
      mt-3
      rounded-2xl
      border
      px-4 py-3
      ${
        isDark
          ? "bg-slate-900 border-slate-700"
          : "bg-white border-gray-100"
      }
    `}
  >
    <p className="text-[11px] text-gray-400 mb-1">
      Mô tả nhiệm vụ
    </p>

    <p
        className={`text-sm whitespace-pre-wrap leading-relaxed ${
          isDark ? "text-gray-300" : "text-gray-600"
        }`}
      >
      {selectedTask.mo_ta || "Không có mô tả"}
    </p>
  </div>
  <div
      className={`
        mt-3
        rounded-2xl
        border
        px-4 py-3
        ${
          isDark
            ? "bg-orange-950/30 border-orange-900/50"
            : "bg-orange-50 border-orange-100"
        }
      `}
    >
  <p className="text-[11px] text-orange-400 mb-1">
    Lý do đánh giá độ ưu tiên
  </p>

    <p
    className={`text-sm whitespace-pre-wrap leading-relaxed ${
      isDark ? "text-orange-300" : "text-orange-800"
    }`}
  >
    {selectedTask.priority_reason || "Chưa có lý do ưu tiên"}
  </p>
</div>

  {documentsWithFile.length > 0 && (
    <div
        className={`
          mt-3
          rounded-2xl
          border
          p-4
          ${
            isDark
              ? "bg-slate-900 border-slate-700"
              : "bg-white border-gray-100"
          }
        `}
      >
      <div className="flex items-center justify-between mb-3">
        <div>
          <p
          className={`text-sm font-semibold ${
            isDark ? "text-gray-100" : "text-gray-800"
          }`}
        >
            📎 Văn bản đính kèm
          </p>

          <p className="text-xs text-gray-400 mt-1">
            Văn bản liên quan đến nhiệm vụ
          </p>
        </div>

        <span className="text-xs text-gray-400">
          {documentsWithFile.length} file
        </span>
      </div>

      <div className="space-y-2">
        {documentsWithFile.map((doc) => (
          <div
            key={doc.id}
            className={`
              flex
              items-center
              justify-between
              gap-3
              rounded-2xl
              border
              px-4 py-3
              transition
              ${
                isDark
                  ? "bg-slate-800 border-slate-700 hover:border-blue-800 hover:bg-slate-800/80"
                  : "bg-gray-50 border-gray-100 hover:border-blue-200 hover:bg-blue-50/40"
              }
            `}
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div
                className="
                  w-11 h-11
                  rounded-2xl
                  bg-blue-100
                  text-blue-600
                  flex items-center justify-center
                  shrink-0
                "
              >
                📄
              </div>

              <div className="min-w-0">
                <p
                    className={`text-sm font-semibold truncate ${
                      isDark ? "text-gray-100" : "text-gray-800"
                    }`}
                  >
                  {fixVietnameseFileName(doc.file_name)}
                </p>

                <p
                  className={`text-xs truncate ${
                    isDark ? "text-gray-400" : "text-gray-500"
                  }`}
                >
                  {doc.so_ky_hieu || "Chưa có số ký hiệu"}
                </p>
              </div>
            </div>

            <a
              href={getViewUrl(doc.file_path, doc.file_name)}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="
                shrink-0
                px-4 py-2
                rounded-xl
                bg-blue-500
                text-white
                text-xs
                font-semibold
                hover:bg-blue-600
                transition
              "
            >
              Xem
            </a>
          </div>
        ))}
      </div>
    </div>
  )}
</div>

          {/* PROGRESS */}
<div
  className={`
    rounded-3xl
    border
    bg-gradient-to-br
    from-gray-900
    via-gray-800
    to-black
    p-5
    shadow-lg
    overflow-hidden
    relative
    ${
      isDark ? "border-slate-700" : "border-gray-100"
    }
  `}
>

  <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl" />
  <div className="absolute -bottom-12 -left-10 w-36 h-36 bg-emerald-400/20 rounded-full blur-3xl" />

  <div className="relative z-10">
    <div className="flex items-start justify-between gap-3 mb-4">
      <div>
        <p className="text-xs text-gray-400 mb-1">
          Tiến độ nhiệm vụ
        </p>

        <h3 className="text-lg font-bold text-white">
          📈 Tiến độ theo phần việc
        </h3>

        <p className="text-xs text-gray-400 mt-1">
          Tự động tính theo trạng thái các phần việc nội bộ
        </p>
      </div>

      <div
        className="
          px-3 py-1
          rounded-full
          bg-white/10
          border
          border-white/10
          text-xs
          font-semibold
          text-gray-200
          shrink-0
        "
      >
        {subtasks.length} phần việc
      </div>
    </div>

    <div className="flex items-end gap-2 mb-3">
      <span className="text-4xl font-bold text-white leading-none">
        {taskProgress}
      </span>

      <span className="text-2xl font-semibold text-gray-400 mb-1">
        %
      </span>
    </div>

    <div
      className="
        w-full
        h-6
        rounded-full
        bg-white/15
        border
        border-white/10
        overflow-hidden
        relative
      "
    >
      <div
        className="
          h-full
          rounded-full
          bg-gradient-to-r
          from-lime-300
          via-teal-300
          to-blue-400
          transition-all
          duration-700
          ease-out
          progress-glow
          progress-shimmer
          relative
          overflow-hidden
        "
        style={{
          width: `${taskProgress}%`,
        }}
      />

      <div className="absolute inset-0 flex items-center justify-end pr-4">
        <span className="text-xs font-semibold text-white/80">
          {selectedTask.han_chot
            ? `Hạn ${new Date(
                selectedTask.han_chot
              ).toLocaleDateString()}`
            : "Chưa có hạn"}
        </span>
      </div>
    </div>

    <div className="flex items-center justify-between mt-3 text-xs text-gray-400">
      <span>
        Hoàn thành:{" "}
        {
          subtasks.filter(
            (item) => item.trang_thai === "hoan_thanh"
          ).length
        }
        /{subtasks.length}
      </span>

      <span>
        Cập nhật tự động
      </span>
    </div>
  </div>
</div>

          {/* SUBTASKS */}
<div
  ref={subtaskSectionRef}
  className={`
  rounded-2xl
  border
  overflow-hidden
  transition-all
  duration-300
  ${
    isDark ? "bg-slate-900" : "bg-white"
  }
  ${
    flashSubtasks
      ? isDark
        ? "border-blue-500 ring-4 ring-blue-900/40 shadow-xl shadow-blue-950/40 animate-pulse"
        : "border-blue-400 ring-4 ring-blue-200 shadow-xl shadow-blue-100 animate-pulse"
      : isDark
      ? "border-slate-700"
      : "border-gray-100"
  }
`}
>
  <button
    onClick={() => setShowSubtasks((prev) => !prev)}
    className={`
      w-full
      flex
      items-center
      justify-between
      px-4 py-4
      transition
      ${
        isDark
          ? "bg-slate-900 hover:bg-slate-800"
          : "bg-white hover:bg-gray-50"
      }
    `}
  >
    <div className="flex items-center gap-2">
      <span>📌</span>

      <div className="text-left">
        <div className="flex items-center gap-2">
          <span
              className={`font-semibold ${
                isDark ? "text-gray-100" : "text-gray-800"
              }`}
            >
            Phần việc nội bộ
          </span>

          <span className="text-xs text-gray-400">
            {subtasks.length} phần việc
          </span>
        </div>

        <p className="text-xs text-gray-400 mt-1">
          {showSubtasks
            ? "Đang hiển thị danh sách phần việc"
            : "Bấm để xem danh sách phần việc"}
        </p>
      </div>
    </div>

    <span
      className={`
        w-9 h-9
        rounded-full
        flex items-center justify-center
        border
        transition-all
        duration-300
        ${
          showSubtasks
            ? isDark
              ? "bg-blue-950/40 text-blue-400 border-blue-800 scale-105"
              : "bg-blue-50 text-blue-600 border-blue-100 scale-105"
            : isDark
            ? "bg-slate-800 text-gray-400 border-slate-700"
            : "bg-gray-50 text-gray-400 border-gray-100"
        }
      `}
      title={showSubtasks ? "Ẩn phần việc" : "Xem phần việc"}
    >
      {showSubtasks ? (
        <EyeOff
          size={17}
          className="transition-all duration-300 animate-pulse"
        />
      ) : (
        <Eye
          size={17}
          className="transition-all duration-300"
        />
      )}
    </span>
  </button>

  <div
    className={`
      grid
      transition-all
      duration-300
      ease-in-out
      ${
        showSubtasks
          ? "grid-rows-[1fr] opacity-100"
          : "grid-rows-[0fr] opacity-0"
      }
    `}
  >
    <div className="overflow-hidden">
      <div
          className={`
            border-t
            p-4
            ${
              isDark
                ? "bg-slate-950/60 border-slate-700"
                : "bg-gray-50/70 border-gray-100"
            }
          `}
        >
        {loadingSubtasks ? (
          <div
              className={`
                rounded-2xl
                border
                p-5
                text-center
                ${
                  isDark
                    ? "bg-slate-900 border-slate-700"
                    : "bg-white border-gray-100"
                }
              `}
            >
            <p className="text-sm text-gray-500">
              Đang tải phần việc...
            </p>
          </div>
        ) : subtasks.length === 0 ? (
          <div
  className={`
    rounded-2xl
    border
    border-dashed
    p-6
    text-center
    ${
      isDark
        ? "bg-slate-900 border-slate-700"
        : "bg-white border-gray-200"
    }
  `}
>
            <p
  className={`text-sm font-medium ${
    isDark ? "text-gray-400" : "text-gray-500"
  }`}
>
              Chưa có phần việc nào được phân công
            </p>

            {canUnitHandleTask && canCreateSubtask && (
  <p className="text-xs text-gray-400 mt-1">
    Bấm “Phân công nội bộ” để giao việc cho nhân viên.
  </p>
)}
          </div>
        ) : (
          <div className="space-y-4">
            {[...subtasks]
              .sort((a, b) => {
                const priority =
                canUnitHandleTask
                  ? {
                      cho_duyet: 1,
                      yeu_cau_chinh_sua: 2,
                      cho_nhan_viec: 3,
                      dang_thuc_hien: 4,
                      hoan_thanh: 5,
                    }
                  : {
                      cho_nhan_viec: 1,
                      yeu_cau_chinh_sua: 2,
                      dang_thuc_hien: 3,
                      cho_duyet: 4,
                      hoan_thanh: 5,
                    };

                return (
                  (priority[a.trang_thai] || 99) -
                  (priority[b.trang_thai] || 99)
                );
              })
              .map((subtask) => {
              const subtaskProgress = getSubtaskProgress(
                subtask.trang_thai
              );

              const assigneeId = Number(subtask.assignee_user_id);

              const isOwner = assigneeId === currentUserId;
              return (
                <div
                    key={subtask.id}
                    className={`
                      rounded-3xl
                      border
                      shadow-sm
                      p-4
                      transition
                      ${
                        isDark
                          ? "bg-slate-900 border-slate-700 hover:border-blue-800"
                          : "bg-white border-gray-100 hover:shadow-md hover:border-blue-100"
                      }
                    `}
                  >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className={`
                            px-3 py-1
                            rounded-full
                            text-xs
                            font-semibold
                            ${getStatusColor(subtask.trang_thai)}
                          `}
                        >
                          {getStatusLabel(subtask.trang_thai, user)}
                        </span>

                        <span
  className={`text-xs ${
    isDark ? "text-gray-500" : "text-gray-300"
  }`}
>
                          Subtask #{subtask.id}
                        </span>

                        {isOwner && subtask.trang_thai === "cho_nhan_viec" && (
                          <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[11px] font-semibold">
                            Mới cần bắt đầu
                          </span>
                        )}
                        {canUnitHandleTask && subtask.trang_thai === "cho_duyet" && (
  <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-[11px] font-semibold">
    Chờ duyệt
  </span>
)}
                      </div>

                      <h4
                          className={`text-sm font-bold leading-relaxed ${
                            isDark ? "text-gray-100" : "text-gray-900"
                          }`}
                        >
                        {subtask.tieu_de}
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                        <div
                            className={`
                              rounded-2xl
                              border
                              px-3 py-2
                              ${
                                isDark
                                  ? "bg-slate-800 border-slate-700"
                                  : "bg-gray-50 border-gray-100"
                              }
                            `}
                          >
                          <p className="text-[11px] text-gray-400 mb-1">
                            Người thực hiện
                          </p>

                          <p
                              className={`text-sm font-semibold truncate ${
                                isDark ? "text-gray-200" : "text-gray-700"
                              }`}
                            >
                            {subtask.assignee_name ||
                              subtask.assignee_username ||
                              "-"}
                          </p>
                        </div>

                        <div
  className={`
    rounded-2xl
    border
    px-3 py-2
    ${
      isDark
        ? "bg-slate-800 border-slate-700"
        : "bg-gray-50 border-gray-100"
    }
  `}
>
                          <p className="text-[11px] text-gray-400 mb-1">
                            Hạn hoàn thành
                          </p>

                          <p
                            className={`text-sm font-semibold ${
                              isDark ? "text-gray-200" : "text-gray-700"
                            }`}
                          >
                            {subtask.han_chot
                              ? new Date(
                                  subtask.han_chot
                                ).toLocaleDateString()
                              : "-"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2 shrink-0">
                      {canUnitHandleTask &&
                        subtask.trang_thai !== "hoan_thanh" && (
                          <button
                            onClick={() => setEditingSubtask(subtask)}
                            className={`
                            px-3 py-1.5
                            rounded-xl
                            text-xs
                            font-semibold
                            transition
                            ${
                              isDark
                                ? "bg-yellow-950/40 text-yellow-300 hover:bg-yellow-950/60"
                                : "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                            }
                          `}
                          >
                            Sửa
                          </button>
                        )}

                      {canSubmitTask &&
                        isOwner &&
                        subtask.trang_thai === "cho_nhan_viec" && (
                          <button
                            onClick={async () => {
                              try {
                                await api.put(
                                  `/tasks/${selectedTask.id}/subtasks/${subtask.id}/start`
                                );

                                alert("Đã bắt đầu phần việc");

                                await reloadSelectedTask();

                                focusSubtaskSection();
                              } catch (err) {
                                console.error(
                                  "START SUBTASK ERROR:",
                                  err
                                );

                                alert(
                                  err.response?.data?.message ||
                                    "Không thể bắt đầu phần việc"
                                );

                                await reloadSelectedTask();

                                focusSubtaskSection();
                              }
                            }}
                            className="
                              px-3 py-1.5
                              rounded-xl
                              text-xs
                              font-semibold
                              bg-green-100
                              text-green-700
                              hover:bg-green-200
                              transition
                            "
                          >
                            Bắt đầu
                          </button>
                        )}

                      {canSubmitTask &&
                      isOwner &&
                        [
                          "dang_thuc_hien",
                          "yeu_cau_chinh_sua",
                        ].includes(subtask.trang_thai) && (
                          <button
                            onClick={() =>
                              setSubmittingSubtask(subtask)
                            }
                            className="
                              px-3 py-1.5
                              rounded-xl
                              text-xs
                              font-semibold
                              bg-purple-100
                              text-purple-700
                              hover:bg-purple-200
                              transition
                            "
                          >
                            Nộp
                          </button>
                        )}
                      {canUnitHandleTask &&
  subtask.trang_thai === "cho_duyet" && (
    <>
      <button
        onClick={async () => {
          try {
            await api.put(
              `/tasks/${selectedTask.id}/subtasks/${subtask.id}/approve`,
              {
                decision: "chap_thuan",
              }
            );

            alert("Đã duyệt phần việc");

await reloadSelectedTask();

focusSubtaskSection();
          } catch (err) {
            console.error("APPROVE SUBTASK ERROR:", err);

            alert(
              err.response?.data?.message ||
                "Không thể duyệt phần việc"
            );
          }
        }}
        className="
          px-3 py-1.5
          rounded-xl
          text-xs
          font-semibold
          bg-green-100
          text-green-700
          hover:bg-green-200
          transition
        "
      >
        Duyệt
      </button>

      <button
  onClick={async () => {
    const reason = window.prompt(
      "Nhập lý do yêu cầu nhân viên chỉnh sửa:"
    );

    if (!reason || !reason.trim()) {
      alert("Vui lòng nhập lý do yêu cầu chỉnh sửa");
      return;
    }

    try {
      await api.put(
        `/tasks/${selectedTask.id}/subtasks/${subtask.id}/approve`,
        {
          decision: "tu_choi",
          note: reason.trim(),
        }
      );

      alert("Đã yêu cầu chỉnh sửa phần việc");

await reloadSelectedTask();

focusSubtaskSection();
    } catch (err) {
      console.error("REJECT SUBTASK ERROR:", err);

      alert(
        err.response?.data?.message ||
          "Không thể trả lại phần việc"
      );
    }
  }}
  className="
    px-3 py-1.5
    rounded-xl
    text-xs
    font-semibold
    bg-red-100
    text-red-700
    hover:bg-red-200
    transition
  "
>
  Trả lại
</button>
    </>
  )}  
  {canUnitHandleTask &&
  selectedTask.status_code === "yeu_cau_chinh_sua" &&
  subtask.trang_thai === "hoan_thanh" && (
    <button
      onClick={async () => {
        try {
          await api.put(
            `/tasks/${selectedTask.id}/subtasks/${subtask.id}/request-revision`
          );

          alert("Đã yêu cầu nhân viên sửa lại phần việc");

await reloadSelectedTask();

focusSubtaskSection();
        } catch (err) {
          console.error("REQUEST SUBTASK REVISION ERROR:", err);

          alert(
            err.response?.data?.message ||
              "Không thể yêu cầu sửa phần việc"
          );
        }
      }}
      className="
        px-3 py-1.5
        rounded-xl
        text-xs
        font-semibold
        bg-orange-100
        text-orange-700
        hover:bg-orange-200
        transition
      "
    >
      Yêu cầu sửa lại
    </button>
)}
                    </div>
                  </div>

                  {subtask.mo_ta && (
                    <div
  className={`
    mt-4
    rounded-2xl
    border
    px-4 py-3
    ${
      isDark
        ? "bg-slate-800 border-slate-700"
        : "bg-gray-50 border-gray-100"
    }
  `}
>
                      <p className="text-[11px] text-gray-400 mb-1">
                        Mô tả phần việc
                      </p>

                      <p
                          className={`text-sm whitespace-pre-wrap leading-relaxed ${
                            isDark ? "text-gray-300" : "text-gray-600"
                          }`}
                        >
                        {subtask.mo_ta}
                      </p>
                    </div>
                  )}

                  {subtask.noi_dung_nop && (
                    <div
  className={`
    mt-4
    rounded-2xl
    border
    px-4 py-3
    ${
      isDark
        ? "bg-purple-950/30 border-purple-900/50"
        : "bg-purple-50 border-purple-100"
    }
  `}
>
                      <p className="text-[11px] text-purple-400 mb-1">
                        Nội dung đã nộp
                      </p>

                      <p
  className={`text-sm whitespace-pre-wrap leading-relaxed ${
    isDark ? "text-gray-300" : "text-gray-700"
  }`}
>
                        {subtask.noi_dung_nop}
                      </p>

                      {subtask.file_path && (
                        <a
                          href={getViewUrl(
                            subtask.file_path,
                            subtask.file_name
                          )}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className={`
                          inline-flex
                          mt-3
                          px-3 py-1.5
                          rounded-xl
                          border
                          text-xs
                          font-semibold
                          transition
                          ${
                            isDark
                              ? "bg-slate-900 border-purple-900/60 text-purple-300 hover:bg-purple-950/40"
                              : "bg-white border-purple-100 text-purple-700 hover:bg-purple-100"
                          }
                        `}
                        >
                          Xem file minh chứng
                        </a>
                      )}
                    </div>
                  )}

                  <div className="mt-4">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-gray-400">
                        Tiến độ theo trạng thái
                      </span>

                      <span
                          className={`text-xs font-semibold ${
                            isDark ? "text-gray-300" : "text-gray-600"
                          }`}
                        >
                        {subtaskProgress}%
                      </span>
                    </div>

                    <div
  className={`w-full rounded-full h-2 overflow-hidden ${
    isDark ? "bg-slate-700" : "bg-gray-200"
  }`}
>
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all"
                        style={{
                          width: `${subtaskProgress}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  </div>
</div>  
                    {/* LOGS */}
  <div
    className={`
      rounded-2xl
      border
      overflow-hidden
      ${
        isDark
          ? "bg-slate-900 border-slate-700"
          : "bg-white border-gray-100"
      }
    `}
  >
  <button
    onClick={() => setShowLogs((prev) => !prev)}
    className={`
        w-full
        flex
        items-center
        justify-between
        px-4 py-4
        transition
        ${
          isDark
            ? "bg-slate-900 hover:bg-slate-800"
            : "bg-white hover:bg-gray-50"
        }
      `}
  >
    <div className="flex items-center gap-2">
      <span>📜</span>

      <span
          className={`font-semibold ${
            isDark ? "text-gray-100" : "text-gray-800"
          }`}
        >
        Nhật ký xử lý
      </span>

      <span className="text-xs text-gray-400">
        {logs.length} hoạt động
      </span>
    </div>

    <span
      className={`
        text-gray-400
        transition-transform
        duration-300
        ${showLogs ? "rotate-180" : "rotate-0"}
      `}
    >
      ▼
    </span>
  </button>

  <div
    className={`
      grid
      transition-all
      duration-300
      ease-in-out
      ${
        showLogs
          ? "grid-rows-[1fr] opacity-100"
          : "grid-rows-[0fr] opacity-0"
      }
    `}
  >
    <div className="overflow-hidden">
      <div
          className={`
            border-t
            p-4
            ${
              isDark
                ? "bg-slate-950/60 border-slate-700"
                : "bg-gray-50/60 border-gray-100"
            }
          `}
        >
        {loadingLogs ? (
          <p className="text-sm text-gray-500">
            Đang tải nhật ký...
          </p>
        ) : logs.length === 0 ? (
          <p className="text-sm text-gray-500">
            Chưa có hoạt động
          </p>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => (
              <div
                key={log.id}
                className={`
                  flex
                  gap-3
                  items-start
                  rounded-2xl
                  border
                  px-4 py-3
                  ${
                    isDark
                      ? "bg-slate-900 border-slate-700"
                      : "bg-white border-gray-100"
                  }
                `}
              >
                <div
                  className={`w-3 h-3 rounded-full mt-1 shrink-0
                    ${
                      log.action?.toLowerCase().includes("từ chối")
                        ? "bg-red-500"
                        : log.action?.toLowerCase().includes("duyệt")
                        ? "bg-green-500"
                        : log.action?.toLowerCase().includes("cập nhật")
                        ? "bg-yellow-500"
                        : log.action?.toLowerCase().includes("nộp")
                        ? "bg-purple-500"
                        : "bg-blue-500"
                    }`}
                />

                <div className="min-w-0">
                  <p
                      className={`text-sm ${
                        isDark ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                    <span className="font-medium">
                      {log.full_name || "Hệ thống"}
                    </span>
                    : {log.action}
                  </p>

                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(log.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  </div>
</div>

                    </div>
        ) : (
  <div className="space-y-4">
    {canUnitHandleTask && (
  <div
  className={`
    flex
    items-center
    gap-2
    rounded-2xl
    p-1
    w-fit
    ${
      isDark ? "bg-slate-800" : "bg-gray-100"
    }
  `}
>
    <button
      onClick={() =>
        setActiveChatScope("leader_unit")
      }
      className={`
        px-4 py-2
        rounded-xl
        text-sm
        font-semibold
        transition
        ${
  activeChatScope === "leader_unit"
    ? isDark
      ? "bg-blue-600 text-white shadow-sm"
      : "bg-white text-blue-600 shadow-sm"
    : isDark
    ? "text-gray-400 hover:text-gray-100"
    : "text-gray-500 hover:text-gray-800"
}
      `}
    >
      Lãnh đạo - đơn vị
    </button>

    <button
      onClick={() =>
        setActiveChatScope("unit_employee")
      }
      className={`
        px-4 py-2
        rounded-xl
        text-sm
        font-semibold
        transition
        ${
  activeChatScope === "unit_employee"
    ? isDark
      ? "bg-blue-600 text-white shadow-sm"
      : "bg-white text-blue-600 shadow-sm"
    : isDark
    ? "text-gray-400 hover:text-gray-100"
    : "text-gray-500 hover:text-gray-800"
}
      `}
    >
      Đơn vị - nhân viên
    </button>
  </div>
)}

    <TaskChatBox
      taskId={selectedTask.id}
      user={user}
      scope={activeChatScope}
    />
  </div>
)}
</div>
        {/* FOOTER ACTION */}
        <div
            className={`
              px-6 py-4
              flex
              justify-between
              items-center
              gap-3
              border-t
              ${
                isDark
                  ? "bg-slate-950 border-slate-800"
                  : "bg-white/95 border-gray-100"
              }
            `}
          >
          <div className="flex flex-wrap gap-2">
            {canShowFooterEdit && (
  <button
    onClick={handleFooterEdit}
    className={`
  px-4 py-2
  rounded-xl
  transition
  ${
    isDark
      ? "bg-yellow-950/40 text-yellow-300 hover:bg-yellow-950/60"
      : "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
  }
`}
  >
    Sửa
  </button>
)}

            
            {canUnitHandleTask &&
  selectedTask.status_code === STATUS.CHO_XAC_NHAN_DON_VI && (
                <button
                  onClick={handleConfirmUnitTask}
                  className="px-4 py-2 bg-purple-500 text-white rounded-xl hover:bg-purple-600 transition"
                >
                  Xác nhận tiếp nhận
                </button>
              )}

            {canUnitHandleTask &&
  canCreateSubtask &&
  [
    "da_giao_nhiem_vu",
    "cho_nhan_viec",
    "dang_thuc_hien",
    "yeu_cau_chinh_sua",
  ].includes(selectedTask.status_code) && (
    <button
      onClick={() => setShowSubtaskAssign(true)}
      className="px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition"
    >
      Phân công nội bộ
    </button>
)}

{canUnitHandleTask &&
  allSubtasksCompleted &&
  [
    "da_giao_nhiem_vu",
    "cho_nhan_viec",
    "dang_thuc_hien",
    "yeu_cau_chinh_sua",
  ].includes(selectedTask.status_code) && (
    <button
      onClick={async () => {
        try {
          await api.put(
            `/tasks/${selectedTask.id}/send-to-leader`
          );

          alert("Đã gửi nhiệm vụ lên lãnh đạo duyệt");

          await reloadSelectedTask();
        } catch (err) {
          console.error("SEND TO LEADER ERROR:", err);

          alert(
            err.response?.data?.message ||
              "Không thể gửi lãnh đạo duyệt"
          );
        }
      }}
      className="
        px-4 py-2
        bg-indigo-500
        text-white
        rounded-xl
        hover:bg-indigo-600
        transition
      "
    >
      Gửi lãnh đạo duyệt
    </button>
)}
            {canSubmitTask &&
  selectedTask.status_code === STATUS.CHO_NHAN_VIEC &&
  Number(selectedTask.assignee_user_id) === currentUserId && (
                <button
  onClick={handleConfirmAssigned}
  className="px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition"
>
  Nhận nhiệm vụ
</button>
              )}
            {canUnitHandleTask &&
  selectedTask.status_code === STATUS.CHO_DUYET_CAP_1 && (
                <>
                  <button
                    onClick={async () => {
                      await handleApprove("chap_thuan");
                      await reloadSelectedTask();
                    }}
                    className="px-4 py-2 bg-green-500 text-white rounded-xl hover:bg-green-600 transition"
                  >
                    Duyệt
                  </button>

                  <button
  onClick={async () => {
    const reason = window.prompt(
      "Nhập lý do từ chối / yêu cầu chỉnh sửa:"
    );

    if (!reason || !reason.trim()) {
      alert("Vui lòng nhập lý do từ chối");
      return;
    }

    await handleApprove("tu_choi", reason.trim());
    await reloadSelectedTask();
  }}
  className="px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition"
>
  Từ chối
</button>
                </>
              )}

            {canLeaderHandleTask &&
  selectedTask.status_code === STATUS.CHO_DUYET_CAP_2 && (
              <>
                <button
                  onClick={async () => {
                    await handleApprove("chap_thuan");
                    await reloadSelectedTask();
                  }}
                  className="px-4 py-2 bg-green-500 text-white rounded-xl hover:bg-green-600 transition"
                >
                  Duyệt
                </button>

                <button
  onClick={async () => {
    const reason = window.prompt(
      "Nhập lý do từ chối / yêu cầu chỉnh sửa:"
    );

    if (!reason || !reason.trim()) {
      alert("Vui lòng nhập lý do từ chối");
      return;
    }

    await handleApprove("tu_choi", reason.trim());
    await reloadSelectedTask();
  }}
  className="px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition"
>
  Từ chối
</button>
              </>
            )}
          </div>

          <button
              onClick={closeModal}
              className={`
                px-4 py-2
                rounded-xl
                transition
                shrink-0
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
        {showEditTask && (
  <EditTaskModal
    task={selectedTask}
    onClose={() => setShowEditTask(false)}
    onUpdated={async () => {
      await reloadSelectedTask();
    }}
  />
)}
{showSubtaskAssign && (
  <SubtaskAssignModal
    task={selectedTask}
    onClose={() => setShowSubtaskAssign(false)}
    onCreated={async () => {
      setShowSubtaskAssign(false);

      await reloadSelectedTask();

      setShowSubtasks(true);

      setTimeout(() => {
        subtaskSectionRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 100);

      setFlashSubtasks(true);

      setTimeout(() => {
        setFlashSubtasks(false);
      }, 1400);
    }}
  />
)}
{editingSubtask && (
  <EditSubtaskModal
    task={selectedTask}
    subtask={editingSubtask}
    onClose={() => setEditingSubtask(null)}
    onUpdated={async () => {
      await reloadSelectedTask();
    }}
  />
)}
{submittingSubtask && (
  <SubmitSubtaskModal
    task={selectedTask}
    subtask={submittingSubtask}
    onClose={() => setSubmittingSubtask(null)}
    onSubmitted={async () => {
      setSubmittingSubtask(null);

      await reloadSelectedTask();

      focusSubtaskSection();
    }}
  />
)}
      </div>
    </div>
  );
}