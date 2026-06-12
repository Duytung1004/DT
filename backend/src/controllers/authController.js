const pool = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

exports.login = async (req, res) => {
  const { username, password } = req.body;

  try {
    const result = await pool.query(
      "SELECT * FROM users WHERE username = $1",
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json("User not found");
    }

    const user = result.rows[0];

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json("Wrong password");
    }

    const token = jwt.sign(
      { id: user.id, role: user.role_id },
      "secretkey",
      { expiresIn: "1d" }
    );

    const { password: _, ...userData } = user;

    res.json({
    message: "Login success",
    token,
    user: userData,
    });
    } catch (err) {
        res.status(500).json(err);
    }
    };