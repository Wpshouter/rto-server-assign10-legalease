const express = require('express');
const cors = require('cors');
const app = express()
const port = 5000
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
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
    const hiringHistoryCollection = database.collection('hiring_history');
    const hiringRequestCollection = database.collection('hiring_request');
    const userCollection = database.collection('user');

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

    app.get('/api/user/:userId', async (req, res) => {
      try {
        const { userId } = req.params;

        const user = await userCollection.findOne({
          _id: new ObjectId(userId)
        });

        if (!user) {
          return res.status(404).send({
            message: 'User not found'
          });
        }

        res.send({
          name: user.name,
          email: user.email,
        });

      } catch (error) {
        console.error(error);

        res.status(500).send({
          message: 'Server Error'
        });
      }
    });
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
    app.get('/api/lawyer/:listingId', async (req, res) => {
      const listingId = req.params.listingId;
      const query = { _id: new ObjectId(listingId) };
      const result = await profilecollection.findOne(query);
      console.log(result);
      //const array = await result.toArray();
      res.send(result);
    })

    app.get('/api/get-legal-profile/:lawyer_id', async (req, res) => {
      const lawyer_id = req.params.lawyer_id;
      const query = { lawyer_id: lawyer_id };
      const result = await profilecollection.findOne(query);
      //console.log(result);
      //const array = await result.toArray();
      res.send(result);
    })

    app.get('/api/hiring-request/user/:user_id', async (req, res) => {
      try {

        const userId = req.params.user_id;

        const requests = await hiringRequestCollection
          .find({ requested_by: userId })
          .toArray();

        if (!requests.length) {
          return res.send([]);
        }

        // Collect lawyer ids once
        const lawyerIds = requests.map(
          (item) => item.lawyerId
        );
        console.log("lawyerIds", lawyerIds);

        // Fetch payment history in one query
        const histories = await hiringHistoryCollection
          .find({
            hired_by: userId,
            lawyerId: { $in: lawyerIds }
          })
          .toArray();

        const profileIds = lawyerIds.map(
          id => new ObjectId(id)
        );

        const profiles = await profilecollection
          .find({
            _id: { $in: profileIds }
          })
          .toArray();
        console.log("profiles found", profiles);
        // Payment lookup
        const historyMap = new Map();

        histories.forEach((history) => {
          historyMap.set(
            history.lawyerId,
            history
          );
        });

        // Profile lookup
        const profileMap = new Map();

        profiles.forEach((profile) => {
          profileMap.set(
            profile._id.toString(),
            profile
          );
        });
        console.log("profiles found", profileMap);
        // Merge everything
        const result = requests.map((request) => ({
          ...request,

          payment:
            historyMap.get(request.lawyerId) || null,

          profile:
            profileMap.get(request.lawyerId) || null,
        }));

        res.send(result);

      } catch (error) {

        console.error(error);

        res.status(500).send({
          message: "Something went wrong",
        });

      }
    });
    app.get('/api/hiring-request/lawyer/:lawyer_id', async (req, res) => {

      const lawyer_id = req.params.lawyer_id;
      const querys = {
        lawyer_id: lawyer_id
      };

      const lawyerUserIdProfile =
        await profilecollection.findOne(querys);

      console.log(lawyerUserIdProfile);

      const query = {
        lawyerId:
          lawyerUserIdProfile._id.toString()
      };

      console.log(
        'laywer id from /api/hiring-request/lawyer/',
        lawyer_id
      );

      const result =
        await hiringRequestCollection
          .find(query)
          .toArray();

      if (!result.length) {
        return res.send([]);
      }

      // Get all user ids
      const userIds = result.map(
        item => new ObjectId(
          item.requested_by
        )
      );

      // Fetch users in one query
      const users =
        await userCollection
          .find({
            _id: {
              $in: userIds
            }
          })
          .toArray();

      // Create lookup map
      const userMap = new Map();

      users.forEach(user => {
        userMap.set(
          user._id.toString(),
          {
            _id: user._id.toString(),
            name: user.name,
            email: user.email,
          }
        );
      });
      // Get all request ids
      const requestIds = result.map(item =>
        item._id.toString()
      );

      // Fetch hiring history records
      const histories =
        await hiringHistoryCollection
          .find({
            reqID: {
              $in: requestIds
            }
          })
          .toArray();

      // Create lookup map
      const historyMap = new Map();

      histories.forEach(history => {
        historyMap.set(
          history.reqID,
          history
        );
      });
      // Attach user object
      const response = result.map(
        request => ({
          ...request,
          user:
            userMap.get(
              request.requested_by
            ) || null,

          hiringHistory:
            historyMap.get(
              request._id.toString()
            ) || null,

          payment: !!historyMap.get(
            request._id.toString()
          )
        })
      );

      res.send(response);

    });
    app.post("/api/lawyer/approve-request", async (req, res) => {
      try {
        const { requestId, status, } = req.body;
        if (!requestId) {
          return res.status(400).send({
            success: false,
            message: "Request ID is required",
          });
        }
        const result = await hiringRequestCollection.updateOne(
          {
            _id: new ObjectId(requestId
            ),
          },
          {
            $set: {
              status:
                status || "approved",
              updated_at:
                new Date(),
            },
          }
        );
        if (
          result.matchedCount === 0
        ) {
          return res.status(404).send({
            success: false,
            message:
              "Request not found",
          });
        }
        res.send({
          success: true,
          message:
            "Request approved successfully",
        });
      } catch (error) {
        console.error(error);
        res.status(500).send({
          success: false,
          message:
            "Something went wrong",
        });
      }
    });
    app.post('/api/hiring-request', async (req, res) => {
      const hiringRequest = req.body;
      const exisitng_same_user_req = await hiringRequestCollection.findOne({
        lawyerId: hiringRequest.lawyerId,
        requested_by: hiringRequest.requested_by,
        status: 'pending'
      })
      if (exisitng_same_user_req) {
        return res.send({
          success: true,
          message: 'Your already have a pending request to this lawyer.',
          inserted: false
        });
      }
      const result =
        await hiringRequestCollection.insertOne(
          hiringRequest
        );

      res.send({
        success: true,
        inserted: true,
        insertedId: result.insertedId
      });


    })
    app.post('/api/hiring-history', async (req, res) => {
      try {
        const hiringHistory = req.body;
        if (!hiringHistory?.payment_intent_id) {
          return res.status(400).send({
            success: false,
            message: 'payment_intent_id is required'
          });
        }
        const existingPayment =
          await hiringHistoryCollection.findOne({
            payment_intent_id:
              hiringHistory.payment_intent_id
          });

        if (existingPayment) {
          return res.send({
            success: true,
            message: 'Payment already recorded',
            inserted: false,
            data: existingPayment
          });
        }

        const result =
          await hiringHistoryCollection.insertOne(
            hiringHistory
          );

        res.send({
          success: true,
          inserted: true,
          insertedId: result.insertedId
        });

      } catch (error) {

        console.error(error);

        res.status(500).send({
          success: false,
          message: error.message
        });

      }

    });

    //get payments
    app.get( '/api/payments/lawyer/:lawyerId', async (req, res) => {
        try {
          const { lawyerId } = req.params;
          const payments =
            await hiringHistoryCollection
              .find({ lawyerId })
              .sort({ created_at: -1 })
              .toArray();

          if (!payments.length) {
            return res.send([]);
          }
          const reqIds = payments.map(
            item => new ObjectId(item.reqID)
          );
          const requests =
            await hiringRequestCollection
              .find({
                _id: { $in: reqIds }
              }).toArray();
          const requestMap = new Map();
          requests.forEach(request => {
            requestMap.set(
              request._id.toString(),
              request
            );
          });
         
          // Users
      const userIds = payments.map(
        item =>
          new ObjectId(
            item.hired_by
          )
      );

      const users =
        await userCollection
          .find({
            _id: {
              $in: userIds
            }
          })
          .toArray();

      const userMap = new Map();

      users.forEach(user => {
        userMap.set(
          user._id.toString(),
          {
            _id:
              user._id.toString(),
            name: user.name,
            email: user.email,
          }
        );
      });

      // Final Response
      const response = payments.map(
        payment => ({
          ...payment,

          request:
            requestMap.get(
              payment.reqID
            ) || null,

          user:
            userMap.get(
              payment.hired_by
            ) || null,
        })
      );

      res.send(response);
      
        } catch (error) {
          console.error(error);
          res.status(500).send({
            message: 'Server Error'
          });
        }
      }
    );
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
