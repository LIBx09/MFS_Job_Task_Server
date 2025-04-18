const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      minlength: 2,
      trim: true,
    },
    mobile: {
      type: String,
      unique: true,
      required: [true, "Mobile number is required"],
      match: [/^01[3-9]\d{8}$/, "Invalid Bangladeshi mobile number"],
    },
    email: {
      type: String,
      unique: true,
      required: [true, "Email is required"],
      lowercase: true,
      match: [/\S+@\S+\.\S+/, "Invalid email format"],
    },
    pin: {
      type: String,
      required: [true, "PIN is required"],
      minlength: 4,
    },
    nid: {
      type: String,
      unique: true,
      required: [true, "NID is required"],
      minlength: 6,
    },
    balance: {
      type: Number,
      default: 40,
      min: 0,
    },
    role: {
      type: String,
      enum: ["user", "agent"],
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
    transactions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Transaction",
      },
    ],
    currentToken: String,
  },
  { timestamps: true }
);

const User = mongoose.model("users", userSchema);

module.exports = User;
