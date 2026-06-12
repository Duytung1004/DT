import { useEffect, useState } from "react";
import {
  History,
  RefreshCcw,
  Search,
  ShieldCheck,
  User,
  Database,
  Clock,
} from "lucide-react";

import api from "../../services/api";

const formatDateTime = (dateString) => {
  if (!dateString) return "—";

  return new Date(dateString).toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const getEntityLabel = (type) => {
  switch (type) {
    case "tasks":
      return "Nhiệm vụ";
    case "documents":
      return "Văn bản";
    case "users":
      return "Người dùng";
    case "trash":
      return "Thùng rác";
    case "messages":
      return "Tin nhắn";
    case "conversations":
      return "Cuộc trò chuyện";
    case "notifications":
      return "Thông báo";
    default:
      return type || "—";
  }
};

const getActionLabel = (action) => {
  switch (action) {
    case "create":
      return "Tạo mới";
    case "update":
      return "Cập nhật";
    case "delete":
      return "Xóa";
    case "restore":
      return "Khôi phục";
    case "submit":
      return "Nộp/Gửi";
    case "approve":
      return "Phê duyệt";
    case "reject":
      return "Từ chối";
    case "login":
      return "Đăng nhập";
    case "logout":
      return "Đăng xuất";
    default:
      return action || "—";
  }
};

const getActionClass = (action) => {
  switch (action) {
    case "delete":
      return "bg-red-50 text-red-600";
    case "restore":
      return "bg-green-50 text-green-600";
    case "create":
      return "bg-blue-50 text-blue-600";
    case "update":
      return "bg-yellow-50 text-yellow-600";
    case "approve":
      return "bg-emerald-50 text-emerald-600";
    case "reject":
      return "bg-orange-50 text-orange-600";
    default:
      return "bg-gray-100 text-gray-600";
  }
};

const safeJsonPreview = (value) => {
  if (!value) return "—";

  try {
    if (typeof value === "string") {
      return value;
    }

    return JSON.stringify(value, null, 2);
  } catch {
    return "—";
  }
};

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({
    entity_type: "all",
    action: "all",
    from: "",
    to: "",
    limit: 100,
  });

  const [selectedLog, setSelectedLog] = useState(null);

  const fetchLogs = async (customFilters = filters) => {
    try {
      setLoading(true);

      const res = await api.get("/audit-logs", {
        params: customFilters,
      });

      setLogs(res.data || []);
    } catch (err) {
      console.error("FETCH AUDIT LOGS ERROR:", err);

      alert(
        err.response?.data?.message ||
          "Không tải được nhật ký hệ thống"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleChange = (field, value) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleApplyFilter = () => {
    fetchLogs(filters);
  };

  const handleResetFilter = () => {
    const reset = {
      entity_type: "all",
      action: "all",
      from: "",
      to: "",
      limit: 100,
    };

    setFilters(reset);
    fetchLogs(reset);
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen space-y-6">
      {/* HEADER */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Nhật ký hệ thống
          </h1>

          <p className="text-gray-500 mt-1">
            Theo dõi các thao tác quan trọng như tạo, sửa, xóa, khôi phục và dọn dữ liệu.
          </p>
        </div>

        <button
          onClick={() => fetchLogs()}
          className="
            flex items-center gap-2
            px-4 py-2
            rounded-2xl
            bg-white
            border border-gray-100
            text-gray-600
            hover:bg-gray-50
            shadow-sm
            transition
          "
        >
          <RefreshCcw size={16} />
          Làm mới
        </button>
      </div>

      {/* OVERVIEW */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">
                Tổng số log đang xem
              </p>

              <p className="text-3xl font-bold text-gray-900 mt-2">
                {logs.length}
              </p>
            </div>

            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center">
              <History size={22} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">
                Log xóa dữ liệu
              </p>

              <p className="text-3xl font-bold text-gray-900 mt-2">
                {logs.filter((item) => item.action === "delete").length}
              </p>
            </div>

            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center">
              <Database size={22} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">
                Log gần nhất
              </p>

              <p className="text-sm font-semibold text-gray-900 mt-2">
                {logs[0]?.created_at
                  ? formatDateTime(logs[0].created_at)
                  : "—"}
              </p>
            </div>

            <div className="w-12 h-12 rounded-2xl bg-green-50 text-green-500 flex items-center justify-center">
              <Clock size={22} />
            </div>
          </div>
        </div>
      </div>

      {/* FILTER */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="text-xs font-semibold text-gray-500">
              Đối tượng
            </label>

            <select
              value={filters.entity_type}
              onChange={(e) =>
                handleChange("entity_type", e.target.value)
              }
              className="mt-2 w-full rounded-2xl bg-gray-100 px-4 py-3 text-sm outline-none"
            >
              <option value="all">Tất cả</option>
              <option value="tasks">Nhiệm vụ</option>
              <option value="documents">Văn bản</option>
              <option value="trash">Thùng rác</option>
              <option value="users">Người dùng</option>
              <option value="messages">Tin nhắn</option>
              <option value="conversations">Cuộc trò chuyện</option>
              <option value="notifications">Thông báo</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500">
              Hành động
            </label>

            <select
              value={filters.action}
              onChange={(e) =>
                handleChange("action", e.target.value)
              }
              className="mt-2 w-full rounded-2xl bg-gray-100 px-4 py-3 text-sm outline-none"
            >
              <option value="all">Tất cả</option>
              <option value="create">Tạo mới</option>
              <option value="update">Cập nhật</option>
              <option value="delete">Xóa</option>
              <option value="restore">Khôi phục</option>
              <option value="submit">Gửi/Nộp</option>
              <option value="approve">Phê duyệt</option>
              <option value="reject">Từ chối</option>
              <option value="login">Đăng nhập</option>
              <option value="logout">Đăng xuất</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500">
              Từ ngày
            </label>

            <input
              type="date"
              value={filters.from}
              onChange={(e) => handleChange("from", e.target.value)}
              className="mt-2 w-full rounded-2xl bg-gray-100 px-4 py-3 text-sm outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500">
              Đến ngày
            </label>

            <input
              type="date"
              value={filters.to}
              onChange={(e) => handleChange("to", e.target.value)}
              className="mt-2 w-full rounded-2xl bg-gray-100 px-4 py-3 text-sm outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500">
              Giới hạn
            </label>

            <select
              value={filters.limit}
              onChange={(e) => handleChange("limit", e.target.value)}
              className="mt-2 w-full rounded-2xl bg-gray-100 px-4 py-3 text-sm outline-none"
            >
              <option value={50}>50 dòng</option>
              <option value={100}>100 dòng</option>
              <option value={200}>200 dòng</option>
              <option value={500}>500 dòng</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-5">
          <button
            onClick={handleResetFilter}
            className="
              px-4 py-2
              rounded-2xl
              bg-gray-100
              text-gray-600
              hover:bg-gray-200
              transition
              font-medium
            "
          >
            Xóa lọc
          </button>

          <button
            onClick={handleApplyFilter}
            className="
              inline-flex items-center gap-2
              px-4 py-2
              rounded-2xl
              bg-blue-500
              text-white
              hover:bg-blue-600
              transition
              font-semibold
            "
          >
            <Search size={16} />
            Lọc dữ liệu
          </button>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">
            Đang tải nhật ký hệ thống...
          </div>
        ) : logs.length === 0 ? (
          <div className="p-10 text-center text-gray-500">
            <ShieldCheck className="mx-auto mb-3 text-gray-400" size={36} />
            Không có nhật ký hệ thống phù hợp.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 border-b border-gray-100">
                  <th className="py-3 px-5 font-medium">
                    Thời gian
                  </th>
                  <th className="py-3 px-5 font-medium">
                    Người thực hiện
                  </th>
                  <th className="py-3 px-5 font-medium">
                    Đối tượng
                  </th>
                  <th className="py-3 px-5 font-medium">
                    Hành động
                  </th>
                  <th className="py-3 px-5 font-medium">
                    Mô tả
                  </th>
                  <th className="py-3 px-5 font-medium text-right">
                    Chi tiết
                  </th>
                </tr>
              </thead>

              <tbody>
                {logs.map((log) => (
                  <tr
                    key={log.id}
                    className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition"
                  >
                    <td className="py-3 px-5 text-gray-500 whitespace-nowrap">
                      {formatDateTime(log.created_at)}
                    </td>

                    <td className="py-3 px-5">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-gray-100 text-gray-500 flex items-center justify-center">
                          <User size={15} />
                        </div>

                        <div>
                          <p className="font-medium text-gray-800">
                            {log.actor_name || "Hệ thống"}
                          </p>

                          <p className="text-xs text-gray-400">
                            ID: {log.user_id || "system"}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-5 text-gray-600">
                      <div>
                        <p className="font-medium">
                          {getEntityLabel(log.entity_type)}
                        </p>

                        <p className="text-xs text-gray-400">
                          #{log.entity_id || "—"}
                        </p>
                      </div>
                    </td>

                    <td className="py-3 px-5">
                      <span
                        className={`
                          inline-flex px-3 py-1
                          rounded-full
                          text-xs
                          font-semibold
                          ${getActionClass(log.action)}
                        `}
                      >
                        {getActionLabel(log.action)}
                      </span>
                    </td>

                    <td className="py-3 px-5 text-gray-500 max-w-[380px]">
                      <p className="line-clamp-2">
                        {log.description || "—"}
                      </p>
                    </td>

                    <td className="py-3 px-5 text-right">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="
                          px-3 py-1.5
                          rounded-xl
                          bg-gray-100
                          text-gray-600
                          hover:bg-gray-200
                          transition
                          text-xs
                          font-medium
                        "
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
      </div>

      {/* DETAIL MODAL */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-[28px] shadow-xl w-full max-w-3xl max-h-[86vh] overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Chi tiết nhật ký
                </h2>

                <p className="text-sm text-gray-500 mt-1">
                  {formatDateTime(selectedLog.created_at)}
                </p>
              </div>

              <button
                onClick={() => setSelectedLog(null)}
                className="px-3 py-1.5 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition"
              >
                Đóng
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[70vh] space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="bg-gray-50 rounded-2xl p-4">
                  <p className="text-gray-400 text-xs mb-1">
                    Người thực hiện
                  </p>
                  <p className="font-semibold text-gray-800">
                    {selectedLog.actor_name || "Hệ thống"}
                  </p>
                </div>

                <div className="bg-gray-50 rounded-2xl p-4">
                  <p className="text-gray-400 text-xs mb-1">
                    Đối tượng
                  </p>
                  <p className="font-semibold text-gray-800">
                    {getEntityLabel(selectedLog.entity_type)} #
                    {selectedLog.entity_id || "—"}
                  </p>
                </div>

                <div className="bg-gray-50 rounded-2xl p-4">
                  <p className="text-gray-400 text-xs mb-1">
                    Hành động
                  </p>
                  <p className="font-semibold text-gray-800">
                    {getActionLabel(selectedLog.action)}
                  </p>
                </div>

                <div className="bg-gray-50 rounded-2xl p-4">
                  <p className="text-gray-400 text-xs mb-1">
                    Thời gian
                  </p>
                  <p className="font-semibold text-gray-800">
                    {formatDateTime(selectedLog.created_at)}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">
                  Mô tả
                </p>

                <div className="bg-gray-50 rounded-2xl p-4 text-sm text-gray-600">
                  {selectedLog.description || "—"}
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">
                  Dữ liệu trước
                </p>

                <pre className="bg-gray-950 text-gray-100 rounded-2xl p-4 text-xs overflow-x-auto">
                  {safeJsonPreview(selectedLog.old_values)}
                </pre>
              </div>

              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">
                  Dữ liệu sau
                </p>

                <pre className="bg-gray-950 text-gray-100 rounded-2xl p-4 text-xs overflow-x-auto">
                  {safeJsonPreview(selectedLog.new_values)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}