import { useEffect, useState } from "react";
import {
  Settings,
  Save,
  Building2,
  Phone,
  Mail,
  FileText,
  Trash2,
} from "lucide-react";

import api from "../../services/api";

const defaultForm = {
  system_name: "",
  organization_name: "",
  system_description: "",
  contact_phone: "",
  contact_email: "",
  trash_retention_days: "30",
};

export default function AdminSystemInfo() {
  const [form, setForm] = useState(defaultForm);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchSettings = async () => {
    try {
      setLoading(true);

      const res = await api.get("/system-settings");

      setForm({
  system_name: res.data.system_name || "",
  organization_name: res.data.organization_name || "",
  system_description: res.data.system_description || "",
  contact_phone: res.data.contact_phone || "",
  contact_email: res.data.contact_email || "",
  trash_retention_days:
    res.data.trash_retention_days || "30",
});
    } catch (err) {
      console.log("FETCH SYSTEM SETTINGS ERROR:", err);

      alert(
        err.response?.data?.message ||
          "Không tải được thông tin hệ thống"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleChange = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.system_name.trim()) {
      alert("Tên hệ thống không được để trống");
      return;
    }

    if (!form.organization_name.trim()) {
      alert("Tên đơn vị không được để trống");
      return;
    }
    const trashDays = Number(form.trash_retention_days);

if (!trashDays || trashDays < 1) {
  alert("Thời gian lưu thùng rác phải lớn hơn 0 ngày");
  return;
}

if (trashDays > 365) {
  alert("Thời gian lưu thùng rác không nên vượt quá 365 ngày");
  return;
}

    try {
      setSaving(true);

      await api.put("/system-settings", form);

      alert("Cập nhật thông tin hệ thống thành công");

      fetchSettings();
    } catch (err) {
      console.log("UPDATE SYSTEM SETTINGS ERROR:", err);

      alert(
        err.response?.data?.message ||
          "Cập nhật thông tin hệ thống thất bại"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      {/* HEADER */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Thông tin hệ thống
          </h1>

          <p className="text-gray-500 mt-1">
            Cấu hình tên hệ thống, đơn vị sử dụng và thông tin liên hệ
          </p>
        </div>

        <button
          onClick={handleSubmit}
          disabled={saving || loading}
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
            disabled:opacity-60
            disabled:cursor-not-allowed
          "
        >
          <Save size={18} />
          {saving ? "Đang lưu..." : "Lưu thay đổi"}
        </button>
      </div>

      {/* OVERVIEW */}
      <div className="bg-white rounded-[32px] border border-gray-200 shadow-sm p-6 mb-6">
        <div className="flex items-start gap-4">
          <div
            className="
              w-14 h-14
              rounded-2xl
              bg-blue-100
              text-blue-600
              flex
              items-center
              justify-center
              shrink-0
            "
          >
            <Settings size={26} />
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Cấu hình hiển thị chung
            </h2>

            <p className="text-sm text-gray-500 mt-2 leading-relaxed max-w-3xl">
              Các thông tin này có thể dùng để hiển thị ở trang đăng nhập,
              dashboard, báo cáo hoặc phần tiêu đề của hệ thống. Admin có thể
              cập nhật khi đơn vị hoặc mô tả hệ thống thay đổi.
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-[32px] border border-gray-200 shadow-sm p-8 text-center text-gray-500">
          Đang tải thông tin hệ thống...
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-6">
          {/* FORM */}
          <form
            onSubmit={handleSubmit}
            className="
              bg-white
              rounded-[32px]
              border
              border-gray-200
              shadow-sm
              p-6
              space-y-5
            "
          >
            <div>
              <label className="text-sm font-semibold text-gray-700">
                Tên hệ thống
              </label>

              <div
                className="
                  mt-2
                  flex
                  items-center
                  gap-3
                  rounded-2xl
                  bg-gray-100
                  px-4
                  py-3
                "
              >
                <Settings size={18} className="text-gray-400" />

                <input
                  value={form.system_name}
                  onChange={(e) =>
                    handleChange("system_name", e.target.value)
                  }
                  placeholder="VD: Hệ thống quản lý tiến độ nhiệm vụ"
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

            <div>
              <label className="text-sm font-semibold text-gray-700">
                Tên đơn vị sử dụng
              </label>

              <div
                className="
                  mt-2
                  flex
                  items-center
                  gap-3
                  rounded-2xl
                  bg-gray-100
                  px-4
                  py-3
                "
              >
                <Building2 size={18} className="text-gray-400" />

                <input
                  value={form.organization_name}
                  onChange={(e) =>
                    handleChange("organization_name", e.target.value)
                  }
                  placeholder="VD: Đảng ủy phường Tam Thanh"
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

            <div>
              <label className="text-sm font-semibold text-gray-700">
                Mô tả hệ thống
              </label>

              <div
                className="
                  mt-2
                  flex
                  items-start
                  gap-3
                  rounded-2xl
                  bg-gray-100
                  px-4
                  py-3
                "
              >
                <FileText
                  size={18}
                  className="text-gray-400 mt-1 shrink-0"
                />

                <textarea
                  value={form.system_description}
                  onChange={(e) =>
                    handleChange(
                      "system_description",
                      e.target.value
                    )
                  }
                  rows={5}
                  placeholder="Mô tả ngắn về chức năng và mục tiêu của hệ thống..."
                  className="
                    bg-transparent
                    outline-none
                    text-sm
                    flex-1
                    text-gray-700
                    resize-none
                  "
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Số điện thoại liên hệ
                </label>

                <div
                  className="
                    mt-2
                    flex
                    items-center
                    gap-3
                    rounded-2xl
                    bg-gray-100
                    px-4
                    py-3
                  "
                >
                  <Phone size={18} className="text-gray-400" />

                  <input
                    value={form.contact_phone}
                    onChange={(e) =>
                      handleChange("contact_phone", e.target.value)
                    }
                    placeholder="VD: 0205..."
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

              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Email liên hệ
                </label>

                <div
                  className="
                    mt-2
                    flex
                    items-center
                    gap-3
                    rounded-2xl
                    bg-gray-100
                    px-4
                    py-3
                  "
                >
                  <Mail size={18} className="text-gray-400" />

                  <input
                    value={form.contact_email}
                    onChange={(e) =>
                      handleChange("contact_email", e.target.value)
                    }
                    placeholder="VD: admin@example.com"
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
            </div>
            <div>
  <label className="text-sm font-semibold text-gray-700">
    Thời gian lưu thùng rác
  </label>

  <div
    className="
      mt-2
      flex
      items-center
      gap-3
      rounded-2xl
      bg-gray-100
      px-4
      py-3
    "
  >
    <Trash2 size={18} className="text-gray-400" />

    <input
      type="number"
      min="1"
      max="365"
      value={form.trash_retention_days}
      onChange={(e) =>
        handleChange(
          "trash_retention_days",
          e.target.value
        )
      }
      placeholder="VD: 30"
      className="
        bg-transparent
        outline-none
        text-sm
        flex-1
        text-gray-700
      "
    />

    <span className="text-sm text-gray-500">
      ngày
    </span>
  </div>

  <p className="text-xs text-gray-400 mt-2">
    Dữ liệu trong thùng rác sẽ được lưu trong khoảng thời gian này trước khi có thể xóa vĩnh viễn.
  </p>
</div>

            <div className="flex justify-end pt-3">
              <button
                type="submit"
                disabled={saving}
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
                  transition
                  disabled:opacity-60
                "
              >
                <Save size={17} />
                {saving ? "Đang lưu..." : "Lưu thông tin"}
              </button>
            </div>
          </form>

          {/* PREVIEW */}
          <div
            className="
              bg-white
              rounded-[32px]
              border
              border-gray-200
              shadow-sm
              p-6
              h-fit
            "
          >
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              Xem trước thông tin
            </h2>

            <div
              className="
                rounded-[28px]
                bg-gradient-to-br
                from-gray-50
                to-white
                border
                border-gray-100
                p-5
              "
            >
              <div
                className="
                  w-14 h-14
                  rounded-2xl
                  bg-black
                  text-white
                  flex
                  items-center
                  justify-center
                  font-bold
                  mb-4
                "
              >
                {form.system_name?.charAt(0)?.toUpperCase() || "H"}
              </div>

              <h3 className="text-xl font-bold text-gray-900">
                {form.system_name || "Tên hệ thống"}
              </h3>

              <p className="text-sm font-semibold text-blue-600 mt-2">
                {form.organization_name || "Tên đơn vị sử dụng"}
              </p>

              <p className="text-sm text-gray-500 mt-4 leading-relaxed">
                {form.system_description ||
                  "Mô tả hệ thống sẽ hiển thị tại đây."}
              </p>

              <div className="mt-5 space-y-2 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <Phone size={15} />
                  <span>
                    {form.contact_phone || "Chưa có số điện thoại"}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Mail size={15} />
                  <span>
                    {form.contact_email || "Chưa có email"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
  <Trash2 size={15} />
  <span>
    Lưu thùng rác:{" "}
    {form.trash_retention_days || 30} ngày
  </span>
</div>
              </div>
            </div>


            <p className="text-xs text-gray-400 mt-4 leading-relaxed">
              Phần xem trước giúp admin kiểm tra nhanh thông tin trước khi lưu.
              Sau này có thể dùng các dữ liệu này cho trang đăng nhập, tiêu đề
              hệ thống hoặc báo cáo.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}