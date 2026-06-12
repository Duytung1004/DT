// ===============================
// CHECK PERMISSION
// ===============================
export const hasPermission = (user, permission) => {
  if (!user || !user.permissions) return false;
  return user.permissions.includes(permission);
};

// ===============================
// CHECK ROLE (OPTIONAL)
// ===============================
export const isLeader = (user) => user?.role === "lanh_dao";
export const isManager = (user) => user?.role === "lanh_dao_don_vi";
export const isStaff = (user) => user?.role === "nhan_vien";