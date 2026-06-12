export const getStatusLabel = (status, user = {}) => {
  switch (status) {
    case "cho_xac_nhan_don_vi":
      if (user.role === "lanh_dao") {
        return "Chờ đơn vị xác nhận";
      }

      if (user.role === "truong_phong") {
        return "Nhiệm vụ mới cần tiếp nhận";
      }

      return "Đang chờ tiếp nhận";

    case "da_giao_nhiem_vu":
      if (user.role === "lanh_dao") {
        return "Đơn vị đã tiếp nhận";
      }

      if (user.role === "truong_phong") {
        return "Đã tiếp nhận - chờ phân công";
      }

      return "Đã tiếp nhận nhiệm vụ";

    case "cho_nhan_viec":
      if (user.role === "truong_phong") {
        return "Chờ nhân viên nhận";
      }

      if (user.role === "nhan_vien") {
        return "Nhiệm vụ mới được phân công";
      }

      return "Đã phân công cán bộ";

    case "dang_thuc_hien":
      return "Đang thực hiện";

    // Dùng cho phần việc nội bộ
    case "cho_duyet":
  if (user.role === "nhan_vien") {
    return "Đã nộp phần việc";
  }

  if (user.role === "truong_phong") {
    return "Chờ duyệt phần việc";
  }

  if (user.role === "lanh_dao") {
    return "Phần việc chờ duyệt";
  }

  return "Chờ duyệt phần việc";

case "cho_duyet_cap_1":
  if (user.role === "nhan_vien") {
    return "Đã gửi chờ trưởng phòng duyệt";
  }

  if (user.role === "truong_phong") {
    return "Chờ trưởng phòng duyệt";
  }

  if (user.role === "lanh_dao") {
    return "Chờ trưởng phòng duyệt";
  }

  return "Chờ duyệt cấp 1";

case "cho_duyet_cap_2":
  if (user.role === "nhan_vien") {
    return "Chờ lãnh đạo duyệt";
  }

  if (user.role === "truong_phong") {
    return "Đã duyệt, chờ lãnh đạo";
  }

  if (user.role === "lanh_dao") {
    return "Chờ lãnh đạo duyệt";
  }

  return "Chờ duyệt cấp 2";

    case "yeu_cau_chinh_sua":
      if (user.role === "nhan_vien") {
        return "Cần chỉnh sửa và nộp lại";
      }

      return "Yêu cầu chỉnh sửa";

    case "hoan_thanh":
      return "Hoàn thành";

    case "qua_han":
      return "Quá hạn";

    default:
      return status || "-";
  }
};