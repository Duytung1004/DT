const trashService = require("../modules/trash/trashService");

let cleanupInterval = null;

const runTrashCleanup = async () => {
  try {
    const result = await trashService.autoCleanupExpiredTrash();

    console.log("AUTO TRASH CLEANUP:", {
      retention_days: result.retention_days,
      expired_tasks: result.expired_tasks,
      expired_documents: result.expired_documents,
      deleted_tasks: result.deleted_tasks,
      deleted_documents: result.deleted_documents,
      errors: result.errors?.length || 0,
    });
  } catch (err) {
    console.log("AUTO TRASH CLEANUP ERROR:", err.message);
  }
};

const startTrashCleanupJob = () => {
  if (cleanupInterval) return;

  // Chạy 1 lần khi server khởi động
  runTrashCleanup();

  // Sau đó cứ 1 giờ kiểm tra 1 lần
  cleanupInterval = setInterval(() => {
    runTrashCleanup();
  }, 60 * 60 * 1000);

  console.log("Trash cleanup job started");
};

module.exports = {
  startTrashCleanupJob,
};