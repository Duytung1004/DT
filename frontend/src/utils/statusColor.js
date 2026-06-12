import { STATUS } from "../constants/status";

export const getStatusColor = (status) => {
  switch (status) {
    case "moi":
      return "bg-gray-100 text-gray-600";

    case "cho_xac_nhan_don_vi":
      return "bg-gray-100 text-gray-600";

    case "da_giao_nhiem_vu":
      return "bg-slate-100 text-slate-700";

    case "cho_nhan_viec":
      return "bg-blue-100 text-blue-700";

    case "dang_thuc_hien":
      return "bg-cyan-100 text-cyan-700";

    // Trạng thái phần việc nội bộ
    case "cho_duyet":
      return "bg-purple-100 text-purple-700";

    // Trạng thái duyệt nhiệm vụ chính
    case "cho_duyet_cap_1":
      return "bg-yellow-100 text-yellow-700";

    case "cho_duyet_cap_2":
      return "bg-indigo-100 text-indigo-700";

    case "yeu_cau_chinh_sua":
      return "bg-orange-100 text-orange-700";

    case "hoan_thanh":
      return "bg-green-100 text-green-700";

    case "qua_han":
      return "bg-red-100 text-red-700";

    default:
      return "bg-gray-100 text-gray-500";
  }
};