const pool = require("../../config/db");
const { getIO } = require("../../config/socket");
const { createLog } = require("../../services/taskLogService");
const { createAuditLog } = require("../../services/auditLogService");

const hasPermission = (user, permission) => {
  return (
    Array.isArray(user?.permissions) &&
    user.permissions.includes(permission)
  );
};

const getUserId = (user) => {
  return user?.userId || user?.id;
};

const emitTaskChanged = (action, taskId, extra = {}) => {
  try {
    getIO().emit("task:changed", {
      action,
      taskId,
      ...extra,
    });
  } catch (err) {
    console.log("EMIT TASK TRASH ERROR:", err.message);
  }
};

const columnExists = async (client, tableName, columnName) => {
  const result = await client.query(
    `
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = $1
      AND column_name = $2
    LIMIT 1
    `,
    [tableName, columnName]
  );

  return result.rows.length > 0;
};

const deleteByColumnIfExists = async (
  client,
  tableName,
  columnName,
  value
) => {
  const exists = await columnExists(
    client,
    tableName,
    columnName
  );

  if (!exists) return;

  await client.query(
    `
    DELETE FROM ${tableName}
    WHERE ${columnName} = $1
    `,
    [value]
  );
};

const emitDocumentChanged = (action, documentId, extra = {}) => {
  try {
    getIO().emit("document:changed", {
      action,
      documentId,
      ...extra,
    });
  } catch (err) {
    console.log("EMIT DOCUMENT TRASH ERROR:", err.message);
  }
};

exports.getTrash = async (user) => {
  if (!hasPermission(user, "trash:view")) {
    throw new Error("Không có quyền xem thùng rác");
  }

  const taskResult = await pool.query(
    `
    SELECT
      t.id,
      t.tieu_de,
      t.mo_ta,
      t.han_chot,
      t.deleted_at,
      t.unit_id,

      tt.code AS status_code,
      tt.name AS status_name,

      un.name AS unit_name,

      COALESCE(u.full_name, u.username) AS assignee_name

    FROM tasks t

    LEFT JOIN trang_thai_task tt
      ON t.trang_thai_id = tt.id

    LEFT JOIN units un
      ON t.unit_id = un.id

    LEFT JOIN users u
      ON t.assignee_user_id = u.id

    WHERE t.deleted_at IS NOT NULL

    ORDER BY t.deleted_at DESC
    `
  );

  const documentResult = await pool.query(
    `
    SELECT
      d.id,
      d.so_ky_hieu,
      d.tieu_de,
      d.trich_yeu,
      d.file_name,
      d.file_path,
      d.workflow_status,
      d.status,
      d.deleted_at,

      un.name AS unit_name,

      COALESCE(u.full_name, u.username) AS created_by_name

    FROM documents d

    LEFT JOIN units un
      ON d.unit_id = un.id

    LEFT JOIN users u
      ON d.created_by = u.id

    WHERE d.deleted_at IS NOT NULL

    ORDER BY d.deleted_at DESC
    `
  );

  return {
    tasks: taskResult.rows,
    documents: documentResult.rows,
  };
};

exports.restoreTask = async (taskId, user) => {
  if (!hasPermission(user, "trash:restore")) {
    throw new Error("Không có quyền khôi phục nhiệm vụ");
  }

  const oldTaskResult = await pool.query(
  `
  SELECT id, deleted_at
  FROM tasks
  WHERE id = $1
    AND deleted_at IS NOT NULL
  `,
  [taskId]
);

if (oldTaskResult.rows.length === 0) {
  throw new Error("Nhiệm vụ không tồn tại trong thùng rác");
}

const result = await pool.query(
    `
    UPDATE tasks
    SET deleted_at = NULL,
        updated_at = NOW()
    WHERE id = $1
      AND deleted_at IS NOT NULL
    RETURNING *
    `,
    [taskId]
  );

  if (result.rows.length === 0) {
    throw new Error("Nhiệm vụ không tồn tại trong thùng rác");
  }

  await createLog(
    taskId,
    getUserId(user),
    "Khôi phục nhiệm vụ từ thùng rác"
  );

 await createAuditLog({
  userId: getUserId(user),
  entityType: "tasks",
  entityId: Number(taskId),
  action: "restore",
  description: "Khôi phục nhiệm vụ từ thùng rác",
  oldValues: {
    deleted_at: oldTaskResult.rows[0].deleted_at,
  },
  newValues: {
    deleted_at: null,
  },
});

emitTaskChanged("restored", taskId, {
  byUserId: getUserId(user),
});

return result.rows[0];
};

exports.restoreDocument = async (documentId, user) => {
  if (!hasPermission(user, "trash:restore")) {
    throw new Error("Không có quyền khôi phục văn bản");
  }

  const oldDocumentResult = await pool.query(
    `
    SELECT id, deleted_at
    FROM documents
    WHERE id = $1
      AND deleted_at IS NOT NULL
    `,
    [documentId]
  );

  if (oldDocumentResult.rows.length === 0) {
    throw new Error("Văn bản không tồn tại trong thùng rác");
  }

  const result = await pool.query(
    `
    UPDATE documents
    SET deleted_at = NULL,
        updated_at = NOW()
    WHERE id = $1
      AND deleted_at IS NOT NULL
    RETURNING *
    `,
    [documentId]
  );

  if (result.rows.length === 0) {
    throw new Error("Văn bản không tồn tại trong thùng rác");
  }

  await createAuditLog({
    userId: getUserId(user),
    entityType: "documents",
    entityId: Number(documentId),
    action: "restore",
    description: "Khôi phục văn bản từ thùng rác",
    oldValues: {
      deleted_at: oldDocumentResult.rows[0].deleted_at,
    },
    newValues: {
      deleted_at: null,
    },
  });

  emitDocumentChanged("restored", documentId, {
    byUserId: getUserId(user),
  });

  return result.rows[0];
};

exports.deleteTaskPermanent = async (taskId, user) => {
  if (!hasPermission(user, "trash:delete_permanent")) {
  throw new Error("Không có quyền xóa vĩnh viễn nhiệm vụ");
}

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const checkResult = await client.query(
      `
      SELECT id
      FROM tasks
      WHERE id = $1
        AND deleted_at IS NOT NULL
      `,
      [taskId]
    );

    if (checkResult.rows.length === 0) {
      throw new Error(
        "Nhiệm vụ không tồn tại trong thùng rác"
      );
    }

    // Xóa dữ liệu liên quan đến conversation của task nếu có
    const hasConversationTaskId = await columnExists(
      client,
      "conversations",
      "task_id"
    );

    if (hasConversationTaskId) {
      await client.query(
        `
        DELETE FROM message_attachments
        WHERE message_id IN (
          SELECT m.id
          FROM messages m
          JOIN conversations c
            ON m.conversation_id = c.id
          WHERE c.task_id = $1
        )
        `,
        [taskId]
      ).catch(() => {});

      await client.query(
        `
        DELETE FROM messages
        WHERE conversation_id IN (
          SELECT id
          FROM conversations
          WHERE task_id = $1
        )
        `,
        [taskId]
      ).catch(() => {});

      await client.query(
        `
        DELETE FROM conversation_members
        WHERE conversation_id IN (
          SELECT id
          FROM conversations
          WHERE task_id = $1
        )
        `,
        [taskId]
      ).catch(() => {});

      await client.query(
        `
        DELETE FROM conversations
        WHERE task_id = $1
        `,
        [taskId]
      ).catch(() => {});
    }

    // Xóa các bảng phụ có task_id nếu tồn tại
    await deleteByColumnIfExists(
      client,
      "notifications",
      "task_id",
      taskId
    );

    await deleteByColumnIfExists(
      client,
      "task_logs",
      "task_id",
      taskId
    );

    await deleteByColumnIfExists(
      client,
      "task_updates",
      "task_id",
      taskId
    );

    await deleteByColumnIfExists(
      client,
      "task_submissions",
      "task_id",
      taskId
    );

    await deleteByColumnIfExists(
      client,
      "task_approvals",
      "task_id",
      taskId
    );

    await deleteByColumnIfExists(
  client,
  "task_reports",
  "task_id",
  taskId
);

await deleteByColumnIfExists(
  client,
  "task_documents",
  "task_id",
  taskId
);

await deleteByColumnIfExists(
  client,
  "subtasks",
  "task_id",
  taskId
);

    // Cuối cùng mới xóa task chính
    await client.query(
      `
      DELETE FROM tasks
      WHERE id = $1
        AND deleted_at IS NOT NULL
      `,
      [taskId]
    );

    await client.query("COMMIT");

await createAuditLog({
  userId: getUserId(user),
  entityType: "tasks",
  entityId: Number(taskId),
  action: "delete",
  description: "Xóa vĩnh viễn nhiệm vụ khỏi thùng rác",
  oldValues: {
    task_id: Number(taskId),
  },
  newValues: null,
});

emitTaskChanged("permanent_deleted", taskId, {
  byUserId: getUserId(user),
});

return true;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

exports.deleteDocumentPermanent = async (documentId, user) => {
  if (!hasPermission(user, "trash:delete_permanent")) {
  throw new Error("Không có quyền xóa vĩnh viễn văn bản");
}

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const checkResult = await client.query(
      `
      SELECT id
      FROM documents
      WHERE id = $1
        AND deleted_at IS NOT NULL
      `,
      [documentId]
    );

    if (checkResult.rows.length === 0) {
      throw new Error(
        "Văn bản không tồn tại trong thùng rác"
      );
    }

    // Nếu tasks có liên kết document_id thì bỏ liên kết trước
    const taskHasDocumentId = await columnExists(
      client,
      "tasks",
      "document_id"
    );

    if (taskHasDocumentId) {
      await client.query(
        `
        UPDATE tasks
        SET document_id = NULL
        WHERE document_id = $1
        `,
        [documentId]
      );
    }

    await deleteByColumnIfExists(
      client,
      "notifications",
      "document_id",
      documentId
    );

    await deleteByColumnIfExists(
      client,
      "document_versions",
      "document_id",
      documentId
    );

    await deleteByColumnIfExists(
      client,
      "document_ai_extractions",
      "document_id",
      documentId
    );

    await deleteByColumnIfExists(
      client,
      "task_documents",
      "document_id",
      documentId
    );

    await deleteByColumnIfExists(
      client,
      "audit_logs",
      "document_id",
      documentId
    );

    // Cuối cùng mới xóa document chính
    await client.query(
      `
      DELETE FROM documents
      WHERE id = $1
        AND deleted_at IS NOT NULL
      `,
      [documentId]
    );

    await client.query("COMMIT");

await createAuditLog({
  userId: getUserId(user),
  entityType: "documents",
  entityId: Number(documentId),
  action: "delete",
  description: "Xóa vĩnh viễn văn bản khỏi thùng rác",
  oldValues: {
    document_id: Number(documentId),
  },
  newValues: null,
});

emitDocumentChanged("permanent_deleted", documentId, {
  byUserId: getUserId(user),
});

return true;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};
exports.cleanupExpiredTrash = async (user) => {
  if (!hasPermission(user, "trash:delete_permanent")) {
    throw new Error("Không có quyền dọn thùng rác quá hạn");
  }

  const settingResult = await pool.query(
    `
    SELECT value
    FROM system_settings
    WHERE key = 'trash_retention_days'
    LIMIT 1
    `
  );

  const retentionDays = Number(
    settingResult.rows[0]?.value || 30
  );

  if (!retentionDays || retentionDays < 1) {
    throw new Error("Cấu hình thời gian lưu thùng rác không hợp lệ");
  }

  const expiredTasksResult = await pool.query(
    `
    SELECT id
    FROM tasks
    WHERE deleted_at IS NOT NULL
      AND deleted_at < NOW() - ($1::int * INTERVAL '1 day')
    ORDER BY deleted_at ASC
    `,
    [retentionDays]
  );

  const expiredDocumentsResult = await pool.query(
    `
    SELECT id
    FROM documents
    WHERE deleted_at IS NOT NULL
      AND deleted_at < NOW() - ($1::int * INTERVAL '1 day')
    ORDER BY deleted_at ASC
    `,
    [retentionDays]
  );

  let deletedTasks = 0;
  let deletedDocuments = 0;

  const errors = [];

  for (const task of expiredTasksResult.rows) {
    try {
      await exports.deleteTaskPermanent(task.id, user);
      deletedTasks++;
    } catch (err) {
      errors.push({
        type: "task",
        id: task.id,
        message: err.message,
      });
    }
  }

  for (const document of expiredDocumentsResult.rows) {
    try {
      await exports.deleteDocumentPermanent(document.id, user);
      deletedDocuments++;
    } catch (err) {
      errors.push({
        type: "document",
        id: document.id,
        message: err.message,
      });
    }
  }

  const cleanupResult = {
  retention_days: retentionDays,
  expired_tasks: expiredTasksResult.rows.length,
  expired_documents: expiredDocumentsResult.rows.length,
  deleted_tasks: deletedTasks,
  deleted_documents: deletedDocuments,
  errors,
};

if (deletedTasks > 0 || deletedDocuments > 0 || errors.length > 0) {
  await createAuditLog({
    userId: getUserId(user),
    entityType: "trash",
    entityId: null,
    action: "delete",
    description: "Dọn dữ liệu quá hạn trong thùng rác",
    oldValues: null,
    newValues: cleanupResult,
  });
}

return cleanupResult;
};

exports.autoCleanupExpiredTrash = async () => {
  const systemUser = {
    userId: null,
    id: null,
    permissions: ["trash:delete_permanent"],
  };

  return await exports.cleanupExpiredTrash(systemUser);
};