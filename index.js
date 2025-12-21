const express = require("express");
const cors = require("cors");
const app = express();
const port = 3000;

app.use(express.json());
app.use(cors({}));
require("dotenv").config();

const Stripe = require("stripe");
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const Admin = require("firebase-admin");
Admin.initializeApp({
  credential: Admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  }),
});

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
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
    const websiteReviewCollection = DB.collection("websiteReviews");

    const checkTokenAndRole = (requiredRole) => {
      return async (req, res, next) => {
        const authHeader = req.headers.authorization;
        if (!authHeader)
          return res.status(401).send({ message: "Unauthorized" });

        const token = authHeader.split(" ")[1]; // Bearer <token>

        try {
          const decoded = await Admin.auth().verifyIdToken(token);
          req.user = decoded;

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
      const newUser = { ...req.body, status: "active", chefId:""};
      const result = await user_Collection.insertOne(newUser);
      res.send(result);
    });

   app.put("/request/:_id/accept", async (req, res) => {
  try {
    const { _id } = req.params;

    
    const request = await DB.collection("request").findOne({
      _id: new ObjectId(_id),
    });
    if (!request) {
      return res.status(404).send({ message: "Request not found" });
    }

   
    await DB.collection("request").updateOne(
      { _id: new ObjectId(_id) },
      { $set: { requestStatus: "approved" } }
    );


    const user = await DB.collection("user").findOne({
      uid: request.uid,
    });
    if (!user) {
      return res.status(404).send({ message: "User not found" });
    }

   
    const updateData = {
      role: request.requestFor,
    };

  
    const hasChefId = Boolean(user.chefId?.toString().trim());
    if (request.requestFor === "chef" && !hasChefId) {
      updateData.chefId = `CHEF-${user._id.toString().slice(-6).toUpperCase()}`;
    }

 
    await DB.collection("user").updateOne(
      { uid: request.uid },
      { $set: updateData }
    );

    res.send({
      message: "Request approved and user role updated",
      updatedUser: updateData,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: "Server error" });
  }
});




    app.put("/request/:_id/reject", async (req, res) => {
      try {
        const { _id } = req.params;

        const request = await DB.collection("request").findOne({
          _id: new ObjectId(_id),
        });
        if (!request)
          return res.status(404).send({ message: "Request not found" });

        await DB.collection("request").updateOne(
          { _id: new ObjectId(_id) },
          { $set: { requestStatus: "rejected" } }
        );

        res.send({ message: "Request rejected" });
      } catch (err) {
        console.error(err);
        res.status(500).send({ message: "Server error" });
      }
    });

    app.get("/users/:uid", async (req, res) => {
      try {
        const { uid } = req.params;
        const user = await user_Collection.findOne({ uid });
        if (!user) return res.status(404).send({ message: "User not found" });
        res.send(user);
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Internal Server Error" });
      }
    });

    app.put("/users/:uid/role", async (req, res) => {
      const { uid } = req.params;
      const { role } = req.body;

      const result = await user_Collection.updateOne(
        { uid },
        { $set: { role } }
      );

      if (result.matchedCount === 0) {
        return res.status(404).send({ message: "User not found" });
      }

      res.send({ message: "Role updated successfully" });
    });



    app.put(
      "/users/:_id/status",
      checkTokenAndRole("admin"),
      async (req, res) => {
        const { _id } = req.params;
        const { status } = req.body;

        await user_Collection.updateOne(
          { _id: new ObjectId(_id) },
          { $set: { status } }
        );
      }
    );

    app.post("/meals", checkTokenAndRole("chef"), async (req, res) => {
      const meal = req.body;
      const result = await DB.collection("meals").insertOne(meal);
      res.send({ message: "Meal created successfully", id: result.insertedId });
    });

    app.get("/meals", async (req, res) => {
      const meals = await DB.collection("meals").find().toArray();
      res.send(meals);
    });

  app.get("/meals/:id", async (req, res) => {
  try {
    const id = req.params.id; 
    const meal = await DB.collection("meals").findOne({
      _id: new ObjectId(id),
    });

    if (!meal) return res.status(404).send({ message: "Meal not found" });
    res.send(meal);
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "Server error" });
  }
});


    app.put("/meals/:id", checkTokenAndRole("chef"), async (req, res) => {
      try {
        const mealId = req.params.id;
        const updateData = req.body;

        if (!mealId || !ObjectId.isValid(mealId))
          return res.status(400).json({ message: "Invalid meal ID" });

        const result = await DB.collection("meals").updateOne(
          { _id: new ObjectId(mealId) },
          { $set: updateData }
        );

        if (result.matchedCount === 0)
          return res.status(404).json({ message: "Meal not found" });

        res.json({ message: "Meal updated successfully" });
      } catch (error) {
        console.error("PUT /meals/:id error:", error);
        res.status(500).json({ message: "Server error" });
      }
    });

    app.delete("/meals/:id", checkTokenAndRole("chef"), async (req, res) => {
      try {
        const mealId = req.params.id;

        if (!mealId || !ObjectId.isValid(mealId))
          return res.status(400).json({ message: "Invalid meal ID" });

        const result = await DB.collection("meals").deleteOne({
          _id: new ObjectId(mealId),
        });

        if (result.deletedCount === 0)
          return res.status(404).json({ message: "Meal not found" });

        res.json({ message: "Meal deleted successfully" });
      } catch (error) {
        console.error("DELETE /meals/:id error:", error);
        res.status(500).json({ message: "Server error" });
      }
    });

    app.post("/orders", async (req, res) => {
      const order = {
        ...req.body,
        orderStatus: "pending",
        paymentStatus: "pending",
      };
      const result = await DB.collection("orders").insertOne(order);
      res.send({ message: "Order placed successfully", id: result.insertedId });
    });

    app.get("/orders", async (req, res) => {
      const orders = await DB.collection("orders").find().toArray();
      res.send(orders);
    });

    app.get("/orders/:email", checkTokenAndRole("user"), async (req, res) => {
      try {
        const { email } = req.params;
        const orders = await DB.collection("orders")
          .find({ userEmail: email })
          .sort({ _id: -1 })
          .toArray();
        res.send(orders);
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Internal Server Error" });
      }
    });

    app.put("/orders/:id", checkTokenAndRole("chef"), async (req, res) => {
      try {
        const { id } = req.params;
        const { orderStatus } = req.body;

        if (!id || !orderStatus) {
          return res
            .status(400)
            .send({ message: "Order ID and status required" });
        }

        const result = await DB.collection("orders").updateOne(
          { _id: new ObjectId(id) },
          { $set: { orderStatus } }
        );

        if (result.matchedCount === 0)
          return res.status(404).json({ message: "Order not found" });

        res.json({ message: `Order status updated to ${orderStatus}` });
      } catch (err) {
        console.error("PUT /orders/:id error:", err);
        res.status(500).json({ message: "Server error" });
      }
    });

    app.put("/orders/payment/:id", async (req, res) => {
      const { id } = req.params;

      await DB.collection("orders").updateOne(
        { _id: new ObjectId(id) },
        { $set: { paymentStatus: "paid" } }
      );

      res.send({ message: "Payment updated successfully" });
    });

   
    app.post("/reviews", async (req, res) => {
      const review = req.body;
      const result = await DB.collection("reviews").insertOne(review);
      res.send({ message: "Review added successfully", id: result.insertedId });
    });

    app.get("/reviews", async (req, res) => {
      const reviews = await DB.collection("reviews").find().toArray();
      res.send(reviews);
    });

    app.get("/reviews/:_id", async (req, res) => {
      const id = req.params._id;
      const result = await DB.collection("reviews").findOne({
        _id: new ObjectId(id),
      });
      res.send(result);
    });

    app.post("/websiteReview", async (req, res) => {
      const review = req.body;
      const result = await websiteReviewCollection.insertOne(review);
      res.send(result);
    });

    app.get("/websiteReview", async (req, res) => {
      const result = await websiteReviewCollection
        .find()
        .sort({ createdAt: 1 })
        .toArray();
      res.send(result);
    });

    app.post("/request", async (req, res) => {
      const request = {
        ...req.body,
        requestStatus: "pending",
        createdAt: new Date(),
      };
      const result = await DB.collection("request").insertOne(request);
      res.send({
        message: "Request inserted in the database successfully",
        id: result.insertedId,
      });
    });

    app.get("/request", async (req, res) => {
      const requests = await DB.collection("request").find().toArray();
      res.send(requests);
    });

    app.get("/request/:uid", async (req, res) => {
      try {
        const { uid } = req.params;
        const user = await DB.collection("request").findOne({ uid });
        if (!user) return res.status(404).send({ message: "User not found" });
        res.send(user);
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Internal Server Error" });
      }
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

    app.delete(
      "/favorites/:mealId",
      checkTokenAndRole("user"),
      async (req, res) => {
        try {
          const { mealId } = req.params;
          const userEmail = req.user?.email;

          if (!mealId)
            return res.status(400).send({ message: "Meal ID is required" });
          if (!userEmail)
            return res.status(400).send({ message: "User email not found" });

          const result = await DB.collection("favorites").deleteOne({
            mealId,
            userEmail,
          });

          if (result.deletedCount === 0)
            return res.status(404).send({ message: "Favorite not found" });

          res.json({ message: "Favorite deleted successfully" });
        } catch (err) {
          console.error("DELETE /favorites/:mealId error:", err);
          res.status(500).send({ message: "Server error" });
        }
      }
    );

    app.post(
      "/createPaymentSession",
      checkTokenAndRole("user"),
      async (req, res) => {
        const { orderId } = req.body;

        const order = await DB.collection("orders").findOne({
          _id: new ObjectId(orderId),
        });
        if (!order) return res.status(404).send({ message: "Order not found" });

        const session = await stripe.checkout.sessions.create({
          mode: "payment",
          payment_method_types: ["card"],
          line_items: [
            {
              price_data: {
                currency: "usd",
                product_data: { name: order.mealName },
                unit_amount: parseInt(order.price) * 100,
              },
              quantity: order.quantity || 1,
            },
          ],
          success_url: `${process.env.CLIENT_URL}/paymentSuccess?orderId=${orderId}`,
          cancel_url: `${process.env.CLIENT_URL}/MyOrders`,
        });

        res.send({ url: session.url });
      }
    );
  } finally {
    // await client.close(); // optional
  }
}

run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hi, from server");
});

app.listen(port, () => {
  console.log("Server is running on port", port);
});
