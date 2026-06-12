const taskService = require("./taskService");
const pool = require("../../config/db");
// CREATE TASK
exports.createTask = async (req, res) => {
  try {
    const task =
  await taskService.createTask(
    req.body,
    req.user
  );
    res.json(task);
  }catch (err) {

  console.log(
    "CREATE TASK ERROR:",
    err
  );

  res.status(400).json({
    message: err.message
  });

}
};

// =======================
// CREATE MULTIPLE TASKS FROM DOCUMENT
// =======================
exports.createTasksFromDocument = async (req, res) => {
  try {
    const result =
      await taskService.createTasksFromDocument(
        req.body,
        req.user
      );

    res.json({
      message: "Tạo nhiều nhiệm vụ từ văn bản thành công",
      tasks: result,
    });
  } catch (err) {
    console.log(
      "CREATE TASKS FROM DOCUMENT ERROR:",
      err
    );

    res.status(400).json({
      message: err.message,
    });
  }
};

// GET ALL TASKS
// GET ALL TASKS
exports.getTasks = async (
  req,
  res
) => {
  try {
    const tasks =
      await taskService.getTasks(
        req.user,
        req.query
      );

    console.log(
      "TASK FILTERS:",
      req.query
    );

    console.log(
      "TASKS:",
      tasks
    );

    res.json(tasks);
  } catch (err) {
    console.log(
      "GET TASKS ERROR:",
      err
    );

    res.status(500).json({
      message: err.message
    });
  }
};

// GET TASK BY ID
exports.getTaskById = async (req, res) => {
  try {
    const task = await taskService.getTaskById(
  req.params.id,
  req.user
);

    if (!task) {
      return res.status(404).json({ message: "Không tìm thấy task" });
    }

    res.json(task);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// UPDATE TASK
exports.updateTask = async (req, res) => {
  try {
    const task = await taskService.updateTask(
      req.params.id,
      req.body,
      req.user
    );
    res.json(task);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// DELETE TASK
exports.deleteTask = async (req, res) => {
  try {
    await taskService.deleteTask(req.params.id, req.user);
    res.json({ message: "Xoá thành công" });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// ASSIGN TASK
exports.assignTask = async (req, res) => {
  try {
    const taskId = req.params.id;
    const { assignee_user_id } = req.body;

    // ❗ validate
    if (!assignee_user_id) {
      return res.status(400).json({
        message: "Thiếu assignee_user_id",
      });
    }

    const task = await taskService.assignTask(
      taskId,
      assignee_user_id,
      req.user
    );

    if (!task) {
      return res.status(404).json({
        message: "Task không tồn tại",
      });
    }

    res.json(task);
  } catch (err) {

  console.log(
    "ASSIGN TASK ERROR:",
    err
  );

  res.status(400).json({
    message: err.message
  });

}
};



// CREATE SUBTASK / PHÂN CÔNG NỘI BỘ
exports.createSubtask = async (req, res) => {
  try {
    const data = {
      ...req.body,
      task_id: req.params.id,
    };

    const subtask = await taskService.createSubtask(
      data,
      req.user
    );

    res.json(subtask);
  } catch (err) {
    console.log("CREATE SUBTASK ERROR:", err);

    res.status(400).json({
      message: err.message,
    });
  }
};

exports.getTaskSubtasks = async (req, res) => {
  try {
    const result = await taskService.getTaskSubtasks(
      req.params.id,
      req.user
    );

    res.json(result);
  } catch (err) {
    console.log("GET TASK SUBTASKS ERROR:", err.message);

    res.status(400).json({
      message: err.message,
    });
  }
};

// UPDATE PROGRESS
exports.updateProgress = async (req, res) => {
  try {
    const update = await taskService.updateTaskProgress(
      req.params.id,
      req.user.userId,
      req.body
    );
    res.json(update);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// SUBMIT TASK
exports.submitTask = async (req, res) => {
  try {
    console.log("SUBMIT TASK BODY:", req.body);
    console.log("SUBMIT TASK FILE:", req.file);

    const result = await taskService.submitTask(
      req.params.id,
      req.user.userId,
      req.body.noi_dung || req.body.noi_dung_tom_tat,
      req.file
    );

    res.json(result);
  } catch (err) {
    console.log("SUBMIT TASK ERROR:", err);

    res.status(500).json({
      message: err.message,
    });
  }
};

// APPROVE TASK
exports.approveTask = async (req, res) => {
  try {
    const result = await taskService.approveTask(
      req.params.id,
      req.user.userId,
      req.body.quyet_dinh,
      req.body.ghi_chu,
      req.user
    );
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// =======================
// GET TASKS BY UNIT
// =======================
exports.getTasksByUnit = async (req, res) => {
  try {
    const { unit_id } = req.query;

    if (!unit_id) {
      return res.status(400).json({
        message: "Thiếu unit_id",
      });
    }
    if (
  !req.user.permissions.includes("task:view_all") &&
  !req.user.permissions.includes("task:view_unit")
) {
  return res.status(403).json({
    message: "Không có quyền xem nhiệm vụ phòng ban",
  });
}

if (
  req.user.permissions.includes("task:view_unit") &&
  !req.user.permissions.includes("task:view_all") &&
  Number(unit_id) !== Number(req.user.unit_id)
) {
  return res.status(403).json({
    message: "Không được xem nhiệm vụ phòng ban khác",
  });
}


    const result = await pool.query(
`
SELECT 
  t.*,

  tt.code AS status_code,
  tt.name AS status_name,

  un.name AS unit_name,

  u.full_name AS assignee_name

FROM tasks t

LEFT JOIN trang_thai_task tt 
  ON t.trang_thai_id = tt.id

LEFT JOIN users u
  ON t.assignee_user_id = u.id

LEFT JOIN units un
  ON t.unit_id = un.id

WHERE t.unit_id = $1
  AND t.deleted_at IS NULL

ORDER BY t.created_at DESC
`,
[unit_id]
);

    res.json(result.rows);

  } catch (err) {
    console.error("Lỗi getTasksByUnit:", err);
    res.status(500).json({
      message: err.message,
    });
  }
};

exports.confirmUnitTask =
async (req, res) => {

  try {

    const result =
      await taskService.confirmUnitTask(
        req.params.id,
        req.user
      );

    res.json(result);

  } catch (err) {

    console.log(
      "CONFIRM UNIT ERROR:",
      err
    );

    res.status(400).json({
      message: err.message
    });

  }

};

exports.confirmAssignedTask =
async (req, res) => {

  try {

    const result =
      await taskService.confirmAssignedTask(
        req.params.id,
        req.user
      );

    res.json(result);

  } catch (err) {

    console.log(
      "CONFIRM ASSIGNED ERROR:",
      err
    );

    res.status(400).json({
      message: err.message
    });

  }

};

exports.getTaskLogs = async (
  req,
  res
) => {

  try {

    const result = await pool.query(
      `
      SELECT
        tl.*,
        u.full_name
      FROM task_logs tl

      LEFT JOIN users u
      ON tl.user_id = u.id

      WHERE tl.task_id = $1

      ORDER BY tl.created_at DESC
      `,
      [req.params.id]
    );

    res.json(result.rows);

  } catch (err) {

    res.status(500).json({
      message: err.message
    });

  }
};

exports.getTaskSubmissions = async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        ts.id,
        ts.task_id,
        ts.submitted_by,
        ts.noi_dung_tom_tat,
        ts.file_name,
        ts.file_path,
        ts.file_type,
        ts.created_at,

        u.full_name AS submitted_by_name,
        u.username AS submitted_by_username

      FROM task_submissions ts

      LEFT JOIN users u
        ON ts.submitted_by = u.id

      WHERE ts.task_id = $1

      ORDER BY ts.created_at DESC
      LIMIT 1
      `,
      [req.params.id]
    );

    res.json(result.rows);
  } catch (err) {
    console.log("GET TASK SUBMISSIONS ERROR:", err);

    res.status(500).json({
      message: err.message,
    });
  }
};
exports.updateSubtask = async (req, res) => {
  try {
    const result = await taskService.updateSubtask(
      req.params.id,
      req.params.subtaskId,
      req.body,
      req.user
    );

    res.json(result);
  } catch (err) {
    console.log("UPDATE SUBTASK ERROR:", err);

    res.status(400).json({
      message: err.message,
    });
  }
};
exports.startSubtask = async (req, res) => {
  try {
    const result = await taskService.startSubtask(
      req.params.id,
      req.params.subtaskId,
      req.user
    );

    res.json(result);
  } catch (err) {
    console.log("START SUBTASK ERROR:", err);

    res.status(400).json({
      message: err.message,
    });
  }
};
exports.updateSubtaskProgress = async (req, res) => {
  try {
    const result = await taskService.updateSubtaskProgress(
      req.params.id,
      req.params.subtaskId,
      req.body,
      req.user
    );

    res.json(result);
  } catch (err) {
    console.log("UPDATE SUBTASK PROGRESS ERROR:", err);

    res.status(400).json({
      message: err.message,
    });
  }
};
exports.submitSubtask = async (req, res) => {
  try {
    const result = await taskService.submitSubtask(
      req.params.id,
      req.params.subtaskId,
      {
        noi_dung_nop: req.body.noi_dung_nop,
        file: req.file,
      },
      req.user
    );

    res.json(result);
  } catch (err) {
    console.log("SUBMIT SUBTASK ERROR:", err);

    res.status(400).json({
      message: err.message,
    });
  }
};
exports.approveSubtask = async (req, res) => {
  try {
    const { taskId, subtaskId } = req.params;
    const { decision } = req.body;

    const result = await taskService.approveSubtask(
      taskId,
      subtaskId,
      decision,
      req.user
    );

    res.json(result);
  } catch (err) {
    console.error("APPROVE SUBTASK ERROR:", err);

    res.status(400).json({
      message: err.message || "Duyệt phần việc thất bại",
    });
  }
};
exports.sendTaskToLeaderApproval = async (req, res) => {
  try {
    const taskId = req.params.taskId || req.params.id;

    const result =
      await taskService.sendTaskToLeaderApproval(
        taskId,
        req.user
      );

    res.json(result);
  } catch (err) {
    console.error("SEND TASK TO LEADER ERROR:", err);

    res.status(400).json({
      message:
        err.message ||
        "Gửi lãnh đạo duyệt thất bại",
    });
  }
};
exports.requestSubtaskRevision = async (req, res) => {
  try {
    const taskId = req.params.taskId || req.params.id;
    const { subtaskId } = req.params;

    const result = await taskService.requestSubtaskRevision(
      taskId,
      subtaskId,
      req.user
    );

    res.json(result);
  } catch (err) {
    console.error("REQUEST SUBTASK REVISION ERROR:", err);

    res.status(400).json({
      message:
        err.message ||
        "Yêu cầu sửa phần việc thất bại",
    });
  }
};