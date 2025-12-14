const express = require("express");
const cors = require("cors");
const app = express();
const port = 3000;

app.use(express.json());
app.use(cors({}));
require("dotenv").config();

const Admin = require("firebase-admin");
Admin.initializeApp({
  credential: Admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  }),
});

const { MongoClient, ServerApiVersion } = require("mongodb");
const uri = process.env.MONGODB_URI;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
  

    await client.connect();

    const DB = client.db("Local-Chef_Bazar");
    await DB.command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );

    const user_Collection = DB.collection("user");


  const checkTokenAndRole = (requiredRole) => {
      return async (req, res, next) => {
        const authHeader = req.headers.authorization;
        if (!authHeader)
          return res.status(401).send({ message: "Unauthorized" });

        const token = authHeader.split(" ")[1]; // Bearer <token>

        try {
          // Verify Firebase token
          const decoded = await Admin.auth().verifyIdToken(token);
          req.user = decoded; // save user info

          // If role check is required
          if (requiredRole) {
            const user = await DB.collection("user").findOne({
              uid: decoded.uid,
            });
            if (!user)
              return res.status(404).send({ message: "User not found" });

            if (user.role !== requiredRole)
              return res.status(403).send({ message: "Access denied" });
          }

          next();
        } catch (err) {
          res.status(401).send({ message: "Invalid token" });
        }
      };
    };



    app.get("/users", async (req, res) => {
      const result = await user_Collection.find().toArray();
      res.send(result);
    });

    app.post("/users", async (req, res) => {
      const newUser = req.body;
      const result = await user_Collection.insertOne(newUser);
      res.send(result);
      console.log(newUser);
    });

    app.post("/meals", checkTokenAndRole("chef"), async (req, res) => {
      const meal = req.body;
      const result = await DB.collection("meals").insertOne(meal);
      res.send({ message: "Meal created successfully", id: result.insertedId });
    });

    app.get("/meals", async (req, res) => {
      const meals = await DB.collection("meals").find().toArray();
      res.json(meals);
    });

    app.post("/orders", async (req, res) => {
      const order = req.body;
      const result = await DB.collection("orders").insertOne(order);
      res.send({ message: "Order placed successfully", id: result.insertedId });
    });

    app.get("/orders", async (req, res) => {
      const orders = await DB.collection("orders").find().toArray();
      res.send(orders);
    });

    app.post("/reviews", async (req, res) => {
      const review = req.body;
      const result = await DB.collection("reviews").insertOne(review);
      res.json({ message: "Review added successfully", id: result.insertedId });
    });

    app.get("/reviews", async (req, res) => {
      const reviews = await DB.collection("reviews").find().toArray();
      res.send(reviews);
    });

    app.post("/favorites", async (req, res) => {
      const favorite = req.body;
      const result = await DB.collection("favorites").insertOne(favorite);
      res.send({ message: "Added to favorites", id: result.insertedId });
    });

    app.get("/favorites", async (req, res) => {
      const favorites = await DB.collection("favorites").find().toArray();
      res.send(favorites);
    });

    app.get("/users/:uid", async (req, res) => {
      try {
        const { uid } = req.params;
        const user = await user_Collection.findOne({ uid: uid });
        if (!user) {
          return res.status(404).send({ message: "User not found" });
        } else {
          res.send(user);
        }
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Internal Server Error" });
      }
    });

    app.put("/users/:uid/role", async (req, res) => {
      const { uid } = req.params;
      const { role } = req.body;

      const result = await user_Collection.updateOne(
        { uid: uid },
        { $set: { role: role } }
      );

      if (result.matchedCount === 0) {
        return res.status(404).send({ message: "User not found" });
      }

      res.send({ message: "Role updated successfully" });
    });
  } finally {
    // await client.close();
  }
}

run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hi, from server");
});

app.listen(port, () => {
  console.log("Ami tomake boltechi bhai,bissash koro server run hoichee!");
});
