import { useEffect, useState } from "react";
import api from "../../services/api";

export default function SubmitSubtaskModal({
  task,
  subtask,
  onClose,
  onSubmitted,
}) {
  const [noiDung, setNoiDung] = useState("");
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

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

  const handleSubmit = async () => {
    if (submitting) return;

    try {
      if (!noiDung.trim()) {
        alert("Vui lòng nhập nội dung nộp");
        return;
      }

      setSubmitting(true);

      const formData = new FormData();
      formData.append("noi_dung_nop", noiDung);

      if (file) {
        formData.append("file", file);
      }

      await api.post(
        `/tasks/${task.id}/subtasks/${subtask.id}/submit`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      alert("Đã nộp phần việc");

      await onSubmitted?.();
    } catch (err) {
      console.error("SUBMIT SUBTASK ERROR:", err);

      alert(
        err.response?.data?.message ||
          "Nộp phần việc thất bại"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const labelClass = `
    text-sm
    font-medium
    ${isDark ? "text-gray-300" : "text-gray-600"}
  `;

  const inputClass = `
    w-full
    mt-1
    p-3
    border
    rounded-xl
    outline-none
    focus:ring-2
    focus:ring-blue-400
    transition
    ${
      isDark
        ? "bg-slate-950 border-slate-700 text-gray-100 placeholder:text-gray-500"
        : "bg-white border-gray-200 text-gray-900 placeholder:text-gray-400"
    }
  `;

  return (
    <div
      className="
        fixed
        inset-0
        bg-black/50
        backdrop-blur-sm
        flex
        items-center
        justify-center
        z-[10001]
        px-4
      "
      onClick={onClose}
    >
      <div
        className={`
          w-[560px]
          max-w-[95vw]
          rounded-3xl
          shadow-2xl
          p-6
          border
          animate-fadeIn
          ${
            isDark
              ? "bg-slate-900 border-slate-800 text-gray-100"
              : "bg-white border-gray-100 text-gray-900"
          }
        `}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-5">
          <div className="min-w-0">
            <h2
              className={`text-xl font-bold ${
                isDark ? "text-gray-100" : "text-gray-900"
              }`}
            >
              Nộp phần việc
            </h2>

            <p
              className={`text-sm mt-1 line-clamp-1 ${
                isDark ? "text-gray-400" : "text-gray-500"
              }`}
            >
              {subtask.tieu_de}
            </p>

            <p
              className={`text-xs mt-1 ${
                isDark ? "text-gray-500" : "text-gray-400"
              }`}
            >
              Hạn hoàn thành:{" "}
              {subtask.han_chot
                ? new Date(subtask.han_chot).toLocaleDateString()
                : "-"}
            </p>
          </div>

          <button
            onClick={onClose}
            className={`
              w-9 h-9
              rounded-full
              flex
              items-center
              justify-center
              text-xl
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

        <div className="space-y-4">
          <div>
            <label className={labelClass}>
              Nội dung nộp
            </label>

            <textarea
              value={noiDung}
              onChange={(e) => setNoiDung(e.target.value)}
              placeholder="Nhập nội dung đã thực hiện..."
              className={`${inputClass} h-32 resize-none`}
            />
          </div>

          <div>
            <label className={labelClass}>
              File minh chứng
            </label>

            <input
              type="file"
              onChange={(e) => setFile(e.target.files[0])}
              className={`
                w-full
                mt-1
                p-3
                border
                rounded-xl
                transition
                ${
                  isDark
                    ? "bg-slate-950 border-slate-700 text-gray-300 file:bg-slate-800 file:text-gray-200 file:border-0 file:rounded-lg file:px-3 file:py-1.5 file:mr-3"
                    : "bg-white border-gray-200 text-gray-700 file:bg-gray-100 file:text-gray-700 file:border-0 file:rounded-lg file:px-3 file:py-1.5 file:mr-3"
                }
              `}
            />

            <p
              className={`text-xs mt-1 ${
                isDark ? "text-gray-500" : "text-gray-400"
              }`}
            >
              Có thể nộp PDF, Word, Excel hoặc ảnh.
            </p>

            {file && (
              <p
                className={`text-xs mt-2 ${
                  isDark ? "text-blue-400" : "text-blue-600"
                }`}
              >
                Đã chọn: {file.name}
              </p>
            )}
          </div>
        </div>

        <div
          className={`
            flex
            justify-end
            gap-3
            mt-6
            pt-4
            border-t
            ${
              isDark ? "border-slate-800" : "border-gray-100"
            }
          `}
        >
          <button
            onClick={onClose}
            className={`
              px-4 py-2
              rounded-xl
              transition
              ${
                isDark
                  ? "bg-slate-800 text-gray-200 hover:bg-slate-700"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }
            `}
          >
            Hủy
          </button>

          <button
            disabled={submitting}
            onClick={handleSubmit}
            className={`
              px-4 py-2
              rounded-xl
              text-white
              transition
              ${
                submitting
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-blue-500 hover:bg-blue-600"
              }
            `}
          >
            {submitting ? "Đang nộp..." : "Nộp phần việc"}
          </button>
        </div>
      </div>
    </div>
  );
}