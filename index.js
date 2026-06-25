const express = require('express');
const cors = require('cors');
const app = express()
const port = 5000
const { createRemoteJWKSet, jwtVerify } = require("jose-cjs");
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const dotenv = require('dotenv');
dotenv.config();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Hello World! server running')
})

app.listen(port, () => {
  //console.log(`Example app listening on port ${port}`)
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
const myLogger = function (req, res, next) {
  console.log('LOGGED', req.headers);
  next();
};
const JWKS = createRemoteJWKSet(
  new URL(`${process.env.NEXT_PUBLIC_FROTNEND_URL}/api/auth/jwks`),
);
const verifyToken = async (req, res, next) => {
  const authHeaderval = req.headers?.authorization;
  if(!authHeaderval){
    return res.status(401).send({message: 'unauthorized access'})
  }
  const token = authHeaderval.split(" ")[1];
  if(!token){
    return res.status(401).send({message: 'unauthorized access'})
  }
    try {
    const { payload } = await jwtVerify(token, JWKS);
   
    req.user = payload;
    next();
  } catch (error) {
    return res.status(401).send({message: 'unauthorized access'})
  }
  //next();
}
const verifyAdmin = async(req,res,next) => {
  if(req.user?.role !== 'admin'){
    return res.status(403).send({message : 'forbidden access'})
  }
  next();
}
const verifyClient = async(req,res,next) => {
  console.log('______________YOOOHOOO_______________________');
  if(req.user?.role !== 'client'){
    return res.status(403).send({message : 'forbidden access'})
  }
  next();
}
const verifyLawyer = async(req,res,next) => {
  if(req.user?.role !== 'lawyer'){
    return res.status(403).send({message : 'forbidden access'})
  }
  next();
}
// client.connect(() => {
//   console.log('connecting to mongodb');
// }).catch(console.dir);
async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    //await client.connect();
    //does actions here
    const database = client.db(process.env.DATABASE_NAME);
    const profilecollection = database.collection('lawyer_sp_profiles');
    const hiringHistoryCollection = database.collection('hiring_history');
    const hiringRequestCollection = database.collection('hiring_request');
    const userCollection = database.collection('user');
    const commentCollection = database.collection('comments');

    app.post('/api/legal_profiles', verifyToken, verifyLawyer, async (req, res) => {

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
      ////console.log(result);
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
    ///api/lawyer/6a365bc060298275cc165ca9
    app.get('/api/lawyer/:listingId', async (req, res) => {
      const listingId = req.params.listingId;
      const query = { _id: new ObjectId(listingId) };
      const result = await profilecollection.findOne(query);
      //console.log(result);
      //const array = await result.toArray();
      res.send(result);
    })

    app.get('/api/get-legal-profile/:lawyer_id', async (req, res) => {
      const lawyer_id = req.params.lawyer_id;
      const query = { lawyer_id: lawyer_id };
      const result = await profilecollection.findOne(query);
      ////console.log(result);
      //const array = await result.toArray();
      res.send(result || []);
    })

    // app.get('/api/hiring-request/user/:user_id', async (req, res) => {
    //   try {

    //     const userId = req.params.user_id;

    //     const requests = await hiringRequestCollection
    //       .find({ requested_by: userId })
    //       .toArray();

    //     if (!requests.length) {
    //       return res.send([]);
    //     }

    //     // Collect lawyer ids once
    //     const lawyerIds = requests.map(
    //       (item) => item.lawyerId
    //     );
    //     //console.log("lawyerIds", lawyerIds);

    //     // Fetch payment history in one query
    //     const histories = await hiringHistoryCollection
    //       .find({
    //         hired_by: userId,
    //         lawyerId: { $in: lawyerIds }
    //       })
    //       .toArray();

    //     const profileIds = lawyerIds.map(
    //       id => new ObjectId(id)
    //     );

    //     const profiles = await profilecollection
    //       .find({
    //         _id: { $in: profileIds }
    //       })
    //       .toArray();
    //     //console.log("profiles found", profiles);
    //     // Payment lookup
    //     const historyMap = new Map();

    //     histories.forEach((history) => {
    //       historyMap.set(
    //         history.lawyerId,
    //         history
    //       );
    //     });

    //     // Profile lookup
    //     const profileMap = new Map();

    //     profiles.forEach((profile) => {
    //       profileMap.set(
    //         profile._id.toString(),
    //         profile
    //       );
    //     });
    //     //console.log("profiles found", profileMap);
    //     // Merge everything
    //     const result = requests.map((request) => ({
    //       ...request,

    //       payment:
    //         historyMap.get(request.lawyerId) || null,

    //       profile:
    //         profileMap.get(request.lawyerId) || null,
    //     }));

    //     res.send(result);

    //   } catch (error) {

    //     console.error(error);

    //     res.status(500).send({
    //       message: "Something went wrong",
    //     });

    //   }
    // });
app.get('/api/hiring-request/user/:user_id', verifyToken, verifyClient,  async (req, res) => {
    try {

      const userId =
        req.params.user_id;

      const result =
        await hiringRequestCollection.aggregate([

          {
            $match: {
              requested_by: userId
            }
          },

          // Join payment/hiring history
          {
            $lookup: {
              from: 'hiring_history',

              let: {
                requestId: {
                  $toString: '$_id'
                }
              },

              pipeline: [
                {
                  $match: {
                    $expr: {
                      $eq: [
                        '$reqID',
                        '$$requestId'
                      ]
                    }
                  }
                }
              ],

              as: 'payment'
            }
          },

          // payment object instead of array
          {
            $addFields: {
              payment: {
                $ifNull: [
                  {
                    $arrayElemAt: [
                      '$payment',
                      0
                    ]
                  },
                  null
                ]
              }
            }
          },

          // Join lawyer profile
          {
            $lookup: {
              from: 'lawyer_sp_profiles',

              let: {
                profileId: {
                  $toObjectId:
                    '$lawyerId'
                }
              },

              pipeline: [
                {
                  $match: {
                    $expr: {
                      $eq: [
                        '$_id',
                        '$$profileId'
                      ]
                    }
                  }
                }
              ],

              as: 'profile'
            }
          },

          // profile object instead of array
          {
            $addFields: {
              profile: {
                $ifNull: [
                  {
                    $arrayElemAt: [
                      '$profile',
                      0
                    ]
                  },
                  null
                ]
              }
            }
          }

        ]).toArray();

      res.send(result);

    } catch (error) {

      console.error(error);

      res.status(500).send({
        message:
          'Something went wrong'
      });

    }
  }
);
    // app.get('/api/hiring-request/lawyer/:lawyer_id', async (req, res) => {

    //   const lawyer_id = req.params.lawyer_id;
    //   const querys = {
    //     lawyer_id: lawyer_id
    //   };

    //   const lawyerUserIdProfile =
    //     await profilecollection.findOne(querys);

    //   //console.log(lawyerUserIdProfile);

    //   const query = {
    //     lawyerId:
    //       lawyerUserIdProfile._id.toString()
    //   };

    //   //console.log(
    //     'laywer id from /api/hiring-request/lawyer/',
    //     lawyer_id
    //   );

    //   const result =
    //     await hiringRequestCollection
    //       .find(query)
    //       .toArray();

    //   if (!result.length) {
    //     return res.send([]);
    //   }

    //   // Get all user ids
    //   const userIds = result.map(
    //     item => new ObjectId(
    //       item.requested_by
    //     )
    //   );

    //   // Fetch users in one query
    //   const users =
    //     await userCollection
    //       .find({
    //         _id: {
    //           $in: userIds
    //         }
    //       })
    //       .toArray();

    //   // Create lookup map
    //   const userMap = new Map();

    //   users.forEach(user => {
    //     userMap.set(
    //       user._id.toString(),
    //       {
    //         _id: user._id.toString(),
    //         name: user.name,
    //         email: user.email,
    //       }
    //     );
    //   });
    //   // Get all request ids
    //   const requestIds = result.map(item =>
    //     item._id.toString()
    //   );

    //   // Fetch hiring history records
    //   const histories =
    //     await hiringHistoryCollection
    //       .find({
    //         reqID: {
    //           $in: requestIds
    //         }
    //       })
    //       .toArray();

    //   // Create lookup map
    //   const historyMap = new Map();

    //   histories.forEach(history => {
    //     historyMap.set(
    //       history.reqID,
    //       history
    //     );
    //   });
    //   // Attach user object
    //   const response = result.map(
    //     request => ({
    //       ...request,
    //       user:
    //         userMap.get(
    //           request.requested_by
    //         ) || null,

    //       hiringHistory:
    //         historyMap.get(
    //           request._id.toString()
    //         ) || null,

    //       payment: !!historyMap.get(
    //         request._id.toString()
    //       )
    //     })
    //   );

    //   res.send(response);

    // });

    app.get( '/api/hiring-request/lawyer/:lawyer_id', verifyToken, verifyLawyer, async (req, res) => {

    try {

      const lawyer_id =
        req.params.lawyer_id;

      const lawyerProfile =
        await profilecollection.findOne({
          lawyer_id
        });

      if (!lawyerProfile) {
        return res.send([]);
      }

      const result =
        await hiringRequestCollection.aggregate([

          {
            $match: {
              lawyerId:
                lawyerProfile._id.toString()
            }
          },

          // Join user
          {
            $lookup: {
              from: 'user',

              let: {
                userId: {
                  $toObjectId:
                    '$requested_by'
                }
              },

              pipeline: [
                {
                  $match: {
                    $expr: {
                      $eq: [
                        '$_id',
                        '$$userId'
                      ]
                    }
                  }
                },

                {
                  $project: {
                    _id: {
                      $toString: '$_id'
                    },
                    name: 1,
                    email: 1
                  }
                }
              ],

              as: 'user'
            }
          },

          {
            $addFields: {
              user: {
                $ifNull: [
                  {
                    $arrayElemAt: [
                      '$user',
                      0
                    ]
                  },
                  null
                ]
              }
            }
          },

          // Join hiring history
          {
            $lookup: {
              from: 'hiring_history',

              let: {
                requestId: {
                  $toString: '$_id'
                }
              },

              pipeline: [
                {
                  $match: {
                    $expr: {
                      $eq: [
                        '$reqID',
                        '$$requestId'
                      ]
                    }
                  }
                }
              ],

              as: 'hiringHistory'
            }
          },

          {
            $addFields: {

              hiringHistory: {
                $ifNull: [
                  {
                    $arrayElemAt: [
                      '$hiringHistory',
                      0
                    ]
                  },
                  null
                ]
              },

              payment: {
                $gt: [
                  {
                    $size:
                      '$hiringHistory'
                  },
                  0
                ]
              }

            }
          }

        ]).toArray();

      res.send(result);

    } catch (error) {

      console.error(error);

      res.status(500).send({
        message:
          'Something went wrong'
      });

    }

    });


    app.post("/api/lawyer/approve-request", verifyToken,  verifyLawyer, async (req, res) => {
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
    app.post('/api/hiring-request', verifyToken, async (req, res) => {
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
    app.post('/api/hiring-history', verifyToken, async (req, res) => {
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

    app.get( '/api/payments/lawyer/:lawyerId', verifyToken, verifyLawyer, async (req, res) => {
    try {
      const { lawyerId } =
        req.params;
      const result =
        await hiringHistoryCollection.aggregate([
          {
            $match: {
              lawyerId
            }
          },

          {
            $sort: {
              created_at: -1
            }
          },

          // Request
          {
            $lookup: {

              from:
                'hiring_request',

              let: {
                requestId: {
                  $toObjectId:
                    '$reqID'
                }
              },

              pipeline: [
                {
                  $match: {
                    $expr: {
                      $eq: [
                        '$_id',
                        '$$requestId'
                      ]
                    }
                  }
                }
              ],

              as: 'request'

            }
          },

          {
            $addFields: {
              request: {
                $ifNull: [
                  {
                    $arrayElemAt: [
                      '$request',
                      0
                    ]
                  },
                  null
                ]
              }
            }
          },

          // User
          {
            $lookup: {

              from: 'user',

              let: {
                userId: {
                  $toObjectId:
                    '$hired_by'
                }
              },

              pipeline: [

                {
                  $match: {
                    $expr: {
                      $eq: [
                        '$_id',
                        '$$userId'
                      ]
                    }
                  }
                },

                {
                  $project: {
                    _id: {
                      $toString:
                        '$_id'
                    },
                    name: 1,
                    email: 1
                  }
                }

              ],

              as: 'user'

            }
          },

          {
            $addFields: {
              user: {
                $ifNull: [
                  {
                    $arrayElemAt: [
                      '$user',
                      0
                    ]
                  },
                  null
                ]
              }
            }
          }

        ]).toArray();

      res.send(result);

    } catch (error) {

      console.error(error);

      res.status(500).send({
        message:
          'Server Error'
      });

    }

    });

    //veryfytoken of the request middleware

    //can comment
    app.get('/api/can-comment/:lawyerId/:userId', async (req, res) => {
    try {

      const {
        lawyerId,
        userId,
      } = req.params;

      const hiring =
        await hiringHistoryCollection.findOne({
          lawyerId,
          hired_by: userId,
        });

      res.send({
        canComment: !!hiring,
        paymentDataId:hiring._id.toString(),
        reqID: hiring.reqID
      });

    } catch (error) {

      console.error(error);

      res.status(500).send({
        canComment: false,
      });

    }
    });


    //
    app.post( '/api/comment', verifyToken,  verifyClient, async (req, res) => {

    try {

      const {
        lawyerId,
        userId,
        comment,
        reqId,
        paymentDataId,
        createdAt,
      } = req.body;

      if (!comment?.trim()) {
        return res.status(400).send({
          success: false,
          message: 'Comment is required',
        });
      }

      // Verify hiring history exists
      const hiring =
        await hiringHistoryCollection.findOne({

          _id: new ObjectId(
            paymentDataId
          ),

          lawyerId,

          hired_by: userId,

          reqID: reqId,

        });

      if (!hiring) {

        return res.status(403).send({
          success: false,
          message:
            'You are not allowed to review this lawyer',
        });

      }

      // Prevent duplicate review
      const existingReview =
        await commentCollection.findOne({

          lawyerId,

          userId,

          paymentDataId,

        });

      if (existingReview) {

        return res.status(400).send({
          success: false,
          message:
            'You already commented. You need to hire again to comment.',
        });

      }

      const review = {

        lawyerId,
        userId,
        comment: comment.trim(),

        reqId,
        paymentDataId,

        createdAt:
          createdAt ||
          new Date().toISOString(),

      };

      const result =
        await commentCollection.insertOne(
          review
        );

      res.send({
        success: true,
        insertedId:
          result.insertedId,
        message:
          'Review submitted successfully',
      });

    } catch (error) {

      console.error(error);

      res.status(500).send({
        success: false,
        message: 'Server Error',
      });

    }

  }
    );


    //get comment
    app.get('/api/comments/lawyer/:lawyerId',  async (req, res) => {
      try {
        const { lawyerId } = req.params;
        const comments = await commentCollection.aggregate([
            {
              $match: { 
                lawyerId
              }
            },
            {
              $sort: {
                createdAt: -1
              }
            },
            {
              $lookup: {
                from: 'user',
                let: {
                  userObjectId: {
                    $toObjectId:
                      '$userId'
                  }
                },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $eq: [
                          '$_id',
                          '$$userObjectId'
                        ]
                      }
                    }
                  },
                  {
                    $project: {
                      _id: {
                        $toString: '$_id'
                      },
                      name: 1,
                      email: 1
                    }
                  }
                ],
                as: 'user'
              }
            },
            {
              $addFields: {
                user: {
                  $ifNull: [
                    {
                      $arrayElemAt: [
                        '$user',
                        0
                      ]
                    },
                    null
                  ]
                }
              }
            }
          ]).toArray();
        res.send(comments);
      } catch (error) {
        console.error(error);
        res.status(500).send({
          message:
            'Failed to fetch comments'
        });
      }
    });

    //get comment users
    app.get( '/api/comments/user/:userId', verifyToken, verifyClient, async (req, res) => {
    try {

      const { userId } =
        req.params;

      const comments =
        await commentCollection.aggregate([

          {
            $match: {
              userId
            }
          },

          {
            $sort: {
              createdAt: -1
            }
          },

          {
            $lookup: {

              from: 'lawyer_sp_profiles',

              let: {
                lawyerProfileId: {
                  $toObjectId:
                    '$lawyerId'
                }
              },

              pipeline: [

                {
                  $match: {
                    $expr: {
                      $eq: [
                        '$_id',
                        '$$lawyerProfileId'
                      ]
                    }
                  }
                },

                {
                  $project: {
                    name: 1,
                    imageUrl: 1,
                    fee: 1,
                    specializations: 1,
                    status: 1
                  }
                }

              ],

              as: 'lawyer'

            }
          },

          {
            $addFields: {
              lawyer: {
                $ifNull: [
                  {
                    $arrayElemAt: [
                      '$lawyer',
                      0
                    ]
                  },
                  null
                ]
              }
            }
          }

        ]).toArray();

      res.send(comments);

    } catch (error) {

      console.error(error);

      res.status(500).send({
        message:
          'Failed to fetch comments'
      });

    }

  }
    );
    app.delete( '/api/comment/:commentId', verifyToken, verifyClient, async (req, res) => {
    try {
      const { commentId } =
        req.params;
      const { userId } =
        req.body;
      const comment =
        await commentCollection.findOne({
          _id: new ObjectId(
            commentId
          )
        });

      if (!comment) {
        return res.status(404).send({
          success: false,
          message:
            'Comment not found'
        });
      }

      if (
        comment.userId !== userId
      ) {
        return res.status(403).send({
          success: false,
          message:
            'Not authorized'
        });
      }

      await commentCollection.deleteOne({
        _id: new ObjectId(
          commentId
        )
      });

      res.send({
        success: true,
        message:
          'Comment deleted'
      });

    } catch (error) {

      console.error(error);

      res.status(500).send({
        success: false,
        message:
          'Server Error'
      });

    }

  }
    );
    app.patch( '/api/comment/:commentId', verifyToken, verifyClient, async (req, res) => {
    try {
      const { commentId } =
        req.params;
      const {
        userId,
        comment
      } = req.body;
      if (
        !comment ||
        comment.trim().length < 10
      ) {
        return res.status(400).send({
          success: false,
          message:
            'Comment must be at least 10 characters'
        });
      }

      const existing =
        await commentCollection.findOne({
          _id: new ObjectId(
            commentId
          )
        });

      if (!existing) {
        return res.status(404).send({
          success: false,
          message:
            'Comment not found'
        });
      }

      if (
        existing.userId !== userId
      ) {
        return res.status(403).send({
          success: false,
          message:
            'Not authorized'
        });
      }

      await commentCollection.updateOne(
        {
          _id: new ObjectId(
            commentId
          )
        },
        {
          $set: {
            comment:
              comment.trim(),
            updatedAt:
              new Date().toISOString()
          }
        }
      );

      res.send({
        success: true,
        message:
          'Comment updated'
      });

    } catch (error) {

      console.error(error);

      res.status(500).send({
        success: false,
        message:
          'Server Error'
      });

    }

  }
);


app.get( '/api/admin/analytics', verifyToken, verifyAdmin, async (req, res) => {
    try {
      const [
        users,
        lawyers,
        hires,
        payments,
        comments
      ] = await Promise.all([

        userCollection.countDocuments(),

        profilecollection.countDocuments(),

        hiringRequestCollection.countDocuments(),

        hiringHistoryCollection.find().toArray(),

        commentCollection.countDocuments()

      ]);

      const totalRevenue =
        payments.reduce(
          (sum, item) =>
            sum +
            Number(item.fee || 0),
          0
        );

      res.send({
        totalUsers: users,
        totalLawyers: lawyers,
        totalHires: hires,
        totalPayments:
          payments.length,
        totalRevenue,
        totalComments:
          comments,
      });

    } catch (error) {

      console.error(error);

      res.status(500).send({
        message:
          'Analytics error'
      });

    }

  }
);


app.get('/api/admin/transactions', verifyToken, verifyAdmin, async (req, res) => {
    try {

      const transactions =
        await hiringHistoryCollection
          .aggregate([

            {
              $lookup: {
                from: 'user',
                let: {
                  userId:
                    '$hired_by'
                },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $eq: [
                          '$_id',
                          {
                            $toObjectId:
                              '$$userId'
                          }
                        ]
                      }
                    }
                  },
                  {
                    $project: {
                      name: 1,
                      email: 1,
                    }
                  }
                ],
                as: 'user'
              }
            },

            {
              $lookup: {
                from: 'lawyer_sp_profiles',
                let: {
                  lawyerId:
                    '$lawyerId'
                },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $eq: [
                          {
                            $toString:
                              '$_id'
                          },
                          '$$lawyerId'
                        ]
                      }
                    }
                  },
                  {
                    $project: {
                      name: 1,
                      imageUrl: 1,
                      specializations: 1,
                      status: 1,
                    }
                  }
                ],
                as: 'lawyer'
              }
            },

            {
              $unwind: {
                path: '$user',
                preserveNullAndEmptyArrays:
                  true
              }
            },

            {
              $unwind: {
                path: '$lawyer',
                preserveNullAndEmptyArrays:
                  true
              }
            },

            {
              $sort: {
                created_at: -1
              }
            }

          ])
          .toArray();

      res.send(
        transactions
      );

    } catch (error) {

      console.error(error);

      res.status(500).send({
        message:
          'Server Error'
      });

    }

  }
);

app.get( '/api/admin/users', verifyToken, verifyAdmin, async (req, res) => {
    try {
      const users =
        await userCollection
          .find({})
          .sort({
            createdAt: -1
          })
          .toArray();

      res.send(users);

    } catch (error) {

      res.status(500).send({
        message:
          'Server Error'
      });

    }

  }
);

app.post(
  "/api/complete-registration",
  verifyToken,
  async (req, res) => {

    const { role } = req.body;

    if (
      role !== "client" &&
      role !== "lawyer"
    ) {
      return res.status(400).send({
        message: "Invalid role"
      });
    }

    await userCollection.updateOne(
      {
        _id: new ObjectId(req.user.id)
      },
      {
        $set: { role }
      }
    );

    res.send({
      success: true
    });

  }
);

//     // Send a ping to confirm a successful connection
//     await client.db("admin").command({ ping: 1 });
//     //console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    //await client.close();
  }
}
run().catch(console.dir);
