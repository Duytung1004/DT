import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import api from "../../services/api";

export default function AdminUnits() {
  const [units, setUnits] = useState([]);
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editingUnit, setEditingUnit] = useState(null);
  const [unitName, setUnitName] = useState("");

  const fetchUnits = async () => {
    try {
      setLoading(true);

      const res = await api.get("/units");

      setUnits(res.data);
    } catch (err) {
      console.log("FETCH UNITS ERROR:", err);
      alert(
        err.response?.data?.message ||
          "Không tải được danh sách phòng ban"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnits();
  }, []);

  const filteredUnits = useMemo(() => {
    const keyword = search.toLowerCase().trim();

    return units.filter((unit) =>
      unit.name?.toLowerCase().includes(keyword)
    );
  }, [units, search]);

  const openCreate = () => {
    setEditingUnit(null);
    setUnitName("");
    setShowForm(true);
  };

  const openEdit = (unit) => {
    setEditingUnit(unit);
    setUnitName(unit.name || "");
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingUnit(null);
    setUnitName("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!unitName.trim()) {
      alert("Vui lòng nhập tên phòng ban");
      return;
    }

    try {
      if (editingUnit) {
        await api.put(`/units/${editingUnit.id}`, {
          name: unitName.trim(),
        });

        alert("Cập nhật phòng ban thành công");
      } else {
        await api.post("/units", {
          name: unitName.trim(),
        });

        alert("Thêm phòng ban thành công");
      }

      closeForm();
      fetchUnits();
    } catch (err) {
      console.log("SAVE UNIT ERROR:", err);
      alert(
        err.response?.data?.message ||
          "Lưu phòng ban thất bại"
      );
    }
  };

  const handleDelete = async (unit) => {
    const ok = window.confirm(
      `Bạn có chắc muốn xóa phòng ban "${unit.name}" không?`
    );

    if (!ok) return;

    try {
      await api.delete(`/units/${unit.id}`);

      alert("Đã xóa phòng ban");
      fetchUnits();
    } catch (err) {
      console.log("DELETE UNIT ERROR:", err);
      alert(
        err.response?.data?.message ||
          "Xóa phòng ban thất bại"
      );
    }
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      {/* HEADER */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Quản lý phòng ban
          </h1>

          <p className="text-gray-500 mt-1">
            Thêm, chỉnh sửa và quản lý các đơn vị/phòng ban trong hệ thống
          </p>
        </div>

        <button
          onClick={openCreate}
          className="
            flex
            items-center
            gap-2
            px-5
            py-3
            rounded-2xl
            bg-blue-500
            text-white
            font-semibold
            hover:bg-blue-600
            shadow-md
            shadow-blue-200
            transition
          "
        >
          <Plus size={18} />
          Thêm phòng ban
        </button>
      </div>

      {/* SUMMARY */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
        <div className="bg-white rounded-3xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center">
              <Building2 size={20} />
            </div>

            <div>
              <p className="text-sm text-gray-400">
                Tổng phòng ban
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {units.length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-gray-200 p-5 shadow-sm">
          <p className="text-sm text-gray-400">
            Đang hiển thị
          </p>
          <p className="text-2xl font-bold text-gray-900">
            {filteredUnits.length}
          </p>
        </div>

        <div className="bg-white rounded-3xl border border-gray-200 p-5 shadow-sm">
          <p className="text-sm text-gray-400">
            Trạng thái
          </p>
          <p className="text-2xl font-bold text-green-600">
            Hoạt động
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
            placeholder="Tìm kiếm phòng ban..."
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
          <table className="w-full min-w-[720px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-5 py-4 text-left text-sm font-semibold text-gray-500">
                  Phòng ban
                </th>

                <th className="px-5 py-4 text-center text-sm font-semibold text-gray-500">
                  ID
                </th>

                <th className="px-5 py-4 text-left text-sm font-semibold text-gray-500">
                  Ngày tạo
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
                    colSpan="4"
                    className="px-5 py-10 text-center text-gray-500"
                  >
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : filteredUnits.length === 0 ? (
                <tr>
                  <td
                    colSpan="4"
                    className="px-5 py-10 text-center text-gray-500"
                  >
                    Không có phòng ban nào
                  </td>
                </tr>
              ) : (
                filteredUnits.map((unit) => (
                  <tr
                    key={unit.id}
                    className="hover:bg-gray-50 transition"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="
                            w-11 h-11
                            rounded-2xl
                            bg-blue-100
                            text-blue-600
                            flex
                            items-center
                            justify-center
                            font-bold
                          "
                        >
                          <Building2 size={20} />
                        </div>

                        <div>
                          <p className="font-semibold text-gray-900">
                            {unit.name}
                          </p>
                          <p className="text-sm text-gray-400">
                            Đơn vị/phòng ban hệ thống
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4 text-center text-sm text-gray-400">
                      #{unit.id}
                    </td>

                    <td className="px-5 py-4 text-sm text-gray-500">
                      {unit.created_at
                        ? new Date(
                            unit.created_at
                          ).toLocaleDateString()
                        : "-"}
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(unit)}
                          className="w-9 h-9 rounded-xl bg-gray-100 text-gray-600 hover:bg-blue-50 hover:text-blue-600 transition flex items-center justify-center"
                          title="Sửa"
                        >
                          <Pencil size={16} />
                        </button>

                        <button
                          onClick={() => handleDelete(unit)}
                          className="w-9 h-9 rounded-xl bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-500 transition flex items-center justify-center"
                          title="Xóa"
                        >
                          <Trash2 size={16} />
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

      {/* FORM MODAL */}
      {showForm && (
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
          onClick={closeForm}
        >
          <div
            className="
              bg-white
              rounded-[32px]
              shadow-2xl
              w-[480px]
              max-w-[95vw]
              overflow-hidden
            "
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-5 bg-gradient-to-b from-gray-50 to-white flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {editingUnit
                    ? "Cập nhật phòng ban"
                    : "Thêm phòng ban"}
                </h2>

                <p className="text-sm text-gray-400 mt-1">
                  {editingUnit
                    ? "Chỉnh sửa thông tin phòng ban"
                    : "Tạo đơn vị/phòng ban mới"}
                </p>
              </div>

              <button
                onClick={closeForm}
                className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400"
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
                  Tên phòng ban
                </label>

                <input
                  value={unitName}
                  onChange={(e) =>
                    setUnitName(e.target.value)
                  }
                  className="mt-2 w-full rounded-2xl bg-gray-100 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="VD: Phòng IT"
                  autoFocus
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={closeForm}
                  className="px-5 py-3 rounded-2xl bg-gray-100 text-gray-600 font-semibold hover:bg-gray-200 transition"
                >
                  Hủy
                </button>

                <button
                  type="submit"
                  className="px-5 py-3 rounded-2xl bg-blue-500 text-white font-semibold hover:bg-blue-600 transition"
                >
                  {editingUnit
                    ? "Lưu thay đổi"
                    : "Thêm phòng ban"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}