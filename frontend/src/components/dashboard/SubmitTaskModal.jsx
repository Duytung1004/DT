import { useState } from "react";
import api from "../../services/api";

export default function SubmitTaskModal({
  task,
  onClose,
  onSubmitted,
}) {
  const [noiDung, setNoiDung] = useState("");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  if (!task) return null;

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];

    if (!selectedFile) return;

    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "image/png",
      "image/jpeg",
    ];

    if (!allowedTypes.includes(selectedFile.type)) {
      alert(
        "Chỉ cho phép upload PDF, Word, Excel, PNG, JPG"
      );
      e.target.value = "";
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      alert("File không được vượt quá 10MB");
      e.target.value = "";
      return;
    }

    setFile(selectedFile);
  };

  const handleSubmit = async () => {
    if (!noiDung.trim()) {
      alert("Vui lòng nhập nội dung báo cáo kết quả");
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();

      formData.append("noi_dung", noiDung);

      if (file) {
        formData.append("file", file);
      }

      await api.post(
        `/tasks/${task.id}/submit`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      alert("Nộp nhiệm vụ thành công");

      if (onSubmitted) {
        await onSubmitted();
      }

      onClose();
    } catch (err) {
      console.log("SUBMIT TASK ERROR:", err);

      alert(
        err.response?.data?.message ||
          "Nộp nhiệm vụ thất bại"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="
        fixed inset-0
        bg-black/50
        backdrop-blur-sm
        flex items-center justify-center
        z-[90]
        px-4
      "
      onClick={onClose}
    >
      <div
        className="
          bg-white
          w-[580px]
          max-w-[95vw]
          rounded-3xl
          shadow-2xl
          overflow-hidden
          animate-fadeIn
        "
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="px-6 py-5 border-b bg-gray-50">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                📤 Nộp nhiệm vụ
              </h2>

              <p className="text-sm text-gray-500 mt-1">
                Gửi báo cáo kết quả và tài liệu minh chứng để cấp trên xét duyệt
              </p>
            </div>

            <button
              onClick={onClose}
              className="
                w-9 h-9
                rounded-full
                flex items-center justify-center
                text-gray-400
                hover:text-red-500
                hover:bg-red-50
                transition
              "
            >
              ✕
            </button>
          </div>
        </div>

        {/* BODY */}
        <div className="px-6 py-5 space-y-5">
          {/* TASK INFO */}
          <div className="rounded-2xl bg-blue-50 border border-blue-100 p-4">
            <p className="text-xs text-blue-500 font-medium mb-1">
              Nhiệm vụ
            </p>

            <p className="font-semibold text-gray-900">
              {task.tieu_de}
            </p>

            <p className="text-xs text-gray-500 mt-2">
              Hạn chót:{" "}
              {task.han_chot
                ? new Date(
                    task.han_chot
                  ).toLocaleDateString()
                : "-"}
            </p>
          </div>

          {/* REPORT CONTENT */}
          <div>
            <label className="text-sm font-semibold text-gray-700">
              Nội dung báo cáo kết quả
            </label>

            <textarea
              value={noiDung}
              onChange={(e) =>
                setNoiDung(e.target.value)
              }
              rows="6"
              placeholder="Nhập kết quả đã thực hiện, sản phẩm hoàn thành, khó khăn/vướng mắc nếu có..."
              className="
                w-full mt-2
                border border-gray-200
                rounded-2xl
                px-4 py-3
                resize-none
                text-sm
                focus:outline-none
                focus:ring-2
                focus:ring-blue-400
              "
            />
          </div>

          {/* EVIDENCE FILE */}
          <div>
            <label className="text-sm font-semibold text-gray-700">
              Tài liệu minh chứng
            </label>

            <div
              className="
                mt-2
                border border-dashed border-gray-300
                rounded-2xl
                p-4
                bg-gray-50
              "
            >
              <label
                className="
                  flex
                  items-center
                  justify-between
                  gap-3
                  cursor-pointer
                "
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="
                      w-11 h-11
                      rounded-2xl
                      bg-white
                      border
                      flex items-center justify-center
                      text-xl
                      shrink-0
                    "
                  >
                    📎
                  </div>

                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {file
                        ? file.name
                        : "Chọn file minh chứng"}
                    </p>

                    <p className="text-xs text-gray-400 mt-1">
                      PDF, Word, Excel, PNG, JPG • Tối đa 10MB
                    </p>
                  </div>
                </div>

                <span
                  className="
                    shrink-0
                    px-3 py-2
                    rounded-xl
                    bg-blue-500
                    text-white
                    text-xs
                    font-medium
                    hover:bg-blue-600
                    transition
                  "
                >
                  Chọn file
                </span>

                <input
                  type="file"
                  hidden
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                  onChange={handleFileChange}
                />
              </label>

              {file && (
                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setFile(null)}
                    className="
                      text-xs
                      text-red-500
                      hover:underline
                    "
                  >
                    Xóa file đã chọn
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl bg-yellow-50 border border-yellow-100 p-4">
            <p className="text-sm text-yellow-700">
              Lưu ý: Báo cáo và tài liệu minh chứng sẽ được gửi lên trưởng phòng để xét duyệt.
            </p>
          </div>
        </div>

        {/* FOOTER */}
        <div className="px-6 py-4 border-t bg-white flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={loading}
            className="
              px-4 py-2
              rounded-xl
              bg-gray-100
              text-gray-700
              hover:bg-gray-200
              transition
              disabled:opacity-60
            "
          >
            Hủy
          </button>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="
              px-5 py-2
              rounded-xl
              bg-blue-500
              text-white
              hover:bg-blue-600
              transition
              disabled:opacity-60
            "
          >
            {loading
              ? "Đang nộp..."
              : "Nộp nhiệm vụ"}
          </button>
        </div>
      </div>
    </div>
  );
}