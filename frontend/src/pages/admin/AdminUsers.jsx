import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  KeyRound,
  X,
  Users,
  Unlock,
} from "lucide-react";
import api from "../../services/api";

const emptyForm = {
  username: "",
  password: "",
  full_name: "",
  role_id: "",
  unit_id: "",
  chuc_vu: "",
};

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [units, setUnits] = useState([]);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [unitFilter, setUnitFilter] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState(emptyForm);

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

  const fetchData = async () => {
    try {
      setLoading(true);

      const [usersRes, rolesRes, unitsRes] =
        await Promise.all([
          api.get("/users"),
          api.get("/roles"),
          api.get("/units"),
        ]);

      setUsers(usersRes.data);
      setRoles(rolesRes.data);
      setUnits(unitsRes.data);
    } catch (err) {
      console.log("FETCH ADMIN USERS ERROR:", err);
      alert(
        err.response?.data?.message ||
          "Không tải được dữ liệu quản trị"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const isUserLocked = (user) => {
  return (
    user.locked_until &&
    new Date(user.locked_until) > new Date()
  );
};

const handleUnlockUser = async (user) => {
  const ok = window.confirm(
    `Bạn có chắc muốn mở khóa tài khoản "${user.username}" không?`
  );

  if (!ok) return;

  try {
    await api.patch(`/users/${user.id}/unlock`);

    alert("Đã mở khóa tài khoản");

    fetchData();
  } catch (err) {
    console.log("UNLOCK USER ERROR:", err);

    alert(
      err.response?.data?.message ||
        "Mở khóa tài khoản thất bại"
    );
  }
};

  const filteredUsers = useMemo(() => {
    const keyword = search.toLowerCase().trim();

    return users.filter((user) => {
      const matchSearch =
  !keyword ||
  user.username?.toLowerCase().includes(keyword) ||
  user.full_name?.toLowerCase().includes(keyword) ||
  user.chuc_vu?.toLowerCase().includes(keyword);

      const matchRole =
        !roleFilter ||
        String(user.role_id) === String(roleFilter);

      const matchUnit =
        !unitFilter ||
        String(user.unit_id) === String(unitFilter);

      return matchSearch && matchRole && matchUnit;
    });
  }, [users, search, roleFilter, unitFilter]);

  const openCreate = () => {
    setEditingUser(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (user) => {
    setEditingUser(user);

    setForm({
      username: user.username || "",
      password: "",
      full_name: user.full_name || "",
      role_id: user.role_id || "",
      unit_id: user.unit_id || "",
      chuc_vu: user.chuc_vu || "",
    });

    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingUser(null);
    setForm(emptyForm);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.username || !form.role_id) {
      alert("Vui lòng nhập username và vai trò");
      return;
    }

    if (!editingUser && !form.password) {
      alert("Vui lòng nhập mật khẩu");
      return;
    }

    try {
      if (editingUser) {
        await api.put(`/users/${editingUser.id}`, {
          username: form.username,
          full_name: form.full_name,
          role_id: Number(form.role_id),
          unit_id: form.unit_id ? Number(form.unit_id) : null,
          chuc_vu: form.chuc_vu || null,
        });

        alert("Cập nhật tài khoản thành công");
      } else {
        await api.post("/users", {
          username: form.username,
          password: form.password,
          full_name: form.full_name,
          role_id: Number(form.role_id),
          unit_id: form.unit_id ? Number(form.unit_id) : null,
          chuc_vu: form.chuc_vu || null,
        });

        alert("Tạo tài khoản thành công");
      }

      closeForm();
      fetchData();
    } catch (err) {
      console.log("SAVE USER ERROR:", err);
      alert(
        err.response?.data?.message ||
          "Lưu tài khoản thất bại"
      );
    }
  };

  const handleDelete = async (user) => {
    const ok = window.confirm(
      `Bạn có chắc muốn xóa tài khoản "${user.username}" không?`
    );

    if (!ok) return;

    try {
      await api.delete(`/users/${user.id}`);
      alert("Đã xóa tài khoản");
      fetchData();
    } catch (err) {
      console.log("DELETE USER ERROR:", err);
      alert(
        err.response?.data?.message ||
          "Xóa tài khoản thất bại"
      );
    }
  };

  const handleResetPassword = async (user) => {
    const newPassword = window.prompt(
      `Nhập mật khẩu mới cho "${user.username}":`
    );

    if (!newPassword) return;

    try {
      await api.patch(`/users/${user.id}/reset-password`, {
        password: newPassword,
      });

      alert("Reset mật khẩu thành công");
    } catch (err) {
      console.log("RESET PASSWORD ERROR:", err);
      alert(
        err.response?.data?.message ||
          "Reset mật khẩu thất bại"
      );
    }
  };

  const getRoleBadge = (user) => {
    const roleName =
      user.role_name ||
      roles.find((r) => r.id === user.role_id)?.name ||
      user.role_id;

    return roleName;
  };

  const getUnitName = (user) => {
    return (
      user.unit_name ||
      units.find((u) => u.id === user.unit_id)?.name ||
      "-"
    );
  };

  const pageClass = `
  p-6
  min-h-screen
  transition-colors
  ${
    isDark
      ? "bg-slate-950 text-gray-100"
      : "bg-gray-100 text-gray-900"
  }
`;

const titleClass = isDark ? "text-gray-100" : "text-gray-900";
const mutedClass = isDark ? "text-gray-400" : "text-gray-500";

const panelClass = `
  rounded-3xl
  border
  shadow-sm
  ${
    isDark
      ? "bg-slate-900 border-slate-800"
      : "bg-white border-gray-200"
  }
`;

const inputBoxClass = `
  flex
  items-center
  gap-3
  rounded-2xl
  px-4
  py-3
  flex-1
  ${
    isDark
      ? "bg-slate-950 border border-slate-800"
      : "bg-gray-100"
  }
`;

const inputClass = `
  bg-transparent
  outline-none
  text-sm
  flex-1
  ${
    isDark
      ? "text-gray-100 placeholder:text-gray-500"
      : "text-gray-700 placeholder:text-gray-400"
  }
`;

const selectClass = `
  rounded-2xl
  px-4
  py-3
  text-sm
  outline-none
  border
  ${
    isDark
      ? "bg-slate-950 border-slate-800 text-gray-100"
      : "bg-gray-100 border-transparent text-gray-700"
  }
`;

const tableHeadClass = isDark
  ? "bg-slate-950"
  : "bg-gray-50";

const tableDivideClass = isDark
  ? "divide-y divide-slate-800"
  : "divide-y divide-gray-100";

const tableRowClass = `
  transition
  ${
    isDark
      ? "hover:bg-slate-800/60"
      : "hover:bg-gray-50"
  }
`;

const thClass = `
  px-5 py-4
  text-left
  text-sm
  font-semibold
  ${isDark ? "text-gray-400" : "text-gray-500"}
`;

const tdTextClass = isDark ? "text-gray-300" : "text-gray-600";

const iconButtonClass = `
  w-9 h-9
  rounded-xl
  transition
  flex
  items-center
  justify-center
  ${
    isDark
      ? "bg-slate-800 text-gray-300 hover:bg-blue-500/15 hover:text-blue-300"
      : "bg-gray-100 text-gray-600 hover:bg-blue-50 hover:text-blue-600"
  }
`;

const dangerButtonClass = `
  w-9 h-9
  rounded-xl
  transition
  flex
  items-center
  justify-center
  ${
    isDark
      ? "bg-slate-800 text-gray-300 hover:bg-red-500/15 hover:text-red-400"
      : "bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-500"
  }
`;

const modalCardClass = `
  rounded-[32px]
  shadow-2xl
  w-[520px]
  max-w-[95vw]
  overflow-hidden
  border
  ${
    isDark
      ? "bg-slate-900 border-slate-800 text-gray-100"
      : "bg-white border-gray-100 text-gray-900"
  }
`;

const modalHeaderClass = `
  px-6 py-5
  flex
  items-center
  justify-between
  border-b
  ${
    isDark
      ? "bg-slate-950 border-slate-800"
      : "bg-gradient-to-b from-gray-50 to-white border-gray-100"
  }
`;

const modalLabelClass = `
  text-sm
  font-semibold
  ${isDark ? "text-gray-300" : "text-gray-700"}
`;

const modalInputClass = `
  mt-2
  w-full
  rounded-2xl
  px-4
  py-3
  text-sm
  outline-none
  border
  focus:ring-2
  focus:ring-blue-400
  ${
    isDark
      ? "bg-slate-950 border-slate-800 text-gray-100 placeholder:text-gray-500"
      : "bg-gray-100 border-transparent text-gray-900"
  }
`;

  return (
    <div className={pageClass}>
      {/* HEADER */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className={`text-3xl font-bold ${titleClass}`}>
            Quản lý tài khoản
          </h1>

          <p className={`${mutedClass} mt-1`}>
            Tạo, chỉnh sửa và phân quyền người dùng trong hệ thống
          </p>
        </div>

        <button
          onClick={openCreate}
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
          "
        >
          <Plus size={18} />
          Thêm tài khoản
        </button>
      </div>

      {/* SUMMARY */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
        <div className={`${panelClass} p-5`}>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center">
              <Users size={20} />
            </div>

            <div>
              <p className={`text-sm ${mutedClass}`}>
                Tổng tài khoản
              </p>
              <p className={`text-2xl font-bold ${titleClass}`}>
                {users.length}
              </p>
            </div>
          </div>
        </div>

        <div className={`${panelClass} p-5`}>
          <p className={`text-sm ${mutedClass}`}>
            Số vai trò
          </p>
          <p className={`text-2xl font-bold ${titleClass}`}>
            {roles.length}
          </p>
        </div>

        <div className={`${panelClass} p-5`}>
          <p className={`text-sm ${mutedClass}`}>
            Số phòng ban
          </p>
          <p className={`text-2xl font-bold ${titleClass}`}>
            {units.length}
          </p>
        </div>
      </div>

      {/* FILTERS */}
      <div className={`${panelClass} p-4 mb-5 flex flex-col xl:flex-row gap-3`}>
        <div className={inputBoxClass}>
          <Search size={18} className="text-gray-400" />

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo username hoặc họ tên..."
            className={inputClass}
          />
        </div>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className={selectClass}
        >
          <option value="">Tất cả vai trò</option>
          {roles.map((role) => (
            <option key={role.id} value={role.id}>
              {role.name}
            </option>
          ))}
        </select>

        <select
          value={unitFilter}
          onChange={(e) => setUnitFilter(e.target.value)}
          className={selectClass}
        >
          <option value="">Tất cả phòng ban</option>
          {units.map((unit) => (
            <option key={unit.id} value={unit.id}>
              {unit.name}
            </option>
          ))}
        </select>
      </div>

      {/* TABLE */}
      <div className={`${panelClass} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead className={tableHeadClass}>
              <tr>
                <th className={thClass}>
                  Người dùng
                </th>

                <th className={thClass}>
                  Vai trò
                </th>

                <th className={thClass}>
                  Chức vụ
                </th>

                <th className={thClass}>
                  Phòng ban
                </th>

                <th className={`${thClass} text-center`}>
                  ID
                </th>

                <th className={`${thClass} text-right`}>
                  Thao tác
                </th>
              </tr>
            </thead>

            <tbody className={tableDivideClass}>
              {loading ? (
                <tr>
                  <td
                    colSpan="6"
                    className="px-5 py-10 text-center text-gray-500"
                  >
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td
                    colSpan="6"
                    className="px-5 py-10 text-center text-gray-500"
                  >
                    Không có tài khoản nào
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    className={tableRowClass}
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="
                            w-11 h-11
                            rounded-2xl
                            bg-gray-900
                            text-white
                            flex
                            items-center
                            justify-center
                            font-bold
                          "
                        >
                          {(user.full_name ||
                            user.username ||
                            "U")
                            .charAt(0)
                            .toUpperCase()}
                        </div>

                        <div>
  <p className={`font-semibold ${titleClass}`}>
    {user.full_name || "Chưa có họ tên"}
  </p>

  <p className={`text-sm ${mutedClass}`}>
    @{user.username}
  </p>

  {isUserLocked(user) && (
    <p className="text-xs text-red-500 font-semibold mt-1">
      Tài khoản đang bị khóa
    </p>
  )}
</div>
                      </div>
                    </td>

                    <td className="px-5 py-4">
  <span
  className={`
    inline-flex
    px-3
    py-1
    rounded-full
    text-xs
    font-semibold
    ${
      isDark
        ? "bg-blue-500/15 text-blue-300 border border-blue-500/30"
        : "bg-blue-50 text-blue-600"
    }
  `}
>
    {getRoleBadge(user)}
  </span>
</td>

<td className={`px-5 py-4 text-sm ${tdTextClass}`}>
  {user.chuc_vu || "-"}
</td>

<td className={`px-5 py-4 text-sm ${tdTextClass}`}>
  {getUnitName(user)}
</td>


                    <td className={`px-5 py-4 text-center text-sm ${mutedClass}`}>
                      #{user.id}
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
  <button
    onClick={() => openEdit(user)}
    className={iconButtonClass}
    title="Sửa"
  >
    <Pencil size={16} />
  </button>

  <button
    onClick={() => handleResetPassword(user)}
   className={iconButtonClass}
    title="Reset mật khẩu"
  >
    <KeyRound size={16} />
  </button>

  {isUserLocked(user) && (
    <button
      onClick={() => handleUnlockUser(user)}
      className={iconButtonClass}
      title="Mở khóa tài khoản"
    >
      <Unlock size={16} />
    </button>
  )}

  <button
    onClick={() => handleDelete(user)}
    className={dangerButtonClass}
    title="Xóa"
  >
    <Trash2 size={16} />
  </button>
</div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* FORM MODAL */}
      {showForm && (
        <div
          className="
            fixed
            inset-0
            bg-black/40
            backdrop-blur-sm
            z-[80]
            flex
            items-center
            justify-center
            px-4
          "
          onClick={closeForm}
        >
          <div
  className={modalCardClass}
  onClick={(e) => e.stopPropagation()}
>
  <div className={modalHeaderClass}>
    <div>
      <h2 className={`text-xl font-bold ${titleClass}`}>
                  {editingUser
                    ? "Cập nhật tài khoản"
                    : "Thêm tài khoản"}
                </h2>

                <p className="text-sm text-gray-400 mt-1">
                  {editingUser
                    ? "Chỉnh sửa thông tin người dùng"
                    : "Tạo tài khoản đăng nhập mới"}
                </p>
              </div>

              <button
                onClick={closeForm}
                className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="p-6 space-y-4"
            >
              <div>
                <label className={modalLabelClass}>
                  Tên đăng nhập
                </label>

                <input
                  value={form.username}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      username: e.target.value,
                    })
                  }
                  className={modalInputClass}
                  placeholder="VD: user01"
                />
              </div>

              <div>
                <label className={modalLabelClass}>
                  Họ tên
                </label>

                <input
                  value={form.full_name}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      full_name: e.target.value,
                    })
                  }
                  className={modalInputClass}
                  placeholder="VD: Nguyễn Văn A"
                />
              </div>

              <div>
  <label className={modalLabelClass}>
    Chức vụ
  </label>

  <input
    value={form.chuc_vu}
    onChange={(e) =>
      setForm({
        ...form,
        chuc_vu: e.target.value,
      })
    }
    className={modalInputClass}
    placeholder="VD: Phó phòng, Trưởng phòng, Phó Bí thư..."
  />
</div>

              {!editingUser && (
                <div>
                 <label className={modalLabelClass}>
                    Mật khẩu
                  </label>

                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        password: e.target.value,
                      })
                    }
                    className={modalInputClass}
                    placeholder="Nhập mật khẩu"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className={modalLabelClass}>
                    Vai trò
                  </label>

                  <select
                    value={form.role_id}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        role_id: e.target.value,
                      })
                    }
                    className={modalInputClass}
                  >
                    <option value="">Chọn vai trò</option>
                    {roles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                 <label className={modalLabelClass}>
                    Phòng ban
                  </label>

                  <select
                    value={form.unit_id}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        unit_id: e.target.value,
                      })
                    }
                    className={modalInputClass}
                  >
                    <option value="">Không chọn</option>
                    {units.map((unit) => (
                      <option key={unit.id} value={unit.id}>
                        {unit.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={closeForm}
                  className={`
  px-5 py-3
  rounded-2xl
  font-semibold
  transition
  ${
    isDark
      ? "bg-slate-800 text-gray-200 hover:bg-slate-700"
      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
  }
`}
                >
                  Hủy
                </button>

                <button
                  type="submit"
                  className="px-5 py-3 rounded-2xl bg-blue-500 text-white font-semibold hover:bg-blue-600 transition"
                >
                  {editingUser ? "Lưu thay đổi" : "Tạo tài khoản"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}