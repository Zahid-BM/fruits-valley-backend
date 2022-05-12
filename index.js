const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');/* to connect server to the database */
require('dotenv').config();
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 8000;

const app = express();

// middleware 
app.use(cors()); /* for providing access to other*/
app.use(express.json()); /* for req.body if use fetch. If axios then remove it*/

const verifyJwt = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).send({ message: 'Unauthorized Access' })
    };
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).send({ message: 'Access Forbidden' })
        };
        req.decoded = decoded;
        next();

    })
};

// connect server to the database
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.cf5fx.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

// to work with database 
async function run() {
    try {
        await client.connect();
        const itemCollection = client.db('warehouse').collection('items');
        const reportCollection = client.db('warehouse').collection('report');
        console.log('db connected');

        // authentication (JWT)
        app.post('/login', async (req, res) => {
            const user = req.body;
            const accessToken = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
                expiresIn: '21d'
            });
            res.send({ accessToken });
        });


        // get all items data from database and send to client side
        app.get('/inventory', async (req, res) => {
            const query = {};
            const cursor = itemCollection.find(query);
            const items = await cursor.toArray();
            res.send(items);
        });
        //get inventory data from database and send to client side
        app.get('/report', async (req, res) => {
            const query = {};
            const cursor = reportCollection.find(query);
            const reports = await cursor.toArray();
            res.send(reports);
        });
        //get id-wise item  from database and send to client side for stock item info
        app.get('/inventory/:id', async (req, res) => {
            const idParams = req.params.id;
            const query = { _id: ObjectId(idParams) };
            const inventory = await itemCollection.findOne(query);
            res.send(inventory);

        });

        // receive PUT request from client side and send response to show qtty on client side UI
        app.put('/inventory/:id', async (req, res) => {
            const id = req.params.id;
            const item = req.body;
            const filter = { _id: ObjectId(id) }
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    quantity: parseInt(item.quantity) - 1,
                }
            };
            const result = await itemCollection.updateOne(filter, updateDoc, options);
            res.send(result);
        });


        // get item id-wise and delete on delivery button clicked and send to server to decrease by one
        /*     app.delete('/inventory/:id', async (req, res) => {
                const id = req.params.id;
                const query = { _id: ObjectId(id) };
                const result = await itemCollection.deleteOne(query);
                res.send(result);
            }); */

        // old code change
        // get single service data with id params from database and send to client side
        app.get('/service/:id', async (req, res) => {
            const idParams = req.params.id;
            const query = { _id: ObjectId(idParams) };
            const service = await serviceCollection.findOne(query);
            res.send(service);
        });

        // old code change
        // receive new service add request from client side to save in the data base and then send to client side again
        app.post('/service', async (req, res) => {
            const newService = req.body;
            const result = await serviceCollection.insertOne(newService);
            res.send(result);
        });
        // old code change
        // receive delete request from client side to delete from database 
        app.delete('/service/:id', async (req, res) => {
            const idAsParams = req.params.id;
            const query = { _id: ObjectId(idAsParams) };
            const result = await serviceCollection.deleteOne(query);
            res.send(result);
        });

        // old code change
        // order collection API
        app.post('/order', async (req, res) => {
            const order = req.body;
            const result = await orderCollection.insertOne(order);
            res.send(result);
        });

        // old code change
        app.get('/orders', verifyJwt, async (req, res) => {
            const decodedEmail = req.decoded.email;
            const email = req.query.email;
            if (email === decodedEmail) {
                const query = { email };
                const cursor = orderCollection.find(query);
                const orders = await cursor.toArray();
                res.send(orders);
            }
            else {
                res.status(403).send({ message: 'Forbidden Access' });
            }
        })

    }
    finally {

    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Warehouse Server is running')
});


app.listen(port, () => {
    console.log(`Warehouse Server is running at port : ${port}`);
});