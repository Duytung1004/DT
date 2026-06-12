import { useEffect, useState } from "react";
import api from "../../services/api";

export default function EditDocumentModal({
  document,
  onClose,
  onUpdated,
}) {
  const [types, setTypes] = useState([]);
  const [sourceLevels, setSourceLevels] = useState([]);
  const [priorities, setPriorities] = useState([]);
  const [securityLevels, setSecurityLevels] = useState([]);

  const [form, setForm] = useState({
    so_ky_hieu: "",
    tieu_de: "",
    trich_yeu: "",
    loai_van_ban_id: "",
    muc_do_uu_tien: "binh_thuong",
    muc_do_bao_mat: "noi_bo",
    cap_ban_hanh: "noi_bo",
    don_vi_ban_hanh: "",
    nguoi_ky: "",
    ngay_ban_hanh: "",
    ngay_nhan: "",
    status: "moi",
  });

  const [loading, setLoading] = useState(false);
  const [newFile, setNewFile] = useState(null);

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

  useEffect(() => {
    fetchMasterData();
  }, []);

  useEffect(() => {
    if (document) {
      setForm({
        so_ky_hieu: document.so_ky_hieu || "",
        tieu_de: document.tieu_de || "",
        trich_yeu: document.trich_yeu || "",
        loai_van_ban_id:
          document.loai_van_ban_id || "",
        muc_do_uu_tien:
          document.muc_do_uu_tien || "binh_thuong",
        muc_do_bao_mat:
          document.muc_do_bao_mat || "noi_bo",
        cap_ban_hanh:
          document.cap_ban_hanh || "noi_bo",
        don_vi_ban_hanh:
          document.don_vi_ban_hanh || "",
        nguoi_ky: document.nguoi_ky || "",
        ngay_ban_hanh: document.ngay_ban_hanh
          ? document.ngay_ban_hanh.slice(0, 10)
          : "",
        ngay_nhan: document.ngay_nhan
          ? document.ngay_nhan.slice(0, 10)
          : "",
        status: document.status || "moi",
      });
    }
  }, [document]);

  const fetchMasterData = async () => {
    try {
      const [
        typeRes,
        sourceRes,
        priorityRes,
        securityRes,
      ] = await Promise.all([
        api.get("/documents/types"),
        api.get("/documents/source-levels"),
        api.get("/documents/priorities"),
        api.get("/documents/security-levels"),
      ]);

      setTypes(typeRes.data);
      setSourceLevels(sourceRes.data);
      setPriorities(priorityRes.data);
      setSecurityLevels(securityRes.data);
    } catch (err) {
      console.log("FETCH MASTER DATA ERROR:", err);
      alert("Không tải được dữ liệu danh mục");
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async () => {
    if (!form.tieu_de.trim()) {
      return alert("Nhập tiêu đề văn bản");
    }

    if (!form.loai_van_ban_id) {
      return alert("Chọn loại văn bản");
    }

    try {
      setLoading(true);

      const formData = new FormData();

Object.entries(form).forEach(([key, value]) => {
  formData.append(key, value ?? "");
});

formData.set(
  "loai_van_ban_id",
  Number(form.loai_van_ban_id)
);

if (newFile) {
  formData.append("file", newFile);
}

await api.put(`/documents/${document.id}`, formData, {
  headers: {
    "Content-Type": "multipart/form-data",
  },
});

      alert("Cập nhật văn bản thành công");

      onUpdated();
      onClose();
    } catch (err) {
      console.log("UPDATE DOCUMENT ERROR:", err);

      alert(
        err.response?.data?.message ||
          "Cập nhật văn bản thất bại"
      );
    } finally {
      setLoading(false);
    }
  };
  const labelClass = `
  text-sm
  font-medium
  ${isDark ? "text-gray-300" : "text-gray-700"}
`;

const inputClass = `
  w-full
  mt-1
  border
  rounded-lg
  px-3 py-2
  outline-none
  focus:ring-2
  focus:ring-blue-400
  transition
  ${
    isDark
      ? "bg-slate-950 border-slate-700 text-gray-100 placeholder:text-gray-500 [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-70"
      : "bg-white border-gray-200 text-gray-900 placeholder:text-gray-400"
  }
`;

  return (
    <div
  className="
    fixed inset-0
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
    w-[820px]
    max-w-[95vw]
    max-h-[90vh]
    rounded-3xl
    shadow-2xl
    overflow-hidden
    border
    ${
      isDark
        ? "bg-slate-900 border-slate-800 text-gray-100"
        : "bg-white border-gray-100 text-gray-900"
    }
  `}
  onClick={(e) => e.stopPropagation()}
>
        {/* HEADER */}
        <div
  className={`
    flex
    items-center
    justify-between
    border-b
    px-6 py-4
    ${
      isDark
        ? "bg-slate-900 border-slate-800"
        : "bg-white border-gray-100"
    }
  `}
>
          <h2
  className={`text-xl font-bold ${
    isDark ? "text-gray-100" : "text-gray-900"
  }`}
>
            ✏️ Chỉnh sửa văn bản
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

        {/* BODY */}
        <div
  className={`
    p-6
    max-h-[calc(90vh-140px)]
    overflow-y-auto
    ${
      isDark ? "bg-slate-900" : "bg-white"
    }
  `}
>
          <div className="grid grid-cols-2 gap-4">
            {/* Số ký hiệu */}
            <div>
              <label className={labelClass}>
                Số ký hiệu
              </label>

              <input
                name="so_ky_hieu"
                value={form.so_ky_hieu}
                onChange={handleChange}
                placeholder="VD: 12-CV/ĐU"
                className={inputClass}
              />
            </div>

            {/* Loại văn bản */}
            <div>
              <label className={labelClass}>
                Loại văn bản
              </label>

              <select
                name="loai_van_ban_id"
                value={form.loai_van_ban_id}
                onChange={handleChange}
                className={inputClass}
              >
                <option value="">
                  Chọn loại văn bản
                </option>

                {types.map((item) => (
                  <option
                    key={item.id}
                    value={item.id}
                  >
                    {item.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Tiêu đề */}
            <div className="col-span-2">
              <label className={labelClass}>
                Tiêu đề văn bản
              </label>

              <input
                name="tieu_de"
                value={form.tieu_de}
                onChange={handleChange}
                placeholder="Nhập tiêu đề văn bản"
                className={inputClass}
              />
            </div>

            {/* Trích yếu */}
            <div className="col-span-2">
              <label className={labelClass}>
                Trích yếu
              </label>

              <textarea
                name="trich_yeu"
                value={form.trich_yeu}
                onChange={handleChange}
                placeholder="Nhập trích yếu nội dung văn bản"
                rows="3"
                className={`${inputClass} resize-none`}
              />
            </div>

            {/* Cấp ban hành */}
            <div>
              <label className={labelClass}>
                Cấp ban hành
              </label>

              <select
                name="cap_ban_hanh"
                value={form.cap_ban_hanh}
                onChange={handleChange}
                className={inputClass}
              >
                {sourceLevels.map((item) => (
                  <option
                    key={item.code}
                    value={item.code}
                  >
                    {item.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Đơn vị ban hành */}
            <div>
              <label className={labelClass}>
                Đơn vị ban hành
              </label>

              <input
                name="don_vi_ban_hanh"
                value={form.don_vi_ban_hanh}
                onChange={handleChange}
                placeholder="VD: Quận ủy"
                className={inputClass}
              />
            </div>

            {/* Mức độ ưu tiên */}
            <div>
              <label className={labelClass}>
                Mức độ ưu tiên
              </label>

              <select
                name="muc_do_uu_tien"
                value={form.muc_do_uu_tien}
                onChange={handleChange}
                className={inputClass}
              >
                {priorities.map((item) => (
                  <option
                    key={item.code}
                    value={item.code}
                  >
                    {item.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Mức độ bảo mật */}
            <div>
              <label className={labelClass}>
                Mức độ bảo mật
              </label>

              <select
                name="muc_do_bao_mat"
                value={form.muc_do_bao_mat}
                onChange={handleChange}
                className={inputClass}
              >
                {securityLevels.map((item) => (
                  <option
                    key={item.code}
                    value={item.code}
                  >
                    {item.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Người ký */}
            <div>
              <label className={labelClass}>
                Người ký
              </label>

              <input
                name="nguoi_ky"
                value={form.nguoi_ky}
                onChange={handleChange}
                placeholder="Nhập người ký"
                className={inputClass}
              />
            </div>

            {/* Trạng thái */}
            <div>
              <label className={labelClass}>
                Trạng thái
              </label>

              <select
                name="status"
                value={form.status}
                onChange={handleChange}
               className={inputClass}
              >
                <option value="moi">
                  Mới tiếp nhận
                </option>
                <option value="luu_tru">
                  Lưu trữ
                </option>
              </select>
            </div>

            {/* Ngày ban hành */}
            <div>
              <label className={labelClass}>
                Ngày ban hành
              </label>

              <input
                type="date"
                name="ngay_ban_hanh"
                value={form.ngay_ban_hanh}
                onChange={handleChange}
               className={inputClass}
              />
            </div>

            {/* Ngày nhận */}
            <div>
              <label className={labelClass}>
                Ngày nhận
              </label>

              <input
                type="date"
                name="ngay_nhan"
                value={form.ngay_nhan}
                onChange={handleChange}
                className={inputClass}
              />
            </div>

            {/* File văn bản */}
<div
  className={`
    col-span-2
    border
    rounded-2xl
    p-4
    ${
      isDark
        ? "bg-slate-950 border-slate-700"
        : "bg-gray-50 border-gray-200"
    }
  `}
>
  <p
    className={`text-sm font-medium ${
      isDark ? "text-gray-200" : "text-gray-700"
    }`}
  >
    File văn bản
  </p>

  {document?.file_path && (
    <div className="mt-2">
      <p
        className={`text-xs mb-1 ${
          isDark ? "text-gray-500" : "text-gray-400"
        }`}
      >
        File hiện tại
      </p>

      <a
        href={`http://localhost:3000${document.file_path}`}
        target="_blank"
        rel="noreferrer"
        className={`text-sm hover:underline ${
          isDark ? "text-blue-400" : "text-blue-600"
        }`}
      >
        {document.file_name || "Xem file"}
      </a>
    </div>
  )}

  <div className="mt-4">
    <label
      className={`text-xs font-medium ${
        isDark ? "text-gray-400" : "text-gray-500"
      }`}
    >
      Thay file mới
    </label>

    <input
      type="file"
      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
      onChange={(e) =>
        setNewFile(e.target.files?.[0] || null)
      }
      className={`
        w-full
        mt-2
        border
        rounded-xl
        px-3 py-2
        text-sm
        transition
        ${
          isDark
            ? "bg-slate-900 border-slate-700 text-gray-300 file:bg-slate-800 file:text-gray-200 file:border-0 file:rounded-lg file:px-3 file:py-1.5 file:mr-3"
            : "bg-white border-gray-200 text-gray-700 file:bg-gray-100 file:text-gray-700 file:border-0 file:rounded-lg file:px-3 file:py-1.5 file:mr-3"
        }
      `}
    />

    {newFile && (
      <p
        className={`text-xs mt-2 ${
          isDark ? "text-blue-400" : "text-blue-600"
        }`}
      >
        File mới đã chọn: {newFile.name}
      </p>
    )}
  </div>
</div>
          </div>
        </div>

        {/* ACTION */}
        <div
  className={`
    flex
    justify-end
    gap-2
    border-t
    px-6 py-4
    ${
      isDark
        ? "bg-slate-950 border-slate-800"
        : "bg-white border-gray-100"
    }
  `}
>
          <button
  onClick={onClose}
  className={`
    px-4 py-2
    rounded-lg
    transition
    ${
      isDark
        ? "bg-slate-800 text-gray-200 hover:bg-slate-700"
        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
    }
  `}
>
            Hủy
          </button>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="
              px-4 py-2
              rounded-lg
              bg-blue-500
              text-white
              hover:bg-blue-600
              disabled:opacity-60
            "
          >
            {loading
              ? "Đang lưu..."
              : "Lưu thay đổi"}
          </button>
        </div>
      </div>
    </div>
  );
}