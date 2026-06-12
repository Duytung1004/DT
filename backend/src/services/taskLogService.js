const pool = require("../config/db");

exports.createLog = async (
  taskId,
  userId,
  action
) => {

  await pool.query(
    `
    INSERT INTO task_logs (
      task_id,
      user_id,
      action
    )
    VALUES ($1, $2, $3)
    `,
    [
      taskId,
      userId,
      action
    ]
  );
};