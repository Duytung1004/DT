import { useEffect, useMemo, useState } from "react";
import {
  ShieldCheck,
  Save,
  Search,
  CheckCircle2,
  KeyRound,
} from "lucide-react";
import api from "../../services/api";

const ALL_PERMISSIONS = [
  {
    group: "Người dùng",
    permissions: [
      "user:view",
      "user:create",
      "user:update",
      "user:delete",
      "user:reset_password",
    ],
  },
  {
    group: "Phòng ban",
    permissions: [
      "unit:create",
      "unit:update",
      "unit:delete",
    ],
  },
  {
    group: "Vai trò & quyền",
    permissions: [
      "role:view",
      "role:update_permissions",
    ],
  },
  {
    group: "Nhiệm vụ",
    permissions: [
      "task:create",
      "task:view_all",
      "task:view_unit",
      "task:view_own",
      "task:update",
      "task:delete",
      "task:assign",
      "task:approve",
    ],
  },
  {
    group: "Duyệt nhiệm vụ",
    permissions: [
      "approve_level_1",
      "approve_level_2",
    ],
  },
  {
  group: "Văn bản",
  permissions: [
    "document:view",
    "document:read",
    "document:view_all",
    "document:view_unit",
    "document:view_related",

    "document:create",
    "document:update",
    "document:delete",
    "document:upload",

    "document:submit_for_review",
    "document:office_review",
    "document:send_to_leader",
    "document:create_task",
  ],
},
  {
  group: "Dashboard",
  permissions: [
    "dashboard:leader",
    "dashboard:unit",
    "dashboard:own",
  ],
},
{
  group: "Analytics",
  permissions: [
    "analytics:view",
  ],
},
{
  group: "Báo cáo",
  permissions: [
    "report:view",
    "report:create",
    "report:export",
  ],
},
{
  group: "Chat",
  permissions: [
    "chat:access",
    "chat:send",
  ],
},
{
  group: "Thùng rác",
  permissions: [
    "trash:view",
    "trash:restore",
    "trash:delete",
  ],
},

];

export default function AdminRoles() {
  const [roles, setRoles] = useState([]);
  const [selectedRole, setSelectedRole] = useState(null);
  const [selectedPermissions, setSelectedPermissions] =
    useState([]);

  const [loadingRoles, setLoadingRoles] = useState(false);
  const [loadingPermissions, setLoadingPermissions] =
    useState(false);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");

  const fetchRoles = async () => {
    try {
      setLoadingRoles(true);

      const res = await api.get("/roles");

      setRoles(res.data);

      if (res.data.length > 0) {
        setSelectedRole(res.data[0]);
      }
    } catch (err) {
      console.log("FETCH ROLES ERROR:", err);
      alert(
        err.response?.data?.message ||
          "Không tải được danh sách vai trò"
      );
    } finally {
      setLoadingRoles(false);
    }
  };

  const fetchRolePermissions = async (roleId) => {
    if (!roleId) return;

    try {
      setLoadingPermissions(true);

      const res = await api.get(
        `/roles/${roleId}/permissions`
      );

      const permissions =
        res.data.permissions?.map((item) => item.permission) ||
        [];

      setSelectedPermissions(permissions);
    } catch (err) {
      console.log("FETCH ROLE PERMISSIONS ERROR:", err);
      alert(
        err.response?.data?.message ||
          "Không tải được quyền của vai trò"
      );
    } finally {
      setLoadingPermissions(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  useEffect(() => {
    if (selectedRole?.id) {
      fetchRolePermissions(selectedRole.id);
    }
  }, [selectedRole?.id]);

  const filteredPermissionGroups = useMemo(() => {
    const keyword = search.toLowerCase().trim();

    if (!keyword) return ALL_PERMISSIONS;

    return ALL_PERMISSIONS.map((group) => ({
      ...group,
      permissions: group.permissions.filter((permission) =>
        permission.toLowerCase().includes(keyword)
      ),
    })).filter((group) => group.permissions.length > 0);
  }, [search]);

  const togglePermission = (permission) => {
    setSelectedPermissions((prev) => {
      if (prev.includes(permission)) {
        return prev.filter((item) => item !== permission);
      }

      return [...prev, permission];
    });
  };

  const toggleGroup = (permissions) => {
    const allChecked = permissions.every((permission) =>
      selectedPermissions.includes(permission)
    );

    if (allChecked) {
      setSelectedPermissions((prev) =>
        prev.filter(
          (permission) => !permissions.includes(permission)
        )
      );
    } else {
      setSelectedPermissions((prev) => [
        ...new Set([...prev, ...permissions]),
      ]);
    }
  };

  const handleSave = async () => {
    if (!selectedRole) return;

    const ok = window.confirm(
      `Bạn có chắc muốn cập nhật quyền cho vai trò "${selectedRole.name}" không?`
    );

    if (!ok) return;

    try {
      setSaving(true);

      await api.put(
  `/roles/${selectedRole.id}/permissions`,
  {
    permissions: selectedPermissions,
  }
);

// Nếu role vừa sửa là role của user hiện tại
// thì cập nhật lại permissions trong localStorage luôn
const currentUser =
  JSON.parse(localStorage.getItem("user")) || {};

if (
  Number(currentUser.role_id || currentUser.roleId) ===
  Number(selectedRole.id)
) {
  const updatedUser = {
    ...currentUser,
    permissions: selectedPermissions,
  };

  localStorage.setItem(
    "user",
    JSON.stringify(updatedUser)
  );

  window.dispatchEvent(
    new Event("profile-updated")
  );

  window.dispatchEvent(
    new Event("permission-updated")
  );
}

alert("Cập nhật quyền thành công");

await fetchRolePermissions(selectedRole.id);
    } catch (err) {
      console.log("SAVE ROLE PERMISSIONS ERROR:", err);
      alert(
        err.response?.data?.message ||
          "Cập nhật quyền thất bại"
      );
    } finally {
      setSaving(false);
    }
  };

  const roleDescription = (code) => {
    switch (code) {
      case "admin":
        return "Quản trị hệ thống, quản lý tài khoản và cấu hình.";
      case "lanh_dao":
        return "Lãnh đạo theo dõi, giao việc và duyệt cấp cao.";
      case "truong_phong":
        return "Trưởng phòng tiếp nhận, phân công và duyệt cấp đơn vị.";
      case "nhan_vien":
        return "Nhân viên thực hiện nhiệm vụ được phân công.";
      default:
        return "Vai trò trong hệ thống.";
    }
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      {/* HEADER */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Vai trò & quyền
          </h1>

          <p className="text-gray-500 mt-1">
            Quản lý quyền hạn cho từng vai trò trong hệ thống
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={!selectedRole || saving}
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
          {saving ? "Đang lưu..." : "Lưu quyền"}
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[330px_1fr] gap-5">
        {/* LEFT: ROLE LIST */}
        <div className="bg-white rounded-[32px] border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div
                className="
                  w-11 h-11
                  rounded-2xl
                  bg-blue-100
                  text-blue-600
                  flex
                  items-center
                  justify-center
                "
              >
                <ShieldCheck size={20} />
              </div>

              <div>
                <h2 className="font-bold text-gray-900">
                  Danh sách vai trò
                </h2>
                <p className="text-xs text-gray-400 mt-1">
                  {roles.length} vai trò hệ thống
                </p>
              </div>
            </div>
          </div>

          <div className="p-3 space-y-2">
            {loadingRoles ? (
              <p className="text-sm text-gray-500 p-3">
                Đang tải vai trò...
              </p>
            ) : roles.length === 0 ? (
              <p className="text-sm text-gray-500 p-3">
                Chưa có vai trò nào
              </p>
            ) : (
              roles.map((role) => {
                const active = selectedRole?.id === role.id;

                return (
                  <button
                    key={role.id}
                    onClick={() => setSelectedRole(role)}
                    className={`
                      w-full
                      rounded-3xl
                      p-4
                      text-left
                      transition
                      border
                      ${
                        active
                          ? "bg-blue-50 border-blue-200"
                          : "bg-white border-gray-100 hover:bg-gray-50"
                      }
                    `}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`
                          w-11 h-11
                          rounded-2xl
                          flex
                          items-center
                          justify-center
                          font-bold
                          shrink-0
                          ${
                            active
                              ? "bg-blue-500 text-white"
                              : "bg-gray-900 text-white"
                          }
                        `}
                      >
                        {role.name?.charAt(0)?.toUpperCase() ||
                          "R"}
                      </div>

                      <div className="min-w-0">
                        <p className="font-bold text-gray-900">
                          {role.name}
                        </p>

                        <p className="text-xs text-gray-400 mt-0.5">
                          {role.code}
                        </p>

                        <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                          {roleDescription(role.code)}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT: PERMISSIONS */}
        <div className="bg-white rounded-[32px] border border-gray-200 shadow-sm overflow-hidden">
          {/* ROLE HEADER */}
          <div className="p-5 border-b border-gray-100">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {selectedRole
                    ? `Quyền của ${selectedRole.name}`
                    : "Chọn vai trò"}
                </h2>

                <p className="text-sm text-gray-500 mt-1">
                  {selectedRole
                    ? roleDescription(selectedRole.code)
                    : "Chọn một vai trò bên trái để xem danh sách quyền"}
                </p>
              </div>

              <div
                className="
                  flex
                  items-center
                  gap-3
                  bg-gray-100
                  rounded-2xl
                  px-4
                  py-3
                  min-w-[280px]
                "
              >
                <Search size={18} className="text-gray-400" />

                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm quyền..."
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

          {/* SUMMARY */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-5 border-b border-gray-100">
            <div className="rounded-3xl bg-gray-50 p-4">
              <p className="text-sm text-gray-400">
                Tổng quyền
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {ALL_PERMISSIONS.reduce(
                  (sum, group) =>
                    sum + group.permissions.length,
                  0
                )}
              </p>
            </div>

            <div className="rounded-3xl bg-gray-50 p-4">
              <p className="text-sm text-gray-400">
                Đang được cấp
              </p>
              <p className="text-2xl font-bold text-blue-600">
                {selectedPermissions.length}
              </p>
            </div>

            <div className="rounded-3xl bg-gray-50 p-4">
              <p className="text-sm text-gray-400">
                Vai trò hiện tại
              </p>
              <p className="text-lg font-bold text-gray-900 truncate">
                {selectedRole?.name || "-"}
              </p>
            </div>
          </div>

          {/* PERMISSION GROUPS */}
          <div className="p-5 max-h-[calc(100vh-320px)] overflow-y-auto">
            {loadingPermissions ? (
              <p className="text-sm text-gray-500">
                Đang tải quyền...
              </p>
            ) : !selectedRole ? (
              <div className="text-center py-16">
                <KeyRound
                  size={42}
                  className="mx-auto text-gray-300 mb-3"
                />
                <p className="text-gray-500">
                  Chọn một vai trò để xem quyền
                </p>
              </div>
            ) : filteredPermissionGroups.length === 0 ? (
              <p className="text-sm text-gray-500">
                Không tìm thấy quyền phù hợp
              </p>
            ) : (
              <div className="space-y-5">
                {filteredPermissionGroups.map((group) => {
                  const allChecked =
                    group.permissions.length > 0 &&
                    group.permissions.every((permission) =>
                      selectedPermissions.includes(permission)
                    );

                  return (
                    <div
                      key={group.group}
                      className="
                        rounded-3xl
                        border
                        border-gray-100
                        bg-gray-50
                        p-4
                      "
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="font-bold text-gray-900">
                            {group.group}
                          </h3>

                          <p className="text-xs text-gray-400 mt-1">
                            {group.permissions.length} quyền
                          </p>
                        </div>

                        <button
                          onClick={() =>
                            toggleGroup(group.permissions)
                          }
                          className={`
                            px-3
                            py-2
                            rounded-xl
                            text-xs
                            font-semibold
                            transition
                            ${
                              allChecked
                                ? "bg-blue-500 text-white"
                                : "bg-white text-gray-500 hover:text-blue-600"
                            }
                          `}
                        >
                          {allChecked
                            ? "Bỏ chọn nhóm"
                            : "Chọn cả nhóm"}
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {group.permissions.map((permission) => {
                          const checked =
                            selectedPermissions.includes(
                              permission
                            );

                          return (
                            <button
                              key={permission}
                              onClick={() =>
                                togglePermission(permission)
                              }
                              className={`
                                flex
                                items-center
                                justify-between
                                gap-3
                                rounded-2xl
                                border
                                px-4
                                py-3
                                text-left
                                transition
                                ${
                                  checked
                                    ? "bg-white border-blue-200 text-blue-600"
                                    : "bg-white border-gray-100 text-gray-600 hover:border-gray-200"
                                }
                              `}
                            >
                              <span className="text-sm font-medium">
                                {permission}
                              </span>

                              {checked ? (
                                <CheckCircle2
                                  size={18}
                                  className="text-blue-500 shrink-0"
                                />
                              ) : (
                                <span className="w-[18px] h-[18px] rounded-full border border-gray-300 shrink-0" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}