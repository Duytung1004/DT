import { useEffect, useState } from "react";
import {
  Trash2,
  RotateCcw,
  ClipboardList,
  FileText,
  RefreshCcw,
} from "lucide-react";

import api from "../services/api";
import socket from "../socket/socket";

const formatDate = (dateString) => {
  if (!dateString) return "—";

  return new Date(dateString).toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};
const getTrashRemainingDays = (deletedAt, retentionDays = 30) => {
  if (!deletedAt) return null;

  const deletedDate = new Date(deletedAt);
  const expireDate = new Date(deletedDate);

  expireDate.setDate(
    expireDate.getDate() + Number(retentionDays || 30)
  );

  const now = new Date();

  const diffTime = expireDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
};

export default function Trash() {
  const [activeTab, setActiveTab] = useState("tasks");

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

  const [tasks, setTasks] = useState([]);
  const [documents, setDocuments] = useState([]);

const [loading, setLoading] = useState(true);
const [restoringId, setRestoringId] = useState(null);
const [cleaning, setCleaning] = useState(false);

const [selectedTasks, setSelectedTasks] = useState([]);
const [selectedDocuments, setSelectedDocuments] = useState([]);
const [trashRetentionDays, setTrashRetentionDays] = useState(30);
const [confirmModal, setConfirmModal] = useState({
  open: false,
  type: null,
});
  const fetchTrash = async () => {
  try {
    setLoading(true);

    const res = await api.get("/trash");
    const settingRes = await api.get("/system-settings");

    setTasks(res.data.tasks || []);
    setDocuments(res.data.documents || []);

    setTrashRetentionDays(
      Number(settingRes.data.trash_retention_days || 30)
    );

    setSelectedTasks([]);
    setSelectedDocuments([]);
  } catch (err) {
    console.error("FETCH TRASH ERROR:", err);

    alert(
      err.response?.data?.message ||
        "Lỗi tải dữ liệu thùng rác"
    );
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
    fetchTrash();
  }, []);

  useEffect(() => {
    const handleRealtime = () => {
      fetchTrash();
    };

    socket.on("task:changed", handleRealtime);
    socket.on("document:changed", handleRealtime);

    return () => {
      socket.off("task:changed", handleRealtime);
      socket.off("document:changed", handleRealtime);
    };
  }, []);

  const handleRestoreTask = async (taskId) => {
    const ok = window.confirm(
      "Bạn có chắc muốn khôi phục nhiệm vụ này không?"
    );

    if (!ok) return;

    try {
      setRestoringId(`task-${taskId}`);

      await api.patch(`/trash/tasks/${taskId}/restore`);

      await fetchTrash();

      alert("Đã khôi phục nhiệm vụ");
    } catch (err) {
      console.error("RESTORE TASK ERROR:", err);

      alert(
        err.response?.data?.message ||
          "Lỗi khôi phục nhiệm vụ"
      );
    } finally {
      setRestoringId(null);
    }
  };

  const handleRestoreDocument = async (documentId) => {
    const ok = window.confirm(
      "Bạn có chắc muốn khôi phục văn bản này không?"
    );

    if (!ok) return;

    try {
      setRestoringId(`document-${documentId}`);

      await api.patch(
        `/trash/documents/${documentId}/restore`
      );

      await fetchTrash();

      alert("Đã khôi phục văn bản");
    } catch (err) {
      console.error("RESTORE DOCUMENT ERROR:", err);

      alert(
        err.response?.data?.message ||
          "Lỗi khôi phục văn bản"
      );
    } finally {
      setRestoringId(null);
    }
  };
  const toggleTaskSelection = (taskId) => {
  setSelectedTasks((prev) =>
    prev.includes(taskId)
      ? prev.filter((id) => id !== taskId)
      : [...prev, taskId]
  );
};

const toggleDocumentSelection = (documentId) => {
  setSelectedDocuments((prev) =>
    prev.includes(documentId)
      ? prev.filter((id) => id !== documentId)
      : [...prev, documentId]
  );
};

const toggleSelectAllTasks = () => {
  if (selectedTasks.length === tasks.length) {
    setSelectedTasks([]);
  } else {
    setSelectedTasks(tasks.map((task) => task.id));
  }
};

const toggleSelectAllDocuments = () => {
  if (selectedDocuments.length === documents.length) {
    setSelectedDocuments([]);
  } else {
    setSelectedDocuments(documents.map((doc) => doc.id));
  }
};

const openDeletePermanentModal = (type) => {
  if (type === "tasks" && selectedTasks.length === 0) {
    alert("Vui lòng chọn ít nhất một nhiệm vụ để xóa vĩnh viễn");
    return;
  }

  if (type === "documents" && selectedDocuments.length === 0) {
    alert("Vui lòng chọn ít nhất một văn bản để xóa vĩnh viễn");
    return;
  }

  setConfirmModal({
    open: true,
    type,
  });
};

const closeDeletePermanentModal = () => {
  setConfirmModal({
    open: false,
    type: null,
  });
};

const handleConfirmDeletePermanent = async () => {
  try {
    if (confirmModal.type === "tasks") {
      for (const taskId of selectedTasks) {
        await api.delete(`/trash/tasks/${taskId}/permanent`);
      }

      setSelectedTasks([]);
      alert("Đã xóa vĩnh viễn nhiệm vụ đã chọn");
    }

    if (confirmModal.type === "documents") {
      for (const documentId of selectedDocuments) {
        await api.delete(
          `/trash/documents/${documentId}/permanent`
        );
      }

      setSelectedDocuments([]);
      alert("Đã xóa vĩnh viễn văn bản đã chọn");
    }

    closeDeletePermanentModal();
    fetchTrash();
  } catch (err) {
    console.error("DELETE PERMANENT ERROR:", err);

    alert(
      err.response?.data?.message ||
        "Lỗi xóa vĩnh viễn dữ liệu"
    );
  }
};
const handleCleanupExpiredTrash = async () => {
  const ok = window.confirm(
    "Bạn có chắc muốn dọn toàn bộ dữ liệu đã quá thời gian lưu trong thùng rác không? Hành động này sẽ xóa vĩnh viễn dữ liệu quá hạn."
  );

  if (!ok) return;

  try {
    setCleaning(true);

    const res = await api.post("/trash/cleanup");

    await fetchTrash();

    alert(
      `Dọn thùng rác thành công.\n` +
        `Nhiệm vụ đã xóa: ${res.data.deleted_tasks || 0}\n` +
        `Văn bản đã xóa: ${res.data.deleted_documents || 0}`
    );
  } catch (err) {
    console.error("CLEANUP TRASH ERROR:", err);

    alert(
      err.response?.data?.message ||
        "Lỗi dọn thùng rác quá hạn"
    );
  } finally {
    setCleaning(false);
  }
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

const softPanelClass = `
  rounded-2xl
  border
  ${
    isDark
      ? "bg-slate-950 border-slate-800"
      : "bg-gray-50 border-gray-100"
  }
`;

  return (
    <div className={pageClass}>
      {/* HEADER */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className={`text-2xl font-bold ${titleClass}`}>
  Thùng rác
</h1>

<p className={`text-sm mt-1 ${mutedClass}`}>
  Quản lý các nhiệm vụ và văn bản đã bị xóa mềm.
</p>
        </div>

        <div className="flex items-center gap-3">
  <button
    onClick={handleCleanupExpiredTrash}
    disabled={cleaning}
    className="
      flex items-center gap-2
      px-4 py-2
      rounded-2xl
      bg-red-50
      border border-red-100
      text-red-600
      hover:bg-red-100
      shadow-sm
      transition
      font-medium
      disabled:opacity-60
      disabled:cursor-not-allowed
    "
  >
    <Trash2 size={16} />
    {cleaning ? "Đang dọn..." : "Dọn dữ liệu quá hạn"}
  </button>

  <button
    onClick={fetchTrash}
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
      </div>

      {/* SUMMARY */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className={`${panelClass} p-5`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${mutedClass}`}>
                Nhiệm vụ đã xóa
              </p>

              <p className={`text-3xl font-bold mt-2 ${titleClass}`}>
                {tasks.length}
              </p>
            </div>

            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center">
              <ClipboardList size={22} />
            </div>
          </div>
        </div>

        <div className={`${panelClass} p-5`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${mutedClass}`}>
                Văn bản đã xóa
              </p>

              <p className={`text-3xl font-bold mt-2 ${titleClass}`}>
                {documents.length}
              </p>
            </div>

            <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center">
              <FileText size={22} />
            </div>
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className={`${panelClass} overflow-hidden`}>
        {/* TABS */}
        <div
  className={`p-4 border-b flex gap-2 ${
    isDark ? "border-slate-800" : "border-gray-100"
  }`}
>
          <button
            onClick={() => setActiveTab("tasks")}
            className={`
              px-4 py-2
              rounded-2xl
              text-sm
              font-medium
              transition
              ${
                activeTab === "tasks"
  ? "bg-blue-500 text-white shadow-sm"
  : isDark
  ? "bg-slate-800 text-gray-300 hover:bg-slate-700"
  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }
            `}
          >
            Nhiệm vụ
          </button>

          <button
            onClick={() => setActiveTab("documents")}
            className={`
              px-4 py-2
              rounded-2xl
              text-sm
              font-medium
              transition
              ${
                activeTab === "documents"
  ? "bg-blue-500 text-white shadow-sm"
  : isDark
  ? "bg-slate-800 text-gray-300 hover:bg-slate-700"
  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }
            `}
          >
            Văn bản
          </button>
        </div>

        {loading ? (
          <div className={`p-8 text-center ${mutedClass}`}>
  Đang tải dữ liệu...
</div>
        ) : activeTab === "tasks" ? (
          <div className="p-4">
  {tasks.length > 0 && (
    <div className="mb-4 flex items-center justify-between gap-3">
      <p className={`text-sm ${mutedClass}`}>
  Đã chọn{" "}
  <span className={`font-semibold ${titleClass}`}>
    {selectedTasks.length}
  </span>{" "}
  nhiệm vụ
</p>

      <button
        onClick={() => openDeletePermanentModal("tasks")}
        disabled={selectedTasks.length === 0}
        className="
          inline-flex items-center gap-2
          px-4 py-2
          rounded-2xl
          bg-red-50
          text-red-600
          hover:bg-red-100
          transition
          text-sm
          font-semibold
          disabled:opacity-50
          disabled:cursor-not-allowed
        "
      >
        <Trash2 size={16} />
        Xóa vĩnh viễn đã chọn
      </button>
    </div>
  )}

  {tasks.length === 0 ? (
              <div className={`py-12 text-center ${mutedClass}`}>
                <Trash2
                  className="mx-auto mb-3 text-gray-400"
                  size={36}
                />

                <p className="font-medium">
                  Không có nhiệm vụ nào trong thùng rác
                </p>

                <p className={`text-xs mt-1 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                  Các nhiệm vụ đã xóa sẽ hiển thị tại đây.
                </p>
              </div>
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
    <th className="py-3 w-10">
      <input
        type="checkbox"
        checked={
          tasks.length > 0 &&
          selectedTasks.length === tasks.length
        }
        onChange={toggleSelectAllTasks}
        className="w-4 h-4 accent-blue-500"
      />
    </th>

    <th className="py-3 font-medium">
      Nhiệm vụ
    </th>

                      <th className="py-3 font-medium">
                        Phòng ban
                      </th>

                      <th className="py-3 font-medium">
                        Người thực hiện
                      </th>

                      <th className="py-3 font-medium">
                        Trạng thái
                      </th>

                      <th className="py-3 font-medium">
                        Ngày xóa
                      </th>

                      <th className="py-3 font-medium text-right">
                        Thao tác
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {tasks.map((task) => (
                      <tr
  key={task.id}
  className={`border-b last:border-0 transition ${
    isDark
      ? "border-slate-800 hover:bg-slate-800/70"
      : "border-gray-100 hover:bg-gray-50"
  }`}
>
  <td className="py-3">
    <input
      type="checkbox"
      checked={selectedTasks.includes(task.id)}
      onChange={() => toggleTaskSelection(task.id)}
      className="w-4 h-4 accent-blue-500"
    />
  </td>

  <td className="py-3">
    <p className={`font-medium ${titleClass}`}>
  {task.tieu_de}
</p>

                          <p className="text-xs text-gray-400 mt-1 line-clamp-1 max-w-[360px]">
                            {task.mo_ta || "Không có mô tả"}
                          </p>
                        </td>

                        <td className={`py-3 ${mutedClass}`}>
                          {task.unit_name || "—"}
                        </td>

                        <td className={`py-3 ${mutedClass}`}>
                          {task.assignee_name || "—"}
                        </td>

                        <td className="py-3">
                          <span
  className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
    isDark
      ? "bg-slate-800 text-gray-300"
      : "bg-gray-100 text-gray-600"
  }`}
>
  {task.status_name || "—"}
</span>
                        </td>

                        <td className={`py-3 ${mutedClass}`}>
  <div>
    <p>{formatDate(task.deleted_at)}</p>

    {(() => {
      const remainingDays = getTrashRemainingDays(
        task.deleted_at,
        trashRetentionDays
      );

      return (
        <p
          className={`text-xs mt-1 ${
            remainingDays <= 0
              ? "text-red-500"
              : remainingDays <= 7
              ? "text-orange-500"
              : "text-gray-400"
          }`}
        >
          {remainingDays <= 0
            ? "Đã quá thời gian lưu trữ"
            : `Còn ${remainingDays} ngày`}
        </p>
      );
    })()}
  </div>
</td>

                        <td className="py-3 text-right">
                          <button
                            disabled={
                              restoringId === `task-${task.id}`
                            }
                            onClick={() =>
                              handleRestoreTask(task.id)
                            }
                            className="
                              inline-flex items-center gap-1
                              px-3 py-1.5
                              rounded-xl
                              bg-green-50
                              text-green-600
                              hover:bg-green-100
                              transition
                              text-xs
                              font-medium
                              disabled:opacity-60
                              disabled:cursor-not-allowed
                            "
                          >
                            <RotateCcw size={14} />
                            {restoringId === `task-${task.id}`
                              ? "Đang khôi phục..."
                              : "Khôi phục"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div className="p-4">
  {documents.length > 0 && (
    <div className="mb-4 flex items-center justify-between gap-3">
     <p className={`text-sm ${mutedClass}`}>
  Đã chọn{" "}
  <span className={`font-semibold ${titleClass}`}>
    {selectedDocuments.length}
  </span>{" "}
  văn bản
</p>

      <button
        onClick={() => openDeletePermanentModal("documents")}
        disabled={selectedDocuments.length === 0}
        className="
          inline-flex items-center gap-2
          px-4 py-2
          rounded-2xl
          bg-red-50
          text-red-600
          hover:bg-red-100
          transition
          text-sm
          font-semibold
          disabled:opacity-50
          disabled:cursor-not-allowed
        "
      >
        <Trash2 size={16} />
        Xóa vĩnh viễn đã chọn
      </button>
    </div>
  )}

  {documents.length === 0 ? (
              <div className={`py-12 text-center ${mutedClass}`}>
                <Trash2
                  className="mx-auto mb-3 text-gray-400"
                  size={36}
                />

                <p className="font-medium">
                  Không có văn bản nào trong thùng rác
                </p>

                <p className={`text-xs mt-1 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
  Các văn bản đã xóa sẽ hiển thị tại đây.
</p>
              </div>
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
    <th className="py-3 w-10">
      <input
        type="checkbox"
        checked={
          documents.length > 0 &&
          selectedDocuments.length === documents.length
        }
        onChange={toggleSelectAllDocuments}
        className="w-4 h-4 accent-blue-500"
      />
    </th>

    <th className="py-3 font-medium">
      Văn bản
    </th>

                      <th className="py-3 font-medium">
                        Người tạo
                      </th>

                      <th className="py-3 font-medium">
                        Phòng ban
                      </th>

                      <th className="py-3 font-medium">
                        Trạng thái
                      </th>

                      <th className="py-3 font-medium">
                        Ngày xóa
                      </th>

                      <th className="py-3 font-medium text-right">
                        Thao tác
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {documents.map((doc) => (
                      <tr
  key={doc.id}
  className={`border-b last:border-0 transition ${
    isDark
      ? "border-slate-800 hover:bg-slate-800/70"
      : "border-gray-100 hover:bg-gray-50"
  }`}
>
  <td className="py-3">
    <input
      type="checkbox"
      checked={selectedDocuments.includes(doc.id)}
      onChange={() => toggleDocumentSelection(doc.id)}
      className="w-4 h-4 accent-blue-500"
    />
  </td>

  <td className="py-3">
    <p className={`font-medium ${titleClass}`}>
  {doc.tieu_de}
</p>

                          <p className="text-xs text-gray-400 mt-1 line-clamp-1 max-w-[360px]">
                            {doc.trich_yeu ||
                              doc.file_name ||
                              doc.so_ky_hieu ||
                              "—"}
                          </p>
                        </td>

                        <td className={`py-3 ${mutedClass}`}>
                          {doc.created_by_name || "—"}
                        </td>

                        <td className={`py-3 ${mutedClass}`}>
                          {doc.unit_name || "—"}
                        </td>

                        <td className="py-3">
                          <span
  className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
    isDark
      ? "bg-slate-800 text-gray-300"
      : "bg-gray-100 text-gray-600"
  }`}
>
                            {doc.workflow_status ||
                              doc.status ||
                              "—"}
                          </span>
                        </td>

                        <td className={`py-3 ${mutedClass}`}>
  <div>
    <p>{formatDate(doc.deleted_at)}</p>

    {(() => {
      const remainingDays = getTrashRemainingDays(
        doc.deleted_at,
        trashRetentionDays
      );

      return (
        <p
          className={`text-xs mt-1 ${
            remainingDays <= 0
              ? "text-red-500"
              : remainingDays <= 7
              ? "text-orange-500"
              : "text-gray-400"
          }`}
        >
          {remainingDays <= 0
            ? "Đã quá thời gian lưu trữ"
            : `Còn ${remainingDays} ngày`}
        </p>
      );
    })()}
  </div>
</td>

                        <td className="py-3 text-right">
                          <button
                            disabled={
                              restoringId ===
                              `document-${doc.id}`
                            }
                            onClick={() =>
                              handleRestoreDocument(doc.id)
                            }
                            className="
                              inline-flex items-center gap-1
                              px-3 py-1.5
                              rounded-xl
                              bg-green-50
                              text-green-600
                              hover:bg-green-100
                              transition
                              text-xs
                              font-medium
                              disabled:opacity-60
                              disabled:cursor-not-allowed
                            "
                          >
                            <RotateCcw size={14} />
                            {restoringId === `document-${doc.id}`
                              ? "Đang khôi phục..."
                              : "Khôi phục"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
            </div>

      {confirmModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div
  className={`
    rounded-[28px]
    shadow-xl
    w-full max-w-md
    p-6
    ${
      isDark
        ? "bg-slate-900 border border-slate-800"
        : "bg-white"
    }
  `}
>
            <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mb-4">
              <Trash2 size={26} />
            </div>

            <h2 className={`text-xl font-bold ${titleClass}`}>
  Xóa vĩnh viễn dữ liệu?
</h2>

            <p className={`text-sm mt-3 leading-relaxed ${mutedClass}`}>
              Hành động này sẽ xóa vĩnh viễn{" "}
              <span className={`font-semibold ${titleClass}`}>
                {confirmModal.type === "tasks"
                  ? selectedTasks.length
                  : selectedDocuments.length}
              </span>{" "}
              {confirmModal.type === "tasks"
                ? "nhiệm vụ"
                : "văn bản"}{" "}
              đã chọn. Sau khi xóa, dữ liệu sẽ không thể khôi phục.
            </p>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={closeDeletePermanentModal}
               className={`
  px-4 py-2
  rounded-2xl
  transition
  font-medium
  ${
    isDark
      ? "bg-slate-800 text-gray-300 hover:bg-slate-700"
      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
  }
`}
              >
                Hủy
              </button>

              <button
                onClick={handleConfirmDeletePermanent}
                className="
                  px-4 py-2
                  rounded-2xl
                  bg-red-500
                  text-white
                  hover:bg-red-600
                  transition
                  font-semibold
                "
              >
                Xóa vĩnh viễn
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}