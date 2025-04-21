const mongoose = require("mongoose");

const UserTransactionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["cash-in", "cash-out", "send-money", "cash-request"],
  },
  amount: {
    type: Number,
  },
  formUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  toUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  createAt: {
    type: Date,
    default: Date.now,
  },
  fee: {
    type: Number,
    default: 0,
  },
});

const UserTransaction = mongoose.model(
  "UserTransaction",
  UserTransactionSchema
);

module.exports = UserTransaction;
