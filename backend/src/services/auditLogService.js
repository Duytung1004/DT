const pool = require("../config/db");

exports.createAuditLog = async ({
  userId = null,
  entityType,
  entityId = null,
  action,
  description = null,
  oldValues = null,
  newValues = null,
  ipAddress = null,
  userAgent = null,
}) => {
  try {
    const result = await pool.query(
      `
      INSERT INTO audit_logs (
        entity_type,
        entity_id,
        action,
        old_values,
        new_values,
        created_at,
        user_id,
        description,
        ip_address,
        user_agent
      )
      VALUES ($1,$2,$3,$4,$5,NOW(),$6,$7,$8,$9)
      RETURNING *
      `,
      [
        entityType,
        entityId,
        action,
        oldValues ? JSON.stringify(oldValues) : null,
        newValues ? JSON.stringify(newValues) : null,
        userId,
        description,
        ipAddress,
        userAgent,
      ]
    );

    return result.rows[0];
  } catch (err) {
    console.log("CREATE AUDIT LOG ERROR:", err.message);
    return null;
  }
};