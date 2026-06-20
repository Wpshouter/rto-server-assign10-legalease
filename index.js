const express = require('express');
const cors = require('cors');
const app = express()
const port = 5000
const { MongoClient, ServerApiVersion } = require('mongodb');
const dotenv = require('dotenv');
dotenv.config();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})


const uri = process.env.MONGO_URI;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    //does actions here
    const database = client.db(process.env.DATABASE_NAME);
    const profilecollection = database.collection('lawyer_sp_profiles');
    app.post('/api/legal_profiles',  async (req, res)  => {
        const profile = req.body;
        const result = await profilecollection.insertOne(profile);
        res.send(result);
      
    })
    
    app.get('/api/laywer', async (req, res) => {
        const cursor = profilecollection.find();
        const result = await cursor.toArray();
        res.send(result);
    })

    app.get('/api/get-legal-profile/:lawyer_id', async (req, res) => {
        const lawyer_id = req.params.lawyer_id;
        const query = { lawyer_id: lawyer_id };
        const result = await profilecollection.findOne(query);
          //const array = await result.toArray();
        res.send(result);
    })
   
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    //await client.close();
  }
}
run().catch(console.dir);
