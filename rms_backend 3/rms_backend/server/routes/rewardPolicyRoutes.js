const express = require("express");
const { 
  createOrUpdatePolicy, 
  getPolicy, 
  deletePolicy, 
  addOrUpdateCategoryRule,
  addOrUpdateThreshold,
  getPolicySummary,
  addOrUpdateTierRule,   // ✅ new controller
  getTierRules           // ✅ new controller
} = require("../controllers/rewardPolicyController");
const { protect, isAdmin } = require("../middleware/authMiddleware");

const router = express.Router();

// Admin routes for reward policies
router.post("/", protect, isAdmin, createOrUpdatePolicy);   // create/update policy
router.get("/", protect, isAdmin, getPolicy);               // get policy
router.delete("/", protect, isAdmin, deletePolicy);         // delete policy

// Category-specific rules
router.post("/policy/category", protect, isAdmin, addOrUpdateCategoryRule);

// Spend threshold bonuses
router.post("/threshold", protect, isAdmin, addOrUpdateThreshold);

// ✅ Tier rules
router.post("/tier", protect, isAdmin, addOrUpdateTierRule);  // create/update tier
router.get("/tier", protect, isAdmin, getTierRules);          // get all tier rules

// Policy summary
router.get("/summary", protect, isAdmin, getPolicySummary);

module.exports = router;
