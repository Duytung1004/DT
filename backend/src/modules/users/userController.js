const userService = require("./userService");
const pool = require("../../config/db");
// CREATE
exports.createUser = async (req, res) => {
  try {
    const user = await userService.createUser(req.body);
    res.json(user);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// GET ALL
exports.getUsers = async (req, res) => {
  try {
    const users = await userService.getUsers();
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// UPDATE
exports.updateUser = async (req, res) => {
  try {
    const user = await userService.updateUser(
      req.params.id,
      req.body
    );
    res.json(user);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// DELETE
exports.deleteUser = async (req, res) => {
  try {
    await userService.deleteUser(req.params.id);
    res.json({ message: "Đã xoá user" });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// RESET PASSWORD
exports.resetPassword = async (req, res) => {
  try {
    const targetUser = await userService.resetPassword(
      req.params.id,
      req.body.password
    );

    await pool.query(
      `
      INSERT INTO security_logs
      (
        user_id,
        username,
        action,
        status,
        ip_address,
        user_agent,
        message
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      `,
      [
        targetUser.id,
        targetUser.username,
        "reset_password",
        "success",
        req.ip,
        req.headers["user-agent"] || null,
        `Admin ID ${req.user.userId} đã reset mật khẩu cho tài khoản ${targetUser.username}`,
      ]
    );

    res.json({
      message: "Đã reset password",
      user: targetUser,
    });
  } catch (err) {
    res.status(400).json({
      message: err.message,
    });
  }
};
exports.getUsersByUnit =
async (req, res) => {

  try {

    const result =
      await userService.getUsersByUnit(
        req.params.unitId
      );

    res.json(result);

  } catch (err) {

    console.log(
      "GET USERS BY UNIT ERROR:",
      err
    );

    res.status(500).json({
      message: err.message
    });

  }

};
// UNLOCK USER
exports.unlockUser = async (req, res) => {
  try {
    const user = await userService.unlockUser(
      req.params.id
    );

    res.json({
      message: "Đã mở khóa tài khoản",
      user,
    });
  } catch (err) {
    res.status(400).json({
      message: err.message,
    });
  }
};