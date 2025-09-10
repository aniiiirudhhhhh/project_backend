const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["admin", "customer"], default: "customer" },
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // ✅ link to Admin
  pointsBalance: { type: Number, default: 0 },

  // ✅ Tier system fields
  tier: {
    type: String,
    enum: ["Silver", "Gold", "Platinum"],
    default: null
  },
  lifetimeSpend: { type: Number, default: 0 }, // track all purchases

  history: [
    {
      type: { type: String, enum: ["earn", "redeem"], required: true },
      points: { type: Number, required: true },
      description: { type: String },
      createdAt: { type: Date, default: Date.now }
    }
  ],

  // ✅ Expiry-enabled points ledger
  pointsHistory: [
    {
      points: { type: Number, required: true },
      earnedAt: { type: Date, default: Date.now },
      expiresAt: { type: Date, required: true }, // <-- Expiry rule
      redeemed: { type: Boolean, default: false }
    }
  ]
});

// 🔒 Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// 🔑 Compare password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// 🎯 Helper method: update tier based on spend
userSchema.methods.updateTier = function () {
  if (this.lifetimeSpend >= 100000) this.tier = "Platinum";
  else if (this.lifetimeSpend >= 50000) this.tier = "Gold";
  else this.tier = "Silver";
  return this.tier;
};

// 🎯 Helper method: add points with expiry
userSchema.methods.addPoints = function (points, validityDays = 365) {
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + validityDays);

  this.pointsHistory.push({
    points,
    earnedAt: new Date(),
    expiresAt: expiryDate
  });

  this.pointsBalance += points;
};

module.exports = mongoose.model("User", userSchema);
