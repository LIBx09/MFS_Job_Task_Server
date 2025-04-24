// models/WithdrawalRequest.js
const mongoose = require("mongoose");

const withdrawalRequestSchema = new mongoose.Schema({
  agentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  amount: { type: Number, required: true }, // Amount requested by the agent
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"], // Status of the request
    default: "pending",
  },
  createdAt: { type: Date, default: Date.now }, // Timestamp
});

module.exports = mongoose.model("WithdrawalRequest", withdrawalRequestSchema);
