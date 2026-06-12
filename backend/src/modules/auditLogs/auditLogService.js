const pool = require("../../config/db");

exports.getAuditLogs = async (query = {}) => {
  const {
    action,
    entity_type,
    user_id,
    from,
    to,
    limit = 100,
  } = query;

  const values = [];
  let where = "WHERE 1 = 1";

  if (action && action !== "all") {
    values.push(action);
    where += ` AND al.action = $${values.length}`;
  }

  if (entity_type && entity_type !== "all") {
    values.push(entity_type);
    where += ` AND al.entity_type = $${values.length}`;
  }

  if (user_id && user_id !== "all") {
    values.push(Number(user_id));
    where += ` AND al.user_id = $${values.length}`;
  }

  if (from) {
    values.push(from);
    where += ` AND al.created_at >= $${values.length}`;
  }

  if (to) {
    values.push(to);
    where += ` AND al.created_at < ($${values.length}::date + INTERVAL '1 day')`;
  }

  values.push(Number(limit) || 100);

  const result = await pool.query(
    `
    SELECT
      al.id,
      al.user_id,
      COALESCE(u.full_name, u.username, 'Hệ thống') AS actor_name,

      al.entity_type,
      al.entity_id,
      al.action,

      al.description,
      al.old_values,
      al.new_values,

      al.ip_address,
      al.user_agent,
      al.created_at

    FROM audit_logs al

    LEFT JOIN users u
      ON al.user_id = u.id

    ${where}

    ORDER BY al.created_at DESC

    LIMIT $${values.length}
    `,
    values
  );

  return result.rows;
};