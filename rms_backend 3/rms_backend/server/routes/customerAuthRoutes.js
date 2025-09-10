const express = require("express");
const { registerCustomer, loginCustomer } = require("../controllers/customerAuthController");

const router = express.Router();

router.post("/customer/register", registerCustomer);
router.post("/customer/login", loginCustomer);

module.exports = router;
