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
    // app.post('/api/legal_profiles',  async (req, res)  => {
    //   //here we need to check if there is entry having lawyer_id inside the profilecollection
    //    console.log(req.body);
    //    console.log(req.body.lawyer_id);
    //    //return;
    //     const profile = req.body;
    //     const result = await profilecollection.insertOne(profile);
    //     res.send(result);

    // })

    app.post('/api/legal_profiles', async (req, res) => {

      const profile = req.body;

      const result = await profilecollection.updateOne(
        {
          lawyer_id: profile.lawyer_id
        },
        {
          $set: profile
        },
        {
          upsert: true
        }
      );
      //console.log(result);
      res.send(result);

    });
    //we need to catch query param
    // app.get('/api/laywer', async (req, res) => {
    //     const query = {};
    //     console.log(query);
    //     if(req.query.specializations){
    //       query.specializations = req.query.specializations;
    //     }
    //     const cursor = profilecollection.find();
    //     const result = await cursor.toArray();
    //     res.send(result);

    // })

    // app.get('/api/lawyer', async (req, res) => {

    //   const {
    //     search,
    //     specialization,
    //     sort
    //   } = req.query;

    //   const query = {
    //     public: true,
    //     status: 'active'
    //   };

    //   // Search

    //   if (search) {

    //     query.$or = [
    //       {
    //         name: {
    //           $regex: search,
    //           $options: 'i'
    //         }
    //       },
    //       {
    //         bio: {
    //           $regex: search,
    //           $options: 'i'
    //         }
    //       }
    //     ];
    //   }

    //   // Filter by specialization

    //   if (specialization) {

    //     query.specializations = specialization;

    //     // alternatively:
    //     // query.specializations = { $in: [specialization] };
    //   }

    //   let cursor = profilecollection.find(query);
    //   // Sorting
    //   if (sort === 'fee_asc') {
    //     cursor = cursor.sort({
    //       fee: 1
    //     });
    //   } else if (sort === 'fee_desc') {
    //     cursor = cursor.sort({
    //       fee: -1
    //     });
    //   } else if (sort === 'name_asc') {
    //     cursor = cursor.sort({
    //       name: 1
    //     });
    //   } else if (sort === 'name_desc') {
    //     cursor = cursor.sort({
    //       name: -1
    //     });
    //   }


    //   //pageinations
    //   if(req.query.page){
    //     const page = req.query.page;
    //     const perpage = 12;
    //     const skipItems = (page -1 ) * perpage;
    //     const total = await profilecollection.countDocuments(query);
    //     const cursor = profilecollection.find(query).skip(skipItems).limit(perpage);

    //     const lawyers = await cursor.toArray();
    //     res.send({total, lawyers});
    //   }
    //   const result = await cursor.toArray();

    //   res.send(result);

    // });
    app.get('/api/lawyer', async (req, res) => {

      const {
        search,
        specialization,
        sort,
        page
      } = req.query;

      const query = {
        public: true,
        status: 'active'
      };

      // Search
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { bio: { $regex: search, $options: 'i' } }
        ];
      }

      // Filter by specialization
      if (specialization) {
        query.specializations = specialization;
        // alternatively: query.specializations = { $in: [specialization] };
      }

      // Single cursor reused for both paths
      let cursor = profilecollection.find(query);

      // Sorting
      if (sort === 'fee_asc') {
        cursor = cursor.sort({ fee: 1 });
      } else if (sort === 'fee_desc') {
        cursor = cursor.sort({ fee: -1 });
      } else if (sort === 'name_asc') {
        cursor = cursor.sort({ name: 1 });
      } else if (sort === 'name_desc') {
        cursor = cursor.sort({ name: -1 });
      }

      // Pagination
      if (page) {
        const pageNum = parseInt(page, 10) || 1;
        const perPage = 12;
        const skipItems = (pageNum - 1) * perPage;

        const total = await profilecollection.countDocuments(query);

        // Reuse the sorted cursor; chain skip + limit
        cursor = cursor.skip(skipItems).limit(perPage);
        const lawyers = await cursor.toArray();
        return res.send({ total, lawyers });
      }

      const result = await cursor.toArray();
      res.send(result);
    });
    app.get('/api/get-legal-profile/:lawyer_id', async (req, res) => {
      const lawyer_id = req.params.lawyer_id;
      const query = { lawyer_id: lawyer_id };
      const result = await profilecollection.findOne(query);
      //const array = await result.toArray();
      res.send(result);
    })

    //veryfytoken of the request middleware




    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    //await client.close();
  }
}
run().catch(console.dir);
