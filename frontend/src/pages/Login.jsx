import { useEffect, useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { Eye, EyeOff, LockKeyhole, User } from "lucide-react";
import api from "../services/api";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [systemInfo, setSystemInfo] = useState({
    system_name: "Hệ thống quản lý tiến độ nhiệm vụ",
    organization_name: "Đảng ủy phường Tam Thanh",
    system_description:
      "Hệ thống hỗ trợ quản lý văn bản, giao nhiệm vụ, theo dõi tiến độ và đánh giá KPI.",
  });

  const navigate = useNavigate();

  useEffect(() => {
    const fetchSystemInfo = async () => {
      try {
        const res = await api.get("/system-settings");

        setSystemInfo({
          system_name:
            res.data.system_name ||
            "Hệ thống quản lý tiến độ nhiệm vụ",
          organization_name:
            res.data.organization_name ||
            "Đảng ủy phường Tam Thanh",
          system_description:
            res.data.system_description ||
            "Hệ thống hỗ trợ quản lý văn bản, giao nhiệm vụ, theo dõi tiến độ và đánh giá KPI.",
        });
      } catch (err) {
        console.log("FETCH LOGIN SYSTEM INFO ERROR:", err);
      }
    };

    fetchSystemInfo();
  }, []);

  if (localStorage.getItem("token")) {
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  if (user.must_change_password) {
  return <Navigate to="/app/profile?forcePassword=1" replace />;
}

  if (user.role === "admin") {
    return <Navigate to="/admin/users" replace />;
  }

  return <Navigate to="/app" replace />;
}

  const handleLogin = async () => {
  if (!username || !password) {
    alert("Vui lòng nhập đầy đủ thông tin");
    return;
  }

  try {
    setLoading(true);

    const res = await api.post("/auth/login", {
      username,
      password,
    });

    const user = res.data.user;

    localStorage.setItem("token", res.data.token);
    localStorage.setItem("user", JSON.stringify(user));

    // Bắt buộc đổi mật khẩu khi đăng nhập lần đầu
    // hoặc sau khi admin reset mật khẩu
    if (user.must_change_password) {
  navigate("/app/profile?forcePassword=1", {
    replace: true,
  });
  return;
}

    if (user.role === "admin") {
      navigate("/admin/users");
    } else {
      navigate("/app");
    }
  } catch (err) {
    alert(
      err.response?.data?.message ||
        "Đăng nhập thất bại"
    );
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="min-h-screen bg-[#f4f1ff] flex items-center justify-center px-3 sm:px-6 py-4 sm:py-10">
      <div
        className="
          w-full
          max-w-[1120px]
          min-h-0
          lg:min-h-[620px]
          bg-white
          rounded-[24px]
          lg:rounded-[28px]
          shadow-2xl
          shadow-indigo-200/70
          p-3
          sm:p-4
          grid
          grid-cols-1
          lg:grid-cols-[1.05fr_1fr]
          gap-3
          lg:gap-4
        "
      >
        {/* LEFT INTRO */}
        <div
          className="
          group
          relative
          min-h-[210px]
          sm:min-h-[260px]
          lg:min-h-[590px]
          rounded-[22px]
          lg:rounded-[24px]
          overflow-hidden
          p-6
          sm:p-8
          lg:p-10
          flex
          flex-col
          justify-between
          text-white
          bg-[#dfe8ff]
          cursor-pointer
        "
        >
          {/* SOFT GRADIENT BACKGROUND */}
          <div
            className="
              absolute
              inset-0
              bg-gradient-to-br
              from-sky-300
              via-indigo-500
              to-purple-200
              transition-all
              duration-700
              ease-out
              group-hover:scale-105
              group-hover:rotate-1
            "
          />

          <div
            className="
              absolute
              -left-24
              top-20
              w-[360px]
              h-[360px]
              rounded-full
              bg-blue-800/70
              blur-[80px]
              transition-all
              duration-700
              ease-out
              group-hover:-translate-y-8
              group-hover:translate-x-8
              group-hover:scale-110
            "
          />

          <div
            className="
              absolute
              left-10
              bottom-10
              w-[320px]
              h-[320px]
              rounded-full
              bg-indigo-900/70
              blur-[70px]
              transition-all
              duration-700
              ease-out
              group-hover:translate-x-10
              group-hover:-translate-y-6
              group-hover:scale-110
            "
          />

          <div
            className="
              absolute
              right-[-40px]
              top-10
              w-[360px]
              h-[520px]
              rounded-full
              bg-white/60
              blur-[55px]
              transition-all
              duration-700
              ease-out
              group-hover:-translate-x-10
              group-hover:translate-y-6
              group-hover:scale-110
            "
          />

          <div
            className="
              absolute
              right-8
              top-0
              w-[200px]
              h-[200px]
              rounded-full
              bg-purple-300/70
              blur-[60px]
              transition-all
              duration-700
              ease-out
              group-hover:-translate-x-8
              group-hover:translate-y-8
              group-hover:scale-125
            "
          />

          {/* ICON */}
            <div
            className="
              text-white
              text-7xl
              font-bold
              leading-none
              drop-shadow-sm
              transition-all
              duration-500
              ease-out
              group-hover:rotate-12
              group-hover:scale-110
            "
          >
            *

          </div>

          {/* TEXT */}
          <div className="relative z-10 pb-2">
            <p className="text-sm text-white/90 mb-4">
              {systemInfo.organization_name}
            </p>

            <h1
              className="
              text-[26px]
              sm:text-[30px]
              lg:text-[38px]
              font-bold
              leading-[1.12]
              max-w-[420px]
              tracking-[-0.03em]
            "
            >
              {systemInfo.system_name}
            </h1>

            <p className="text-sm text-white/85 mt-4 lg:mt-6 leading-relaxed max-w-[390px]">
              {systemInfo.system_description}
            </p>
          </div>
        </div>

        {/* RIGHT LOGIN FORM */}
        <div className="flex items-center justify-center px-4 sm:px-8 py-8 lg:py-10">
          <div className="w-full max-w-[420px] lg:max-w-[360px]">
            <div className="mb-8">
              <div className="text-blue-600 text-3xl font-bold mb-4">
                *
              </div>

              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
                Đăng nhập
              </h2>

              <p className="text-sm text-gray-500 mt-2">
                Đăng nhập để quản lý nhiệm vụ, văn bản và theo dõi tiến độ công việc.
              </p>
            </div>

            <div className="space-y-5">
              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Tên đăng nhập
                </label>

                <div
                  className="
                    mt-2
                    flex
                    items-center
                    gap-3
                    rounded-2xl
                    border
                    border-gray-200
                    bg-white
                    px-4
                    py-3
                    focus-within:ring-2
                    focus-within:ring-blue-400
                  "
                >
                  <User size={18} className="text-gray-400" />

                  <input
                    value={username}
                    onChange={(e) =>
                      setUsername(e.target.value)
                    }
                    placeholder="Nhập username"
                    className="flex-1 outline-none text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Mật khẩu
                </label>

                <div
                  className="
                    mt-2
                    flex
                    items-center
                    gap-3
                    rounded-2xl
                    border
                    border-gray-200
                    bg-white
                    px-4
                    py-3
                    focus-within:ring-2
                    focus-within:ring-blue-400
                  "
                >
                  <LockKeyhole
                    size={18}
                    className="text-gray-400"
                  />

                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) =>
                      setPassword(e.target.value)
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleLogin();
                      }
                    }}
                    placeholder="Nhập mật khẩu"
                    className="flex-1 outline-none text-sm"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword(!showPassword)
                    }
                    className="text-gray-400 hover:text-gray-700"
                  >
                    {showPassword ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>
                </div>
              </div>

              <button
                onClick={handleLogin}
                disabled={loading}
                className="
                  w-full
                  rounded-xl
                  bg-[#4f35f5]
                  py-3
                  text-white
                  font-semibold
                  shadow-lg
                  shadow-indigo-300
                  hover:bg-[#3f2be0]
                  transition
                  disabled:opacity-60
                  disabled:cursor-not-allowed
                "
              >
                {loading ? "Đang đăng nhập..." : "Đăng nhập"}
              </button>
            </div>

            <p className="text-xs text-gray-400 text-center mt-8">
              Nếu quên mật khẩu, vui lòng liên hệ quản trị viên để được hỗ trợ.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}