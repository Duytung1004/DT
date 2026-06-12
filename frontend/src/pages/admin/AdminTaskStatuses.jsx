import { useEffect, useMemo, useState } from "react";
import {
  ListChecks,
  Search,
  Pencil,
  Save,
  X,
  ShieldAlert,
} from "lucide-react";

import api from "../../services/api";

export default function AdminTaskStatuses() {
  const [statuses, setStatuses] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const [editingStatus, setEditingStatus] = useState(null);
  const [statusName, setStatusName] = useState("");

  const fetchStatuses = async () => {
    try {
      setLoading(true);

      const res = await api.get("/task-statuses");

      setStatuses(res.data);
    } catch (err) {
      console.log("FETCH TASK STATUSES ERROR:", err);

      alert(
        err.response?.data?.message ||
          "Không tải được danh sách trạng thái"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatuses();
  }, []);

  const filteredStatuses = useMemo(() => {
    const keyword = search.toLowerCase().trim();

    return statuses.filter((status) => {
      return (
        status.name?.toLowerCase().includes(keyword) ||
        status.code?.toLowerCase().includes(keyword)
      );
    });
  }, [statuses, search]);

  const openEdit = (status) => {
    setEditingStatus(status);
    setStatusName(status.name || "");
  };

  const closeEdit = () => {
    setEditingStatus(null);
    setStatusName("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!editingStatus) return;

    if (!statusName.trim()) {
      alert("Tên trạng thái không được để trống");
      return;
    }

    try {
      await api.put(`/task-statuses/${editingStatus.id}`, {
        name: statusName.trim(),
      });

      alert("Cập nhật trạng thái thành công");

      closeEdit();
      fetchStatuses();
    } catch (err) {
      console.log("UPDATE TASK STATUS ERROR:", err);

      alert(
        err.response?.data?.message ||
          "Cập nhật trạng thái thất bại"
      );
    }
  };

  const getStatusPreviewColor = (code) => {
    switch (code) {
      case "hoan_thanh":
        return "bg-green-50 text-green-600 border-green-100";
      case "qua_han":
      case "yeu_cau_chinh_sua":
        return "bg-red-50 text-red-600 border-red-100";
      case "dang_thuc_hien":
        return "bg-yellow-50 text-yellow-600 border-yellow-100";
      case "cho_duyet_cap_1":
      case "cho_duyet_cap_2":
      case "cho_xac_nhan_don_vi":
      case "cho_nhan_viec":
        return "bg-purple-50 text-purple-600 border-purple-100";
      case "da_giao_nhiem_vu":
        return "bg-blue-50 text-blue-600 border-blue-100";
      default:
        return "bg-gray-50 text-gray-600 border-gray-100";
    }
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      {/* HEADER */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Trạng thái nhiệm vụ
          </h1>

          <p className="text-gray-500 mt-1">
            Quản lý tên hiển thị của các trạng thái xử lý nhiệm vụ
          </p>
        </div>
      </div>

      {/* NOTICE */}
      <div className="bg-white rounded-[32px] border border-gray-200 shadow-sm p-5 mb-5">
        <div className="flex items-start gap-4">
          <div
            className="
              w-12 h-12
              rounded-2xl
              bg-yellow-50
              text-yellow-600
              flex
              items-center
              justify-center
              shrink-0
            "
          >
            <ShieldAlert size={22} />
          </div>

          <div>
            <h2 className="font-bold text-gray-900">
              Lưu ý khi cấu hình trạng thái
            </h2>

            <p className="text-sm text-gray-500 mt-1 leading-relaxed">
              Mã trạng thái <span className="font-semibold">code</span> đang
              được backend sử dụng để xử lý nghiệp vụ, vì vậy trang này chỉ cho
              phép sửa tên hiển thị. Không nên chỉnh sửa trực tiếp code trong
              cơ sở dữ liệu nếu chưa kiểm tra toàn bộ logic hệ thống.
            </p>
          </div>
        </div>
      </div>

      {/* SUMMARY */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
        <div className="bg-white rounded-3xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center">
              <ListChecks size={20} />
            </div>

            <div>
              <p className="text-sm text-gray-400">
                Tổng trạng thái
              </p>

              <p className="text-2xl font-bold text-gray-900">
                {statuses.length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-gray-200 p-5 shadow-sm">
          <p className="text-sm text-gray-400">
            Đang hiển thị
          </p>

          <p className="text-2xl font-bold text-gray-900">
            {filteredStatuses.length}
          </p>
        </div>

        <div className="bg-white rounded-3xl border border-gray-200 p-5 shadow-sm">
          <p className="text-sm text-gray-400">
            Chế độ chỉnh sửa
          </p>

          <p className="text-2xl font-bold text-green-600">
            An toàn
          </p>
        </div>
      </div>

      {/* FILTER */}
      <div
        className="
          bg-white
          rounded-3xl
          border
          border-gray-200
          p-4
          shadow-sm
          mb-5
        "
      >
        <div
          className="
            flex
            items-center
            gap-3
            bg-gray-100
            rounded-2xl
            px-4
            py-3
          "
        >
          <Search size={18} className="text-gray-400" />

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên hoặc mã trạng thái..."
            className="
              bg-transparent
              outline-none
              text-sm
              flex-1
              text-gray-700
            "
          />
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-5 py-4 text-left text-sm font-semibold text-gray-500">
                  Trạng thái
                </th>

                <th className="px-5 py-4 text-left text-sm font-semibold text-gray-500">
                  Code
                </th>

                <th className="px-5 py-4 text-left text-sm font-semibold text-gray-500">
                  Xem trước
                </th>

                <th className="px-5 py-4 text-center text-sm font-semibold text-gray-500">
                  ID
                </th>

                <th className="px-5 py-4 text-right text-sm font-semibold text-gray-500">
                  Thao tác
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td
                    colSpan="5"
                    className="px-5 py-10 text-center text-gray-500"
                  >
                    Đang tải trạng thái...
                  </td>
                </tr>
              ) : filteredStatuses.length === 0 ? (
                <tr>
                  <td
                    colSpan="5"
                    className="px-5 py-10 text-center text-gray-500"
                  >
                    Không có trạng thái nào
                  </td>
                </tr>
              ) : (
                filteredStatuses.map((status) => (
                  <tr
                    key={status.id}
                    className="hover:bg-gray-50 transition"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="
                            w-11 h-11
                            rounded-2xl
                            bg-gray-900
                            text-white
                            flex
                            items-center
                            justify-center
                            font-bold
                          "
                        >
                          {status.name?.charAt(0)?.toUpperCase() || "T"}
                        </div>

                        <div>
                          <p className="font-semibold text-gray-900">
                            {status.name}
                          </p>

                          <p className="text-sm text-gray-400">
                            Tên hiển thị trạng thái
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className="
                          px-3
                          py-1
                          rounded-full
                          bg-gray-100
                          text-gray-600
                          text-xs
                          font-semibold
                        "
                      >
                        {status.code}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`
                          inline-flex
                          px-3
                          py-1
                          rounded-full
                          border
                          text-xs
                          font-semibold
                          ${getStatusPreviewColor(status.code)}
                        `}
                      >
                        {status.name}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-center text-sm text-gray-400">
                      #{status.id}
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(status)}
                          className="
                            w-9 h-9
                            rounded-xl
                            bg-gray-100
                            text-gray-600
                            hover:bg-blue-50
                            hover:text-blue-600
                            transition
                            flex
                            items-center
                            justify-center
                          "
                          title="Sửa tên trạng thái"
                        >
                          <Pencil size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* EDIT MODAL */}
      {editingStatus && (
        <div
          className="
            fixed
            inset-0
            bg-black/40
            backdrop-blur-sm
            z-[80]
            flex
            items-center
            justify-center
            px-4
          "
          onClick={closeEdit}
        >
          <div
            className="
              bg-white
              rounded-[32px]
              shadow-2xl
              w-[500px]
              max-w-[95vw]
              overflow-hidden
            "
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-5 bg-gradient-to-b from-gray-50 to-white flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Cập nhật trạng thái
                </h2>

                <p className="text-sm text-gray-400 mt-1">
                  Chỉ thay đổi tên hiển thị, không thay đổi mã trạng thái
                </p>
              </div>

              <button
                onClick={closeEdit}
                className="
                  w-10 h-10
                  rounded-full
                  hover:bg-gray-100
                  flex
                  items-center
                  justify-center
                  text-gray-400
                "
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="p-6 space-y-4"
            >
              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Mã trạng thái
                </label>

                <input
                  value={editingStatus.code}
                  disabled
                  className="
                    mt-2
                    w-full
                    rounded-2xl
                    bg-gray-100
                    px-4
                    py-3
                    text-sm
                    text-gray-500
                    outline-none
                    cursor-not-allowed
                  "
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Tên hiển thị
                </label>

                <input
                  value={statusName}
                  onChange={(e) => setStatusName(e.target.value)}
                  className="
                    mt-2
                    w-full
                    rounded-2xl
                    bg-gray-100
                    px-4
                    py-3
                    text-sm
                    outline-none
                    focus:ring-2
                    focus:ring-blue-400
                  "
                  placeholder="VD: Đang thực hiện"
                  autoFocus
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={closeEdit}
                  className="
                    px-5
                    py-3
                    rounded-2xl
                    bg-gray-100
                    text-gray-600
                    font-semibold
                    hover:bg-gray-200
                    transition
                  "
                >
                  Hủy
                </button>

                <button
                  type="submit"
                  className="
                    px-5
                    py-3
                    rounded-2xl
                    bg-blue-500
                    text-white
                    font-semibold
                    hover:bg-blue-600
                    transition
                    flex
                    items-center
                    gap-2
                  "
                >
                  <Save size={17} />
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}