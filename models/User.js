const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: String,
    mobile: String,
    email: String,
    pin: String,
    nid: String,
    balance: { type: Number, default: 40 },
    role: { type: String, enum: ["user", "agent", "admin"], default: "user" },
    isBlocked: { type: Boolean, default: false },
    transactions: { type: [Object], default: [] },
    requestAgent: { type: Boolean, default: false },
    userUid: String,
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

module.exports = User;
