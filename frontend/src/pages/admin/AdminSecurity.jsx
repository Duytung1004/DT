import { useEffect, useState } from "react";
import {
  ShieldCheck,
  LockKeyhole,
  KeyRound,
  Clock,
  FileClock,
  Smartphone,
  AlertTriangle,
  CheckCircle2,
  Settings,
  RefreshCw,
} from "lucide-react";

import api from "../../services/api";

export default function AdminSecurity() {
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const fetchSecurityLogs = async () => {
    try {
      setLoadingLogs(true);

      const res = await api.get("/security/logs");

      setLogs(res.data);
    } catch (err) {
      console.log("FETCH SECURITY LOGS ERROR:", err);

      alert(
        err.response?.data?.message ||
          "Không tải được nhật ký bảo mật"
      );
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchSecurityLogs();
  }, []);

  const securityCards = [
    {
      title: "Chính sách mật khẩu",
      description:
        "Thiết lập độ dài tối thiểu, yêu cầu chữ hoa, chữ thường, số và ký tự đặc biệt.",
      icon: <LockKeyhole size={24} />,
      status: "Đề xuất",
      items: [
        "Tối thiểu 8 ký tự",
        "Có chữ hoa và chữ thường",
        "Có ít nhất 1 chữ số",
        "Không dùng mật khẩu quá đơn giản",
      ],
    },
    {
      title: "Bảo vệ đăng nhập",
      description:
        "Hạn chế dò mật khẩu bằng cách khóa tài khoản tạm thời khi đăng nhập sai nhiều lần.",
      icon: <AlertTriangle size={24} />,
      status: "Đang áp dụng",
      items: [
        "Sai mật khẩu 5 lần sẽ khóa tài khoản",
        "Thời gian khóa: 15 phút",
        "Ghi log các lần đăng nhập thất bại",
        "Ghi log khi tài khoản bị khóa",
      ],
    },
    {
      title: "Quản lý phiên đăng nhập",
      description:
        "Kiểm soát thời hạn token và yêu cầu đăng nhập lại khi có thay đổi bảo mật.",
      icon: <Clock size={24} />,
      status: "Đang áp dụng",
      items: [
        "JWT có thời hạn sử dụng",
        "Đăng xuất sẽ xóa token phía client",
        "Không lưu mật khẩu ở frontend",
        "Token được kiểm tra ở các API bảo vệ",
      ],
    },
    {
      title: "Reset mật khẩu người dùng",
      description:
        "Admin có thể cấp lại mật khẩu cho người dùng khi người dùng quên mật khẩu.",
      icon: <KeyRound size={24} />,
      status: "Đang áp dụng",
      items: [
        "Reset tại trang Quản lý tài khoản",
        "Mật khẩu mới được mã hóa bằng bcrypt",
        "Không cần biết mật khẩu cũ của người dùng",
        "Nên ghi lại lịch sử reset mật khẩu",
      ],
    },
    {
      title: "Nhật ký bảo mật",
      description:
        "Theo dõi các hành động quan trọng để phát hiện lỗi hoặc hành vi bất thường.",
      icon: <FileClock size={24} />,
      status: "Đang áp dụng",
      items: [
        "Ghi log đăng nhập thành công",
        "Ghi log đăng nhập thất bại",
        "Ghi log tài khoản bị khóa",
        "Hiển thị nhật ký bảo mật gần đây",
      ],
    },
    {
      title: "OTP quên mật khẩu",
      description:
        "Có thể tích hợp OTP qua số điện thoại hoặc email để người dùng tự khôi phục mật khẩu.",
      icon: <Smartphone size={24} />,
      status: "Mở rộng sau",
      items: [
        "Nhập số điện thoại hoặc email",
        "Tạo mã OTP có thời hạn",
        "Xác thực OTP trước khi đổi mật khẩu",
        "Có thể tích hợp SMS Gateway sau",
      ],
    },
  ];

  const getStatusClass = (status) => {
    switch (status) {
      case "success":
        return "bg-green-50 text-green-600";
      case "failed":
        return "bg-red-50 text-red-600";
      case "locked":
      case "blocked":
        return "bg-yellow-50 text-yellow-600";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  const getCardStatusClass = (status) => {
    switch (status) {
      case "Đang áp dụng":
        return "bg-green-50 text-green-600";
      case "Nên làm tiếp":
        return "bg-yellow-50 text-yellow-600";
      case "Mở rộng sau":
        return "bg-purple-50 text-purple-600";
      default:
        return "bg-blue-50 text-blue-600";
    }
  };

  const formatAction = (action) => {
    switch (action) {
      case "login_success":
        return "Đăng nhập thành công";
      case "login_failed":
        return "Đăng nhập thất bại";
      case "account_locked":
        return "Khóa tài khoản";
      case "login_blocked":
        return "Chặn đăng nhập";
      case "change_password_success":
        return "Đổi mật khẩu thành công";
      case "change_password_failed":
        return "Đổi mật khẩu thất bại";
      default:
        return action;
    }
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      {/* HEADER */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          Bảo mật hệ thống
        </h1>

        <p className="text-gray-500 mt-1">
          Quản lý các chính sách bảo mật, đăng nhập và khôi phục tài khoản
          trong hệ thống
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
            <ShieldCheck size={28} />
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Trung tâm bảo mật hệ thống
            </h2>

            <p className="text-sm text-gray-500 mt-2 leading-relaxed max-w-4xl">
              Khu vực này dùng để quản lý các chính sách bảo mật của toàn hệ
              thống như chính sách mật khẩu, bảo vệ đăng nhập, reset mật khẩu,
              nhật ký bảo mật và phương án xác thực OTP. Một số chức năng đã
              được áp dụng, một số chức năng sẽ được triển khai tiếp để tăng mức
              an toàn cho hệ thống.
            </p>
          </div>
        </div>
      </div>

      {/* SECURITY SUMMARY */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-3xl border border-gray-200 p-5 shadow-sm">
          <p className="text-sm text-gray-400">Cơ chế đang có</p>
          <p className="text-2xl font-bold text-green-600 mt-1">
            bcrypt + JWT
          </p>
        </div>

        <div className="bg-white rounded-3xl border border-gray-200 p-5 shadow-sm">
          <p className="text-sm text-gray-400">Phân quyền</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">
            RBAC
          </p>
        </div>

        <div className="bg-white rounded-3xl border border-gray-200 p-5 shadow-sm">
          <p className="text-sm text-gray-400">Mức bảo mật hiện tại</p>
          <p className="text-2xl font-bold text-yellow-600 mt-1">
            Cơ bản+
          </p>
        </div>
      </div>

      {/* CARDS */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {securityCards.map((card) => (
          <div
            key={card.title}
            className="
              bg-white
              rounded-[32px]
              border
              border-gray-200
              shadow-sm
              p-6
              hover:shadow-md
              transition
            "
          >
            <div className="flex items-start justify-between gap-4 mb-5">
              <div className="flex items-start gap-4">
                <div
                  className="
                    w-12 h-12
                    rounded-2xl
                    bg-blue-50
                    text-blue-600
                    flex
                    items-center
                    justify-center
                    shrink-0
                  "
                >
                  {card.icon}
                </div>

                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    {card.title}
                  </h2>

                  <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                    {card.description}
                  </p>
                </div>
              </div>

              <span
                className={`
                  px-3
                  py-1
                  rounded-full
                  text-xs
                  font-semibold
                  shrink-0
                  ${getCardStatusClass(card.status)}
                `}
              >
                {card.status}
              </span>
            </div>

            <div className="space-y-3">
              {card.items.map((item) => (
                <div
                  key={item}
                  className="
                    flex
                    items-start
                    gap-3
                    rounded-2xl
                    bg-gray-50
                    px-4
                    py-3
                  "
                >
                  <CheckCircle2
                    size={18}
                    className="text-blue-500 mt-0.5 shrink-0"
                  />

                  <p className="text-sm text-gray-600 leading-relaxed">
                    {item}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* SECURITY LOGS */}
      <div className="bg-white rounded-[32px] border border-gray-200 shadow-sm p-6 mt-6">
        <div className="flex items-center justify-between gap-4 mb-5">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Nhật ký bảo mật gần đây
            </h2>

            <p className="text-sm text-gray-500 mt-1">
              Theo dõi các hoạt động đăng nhập, đăng nhập thất bại và khóa tài khoản
            </p>
          </div>

          <button
            onClick={fetchSecurityLogs}
            disabled={loadingLogs}
            className="
              flex
              items-center
              gap-2
              px-4
              py-2.5
              rounded-2xl
              bg-gray-100
              text-gray-600
              hover:bg-blue-50
              hover:text-blue-600
              transition
              disabled:opacity-60
            "
          >
            <RefreshCw size={16} />
            Làm mới
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-500">
                  Người dùng
                </th>

                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-500">
                  Hành động
                </th>

                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-500">
                  Trạng thái
                </th>

                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-500">
                  Nội dung
                </th>

                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-500">
                  Thời gian
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {loadingLogs ? (
                <tr>
                  <td
                    colSpan="5"
                    className="px-4 py-8 text-center text-gray-500"
                  >
                    Đang tải nhật ký bảo mật...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td
                    colSpan="5"
                    className="px-4 py-8 text-center text-gray-500"
                  >
                    Chưa có nhật ký bảo mật
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-gray-50 transition"
                  >
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-semibold text-gray-900">
                          {log.username || "Không xác định"}
                        </p>

                        <p className="text-xs text-gray-400">
                          User ID: {log.user_id || "-"}
                        </p>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-gray-700">
                        {formatAction(log.action)}
                      </span>

                      <p className="text-xs text-gray-400 mt-0.5">
                        {log.action}
                      </p>
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`
                          inline-flex
                          px-3
                          py-1
                          rounded-full
                          text-xs
                          font-semibold
                          ${getStatusClass(log.status)}
                        `}
                      >
                        {log.status}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-sm text-gray-600">
                      {log.message}
                    </td>

                    <td className="px-4 py-3 text-sm text-gray-400">
                      {log.created_at
                        ? new Date(log.created_at).toLocaleString()
                        : "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* NEXT STEP */}
      <div className="bg-white rounded-[32px] border border-gray-200 shadow-sm p-6 mt-6">
        <div className="flex items-start gap-4">
          <div
            className="
              w-12 h-12
              rounded-2xl
              bg-yellow-50
              text-yellow-600
              flex
              items-center
              justify-center
              shrink-0
            "
          >
            <Settings size={24} />
          </div>

          <div>
            <h2 className="text-lg font-bold text-gray-900">
              Bước bảo mật có thể triển khai sau
            </h2>

            <p className="text-sm text-gray-500 mt-2 leading-relaxed">
              Sau khi đã có khóa tài khoản và nhật ký bảo mật, bước mở rộng
              tiếp theo có thể là OTP quên mật khẩu hoặc cấu hình chính sách
              mật khẩu lưu trong cơ sở dữ liệu.
            </p>

            <div className="mt-4 rounded-2xl bg-gray-50 p-4 text-sm text-gray-600">
              Đề xuất mở rộng: quên mật khẩu bằng OTP qua email hoặc số điện
              thoại, kết hợp ghi log mỗi lần yêu cầu OTP.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}