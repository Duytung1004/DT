import { useEffect, useState } from "react";
import api from "../../services/api";

export default function EditTaskModal({
  task,
  onClose,
  onUpdated,
}) {
  const [units, setUnits] = useState([]);

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

  const [form, setForm] = useState({
    tieu_de: task?.tieu_de || "",
    mo_ta: task?.mo_ta || "",
    han_chot: task?.han_chot
      ? task.han_chot.slice(0, 10)
      : "",
    unit_id: task?.unit_id || "",
    chu_ky_bao_cao:
      task?.chu_ky_bao_cao || "mot_lan",
  });

  useEffect(() => {
    api.get("/units").then((res) => {
      setUnits(res.data);
    });
  }, []);

  const handleChange = (key, value) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSubmit = async () => {
    try {
      if (!form.tieu_de.trim()) {
        alert("Vui lòng nhập tiêu đề nhiệm vụ");
        return;
      }

      if (!form.han_chot) {
        alert("Vui lòng chọn hạn chót");
        return;
      }

      await api.put(`/tasks/${task.id}`, form);

      alert("Cập nhật nhiệm vụ thành công");

      await onUpdated();

      onClose();
    } catch (err) {
      console.error("UPDATE TASK ERROR:", err);

      alert(
        err.response?.data?.message ||
          "Cập nhật nhiệm vụ thất bại"
      );
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
          w-[540px]
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
        <div className="flex items-center justify-between mb-5">
          <h2
            className={`text-xl font-bold ${
              isDark ? "text-gray-100" : "text-gray-900"
            }`}
          >
            Sửa nhiệm vụ
          </h2>

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
              Tiêu đề nhiệm vụ
            </label>

            <input
              value={form.tieu_de}
              onChange={(e) =>
                handleChange("tieu_de", e.target.value)
              }
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>
              Mô tả nhiệm vụ
            </label>

            <textarea
              value={form.mo_ta}
              onChange={(e) =>
                handleChange("mo_ta", e.target.value)
              }
              className={`
                ${inputClass}
                h-28
                resize-none
              `}
            />
          </div>

          <div>
            <label className={labelClass}>
              Hạn chót
            </label>

            <input
              type="date"
              value={form.han_chot}
              onChange={(e) =>
                handleChange("han_chot", e.target.value)
              }
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>
              Chu kỳ báo cáo
            </label>

            <select
              value={form.chu_ky_bao_cao}
              onChange={(e) =>
                handleChange(
                  "chu_ky_bao_cao",
                  e.target.value
                )
              }
              className={inputClass}
            >
              <option value="mot_lan">Nộp một lần</option>
              <option value="hang_ngay">
                Báo cáo hằng ngày
              </option>
              <option value="hang_tuan">
                Báo cáo hằng tuần
              </option>
              <option value="hang_thang">
                Báo cáo hằng tháng
              </option>
              <option value="hang_quy">
                Báo cáo hằng quý
              </option>
              <option value="dot_xuat">
                Báo cáo đột xuất
              </option>
            </select>
          </div>

          <div>
            <label className={labelClass}>
              Phòng ban phụ trách
            </label>

            <select
              value={form.unit_id}
              onChange={(e) =>
                handleChange("unit_id", e.target.value)
              }
              className={inputClass}
            >
              <option value="">Chọn phòng ban</option>

              {units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
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
            onClick={handleSubmit}
            className="
              px-4 py-2
              rounded-xl
              bg-blue-500
              text-white
              hover:bg-blue-600
              transition
            "
          >
            Lưu thay đổi
          </button>
        </div>
      </div>
    </div>
  );
}