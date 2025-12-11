const express = require("express");
const cors = require("cors");
const app = express();
const port = 3000;

app.use(express.json());
app.use(cors({}));

const { MongoClient, ServerApiVersion } = require("mongodb");
const uri =
  "mongodb+srv://Local-Chef-Bazar:1V3HUL6HrRF92Zhx@cluster0.h2qhrdv.mongodb.net/?appName=Cluster0";

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect(); // Connect the client to the server	(optional starting in v4.7)

    const DB = client.db("Local-Chef_Bazar");
    await client.db("Local-Chef_Bazar").command({ ping: 1 }); // Send a ping to confirm a successful connection
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );



    const user_Collection = DB.collection("user");

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

    // Meals
    app.post("/meals", async (req, res) => {
      const meal = req.body;
      const result = await db.collection("meals").insertOne(meal);
      res.send({ message: "Meal created successfully", id: result.insertedId });
    });

    app.get("/meals", async (req, res) => {
      const meals = await db.collection("meals").find().toArray();
      res.json(meals);
    });



    // Orders
    app.post("/orders", async (req, res) => {
      const order = req.body;
      const result = await db.collection("orders").insertOne(order);
      res.send({ message: "Order placed successfully", id: result.insertedId });
    });

    app.get("/orders", async (req, res) => {
      const orders = await db.collection("orders").find().toArray();
      res.send(orders);
    });

    // Reviews
    app.post("/reviews", async (req, res) => {
      const review = req.body;
      const result = await db.collection("reviews").insertOne(review);
      res.json({ message: "Review added successfully", id: result.insertedId });
    });

    app.get("/reviews", async (req, res) => {
      const reviews = await db.collection("reviews").find().toArray();
      res.send(reviews);
    });

    // Favorites
    app.post("/favorites", async (req, res) => {
      const favorite = req.body;
      const result = await db.collection("favorites").insertOne(favorite);
      res.send({ message: "Added to favorites", id: result.insertedId });
    });

    app.get("/favorites", async (req, res) => {
      const favorites = await db.collection("favorites").find().toArray();
      res.send(favorites);
    });



  //  app.get("/users/:uid", async (req, res) => {
  // const { uid } = req.params;
  
  app.get("/users/:uid",(req,res)=>{
    const {uid}=req.params;
     
    const user = UserCollection.findOne({ uid: uid });
    if (!user){
      return res.status(404).send("User not found");
    }
    else{
      return res.send(user);
    }
  })







  } finally {
    // await client.close(); // Ensures that the client will close when you finish/error
  }
}



run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hi, from server");
});

app.listen(port, () => {
  console.log("Ami toke boltechi ,bissash koro server run kortechee!");
});
