const User = require("../models/User");
const jwt = require("jsonwebtoken");

// generate JWT token
const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

// @desc Register Admin
// @route POST /auth/admin/register
exports.registerAdmin = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // check if admin already exists
    const existingAdmin = await User.findOne({ email, role: "admin" });
    if (existingAdmin) {
      return res.status(400).json({ message: "Admin already exists" });
    }

    // create new admin
    const admin = await User.create({ name, email, password, role: "admin" });

    res.status(201).json({
      _id: admin._id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      token: generateToken(admin._id, admin.role)
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Login Admin
// @route POST /auth/admin/login
exports.loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const admin = await User.findOne({ email, role: "admin" });
    if (!admin) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await admin.matchPassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    res.json({
      _id: admin._id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      token: generateToken(admin._id, admin.role)
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
