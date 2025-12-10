const express = require("express");
const cors = require("cors");
const app = express();
const port = 3000;

app.use(express.json());
app.use(cors({}));

const { MongoClient, ServerApiVersion } = require("mongodb");
const uri =
  "mongodb+srv://Local-Chef_Bazar:<db_password>@cluster0.h2qhrdv.mongodb.net/?appName=Cluster0";

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
    
    await client.connect();// Connect the client to the server	(optional starting in v4.7)
   
    const DB=client.db("Local-Chef_Bazar")
    await client.db("Local-Chef_Bazar").command({ ping: 1 }); // Send a ping to confirm a successful connection
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );


    const user_Collection=DB.collection("user");


    app.get("/users",async (req,res)=>{
        const result=await user_Collection.find().toArray();
        res.send(result);
    })



  } 
  finally {
   
    // await client.close(); // Ensures that the client will close when you finish/error
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("hello World");
});

app.listen(port, () => {
  console.log("Ami toke boltechi ,bissash koro server run kortechee!");
});
