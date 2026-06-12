import { useEffect, useState } from "react";
import api from "../../services/api";

export default function SubtaskAssignModal({
  task,
  onClose,
  onCreated,
}) {
  const [users, setUsers] = useState([]);
  const [mode, setMode] = useState("single");
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

  const [form, setForm] = useState({
    tieu_de: "",
    mo_ta: "",
    assignee_user_id: "",
    han_chot: "",
  });

  const [rows, setRows] = useState([
    {
      tieu_de: "",
      mo_ta: "",
      assignee_user_id: "",
      han_chot: "",
    },
  ]);

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

  const handleRowChange = (index, key, value) => {
    setRows((prev) =>
      prev.map((row, i) =>
        i === index
          ? {
              ...row,
              [key]: value,
            }
          : row
      )
    );
  };

  const addRow = () => {
    setRows((prev) => [
      ...prev,
      {
        tieu_de: "",
        mo_ta: "",
        assignee_user_id: "",
        han_chot: "",
      },
    ]);
  };

  const removeRow = (index) => {
    if (rows.length === 1) {
      alert("Cần ít nhất 1 phần việc");
      return;
    }

    setRows((prev) =>
      prev.filter((_, i) => i !== index)
    );
  };

  const handleSubmitSingle = async () => {
    if (submitting) return;

    try {
      setSubmitting(true);

      if (
        !form.tieu_de ||
        !form.assignee_user_id ||
        !form.han_chot
      ) {
        alert(
          "Vui lòng nhập đủ tiêu đề, người thực hiện và hạn chót"
        );
        return;
      }

      await api.post(`/tasks/${task.id}/subtask`, {
        ...form,
        assignee_user_id: Number(form.assignee_user_id),
      });

      alert("Đã giao phần việc");

      await onCreated();

      setForm({
        tieu_de: "",
        mo_ta: "",
        assignee_user_id: "",
        han_chot: "",
      });
    } catch (err) {
      console.error("CREATE SUBTASK ERROR:", err);

      alert(
        err.response?.data?.message ||
          "Phân công nội bộ thất bại"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitMultiple = async () => {
    if (submitting) return;

    try {
      setSubmitting(true);

      const invalidRow = rows.find(
        (row) =>
          !row.tieu_de ||
          !row.assignee_user_id ||
          !row.han_chot
      );

      if (invalidRow) {
        alert(
          "Vui lòng nhập đủ tiêu đề, người thực hiện và hạn chót cho tất cả phần việc"
        );
        return;
      }

      await Promise.all(
        rows.map((row) =>
          api.post(`/tasks/${task.id}/subtask`, {
            ...row,
            assignee_user_id: Number(row.assignee_user_id),
          })
        )
      );

      alert("Đã giao tất cả phần việc");

      await onCreated();

      setRows([
        {
          tieu_de: "",
          mo_ta: "",
          assignee_user_id: "",
          han_chot: "",
        },
      ]);
    } catch (err) {
      console.error("CREATE MULTIPLE SUBTASKS ERROR:", err);

      alert(
        err.response?.data?.message ||
          "Giao nhiều phần việc thất bại"
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

  const modeButtonClass = (active) => `
    rounded-2xl
    border
    p-4
    text-left
    transition
    ${
      active
        ? isDark
          ? "border-blue-500 bg-blue-950/40 text-blue-300"
          : "border-blue-400 bg-blue-50 text-blue-700"
        : isDark
        ? "border-slate-700 bg-slate-950 text-gray-300 hover:bg-slate-800"
        : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
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
          w-[720px]
          max-w-[95vw]
          max-h-[90vh]
          overflow-y-auto
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
              Phân công nội bộ
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
          <button
            onClick={() => setMode("single")}
            className={modeButtonClass(mode === "single")}
          >
            <p className="font-semibold">
              Giao việc cho 1 người
            </p>
            <p className="text-xs mt-1">
              Dùng khi nhiệm vụ chỉ cần một nhân viên xử lý
            </p>
          </button>

          <button
            onClick={() => setMode("multiple")}
            className={modeButtonClass(mode === "multiple")}
          >
            <p className="font-semibold">
              Chia nhỏ thành nhiều phần việc
            </p>
            <p className="text-xs mt-1">
              Dùng khi cần nhiều nhân viên cùng tham gia
            </p>
          </button>
        </div>

        {mode === "single" ? (
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
                placeholder="Ví dụ: Rà soát nội dung văn bản"
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
                placeholder="Nhập yêu cầu cụ thể cho nhân viên..."
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
        ) : (
          <div className="space-y-4">
            {rows.map((row, index) => (
              <div
                key={index}
                className={`
                  rounded-2xl
                  border
                  p-4
                  ${
                    isDark
                      ? "bg-slate-950 border-slate-700"
                      : "bg-gray-50 border-gray-100"
                  }
                `}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3
                    className={`font-semibold ${
                      isDark ? "text-gray-100" : "text-gray-800"
                    }`}
                  >
                    Phần việc {index + 1}
                  </h3>

                  <button
                    onClick={() => removeRow(index)}
                    className="
                      text-xs
                      text-red-500
                      hover:text-red-400
                      transition
                    "
                  >
                    Xóa dòng
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="md:col-span-2">
                    <label className={labelClass}>
                      Tên phần việc
                    </label>

                    <input
                      value={row.tieu_de}
                      onChange={(e) =>
                        handleRowChange(
                          index,
                          "tieu_de",
                          e.target.value
                        )
                      }
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>
                      Người thực hiện
                    </label>

                    <select
                      value={row.assignee_user_id}
                      onChange={(e) =>
                        handleRowChange(
                          index,
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
                      value={row.han_chot}
                      max={
                        task.han_chot
                          ? task.han_chot.slice(0, 10)
                          : undefined
                      }
                      onChange={(e) =>
                        handleRowChange(
                          index,
                          "han_chot",
                          e.target.value
                        )
                      }
                      className={inputClass}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className={labelClass}>
                      Mô tả
                    </label>

                    <textarea
                      value={row.mo_ta}
                      onChange={(e) =>
                        handleRowChange(
                          index,
                          "mo_ta",
                          e.target.value
                        )
                      }
                      className={`${inputClass} h-20 resize-none`}
                    />
                  </div>
                </div>
              </div>
            ))}

            <button
              onClick={addRow}
              className={`
                w-full
                py-3
                rounded-xl
                border
                border-dashed
                transition
                ${
                  isDark
                    ? "border-blue-800 text-blue-400 hover:bg-blue-950/30"
                    : "border-blue-300 text-blue-600 hover:bg-blue-50"
                }
              `}
            >
              + Thêm phần việc
            </button>
          </div>
        )}

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
            Đóng
          </button>

          <button
            disabled={submitting}
            onClick={
              mode === "single"
                ? handleSubmitSingle
                : handleSubmitMultiple
            }
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
            {submitting
              ? "Đang giao..."
              : mode === "single"
              ? "Giao phần việc"
              : "Giao tất cả"}
          </button>
        </div>
      </div>
    </div>
  );
}