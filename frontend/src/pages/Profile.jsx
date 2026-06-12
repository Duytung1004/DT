import {
  Mail,
  Shield,
  User,
  Building2,
  CalendarDays,
  Save,
  KeyRound,
  Pencil,
  X,
  Camera,
  Settings,
  Briefcase,
  ArrowRight,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import api from "../services/api";

const getRoleLabel = (role) => {
  switch (role) {
    case "admin":
      return "Quản trị viên";
    case "lanh_dao":
      return "Lãnh đạo";
    case "truong_phong":
      return "Trưởng phòng";
    case "nhan_vien":
      return "Nhân viên";
    default:
      return role || "Chưa có vai trò";
  }
};

export default function Profile() {
  const storedUser =
    JSON.parse(localStorage.getItem("user")) || {};
  const [searchParams] = useSearchParams();
const forcePassword = searchParams.get("forcePassword") === "1";
const navigate = useNavigate();
  const userKey = storedUser.id || storedUser.userId || "default";

  const [user, setUser] = useState(storedUser);

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

  const [profileForm, setProfileForm] = useState({
    full_name: storedUser.full_name || "",
    username: storedUser.username || "",
    email: storedUser.email || "",
  });

  const [passwordForm, setPasswordForm] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [avatar, setAvatar] = useState(
    localStorage.getItem(`profile_avatar_${userKey}`) || ""
  );

  const [cover, setCover] = useState(
    localStorage.getItem(`profile_cover_${userKey}`) || ""
  );

  const [isEditingProfile, setIsEditingProfile] =
    useState(false);

  const [isChangingPassword, setIsChangingPassword] =
    useState(false);

  const [profileLoading, setProfileLoading] =
    useState(false);

  const [passwordLoading, setPasswordLoading] =
    useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const mustForcePassword =
  forcePassword || user.must_change_password;
  useEffect(() => {
  if (mustForcePassword) {
    setIsChangingPassword(true);
    setMessage("");
    setError(
      "Bạn cần đổi mật khẩu trước khi tiếp tục sử dụng hệ thống."
    );
  }
}, [mustForcePassword]);

  const avatarInputRef = useRef(null);
  const coverInputRef = useRef(null);

  const displayName =
    user.full_name || user.username || "Người dùng";

  const roleName =
  user.role_name || getRoleLabel(user.role);

  const unitName =
    user.unit_name ||
    (user.unit_id ? `Phòng ban #${user.unit_id}` : "Chưa cập nhật");

  const firstLetter =
    displayName?.charAt(0)?.toUpperCase() || "U";

  const positionName =
  user.chuc_vu || "Chưa cập nhật chức vụ";

const titleClass = isDark ? "text-gray-100" : "text-gray-900";
const mutedClass = isDark ? "text-gray-400" : "text-gray-500";

const mainCardClass = `
  relative
  rounded-[34px]
  shadow-xl
  border
  overflow-hidden
  ${
    isDark
      ? "bg-slate-900 border-slate-800"
      : "bg-white border-gray-100"
  }
`;

const panelClass = `
  rounded-[28px]
  shadow-sm
  border
  p-6
  ${
    isDark
      ? "bg-slate-900 border-slate-800"
      : "bg-white border-gray-100"
  }
`;

const softBoxClass = `
  p-4
  rounded-2xl
  ${
    isDark
      ? "bg-slate-950 border border-slate-800"
      : "bg-gray-50"
  }
`;

  const handleProfileChange = (e) => {
    const { name, value } = e.target;

    setProfileForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;

    setPasswordForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleImageChange = (e, type) => {
    const file = e.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Vui lòng chọn file ảnh");
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const imageData = reader.result;

      if (type === "avatar") {
        setAvatar(imageData);

        localStorage.setItem(
            `profile_avatar_${userKey}`,
            imageData
        );

        window.dispatchEvent(
            new Event("profile-updated")
        );
        }

      if (type === "cover") {
        setCover(imageData);

        localStorage.setItem(
            `profile_cover_${userKey}`,
            imageData
        );

        window.dispatchEvent(
            new Event("profile-updated")
        );
        }
    };

    reader.readAsDataURL(file);
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();

    try {
      setProfileLoading(true);
      setMessage("");
      setError("");

      const res = await api.patch(
        "/auth/profile",
        profileForm
      );

      const updatedUser = {
        ...user,
        ...res.data.user,
        permissions: user.permissions || [],
      };

      localStorage.setItem(
        "user",
        JSON.stringify(updatedUser)
      );
      window.dispatchEvent(
        new Event("profile-updated")
        );

      setUser(updatedUser);

      setProfileForm({
        full_name: updatedUser.full_name || "",
        username: updatedUser.username || "",
        email: updatedUser.email || "",
      });

      setMessage("Cập nhật hồ sơ thành công");
      setIsEditingProfile(false);
    } catch (err) {
      console.log("UPDATE PROFILE ERROR:", err);

      setError(
        err.response?.data?.message ||
          "Không thể cập nhật hồ sơ"
      );
    } finally {
      setProfileLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();

    try {
      setPasswordLoading(true);
      setMessage("");
      setError("");

      if (
        passwordForm.newPassword !==
        passwordForm.confirmPassword
      ) {
        setError("Mật khẩu nhập lại không khớp");
        return;
      }

      await api.patch("/auth/change-password", {
        oldPassword: passwordForm.oldPassword,
        newPassword: passwordForm.newPassword,
      });
      const updatedUser = {
  ...user,
  must_change_password: false,
};

localStorage.setItem("user", JSON.stringify(updatedUser));
setUser(updatedUser);

window.dispatchEvent(new Event("profile-updated"));

      setPasswordForm({
        oldPassword: "",
        newPassword: "",
        confirmPassword: "",
      });

      setMessage(
  "Đổi mật khẩu thành công. Bạn có thể tiếp tục sử dụng hệ thống."
);
setIsChangingPassword(false);

navigate("/app/profile", {
  replace: true,
});
    } catch (err) {
      console.log("CHANGE PASSWORD ERROR:", err);

      setError(
        err.response?.data?.message ||
          "Không thể đổi mật khẩu"
      );
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* PROFILE CARD */}
      <div className={mainCardClass}>
        {/* COVER */}
        <div
          className="
            relative
            h-52
            bg-gradient-to-r
            from-blue-500
            via-cyan-400
            to-orange-300
          "
        >
          {cover && (
            <img
              src={cover}
              alt="cover"
              className="w-full h-full object-cover"
            />
          )}

          <button
            onClick={() => coverInputRef.current?.click()}
            className="
              absolute
              top-5
              right-5
              w-10 h-10
              rounded-full
              bg-white/90
              text-gray-800
              shadow
              flex
              items-center
              justify-center
              hover:bg-white
            "
            title="Đổi ảnh nền"
          >
            <Pencil size={18} />
          </button>

          <input
            ref={coverInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleImageChange(e, "cover")}
          />
        </div>

        {/* PROFILE BODY */}
        <div className="px-8 pb-7">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 -mt-16">
            <div className="flex flex-col md:flex-row md:items-end gap-5">
              {/* AVATAR */}
              <div className="relative">
                <div
                  className="
                    w-32 h-32
                    rounded-full
                    bg-white
                    border-4
                    border-white
                    shadow-xl
                    overflow-hidden
                    flex
                    items-center
                    justify-center
                  "
                >
                  {avatar ? (
                    <img
                      src={avatar}
                      alt="avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div
                      className="
                        w-full h-full
                        bg-blue-600
                        text-white
                        flex
                        items-center
                        justify-center
                        text-5xl
                        font-bold
                      "
                    >
                      {firstLetter}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => avatarInputRef.current?.click()}
                  className="
                    absolute
                    bottom-2
                    right-2
                    w-10 h-10
                    rounded-full
                    bg-white
                    text-blue-600
                    shadow-lg
                    flex
                    items-center
                    justify-center
                    hover:bg-blue-50
                  "
                  title="Đổi ảnh đại diện"
                >
                  <Camera size={18} />
                </button>

                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleImageChange(e, "avatar")}
                />
              </div>

              {/* NAME */}
              <div className="pb-3">
                <h1 className={`text-3xl font-bold ${titleClass}`}>
                  {displayName}
                </h1>

                <p className={`text-sm mt-1 ${mutedClass}`}>
                  {roleName}
                </p>

                <p className={`text-sm mt-1 ${mutedClass}`}>
                  {unitName}
                </p>

                <div className="flex flex-wrap gap-3 mt-5">
                  <button
                    onClick={() => setIsEditingProfile(true)}
                    className="
                      px-5 py-2.5
                      rounded-full
                      bg-gray-900
                      text-white
                      text-sm
                      font-semibold
                      hover:bg-black
                    "
                  >
                    Chỉnh sửa hồ sơ
                  </button>

                  <button
                    onClick={() => setIsChangingPassword(true)}
                    className="
                      px-5 py-2.5
                      rounded-full
                      border
                      border-gray-300
                      text-gray-800
                      text-sm
                      font-semibold
                      hover:bg-gray-50
                    "
                  >
                    Đổi mật khẩu
                  </button>
                </div>
              </div>
            </div>

            {/* ROLE */}
            <div className="pb-4">
              <div className="text-right hidden lg:block">
                <p className="text-sm text-gray-500 flex items-center gap-2 justify-end">
                  Vai trò hiện tại
                  <Briefcase size={16} />
                </p>

                <span
                  className="
                    inline-flex
                    mt-2
                    px-4 py-2
                    rounded-full
                    bg-gray-100
                    text-gray-800
                    text-sm
                    font-semibold
                  "
                >
                  {roleName}
                </span>
              </div>
            </div>
          </div>

          {/* QUICK CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
            <ActionCard
            isDark={isDark}
              title="Thông tin cá nhân"
              desc="Xem và cập nhật hồ sơ của bạn."
              onClick={() => setIsEditingProfile(true)}
            />

            <ActionCard
            isDark={isDark}
              title="Bảo mật"
              desc="Thay đổi mật khẩu đăng nhập."
              onClick={() => setIsChangingPassword(true)}
            />

            <ActionCard
            isDark={isDark}
              title="Trạng thái"
              desc="Tài khoản đang hoạt động."
            />
          </div>
        </div>
      </div>

      {(message || error) && (
        <div
          className={`
            mt-5 px-5 py-3 rounded-2xl text-sm font-medium
            ${
              message
                ? "bg-green-50 text-green-700 border border-green-100"
                : "bg-red-50 text-red-700 border border-red-100"
            }
          `}
        >
          {message || error}
        </div>
      )}

      {/* CONTENT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        {/* LEFT */}
        <div className="lg:col-span-2 space-y-6">
          {/* INFO / EDIT */}
          <div className={panelClass}>
            <div className="flex items-center justify-between mb-5">
              <h2 className={`text-lg font-bold ${titleClass}`}>
                Thông tin cá nhân
              </h2>

              {!isEditingProfile && (
                <button
                    onClick={() => setIsEditingProfile(true)}
                    className={`
                      px-4 py-2
                      rounded-xl
                      text-sm
                      font-semibold
                      flex
                      items-center
                      gap-2
                      transition
                      ${
                        isDark
                          ? "bg-blue-500/15 text-blue-300 border border-blue-500/30 hover:bg-blue-500/25"
                          : "bg-blue-50 text-blue-600 hover:bg-blue-100"
                      }
                    `}
                  >
                  <Pencil size={16} />
                  Chỉnh sửa
                </button>
              )}
            </div>

            {!isEditingProfile ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InfoItem
                  isDark={isDark}
                  icon={<User size={18} />}
                  label="Họ và tên"
                  value={
                    user.full_name ||
                    user.username ||
                    "Chưa cập nhật"
                  }
                />

                <InfoItem
                isDark={isDark}
                  icon={<User size={18} />}
                  label="Tên đăng nhập"
                  value={user.username || "Chưa cập nhật"}
                />

                <InfoItem
                isDark={isDark}
                  icon={<Mail size={18} />}
                  label="Email"
                  value={user.email || "Chưa cập nhật email"}
                />

                <InfoItem
                  isDark={isDark}
                  icon={<Shield size={18} />}
                  label="Vai trò"
                  value={roleName}
                />

                <InfoItem
                  isDark={isDark}
                  icon={<Briefcase size={18} />}
                  label="Chức vụ"
                  value={positionName}
                />

                <InfoItem
                isDark={isDark}
                  icon={<Building2 size={18} />}
                  label="Phòng ban"
                  value={unitName}
                />

                <InfoItem
                isDark={isDark}
                  icon={<CalendarDays size={18} />}
                  label="Mã người dùng"
                  value={
                    user.userId ||
                    user.id ||
                    "Chưa cập nhật"
                  }
                />
              </div>
            ) : (
              <form
                onSubmit={handleUpdateProfile}
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
              >
                <FormInput
                isDark={isDark}
                  label="Họ và tên"
                  name="full_name"
                  value={profileForm.full_name}
                  onChange={handleProfileChange}
                  placeholder="Nhập họ và tên"
                />

                <FormInput
                isDark={isDark}
                  label="Tên tài khoản"
                  name="username"
                  value={profileForm.username}
                  onChange={handleProfileChange}
                  placeholder="Nhập tên tài khoản"
                  required
                />

                <FormInput
                isDark={isDark}
                  label="Email"
                  name="email"
                  type="email"
                  value={profileForm.email}
                  onChange={handleProfileChange}
                  placeholder="Nhập email"
                />

                <div className="flex items-end gap-3">
                  <button
  type="button"
  onClick={() => {
    setIsEditingProfile(false);
    setProfileForm({
      full_name: user.full_name || "",
      username: user.username || "",
      email: user.email || "",
    });
  }}
  className={`
    flex-1
    h-11
    rounded-xl
    text-sm
    font-semibold
    flex
    items-center
    justify-center
    gap-2
    transition
    ${
      isDark
        ? "bg-slate-800 text-gray-200 hover:bg-slate-700"
        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
    }
  `}
>
  <X size={17} />
  Hủy
</button>

                  <button
                    type="submit"
                    disabled={profileLoading}
                    className="
                      flex-1
                      h-11
                      rounded-xl
                      bg-blue-600
                      text-white
                      text-sm
                      font-semibold
                      flex
                      items-center
                      justify-center
                      gap-2
                      hover:bg-blue-700
                      disabled:opacity-60
                    "
                  >
                    <Save size={17} />
                    {profileLoading
                      ? "Đang lưu..."
                      : "Lưu"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* RIGHT */}
        <div className="space-y-6">
          {/* PASSWORD */}
          <div className={panelClass}>
            <div className="flex items-center justify-between mb-5">
              <h2 className={`text-lg font-bold ${titleClass}`}>
                Đổi mật khẩu
              </h2>

              {!isChangingPassword && (
                <button
                  onClick={() => setIsChangingPassword(true)}
                  className="
                    px-4 py-2
                    rounded-xl
                    bg-gray-100
                    text-gray-700
                    text-sm
                    font-semibold
                    flex
                    items-center
                    gap-2
                    hover:bg-gray-200
                  "
                >
                  <KeyRound size={16} />
                  Đổi
                </button>
              )}
            </div>

            {!isChangingPassword ? (
              <p className="text-sm text-gray-500">
                Bạn có thể thay đổi mật khẩu đăng nhập tại đây.
              </p>
            ) : (
              <form
                onSubmit={handleChangePassword}
                className="space-y-4"
              >
                <FormInput
                isDark={isDark}
                  label="Mật khẩu hiện tại"
                  name="oldPassword"
                  type="password"
                  value={passwordForm.oldPassword}
                  onChange={handlePasswordChange}
                  placeholder="Nhập mật khẩu hiện tại"
                  required
                />

                <FormInput
                isDark={isDark}
                  label="Mật khẩu mới"
                  name="newPassword"
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={handlePasswordChange}
                  placeholder="Nhập mật khẩu mới"
                  required
                />

                <FormInput
                isDark={isDark}
                  label="Nhập lại mật khẩu mới"
                  name="confirmPassword"
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={handlePasswordChange}
                  placeholder="Nhập lại mật khẩu mới"
                  required
                />

               <div className="flex gap-3">
  {!mustForcePassword && (
  <button
    type="button"
    onClick={() => {
      setIsChangingPassword(false);
      setPasswordForm({
        oldPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    }}
    className={`
      flex-1
      h-11
      rounded-xl
      text-sm
      font-semibold
      flex
      items-center
      justify-center
      gap-2
      transition
      ${
        isDark
          ? "bg-slate-800 text-gray-200 hover:bg-slate-700"
          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
      }
    `}
  >
    <X size={17} />
    Hủy
  </button>
)}

  <button
    type="submit"
    disabled={passwordLoading}
    className={`
      ${mustForcePassword ? "w-full" : "flex-1"}
      h-11
      rounded-xl
      text-sm
      font-semibold
      flex
      items-center
      justify-center
      gap-2
      transition
      disabled:opacity-60
      ${
        isDark
          ? "bg-blue-600 text-white hover:bg-blue-700"
          : "bg-gray-900 text-white hover:bg-black"
      }
    `}
  >
    <KeyRound size={17} />
    {passwordLoading ? "Đang đổi..." : "Xác nhận"}
  </button>
</div>
              </form>
            )}
          </div>

          {/* ACCOUNT */}
          <div className={panelClass}>
            <h2 className={`text-lg font-bold mb-5 ${titleClass}`}>
              Tài khoản
            </h2>

            <div className="space-y-4">
              <div className={softBoxClass}>
                <p className="text-xs text-gray-400">
                  Trạng thái
                </p>
                <p className={`text-sm font-semibold mt-1 ${titleClass}`}>
                  Đang hoạt động
                </p>
              </div>

              <div className={softBoxClass}>
                <p className="text-xs text-gray-400">
                  Quyền truy cập
                </p>
                <p className={`text-sm font-semibold mt-1 ${titleClass}`}>
                  {Array.isArray(user.permissions)
                    ? `${user.permissions.length} quyền`
                    : "Theo vai trò"}
                </p>
              </div>
            </div>

            <p className="text-xs text-gray-400 mt-5 leading-relaxed">
              Phòng ban và vai trò được quản lý bởi quản trị viên.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ActionCard({ title, desc, onClick, isDark }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        text-left
        p-4
        rounded-2xl
        transition
        group
        ${
          isDark
            ? "bg-slate-950 hover:bg-slate-800 border border-slate-800"
            : "bg-gray-50 hover:bg-gray-100"
        }
      `}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p
            className={`text-sm font-bold ${
              isDark ? "text-gray-100" : "text-gray-900"
            }`}
          >
            {title}
          </p>

          <p
            className={`text-xs mt-1 leading-relaxed ${
              isDark ? "text-gray-400" : "text-gray-500"
            }`}
          >
            {desc}
          </p>
        </div>

        <div
          className="
            w-8 h-8
            rounded-full
            border
            border-blue-500
            text-blue-600
            flex
            items-center
            justify-center
            group-hover:bg-blue-600
            group-hover:text-white
            transition
            shrink-0
          "
        >
          <ArrowRight size={16} />
        </div>
      </div>
    </button>
  );
}

function FormInput({
  label,
  name,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
  isDark,
}) {
  return (
    <div>
      <label
        className={`text-xs font-medium ${
          isDark ? "text-gray-400" : "text-gray-500"
        }`}
      >
        {label}
      </label>

      <input
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className={`
          mt-2
          w-full
          h-11
          px-4
          rounded-xl
          border
          text-sm
          outline-none
          focus:border-blue-500
          ${
            isDark
              ? "bg-slate-950 border-slate-700 text-gray-100 placeholder:text-gray-500 focus:bg-slate-900"
              : "bg-gray-50 border-gray-200 text-gray-900 focus:bg-white"
          }
        `}
      />
    </div>
  );
}

function InfoItem({ icon, label, value, isDark }) {
  return (
    <div
      className={`
        p-4
        rounded-2xl
        border
        flex
        items-start
        gap-3
        ${
          isDark
            ? "bg-slate-950 border-slate-800"
            : "bg-gray-50 border-gray-100"
        }
      `}
    >
      <div
        className={`
          w-10 h-10
          rounded-xl
          flex
          items-center
          justify-center
          shadow-sm
          shrink-0
          ${
            isDark
              ? "bg-slate-900 text-blue-300"
              : "bg-white text-blue-600"
          }
        `}
      >
        {icon}
      </div>

      <div className="min-w-0">
        <p
          className={`text-xs ${
            isDark ? "text-gray-500" : "text-gray-400"
          }`}
        >
          {label}
        </p>

        <p
          className={`text-sm font-semibold mt-1 break-words ${
            isDark ? "text-gray-100" : "text-gray-800"
          }`}
        >
          {value}
        </p>
      </div>
    </div>
  );
}