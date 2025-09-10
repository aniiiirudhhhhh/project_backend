const User = require("../models/User");
const jwt = require("jsonwebtoken");

const generateToken = (id, role, adminId) => {
  return jwt.sign({ id, role, adminId }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

// @desc Register Customer
// @route POST /auth/customer/register
exports.registerCustomer = async (req, res) => {
  try {
    const { name, email, password, adminId } = req.body;

    // Check if admin exists
    const admin = await User.findOne({ _id: adminId, role: "admin" });
    if (!admin) {
      return res.status(400).json({ message: "Invalid admin ID" });
    }

    // Check if customer already exists under same admin
    const existingCustomer = await User.findOne({ email, role: "customer", adminId });
    if (existingCustomer) {
      return res.status(400).json({ message: "Customer already exists" });
    }

    // Create customer
    const customer = await User.create({
      name,
      email,
      password,
      role: "customer",
      adminId
    });

    res.status(201).json({
      _id: customer._id,
      name: customer.name,
      email: customer.email,
      role: customer.role,
      adminId: customer.adminId,
      token: generateToken(customer._id, customer.role, customer.adminId)
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Login Customer
// @route POST /auth/customer/login
exports.loginCustomer = async (req, res) => {
  try {
    const { email, password, adminId } = req.body;

    // Find customer under given admin
    const customer = await User.findOne({ email, role: "customer"});
    if (!customer) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await customer.matchPassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    res.json({
      _id: customer._id,
      name: customer.name,
      email: customer.email,
      role: customer.role,
      adminId: customer.adminId,
      token: generateToken(customer._id, customer.role, customer.adminId)
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
