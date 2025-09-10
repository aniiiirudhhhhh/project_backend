const Transaction = require("../models/Transaction");
const RewardPolicy = require("../models/RewardPolicy");
const User = require("../models/User");

// Customer makes a purchase
exports.addTransaction = async (req, res) => {
  try {
    const customerId = req.user._id;
    const { amount, category, redeemPoints = 0, adminId } = req.body;

    if (!adminId) return res.status(400).json({ message: "Admin ID is required" });

    // Fetch admin's reward policy
    const policy = await RewardPolicy.findOne({ adminId });
    if (!policy) return res.status(404).json({ message: "No reward policy found for this business" });

    // Fetch customer
    const customer = await User.findById(customerId);
    if (!customer) return res.status(404).json({ message: "Customer not found" });

    // Points calculation parts
    let tierMultiplier = 1;
    if (customer.tier) {
      const tierRule = policy.tierRules.find(t => t.tierName === customer.tier);
      if (tierRule) tierMultiplier = tierRule.multiplier;
    }

    // Calculate base points (fallback)
    const basePoints = Math.floor((amount / 100) * policy.basePointsPer100);

    // Calculate category points if applicable
    let categoryPoints = 0;
    const categoryRule = policy.categoryRules.find(c => c.category === category);
    if (categoryRule) {
      categoryPoints = amount >= categoryRule.minAmount
        ? Math.floor((amount / 100) * categoryRule.pointsPer100) + (categoryRule.bonusPoints || 0)
        : basePoints;
    } else {
      categoryPoints = basePoints;
    }

    // Apply tier multiplier
    let earnedPoints = Math.floor(categoryPoints * tierMultiplier);

    // Calculate spend threshold bonus points
    let thresholdBonus = 0;
    if (policy.spendThresholds?.length) {
      policy.spendThresholds.forEach(threshold => {
        if (amount >= threshold.minAmount) thresholdBonus += threshold.bonusPoints;
      });
    }
    earnedPoints += thresholdBonus;

    // Add points with expiry
    if (earnedPoints > 0) {
      const expiryDays = policy.pointsExpiryDays || 365;
      if (typeof customer.addPoints === 'function') {
        customer.addPoints(earnedPoints, expiryDays);
      } else {
        const now = new Date();
        const expiresAt = new Date(now.getTime() + expiryDays * 24 * 60 * 60 * 1000);
        customer.pointsHistory.push({ points: earnedPoints, redeemed: false, expiresAt });
      }
    }

    // Redeem points logic (unchanged)
    const now = new Date();
    let availablePoints = customer.pointsHistory
      .filter(p => !p.redeemed && p.expiresAt > now)
      .reduce((sum, p) => sum + p.points, 0);

    if (redeemPoints > availablePoints) {
      return res.status(400).json({ message: "Not enough valid points to redeem" });
    }

    let remaining = redeemPoints;
    for (const entry of customer.pointsHistory) {
      if (remaining <= 0) break;
      if (entry.redeemed || entry.expiresAt <= now) continue;

      if (entry.points <= remaining) {
        remaining -= entry.points;
        entry.redeemed = true;
      } else {
        entry.points -= remaining;
        remaining = 0;
      }
    }

    // Recalculate balance
    customer.pointsBalance = customer.pointsHistory
      .filter(p => !p.redeemed && p.expiresAt > now)
      .reduce((sum, p) => sum + p.points, 0);

    // Auto-assign tier
    if (policy.tierRules?.length) {
      const sortedTiers = [...policy.tierRules].sort((a, b) => b.minPoints - a.minPoints);
      for (const tierRule of sortedTiers) {
        if (customer.pointsBalance >= tierRule.minPoints) {
          customer.tier = tierRule.tierName;
          break;
        }
      }
    }

    await customer.save();

    // Save transaction
    const transaction = await Transaction.create({
      adminId,
      customerId,
      amount,
      category,
      earnedPoints,
      redeemedPoints: redeemPoints,
      finalPoints: customer.pointsBalance,
    });

    // Respond with detailed points breakdown
    res.status(201).json({
      transaction,
      currentTier: customer.tier,
      currentBalance: customer.pointsBalance,
      pointsBreakdown: {
        basePoints,
        categoryPoints,
        tierMultiplier,
        thresholdBonus,
        totalEarnedPoints: earnedPoints,
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};
// Fetch transaction history for a specific customer (admin)
exports.getCustomerHistory = async (req, res) => {
  try {
    const { customerId } = req.params;
    const customer = await User.findById(customerId);
    if (!customer) return res.status(404).json({ message: "Customer not found" });

    const transactions = await Transaction.find({ customerId }).sort({ createdAt: -1 });
    res.json({
      customer: {
        name: customer.name,
        email: customer.email,
        tier: customer.tier,
        pointsBalance: customer.pointsBalance,
      },
      transactions,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

// Get expiring points for admin
exports.getExpiringPoints = async (req, res) => {
  try {
    const adminId = req.user._id;
    const customers = await User.find({ adminId, role: "customer" });

    const now = new Date();
    const warningDays = 30;

    const result = customers.map(c => {
      const expiringPoints = c.pointsHistory
        .filter(p => !p.redeemed && p.expiresAt > now && (p.expiresAt - now) / (1000*60*60*24) <= warningDays)
        .reduce((sum, p) => sum + p.points, 0);

      return { customerId: c._id, name: c.name, email: c.email, expiringPoints };
    }).filter(c => c.expiringPoints > 0);

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

// Get transaction history for logged-in customer
exports.getHistory = async (req, res) => {
  try {
    const customerId = req.user._id;
    const customer = await User.findById(customerId);
    if (!customer) return res.status(404).json({ message: "Customer not found" });

    const transactions = await Transaction.find({ customerId }).sort({ createdAt: -1 });
    res.json({
      currentBalance: customer.pointsBalance,
      tier: customer.tier,
      transactions,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};
