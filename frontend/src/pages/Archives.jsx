import { useEffect, useMemo, useState } from "react";
import {
  Archive,
  Building2,
  Calendar,
  ClipboardList,
  FileText,
  Folder,
  FolderOpen,
  Paperclip,
  RefreshCw,
  Search,
} from "lucide-react";
import api from "../services/api";

const formatDate = (value) => {
  if (!value) return "Chưa có";
  return new Date(value).toLocaleDateString("vi-VN");
};

const getMonthKey = (value) => {
  if (!value) return "Không rõ thời gian";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Không rõ thời gian";

  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  return `Tháng ${month}/${year}`;
};

export default function Archives() {
  const [records, setRecords] = useState([]);
  const [activeFolder, setActiveFolder] = useState({
    type: "all",
    value: "all",
    label: "Tất cả hồ sơ",
  });

  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedArchive, setSelectedArchive] = useState(null);
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

  const fetchArchives = async () => {
    try {
      setLoading(true);

      const [taskRes, documentRes] = await Promise.all([
        api.get("/tasks"),
        api.get("/documents", {
          params: {
            page: 1,
            limit: 100,
          },
        }),
      ]);

      const tasks = Array.isArray(taskRes.data) ? taskRes.data : [];

      const documents = Array.isArray(documentRes.data?.data)
        ? documentRes.data.data
        : Array.isArray(documentRes.data)
        ? documentRes.data
        : [];

      const taskArchives = tasks
        .filter(
          (task) =>
            task.archived_at ||
            task.completed_at ||
            task.status_code === "hoan_thanh" ||
            task.display_status_code === "hoan_thanh"
        )
        .map((task) => ({
          id: `task-${task.id}`,
          raw_id: task.id,
          archive_type: "task",
          type_label: "Nhiệm vụ hoàn thành",
          title: task.tieu_de || "Nhiệm vụ không có tiêu đề",
          description: task.mo_ta || "",
          unit_name: task.unit_name || "Chưa xác định phòng ban",
          archived_at:
            task.archived_at ||
            task.completed_at ||
            task.updated_at ||
            task.created_at,
          status_name:
            task.status_name ||
            task.display_status_code ||
            task.status_code ||
            "Hoàn thành",
          assignee_name: task.assignee_name || "Chưa rõ",
          file_path: null,
          file_name: null,
        }));

      const documentArchives = documents
        .filter(
          (doc) =>
            doc.archived_at ||
            doc.workflow_status === "task_created" ||
            doc.status === "da_tao_nhiem_vu"
        )
        .map((doc) => ({
          id: `document-${doc.id}`,
          raw_id: doc.id,
          archive_type: "document",
          type_label: "Văn bản",
          title:
            doc.tieu_de ||
            doc.so_ky_hieu ||
            "Văn bản không có tiêu đề",
          description: doc.trich_yeu || "",
          unit_name: doc.unit_name || "Văn phòng Đảng ủy",
          archived_at:
            doc.archived_at ||
            doc.updated_at ||
            doc.ngay_nhan ||
            doc.created_at,
          status_name:
            doc.workflow_status ||
            doc.status ||
            "Đã xử lý",
          assignee_name:
            doc.created_by_name ||
            doc.nguoi_tao_name ||
            "Văn thư",
          file_path: doc.file_path,
          file_name: doc.file_name,
        }));

      setRecords([...taskArchives, ...documentArchives]);
    } catch (err) {
      console.log("FETCH ARCHIVES ERROR:", err);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArchives();
  }, []);

  const folders = useMemo(() => {
    const units = Array.from(
      new Set(records.map((item) => item.unit_name).filter(Boolean))
    );

    const months = Array.from(
      new Set(records.map((item) => getMonthKey(item.archived_at)))
    );

    return [
      {
        type: "all",
        value: "all",
        label: "Tất cả hồ sơ",
        icon: "folder",
      },
      {
        type: "type",
        value: "task",
        label: "Nhiệm vụ hoàn thành",
        icon: "task",
      },
      {
        type: "type",
        value: "document",
        label: "Văn bản đã xử lý",
        icon: "document",
      },
      {
        type: "group-title",
        value: "unit-title",
        label: "Theo phòng ban",
      },
      ...units.map((unit) => ({
        type: "unit",
        value: unit,
        label: unit,
        icon: "unit",
      })),
      {
        type: "group-title",
        value: "month-title",
        label: "Theo thời gian",
      },
      ...months.map((month) => ({
        type: "month",
        value: month,
        label: month,
        icon: "month",
      })),
    ];
  }, [records]);

  const filteredRecords = useMemo(() => {
    return records.filter((item) => {
      const matchFolder =
        activeFolder.type === "all"
          ? true
          : activeFolder.type === "type"
          ? item.archive_type === activeFolder.value
          : activeFolder.type === "unit"
          ? item.unit_name === activeFolder.value
          : activeFolder.type === "month"
          ? getMonthKey(item.archived_at) === activeFolder.value
          : true;

      const search = keyword.trim().toLowerCase();

      const matchKeyword =
        !search ||
        item.title?.toLowerCase().includes(search) ||
        item.description?.toLowerCase().includes(search) ||
        item.unit_name?.toLowerCase().includes(search) ||
        item.assignee_name?.toLowerCase().includes(search);

      return matchFolder && matchKeyword;
    });
  }, [records, activeFolder, keyword]);

  const stats = useMemo(() => {
    const taskCount = records.filter(
      (item) => item.archive_type === "task"
    ).length;

    const documentCount = records.filter(
      (item) => item.archive_type === "document"
    ).length;

    const unitCount = new Set(records.map((item) => item.unit_name)).size;

    return {
      total: records.length,
      taskCount,
      documentCount,
      unitCount,
    };
  }, [records]);

  const openFile = (filePath) => {
    if (!filePath) return;

    const baseURL =
      import.meta.env.VITE_API_URL?.replace("/api", "") ||
      "http://localhost:3000";

    window.open(`${baseURL}${filePath}`, "_blank");
  };

  const getFolderIcon = (folder) => {
    const active =
      activeFolder.type === folder.type &&
      activeFolder.value === folder.value;

    if (active) return <FolderOpen size={18} />;

    if (folder.icon === "task") return <ClipboardList size={18} />;
    if (folder.icon === "document") return <FileText size={18} />;
    if (folder.icon === "unit") return <Building2 size={18} />;
    if (folder.icon === "month") return <Calendar size={18} />;

    return <Folder size={18} />;
  };

  return (
    <div
      className={`
        min-h-screen
        p-4 md:p-6
        ${
          isDark
            ? "bg-slate-950 text-gray-100"
            : "bg-gray-50 text-gray-900"
        }
      `}
    >
      {/* HEADER */}
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div
              className={`
                w-12 h-12
                rounded-2xl
                flex items-center justify-center
                shadow
                ${
                  isDark
                    ? "bg-blue-600 text-white"
                    : "bg-blue-500 text-white"
                }
              `}
            >
              <Archive size={24} />
            </div>

            <div>
              <h1 className="text-2xl font-bold">
                Kho lưu trữ hồ sơ
              </h1>
              <p
                className={`text-sm mt-1 ${
                  isDark ? "text-gray-400" : "text-gray-500"
                }`}
              >
                Quản lý hồ sơ nhiệm vụ, văn bản, báo cáo và minh chứng đã xử lý
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={fetchArchives}
          disabled={loading}
          className={`
            px-4 py-3
            rounded-2xl
            flex items-center
            gap-2
            text-sm
            font-semibold
            transition
            disabled:opacity-60
            ${
              isDark
                ? "bg-slate-800 hover:bg-slate-700 text-gray-100"
                : "bg-white hover:bg-gray-100 text-gray-700 shadow-sm"
            }
          `}
        >
          <RefreshCw
            size={16}
            className={loading ? "animate-spin" : ""}
          />
          Làm mới
        </button>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div
          className={`
            rounded-3xl p-4 border
            ${
              isDark
                ? "bg-slate-900 border-slate-800"
                : "bg-white border-gray-200"
            }
          `}
        >
          <p className="text-sm opacity-70">Tổng hồ sơ</p>
          <p className="text-2xl font-bold mt-1">{stats.total}</p>
        </div>

        <div
          className={`
            rounded-3xl p-4 border
            ${
              isDark
                ? "bg-slate-900 border-slate-800"
                : "bg-white border-gray-200"
            }
          `}
        >
          <p className="text-sm opacity-70">Nhiệm vụ</p>
          <p className="text-2xl font-bold mt-1">{stats.taskCount}</p>
        </div>

        <div
          className={`
            rounded-3xl p-4 border
            ${
              isDark
                ? "bg-slate-900 border-slate-800"
                : "bg-white border-gray-200"
            }
          `}
        >
          <p className="text-sm opacity-70">Văn bản</p>
          <p className="text-2xl font-bold mt-1">{stats.documentCount}</p>
        </div>

        <div
          className={`
            rounded-3xl p-4 border
            ${
              isDark
                ? "bg-slate-900 border-slate-800"
                : "bg-white border-gray-200"
            }
          `}
        >
          <p className="text-sm opacity-70">Phòng ban</p>
          <p className="text-2xl font-bold mt-1">{stats.unitCount}</p>
        </div>
      </div>

      {/* MAIN */}
      <div className="grid grid-cols-1 lg:grid-cols-[290px_1fr] gap-5">
        {/* LEFT TREE */}
        <div
          className={`
            rounded-3xl
            border
            overflow-hidden
            ${
              isDark
                ? "bg-slate-900 border-slate-800"
                : "bg-white border-gray-200"
            }
          `}
        >
          <div
            className={`
              px-4 py-4
              border-b
              ${
                isDark
                  ? "border-slate-800"
                  : "border-gray-200"
              }
            `}
          >
            <h2 className="font-bold">Thư mục lưu trữ</h2>
            <p className="text-xs opacity-60 mt-1">
              Sắp xếp theo loại, phòng ban và thời gian
            </p>
          </div>

          <div className="p-3 space-y-1 max-h-[68vh] overflow-y-auto">
            {folders.map((folder) => {
              if (folder.type === "group-title") {
                return (
                  <div
                    key={folder.value}
                    className="px-3 pt-4 pb-2 text-xs font-bold uppercase opacity-50"
                  >
                    {folder.label}
                  </div>
                );
              }

              const active =
                activeFolder.type === folder.type &&
                activeFolder.value === folder.value;

              return (
                <button
                  key={`${folder.type}-${folder.value}`}
                  onClick={() => setActiveFolder(folder)}
                  className={`
                    w-full
                    flex items-center
                    gap-3
                    px-3 py-2.5
                    rounded-2xl
                    text-left
                    text-sm
                    transition
                    ${
                      active
                        ? isDark
                          ? "bg-blue-600 text-white"
                          : "bg-blue-500 text-white"
                        : isDark
                        ? "hover:bg-slate-800 text-gray-300"
                        : "hover:bg-gray-100 text-gray-700"
                    }
                  `}
                >
                  <span className="shrink-0">
                    {getFolderIcon(folder)}
                  </span>
                  <span className="truncate">{folder.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* RIGHT CONTENT */}
        <div
          className={`
            rounded-3xl
            border
            overflow-hidden
            ${
              isDark
                ? "bg-slate-900 border-slate-800"
                : "bg-white border-gray-200"
            }
          `}
        >
          {/* TOOLBAR */}
          <div
            className={`
              p-4
              border-b
              flex flex-col
              md:flex-row
              gap-3
              md:items-center
              md:justify-between
              ${
                isDark
                  ? "border-slate-800"
                  : "border-gray-200"
              }
            `}
          >
            <div>
              <h2 className="font-bold">
                {activeFolder.label}
              </h2>
              <p className="text-xs opacity-60 mt-1">
                {filteredRecords.length} hồ sơ trong thư mục này
              </p>
            </div>

            <div
              className={`
                flex items-center
                gap-2
                px-3 py-2
                rounded-2xl
                border
                w-full md:w-[320px]
                ${
                  isDark
                    ? "bg-slate-950 border-slate-800"
                    : "bg-gray-50 border-gray-200"
                }
              `}
            >
              <Search size={16} className="opacity-50" />
              <input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Tìm hồ sơ, văn bản, phòng ban..."
                className={`
                  bg-transparent
                  outline-none
                  text-sm
                  w-full
                  ${
                    isDark
                      ? "placeholder:text-gray-500"
                      : "placeholder:text-gray-400"
                  }
                `}
              />
            </div>
          </div>

          {/* LIST */}
          <div className="p-4">
            {loading ? (
              <div className="py-16 text-center opacity-60">
                Đang tải kho lưu trữ...
              </div>
            ) : filteredRecords.length === 0 ? (
              <div className="py-16 text-center opacity-60">
                Chưa có hồ sơ lưu trữ phù hợp
              </div>
            ) : (
              <div className="space-y-3">
                {filteredRecords.map((item) => (
                  <div
                    key={item.id}
                    className={`
                      rounded-3xl
                      border
                      p-4
                      flex flex-col
                      xl:flex-row
                      xl:items-center
                      xl:justify-between
                      gap-4
                      transition
                      ${
                        isDark
                          ? "bg-slate-950 border-slate-800 hover:bg-slate-900"
                          : "bg-gray-50 border-gray-200 hover:bg-white"
                      }
                    `}
                  >
                    <div className="flex items-start gap-4 min-w-0">
                      <div
                        className={`
                          w-12 h-12
                          rounded-2xl
                          flex items-center justify-center
                          shrink-0
                          ${
                            item.archive_type === "task"
                              ? isDark
                                ? "bg-emerald-950 text-emerald-300"
                                : "bg-emerald-100 text-emerald-700"
                              : isDark
                              ? "bg-blue-950 text-blue-300"
                              : "bg-blue-100 text-blue-700"
                          }
                        `}
                      >
                        {item.archive_type === "task" ? (
                          <ClipboardList size={22} />
                        ) : (
                          <FileText size={22} />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-bold truncate">
                            {item.title}
                          </h3>

                          <span
                            className={`
                              px-2.5 py-1
                              rounded-full
                              text-xs
                              font-semibold
                              ${
                                isDark
                                  ? "bg-slate-800 text-gray-300"
                                  : "bg-white text-gray-600"
                              }
                            `}
                          >
                            {item.type_label}
                          </span>
                        </div>

                        {item.description && (
                          <p className="text-sm opacity-70 mt-1 line-clamp-2">
                            {item.description}
                          </p>
                        )}

                        <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs opacity-70 mt-3">
                          <span className="flex items-center gap-1">
                            <Building2 size={13} />
                            {item.unit_name}
                          </span>

                          <span className="flex items-center gap-1">
                            <Calendar size={13} />
                            {formatDate(item.archived_at)}
                          </span>

                          <span>
                            Người phụ trách: {item.assignee_name}
                          </span>

                          <span>
                            Trạng thái: {item.status_name}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {item.file_path && (
                        <button
                          onClick={() => openFile(item.file_path)}
                          className={`
                            px-4 py-2
                            rounded-2xl
                            text-sm
                            font-semibold
                            flex items-center gap-2
                            transition
                            ${
                              isDark
                                ? "bg-slate-800 hover:bg-slate-700 text-gray-100"
                                : "bg-white hover:bg-gray-100 text-gray-700 border border-gray-200"
                            }
                          `}
                        >
                          <Paperclip size={15} />
                          Mở file
                        </button>
                      )}

                      <button
                        onClick={() => setSelectedArchive(item)}
                        className={`
                          px-4 py-2
                          rounded-2xl
                          text-sm
                          font-semibold
                          transition
                          ${
                            isDark
                              ? "bg-blue-600 hover:bg-blue-500 text-white"
                              : "bg-blue-500 hover:bg-blue-600 text-white"
                          }
                        `}
                      >
                        Hồ sơ #{item.raw_id}
                    </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      {selectedArchive && (
  <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
    <div
      className={`
        w-full max-w-3xl rounded-3xl p-6
        ${isDark ? "bg-slate-900 text-white" : "bg-white"}
      `}
    >
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">
          Chi tiết hồ sơ #{selectedArchive.raw_id}
        </h2>

        <button
          onClick={() => setSelectedArchive(null)}
          className="px-3 py-2 rounded-xl bg-red-500 text-white"
        >
          Đóng
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <strong>Tiêu đề:</strong>
          <p>{selectedArchive.title}</p>
        </div>

        <div>
          <strong>Mô tả:</strong>
          <p>{selectedArchive.description || "Không có mô tả"}</p>
        </div>

        <div>
          <strong>Loại hồ sơ:</strong>
          <p>{selectedArchive.type_label}</p>
        </div>

        <div>
          <strong>Phòng ban:</strong>
          <p>{selectedArchive.unit_name}</p>
        </div>

        <div>
          <strong>Người phụ trách:</strong>
          <p>{selectedArchive.assignee_name}</p>
        </div>

        <div>
          <strong>Ngày lưu trữ:</strong>
          <p>{formatDate(selectedArchive.archived_at)}</p>
        </div>

        <div>
          <strong>Trạng thái:</strong>
          <p>{selectedArchive.status_name}</p>
        </div>
      </div>
    </div>
  </div>
)}
    </div>
  );
}