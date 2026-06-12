import { useEffect, useState } from "react";
import api from "../../services/api";

export default function CreateDocumentModal({
  onClose,
  onCreated,
}) {
  const [types, setTypes] = useState([]);
  const [sourceLevels, setSourceLevels] = useState([]);
  const [priorities, setPriorities] = useState([]);
  const [securityLevels, setSecurityLevels] = useState([]);
  const [selectedFile, setSelectedFile] =
  useState(null);
  

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
});

  const [loading, setLoading] = useState(false);

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

  const selectedType = types.find(
  (item) => String(item.id) === String(form.loai_van_ban_id)
);

  useEffect(() => {
    fetchMasterData();
  }, []);

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

    formData.append("so_ky_hieu", form.so_ky_hieu);
    formData.append("tieu_de", form.tieu_de);
    formData.append("trich_yeu", form.trich_yeu);
    formData.append("loai_van_ban_id", form.loai_van_ban_id);
    formData.append("muc_do_uu_tien", form.muc_do_uu_tien);
    formData.append("muc_do_bao_mat", form.muc_do_bao_mat);
    formData.append("cap_ban_hanh", form.cap_ban_hanh);
    formData.append("don_vi_ban_hanh", form.don_vi_ban_hanh);
    formData.append("nguoi_ky", form.nguoi_ky);
    formData.append("ngay_ban_hanh", form.ngay_ban_hanh);
    formData.append("ngay_nhan", form.ngay_nhan);

    if (selectedFile) {
      formData.append("file", selectedFile);
    }

    await api.post("/documents", formData);

    alert("Thêm văn bản thành công");

    onCreated();
    onClose();
  } catch (err) {
    console.log("CREATE DOCUMENT ERROR:", err);

    alert(
      err.response?.data?.message ||
        "Thêm văn bản thất bại"
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
      ? "bg-slate-950 border-slate-700 text-gray-100 placeholder:text-gray-500"
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
    📄 Thêm văn bản
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
<div className="p-6 max-h-[calc(90vh-140px)] overflow-y-auto">
  <div className="grid grid-cols-2 gap-4">

    {/* Số ký hiệu */}
    <div>
      <label className="text-sm font-medium">
        Số ký hiệu
      </label>

      <input
        name="so_ky_hieu"
        value={form.so_ky_hieu}
        onChange={handleChange}
        placeholder="VD: 12-CV/ĐU"
        className="w-full mt-1 border rounded-lg px-3 py-2"
      />
    </div>

    {/* Loại văn bản */}
    <div>
      <label className="text-sm font-medium">
        Loại văn bản
      </label>

      <select
        name="loai_van_ban_id"
        value={form.loai_van_ban_id}
        onChange={handleChange}
        className="w-full mt-1 border rounded-lg px-3 py-2"
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
      {selectedType && (
  <div className="mt-2 rounded-xl bg-blue-50 border border-blue-100 px-3 py-2">
    <p className="text-xs text-blue-700">
      Loại văn bản này sẽ ảnh hưởng đến độ ưu tiên của nhiệm vụ khi tạo nhiệm vụ từ văn bản.
    </p>

    {selectedType.priority_weight !== undefined && (
      <p className="text-xs text-blue-500 mt-1">
        Trọng số ưu tiên: {selectedType.priority_weight} điểm
      </p>
    )}
  </div>
)}
    </div>

    {/* Tiêu đề */}
    <div className="col-span-2">
      <label className="text-sm font-medium">
        Tiêu đề văn bản
      </label>

      <input
        name="tieu_de"
        value={form.tieu_de}
        onChange={handleChange}
        placeholder="Nhập tiêu đề văn bản"
        className="w-full mt-1 border rounded-lg px-3 py-2"
      />
    </div>

    {/* Trích yếu */}
    <div className="col-span-2">
      <label className="text-sm font-medium">
        Trích yếu
      </label>

      <textarea
        name="trich_yeu"
        value={form.trich_yeu}
        onChange={handleChange}
        placeholder="Nhập trích yếu nội dung văn bản"
        rows="3"
        className="w-full mt-1 border rounded-lg px-3 py-2 resize-none"
      />
    </div>

    {/* Cấp ban hành */}
    <div>
      <label className="text-sm font-medium">
        Cấp ban hành
      </label>

      <select
        name="cap_ban_hanh"
        value={form.cap_ban_hanh}
        onChange={handleChange}
        className="w-full mt-1 border rounded-lg px-3 py-2"
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
      <label className="text-sm font-medium">
        Đơn vị ban hành
      </label>

      <input
        name="don_vi_ban_hanh"
        value={form.don_vi_ban_hanh}
        onChange={handleChange}
        placeholder="VD: Quận ủy"
        className="w-full mt-1 border rounded-lg px-3 py-2"
      />
    </div>

    {/* Mức độ ưu tiên */}
    <div>
      <label className="text-sm font-medium">
        Mức độ ưu tiên
      </label>

      <select
        name="muc_do_uu_tien"
        value={form.muc_do_uu_tien}
        onChange={handleChange}
        className="w-full mt-1 border rounded-lg px-3 py-2"
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
      <label className="text-sm font-medium">
        Mức độ bảo mật
      </label>

      <select
        name="muc_do_bao_mat"
        value={form.muc_do_bao_mat}
        onChange={handleChange}
        className="w-full mt-1 border rounded-lg px-3 py-2"
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
      <label className="text-sm font-medium">
        Người ký
      </label>

      <input
        name="nguoi_ky"
        value={form.nguoi_ky}
        onChange={handleChange}
        placeholder="Nhập người ký"
        className="w-full mt-1 border rounded-lg px-3 py-2"
      />
    </div>

    {/* Ngày ban hành */}
    <div>
      <label className="text-sm font-medium">
        Ngày ban hành
      </label>

      <input
        type="date"
        name="ngay_ban_hanh"
        value={form.ngay_ban_hanh}
        onChange={handleChange}
        className="w-full mt-1 border rounded-lg px-3 py-2"
      />
    </div>

    {/* Ngày nhận */}
    <div>
      <label className="text-sm font-medium">
        Ngày nhận
      </label>

      <input
        type="date"
        name="ngay_nhan"
        value={form.ngay_nhan}
        onChange={handleChange}
        className="w-full mt-1 border rounded-lg px-3 py-2"
      />
    </div>

    {/* Tệp văn bản */}
    <div className="col-span-2">
      <label className="text-sm font-medium">
        Tệp văn bản
      </label>

      <div
  className={`
    mt-2
    border-2
    border-dashed
    rounded-2xl
    p-5
    text-center
    transition
    ${
      isDark
        ? "bg-slate-950 border-slate-700 hover:bg-slate-800"
        : "bg-gray-50 border-gray-300 hover:bg-gray-100"
    }
  `}
>
        <input
          type="file"
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
          onChange={(e) =>
  setSelectedFile(e.target.files?.[0] || null)
}
          className="hidden"
          id="document-file"
        />

        <label
          htmlFor="document-file"
          className="cursor-pointer block"
        >
          <div className="text-3xl mb-2">
            📎
          </div>

          <p
  className={`font-medium ${
    isDark ? "text-gray-200" : "text-gray-700"
  }`}
>
  Bấm để chọn file văn bản
</p>

          <p
  className={`text-xs mt-1 ${
    isDark ? "text-gray-500" : "text-gray-400"
  }`}
>
            Hỗ trợ PDF, DOC, DOCX, JPG, PNG
          </p>
        </label>

        {selectedFile && (
          <div
  className={`mt-3 text-sm font-medium ${
    isDark ? "text-blue-400" : "text-blue-600"
  }`}
>
            Đã chọn: {selectedFile.name}
          </div>
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
      : "Lưu văn bản"}
  </button>
</div>
      </div>
    </div>
  );
}