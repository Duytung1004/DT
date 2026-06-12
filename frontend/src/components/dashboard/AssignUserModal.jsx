import { useEffect, useState } from "react";
import api from "../../services/api";

export default function AssignUserModal({
  task,
  onClose,
  fetchTasks,
  setSelectedTask,
}) {
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] =
    useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);

      const res = await api.get(
        `/users/unit/${task.unit_id}`
      );

      console.log(
        "USERS BY UNIT:",
        res.data
      );

      setUsers(res.data);
    } catch (err) {
      console.log(
        "FETCH USERS ERROR:",
        err
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedUserId) {
      return alert("Chọn nhân viên");
    }

    try {
      await api.post(
        `/tasks/${task.id}/assign`,
        {
          assignee_user_id:
            Number(selectedUserId),
        }
      );

      await fetchTasks();

      setSelectedTask(null);

      onClose();
    } catch (err) {
      console.log(
        "ASSIGN USER ERROR:",
        err
      );

      alert(
        err.response?.data?.message ||
          "Lỗi phân công cán bộ"
      );
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-[70]"
      onClick={onClose}
    >
      <div
        className="bg-white p-5 rounded-2xl w-[400px]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold mb-4">
          Phân công cán bộ
        </h2>

        {loading ? (
          <p className="text-sm text-gray-500">
            Đang tải danh sách nhân viên...
          </p>
        ) : (
          <select
            value={selectedUserId}
            onChange={(e) =>
              setSelectedUserId(e.target.value)
            }
            className="w-full border rounded-lg p-2"
          >
            <option value="">
              Chọn nhân viên
            </option>

            {users.map((u) => (
              <option
                key={u.id}
                value={u.id}
              >
                {u.full_name ||
                  u.username ||
                  `User #${u.id}`}
              </option>
            ))}
          </select>
        )}

        {!loading && users.length === 0 && (
          <p className="text-sm text-red-500 mt-2">
            Phòng ban này chưa có nhân viên.
          </p>
        )}

        <div className="flex justify-end gap-2 mt-5">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 rounded-lg"
          >
            Huỷ
          </button>

          <button
            onClick={handleAssign}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg"
          >
            Xác nhận
          </button>
        </div>
      </div>
    </div>
  );
}