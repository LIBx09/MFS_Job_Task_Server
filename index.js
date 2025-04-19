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
      console.log("38 user", user);
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
      console.log("token added before", token);
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
        console.log("88 user", user);

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
