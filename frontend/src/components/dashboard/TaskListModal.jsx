import { hasPermission } from "../../utils/permission";
// rename

export default function TaskListModal({
  selectedDept,
  tasks,
  setTasks,
  setSelectedDept,
  setSelectedTask,
  user,
}) {

  const canViewTasks =
  hasPermission(user, "task:view_all") ||
  hasPermission(user, "task:view_unit");

if (!selectedDept || !canViewTasks) {
  return null;
}

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      onClick={() => {
        setSelectedDept(null);
        setTasks([]);
      }}
    >

      <div
        className="bg-white w-[500px] max-h-[500px] rounded-2xl shadow-xl p-5 overflow-auto animate-fadeIn"
        onClick={(e) => e.stopPropagation()}
      >

        {/* HEADER */}
        <div className="flex justify-between items-center mb-4 border-b pb-2">

          <h2 className="text-lg font-semibold">
            📋 {selectedDept}
          </h2>

          <button
            onClick={() => {
              setSelectedDept(null);
              setTasks([]);
            }}
            className="text-gray-400 hover:text-red-500 text-xl"
          >
            ✕
          </button>

        </div>

        {/* CONTENT */}
        {!tasks ? (
          <p className="text-center text-gray-500">
            Đang tải...
          </p>

        ) : tasks.length === 0 ? (

          <p className="text-gray-500 text-center">
            Không có task
          </p>

        ) : (

          <div className="space-y-3">

            {tasks.map((task) => {

              const isOverdue =
                new Date(task.han_chot) < new Date() &&
                task.status_code !== "hoan_thanh";

              return (
                <div
                  key={task.id}
                  onClick={() => {
                    setSelectedTask(task);
                  }}
                  className="p-3 border rounded-xl hover:shadow transition flex justify-between items-center cursor-pointer"
                >

                  <div>
                    <p className="font-medium">
                      {task.tieu_de}
                    </p>

                    <p className="text-xs text-gray-500">
                      📅{" "}
                      {new Date(
                        task.han_chot
                      ).toLocaleDateString()}
                    </p>
                  </div>

                  <span
                    className={`text-xs px-2 py-1 rounded-full font-medium
                    ${
                      task.status_code === "hoan_thanh"
                        ? "bg-green-100 text-green-600"
                        : isOverdue
                        ? "bg-red-100 text-red-600"
                        : "bg-blue-100 text-blue-600"
                    }`}
                  >
                    {task.status_code}
                  </span>

                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}