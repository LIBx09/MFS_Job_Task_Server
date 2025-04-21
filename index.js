const express = require("express");
const app = express();
require("dotenv").config();
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
// const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cors = require("cors");
const port = process.env.PORT || 5000;
//models
const User = require("./models/User");
const UserTransaction = require("./models/UserTransactions");
const Transactions = require("./models/Transactions");

app.use(express.json());
app.use(cookieParser());
app.use(cors({ origin: "http://localhost:5173", credentials: true }));

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.iciu9bb.mongodb.net/MFS?appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
// const client = new MongoClient(uri, {});
mongoose
  .connect(uri, {
    serverApi: {
      version: "1",
      strict: true,
      deprecationErrors: true,
    },
  })
  .then(() => console.log("connected to MongoDB via Mongoose"))
  .catch((err) => console.log("MongoDB connection error", err));

async function run() {
  try {
    // const usersCollection = client.db("MFS").collection("users");

    app.post("/jwt", async (req, res) => {
      const user = req.body;
      // console.log("38 user", user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "5h",
      });
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: false,
        })
        .send({ success: true });
    });

    const verifyToken = (req, res, next) => {
      const token = req.cookies?.token;
      // console.log("52 token added before", token);
      if (!token) return res.status(401).send("Access Denied");
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) return res.status(403).send("Invalid Token");
        req.user = decoded;
        next();
      });
    };

    app.post("/logout", (req, res) => {
      res
        .clearCookie("token", {
          httpOnly: true,
          secure: false,
        })
        .send({ success: true });
    });

    //Users Related APIs

    app.get("/users", verifyToken, async (req, res) => {
      const users = await User.find();
      res.send(users);
    });

    app.post("/users", async (req, res) => {
      const user = new User(req.body);
      const result = await user.save();
      res.send(result);
    });

    //Get Agents request
    app.get("/users/agent-requests", async (req, res) => {
      try {
        const agentRequests = await User.find({
          role: "user",
          requestAgent: true,
        });
        res.send(agentRequests);
      } catch (error) {
        res
          .status(500)
          .send({ message: "Error fetching agent requests", error });
      }
    });

    // checks roles
    app.get("/users/roles/:email", async (req, res) => {
      try {
        const email = req.params.email;
        const user = await User.findOne({ email });
        // console.log("103 user", user);

        if (!user) {
          return res.status(404).send({ message: "User Not Found" });
        }

        res.send({
          role: user.role, // e.g., "user", "agent", or "admin"
          isAdmin: user.role === "admin",
          isAgent: user.role === "agent",
        });
      } catch (error) {
        res.status(500).send({ message: "Server error", error });
      }
    });

    app.post("/transactions/UCashIn", async (req, res) => {
      const { agentId, agentPin, amount, userPhn, userId } = req.body;
      // console.log(" 123 UCashIn", req.body);

      if (!agentId || !agentPin || !userPhn || !amount) {
        return res.status(400).send({ message: "All fields are required" });
      }

      try {
        // Find the agent by ID and pin
        const agent = await User.findById(agentId);
        if (!agent || agent.role !== "agent") {
          return res.status(404).send({ message: "Agent not found" });
        }
        if (agent.pin !== agentPin) {
          return res.status(401).json({ message: "Invalid agent pin" });
        }
        const user = await User.findOne({ mobile: userPhn });
        if (!user) {
          return res.status(404).send({ message: "User not found" });
        }
        if (agent.balance < amount) {
          return res.status(400).send({ message: "Insufficient balance" });
        }

        const amountNum = Number(amount); // Always convert amount to number

        if (agent.balance < amountNum) {
          return res.status(400).send({ message: "Insufficient balance" });
        }

        agent.balance -= amount;
        user.balance += amountNum;

        const transaction = new Transactions({
          type: "cash-in",
          amount,
          formUser: agentId,
          toUser: user._id,
          fee: 0,
        });

        await agent.save();
        await user.save();
        await transaction.save();
        res.status(200).send({ message: "Cash-in successful" });
      } catch (error) {
        console.error("Error in UCashIn:", error);
        return res.status(500).send({ message: "Internal Server Error" });
      }
    });

    //cash out process

    app.post("/transactions/UCashOut", async (req, res) => {
      const { userId, userPin, agentPhn, amount } = req.body;
      console.log("UCashOut", req.body);

      if (!userId || !userPin || !agentPhn || !amount) {
        return res.status(400).send({ message: "All fields are required" });
      }
      try {
        const user = await User.findById(userId);
        if (!user || user.role !== "user") {
          return res.status(404).send({ message: "User not found" });
        }

        if (user.pin !== userPin) {
          return res.status(401).send({ message: "Invalid user pin" });
        }

        const agent = await User.findOne({ mobile: agentPhn });
        if (!agent || agent.role !== "agent") {
          return res.status(404).send({ message: "Agent not found" });
        }

        const amountNum = Number(amount);
        const fee = amountNum * 0.015;
        const totalDeduct = amountNum + fee;
        if (user.balance < totalDeduct) {
          return res.status(404).send({ message: "Insufficient balance" });
        }

        user.balance -= totalDeduct;

        const agentFee = amountNum * 0.01;
        agent.balance += amountNum + agentFee;

        const adminFee = amountNum * 0.005;
        const admin = await User.findOne({ role: "admin" });

        if (admin) {
          admin.balance += adminFee;
          await admin.save();
        }

        await user.save();
        await agent.save();

        const transaction = new Transactions({
          type: "cash-out",
          amount: amountNum,
          formUser: userId,
          toUser: agent._id,
          fee: fee,
        });

        await transaction.save();

        res.status(200).send({
          message: "Cash-out successful",
          trxId: transaction._id,
        });
      } catch (error) {
        console.error("Error in UCashOut:", error);
        res.status(500).send({ message: "Internal Server Error" });
      }
    });

    //send_Money process

    app.post("/transactions/sendMoney", async (req, res) => {
      const { senderPhone, receiverPhone, amount, senderPin } = req.body;

      if (!senderPhone || !receiverPhone || !amount || !senderPin) {
        return res.status(400).send({ message: "All fields are required" });
      }

      if (amount < 50) {
        return res.status(400).send({ message: "Minimum amount is 50 Taka" });
      }

      try {
        const sender = await User.findOne({ mobile: senderPhone });
        const receiver = await User.findOne({ mobile: receiverPhone });

        if (!sender || !receiver) {
          return res
            .status(404)
            .send({ message: "Sender or receiver not found" });
        }

        if (sender.pin !== senderPin) {
          return res.status(401).send({ message: "Invalid PIN" });
        }

        let fee = amount > 100 ? 5 : 0;
        const totalDeduction = Number(amount) + fee;

        if (sender.balance < totalDeduction) {
          return res.status(400).send({ message: "Insufficient balance" });
        }

        // Update balances
        sender.balance -= totalDeduction;
        receiver.balance += Number(amount);

        // Save the transaction
        const transaction = new Transactions({
          type: "send-money",
          amount,
          formUser: sender._id,
          toUser: receiver._id,
          fee,
        });

        await sender.save();
        await receiver.save();
        await transaction.save();

        res.status(200).send({
          message: "Send money successful",
          trxId: transaction._id,
        });
      } catch (err) {
        console.error("Send Money Error:", err);
        res.status(500).send({ message: "Server error" });
      }
    });

    //get pending agent requests
    app.get("/admin/pending-agents", async (req, res) => {
      try {
        const pendingAgents = await User.find({ requestAgent: true });
        res.status(200).json(pendingAgents);
      } catch (err) {
        res.status(500).json({ message: "Failed to fetch agent requests" });
      }
    });

    // pending agent request process
    app.patch("/admin/handle-agent/:id", async (req, res) => {
      const userId = req.params.id;
      const { action } = req.body;

      try {
        if (action === "accept") {
          await User.findByIdAndUpdate(userId, {
            role: "agent",
            balance: 100000,
            requestAgent: false,
          });
          return res
            .status(200)
            .json({ message: "Agent accepted and balance updated" });
        } else if (action === "reject") {
          await User.findByIdAndUpdate(userId, {
            role: "user",
            requestAgent: false,
          });
          return res.status(200).json({ message: "Agent request rejected" });
        } else {
          return res.status(400).json({ message: "Invalid action" });
        }
      } catch (err) {
        res.status(500).json({ message: "Failed to process agent request" });
      }
    });

    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log(
    //   "Pinged your deployment. You successfully connected to MongoDB!"
    // );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("MFS IS RUNNING VIA MONGOOSE");
});

app.listen(port, () => {
  console.log(`MFS server is running on port ${port}`);
});
