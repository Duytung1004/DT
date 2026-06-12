import { useNavigate } from "react-router-dom";
import {
  Building2,
  ShieldCheck,
  ListChecks,
  LockKeyhole,
  Settings,
  ChevronRight,
  History,
} from "lucide-react";

export default function AdminSettings() {
  const navigate = useNavigate();

  const settingCards = [
    {
      title: "Quản lý phòng ban",
      description:
        "Thêm, sửa, xoá hoặc ẩn các đơn vị/phòng ban trong hệ thống.",
      icon: <Building2 size={22} />,
      status: "Đang dùng",
      path: "/admin/units",
    },
    {
  title: "Vai trò & quyền",
  description:
    "Quản lý quyền hạn của Admin, Lãnh đạo, Trưởng phòng và Nhân viên.",
  icon: <ShieldCheck size={22} />,
  status: "Đang dùng",
  path: "/admin/roles",
},
    {
  title: "Trạng thái nhiệm vụ",
  description:
    "Cấu hình các trạng thái xử lý nhiệm vụ như chờ xác nhận, đang thực hiện, chờ duyệt.",
  icon: <ListChecks size={22} />,
  status: "Đang dùng",
  path: "/admin/statuses",
},
    {
  title: "Bảo mật tài khoản",
  description:
    "Đổi mật khẩu tài khoản hiện tại và quản lý các thiết lập bảo mật.",
  icon: <LockKeyhole size={22} />,
  status: "Đang dùng",
  path: "/admin/security",
},
    {
        title: "Thông tin hệ thống",
        description:
            "Cấu hình tên hệ thống, tên đơn vị, mô tả và các thông tin hiển thị chung.",
        icon: <Settings size={22} />,
        status: "Đang dùng",
        path: "/admin/system-info",
    },
    {
  title: "Nhật ký hệ thống",
  description:
    "Theo dõi các thao tác quan trọng như đăng nhập, cập nhật, khôi phục, xóa dữ liệu và dọn thùng rác.",
  icon: <History size={22} />,
  status: "Đang dùng",
  path: "/admin/audit-logs",
},
  ];

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      {/* HEADER */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          Cài đặt hệ thống
        </h1>

        <p className="text-gray-500 mt-1">
          Quản lý các cấu hình chung dành cho quản trị viên
        </p>
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
              Trung tâm cấu hình Admin
            </h2>

            <p className="text-sm text-gray-500 mt-2 leading-relaxed max-w-3xl">
              Khu vực này dùng để cấu hình dữ liệu nền của hệ thống như phòng ban,
              vai trò, quyền hạn, trạng thái nhiệm vụ và các thiết lập bảo mật.
              Hiện tại có thể triển khai từng module theo mức độ ưu tiên.
            </p>
          </div>
        </div>
      </div>

      {/* SETTINGS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {settingCards.map((item) => (
          <button
            key={item.title}
            onClick={() => {
              if (item.path) {
                navigate(item.path);
              }
            }}
            className="
              bg-white
              rounded-[28px]
              border
              border-gray-200
              p-5
              shadow-sm
              hover:shadow-md
              hover:border-blue-200
              transition
              text-left
              group
            "
          >
            <div className="flex items-start justify-between gap-4">
              <div
                className="
                  w-12 h-12
                  rounded-2xl
                  bg-gray-100
                  text-gray-700
                  flex
                  items-center
                  justify-center
                  group-hover:bg-blue-100
                  group-hover:text-blue-600
                  transition
                "
              >
                {item.icon}
              </div>

              <ChevronRight
                size={20}
                className="
                  text-gray-300
                  group-hover:text-blue-500
                  transition
                "
              />
            </div>

            <div className="mt-5">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-bold text-gray-900">
                  {item.title}
                </h3>

                <span
                  className={`
                    px-2.5
                    py-1
                    rounded-full
                    text-[11px]
                    font-semibold
                    ${
                      item.status === "Đang dùng"
                        ? "bg-green-50 text-green-600"
                        : "bg-yellow-50 text-yellow-600"
                    }
                  `}
                >
                  {item.status}
                </span>
              </div>

              <p className="text-sm text-gray-500 leading-relaxed">
                {item.description}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}