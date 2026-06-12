import { useState } from "react";
import api from "../../services/api";

export default function UpdateProgressModal({
  task,
  onClose,
  onUpdated,
}) {
  const [noiDung, setNoiDung] = useState("");
  const [kpi, setKpi] = useState(
    task?.kpi_phan_tram || 0
  );
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!noiDung.trim()) {
      return alert("Nhập nội dung cập nhật");
    }

    if (kpi < 0 || kpi > 100) {
      return alert("Tiến độ phải từ 0 đến 100%");
    }

    try {
      setLoading(true);

      await api.post(
        `/tasks/${task.id}/progress`,
        {
          noi_dung: noiDung,
          trang_thai_sau: task.status_code,
          kpi_sau: Number(kpi),
        }
      );

      alert("Cập nhật tiến độ thành công");

      onUpdated();
      onClose();
    } catch (err) {
      console.log("UPDATE PROGRESS ERROR:", err);

      alert(
        err.response?.data?.message ||
          "Cập nhật tiến độ thất bại"
      );
    } finally {
      setLoading(false);
    }
  };

  if (!task) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[80]"
      onClick={onClose}
    >
      <div
        className="bg-white w-[480px] max-w-[95vw] rounded-2xl shadow-xl p-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="flex items-center justify-between border-b pb-3 mb-4">
          <h2 className="text-lg font-bold">
            📈 Cập nhật tiến độ
          </h2>

          <button
            onClick={onClose}
            className="text-gray-400 hover:text-red-500 text-xl"
          >
            ✕
          </button>
        </div>

        {/* TASK INFO */}
        <div className="mb-4 bg-gray-50 border rounded-xl p-3">
          <p className="text-sm font-semibold text-gray-800">
            {task.tieu_de}
          </p>

          <p className="text-xs text-gray-500 mt-1">
            Trạng thái hiện tại: {task.status_name || task.status_code}
          </p>
        </div>

        {/* CONTENT */}
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">
              Nội dung cập nhật
            </label>

            <textarea
              value={noiDung}
              onChange={(e) =>
                setNoiDung(e.target.value)
              }
              rows="5"
              placeholder="Nhập nội dung đã thực hiện, khó khăn, kết quả tạm thời..."
              className="
                w-full mt-1
                border border-gray-200
                rounded-xl
                px-3 py-2
                resize-none
                focus:outline-none
                focus:ring-2
                focus:ring-blue-400
              "
            />
          </div>

          <div>
            <label className="text-sm font-medium">
              Tỷ lệ hoàn thành: {kpi}%
            </label>

            <input
              type="range"
              min="0"
              max="100"
              value={kpi}
              onChange={(e) =>
                setKpi(e.target.value)
              }
              className="w-full mt-2"
            />

            <input
              type="number"
              min="0"
              max="100"
              value={kpi}
              onChange={(e) =>
                setKpi(e.target.value)
              }
              className="
                w-full mt-2
                border border-gray-200
                rounded-xl
                px-3 py-2
                focus:outline-none
                focus:ring-2
                focus:ring-blue-400
              "
            />
          </div>
        </div>

        {/* ACTION */}
        <div className="flex justify-end gap-2 mt-5 border-t pt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
          >
            Hủy
          </button>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="
              px-4 py-2
              bg-blue-500
              text-white
              rounded-lg
              hover:bg-blue-600
              disabled:opacity-60
            "
          >
            {loading
              ? "Đang gửi..."
              : "Gửi cập nhật"}
          </button>
        </div>
      </div>
    </div>
  );
}