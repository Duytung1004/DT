import { useEffect, useState } from "react";
import api from "../../services/api";

export default function EditSubtaskModal({
  task,
  subtask,
  onClose,
  onUpdated,
}) {
  const [users, setUsers] = useState([]);
  const [saving, setSaving] = useState(false);

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
    tieu_de: subtask?.tieu_de || "",
    mo_ta: subtask?.mo_ta || "",
    assignee_user_id: subtask?.assignee_user_id || "",
    han_chot: subtask?.han_chot
      ? subtask.han_chot.slice(0, 10)
      : "",
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await api.get("/users");

      const employees = res.data.filter(
        (u) =>
          (u.role === "nhan_vien" || u.role_id === 4) &&
          u.unit_id === task.unit_id
      );

      setUsers(employees);
    } catch (err) {
      console.error("FETCH USERS ERROR:", err);
      alert("Không tải được danh sách nhân viên");
    }
  };

  const handleChange = (key, value) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSubmit = async () => {
    if (saving) return;

    try {
      setSaving(true);

      if (
        !form.tieu_de ||
        !form.assignee_user_id ||
        !form.han_chot
      ) {
        alert(
          "Vui lòng nhập đủ tiêu đề, người thực hiện và hạn hoàn thành"
        );
        return;
      }

      await api.put(
        `/tasks/${task.id}/subtasks/${subtask.id}`,
        {
          ...form,
          assignee_user_id: Number(form.assignee_user_id),
        }
      );

      alert("Đã cập nhật phần việc");

      await onUpdated();

      onClose();
    } catch (err) {
      console.error("UPDATE SUBTASK ERROR:", err);

      alert(
        err.response?.data?.message ||
          "Cập nhật phần việc thất bại"
      );
    } finally {
      setSaving(false);
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
              Sửa phần việc
            </h2>

            <p
              className={`text-sm mt-1 line-clamp-1 ${
                isDark ? "text-gray-400" : "text-gray-500"
              }`}
            >
              {task.tieu_de}
            </p>

            <p
              className={`text-xs mt-1 ${
                isDark ? "text-gray-500" : "text-gray-400"
              }`}
            >
              Hạn nhiệm vụ chính:{" "}
              {task.han_chot
                ? new Date(task.han_chot).toLocaleDateString()
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
              Tên phần việc
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
              Mô tả phần việc
            </label>

            <textarea
              value={form.mo_ta}
              onChange={(e) =>
                handleChange("mo_ta", e.target.value)
              }
              className={`${inputClass} h-28 resize-none`}
            />
          </div>

          <div>
            <label className={labelClass}>
              Người thực hiện
            </label>

            <select
              value={form.assignee_user_id}
              onChange={(e) =>
                handleChange(
                  "assignee_user_id",
                  e.target.value
                )
              }
              className={inputClass}
            >
              <option value="">Chọn nhân viên</option>

              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name || u.username}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>
              Hạn hoàn thành
            </label>

            <input
              type="date"
              value={form.han_chot}
              max={
                task.han_chot
                  ? task.han_chot.slice(0, 10)
                  : undefined
              }
              onChange={(e) =>
                handleChange("han_chot", e.target.value)
              }
              className={inputClass}
            />
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
            disabled={saving}
            onClick={handleSubmit}
            className={`
              px-4 py-2
              rounded-xl
              text-white
              transition
              ${
                saving
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-blue-500 hover:bg-blue-600"
              }
            `}
          >
            {saving ? "Đang lưu..." : "Lưu thay đổi"}
          </button>
        </div>
      </div>
    </div>
  );
}