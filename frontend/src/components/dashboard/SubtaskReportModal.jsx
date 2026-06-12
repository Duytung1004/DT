import { useState } from "react";
import api from "../../services/api";

export default function SubtaskReportModal({
  task,
  subtask,
  onClose,
  onSubmitted,
}) {
  const [noiDung, setNoiDung] = useState("");
  const [khoKhan, setKhoKhan] = useState("");
  const [deXuat, setDeXuat] = useState("");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!noiDung.trim()) {
      alert("Vui lòng nhập nội dung báo cáo");
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();

      formData.append("noi_dung", noiDung);
      formData.append("kho_khan", khoKhan);
      formData.append("de_xuat", deXuat);

      if (file) {
        formData.append("file", file);
      }

      await api.post(
        `/tasks/${task.id}/subtasks/${subtask.id}/reports`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      alert("Đã gửi báo cáo phần việc");

      if (onSubmitted) {
        await onSubmitted();
      }

      onClose();
    } catch (err) {
      console.error("CREATE SUBTASK REPORT ERROR:", err);

      alert(
        err.response?.data?.message ||
          "Không thể gửi báo cáo phần việc"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-[80] px-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-[560px] max-w-[95vw] rounded-3xl shadow-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5">
          <h2 className="text-xl font-bold text-gray-900">
            Báo cáo phần việc
          </h2>

          <p className="text-sm text-gray-400 mt-1">
            {subtask.tieu_de}
          </p>
        </div>

        <div className="rounded-2xl bg-blue-50 border border-blue-100 p-4 mb-5">
          <p className="text-xs text-blue-500 font-semibold">
            Tiến độ phần việc
          </p>

          <p className="text-sm text-blue-700 mt-1">
            Tỷ lệ hoàn thành sẽ được hệ thống tự ghi nhận theo trạng thái phần việc, không nhập thủ công.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-gray-700">
              Nội dung đã thực hiện
            </label>

            <textarea
              value={noiDung}
              onChange={(e) => setNoiDung(e.target.value)}
              rows={5}
              placeholder="Nhập nội dung phần việc đã thực hiện trong kỳ báo cáo..."
              className="mt-2 w-full border border-gray-200 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-400 resize-none"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-700">
              Khó khăn / vướng mắc
            </label>

            <textarea
              value={khoKhan}
              onChange={(e) => setKhoKhan(e.target.value)}
              rows={3}
              placeholder="Nhập khó khăn, vướng mắc nếu có..."
              className="mt-2 w-full border border-gray-200 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-400 resize-none"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-700">
              Đề xuất / kiến nghị
            </label>

            <textarea
              value={deXuat}
              onChange={(e) => setDeXuat(e.target.value)}
              rows={3}
              placeholder="Nhập đề xuất, kiến nghị nếu có..."
              className="mt-2 w-full border border-gray-200 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-400 resize-none"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-700">
              File minh chứng nếu có
            </label>

            <input
              type="file"
              onChange={(e) =>
                setFile(e.target.files?.[0] || null)
              }
              className="mt-2 w-full text-sm"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 transition disabled:opacity-60"
          >
            Hủy
          </button>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-blue-500 text-white hover:bg-blue-600 transition disabled:opacity-60"
          >
            {loading ? "Đang gửi..." : "Gửi báo cáo"}
          </button>
        </div>
      </div>
    </div>
  );
}