const express = require("express");
const { addTransaction, getHistory ,getCustomerHistory,getExpiringPoints} = require("../controllers/transactionController");
const { protect ,isAdmin} = require("../middleware/authMiddleware");
 
const router = express.Router();
 
// customer must be logged in
router.post("/", protect, addTransaction);
router.get("/history", protect, getHistory);
router.get("/customer/:customerId", protect, isAdmin, getCustomerHistory);
router.get("/points-expiry", protect, isAdmin, getExpiringPoints);

module.exports = router;
 