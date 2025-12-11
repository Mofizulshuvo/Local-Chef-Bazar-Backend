const express = require("express");
const cors = require("cors");
const app = express();
const port = 3000;

app.use(express.json());
app.use(cors());

const { MongoClient, ServerApiVersion } = require("mongodb");
const uri =
  "mongodb+srv://Local-Chef-Bazar:1V3HUL6HrRF92Zhx@cluster0.h2qhrdv.mongodb.net/?appName=Cluster0";

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
    console.log("Pinged your deployment. You successfully connected to MongoDB!");

    const user_Collection = DB.collection("user");

    // Get all users
    app.get("/users", async (req, res) => {
      const result = await user_Collection.find().toArray();
      res.send(result);
    });

    // Add new user
    app.post("/users", async (req, res) => {
      try {
        const newUser = req.body;

        // Check if user already exists
        const existing = await user_Collection.findOne({ uid: newUser.uid });
        if (existing) {
          return res.status(400).send({ message: "User already exists" });
        }

        const result = await user_Collection.insertOne(newUser);
        res.send(result);
        console.log("Inserted user:", newUser);
      } catch (err) {
        console.error(err);
        res.status(500).send({ message: "Error adding user" });
      }
    });

    // Get single user by UID
    app.get("/users/:uid", async (req, res) => {
      try {
        const { uid } = req.params;
        console.log("Fetching user with UID:", uid);
        const user = await user_Collection.findOne({ uid: uid });
        if (!user) {
          console.log("User not found for UID:", uid);
          return res.status(404).send({ message: "User not found" });
        }
        res.send(user);
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Internal Server Error" });
      }
    });

    // Update user role
    app.put("/users/:uid/role", async (req, res) => {
      try {
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
      } catch (err) {
        console.error(err);
        res.status(500).send({ message: "Error updating role" });
      }
    });

    // Other collections (meals, orders, reviews, favorites) - no changes
    app.post("/meals", async (req, res) => {
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

  } finally {
    // await client.close();
  }
}

run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hi, from server");
});

app.listen(port, () => {
  console.log("Server running on port", port);
});
