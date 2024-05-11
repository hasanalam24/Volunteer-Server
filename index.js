const express = require('express')
const cors = require('cors')
const jwt = require('jsonwebtoken')
const cookieParser = require('cookie-parser')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const app = express()
const port = process.env.PORT || 5000;

// middleware
app.use(express.json())
app.use(cors({
    origin: [
        'http://localhost:5173', 'http://localhost:5174',
    ],
    credentials: true
}))
app.use(cookieParser())




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.qvnsypp.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

//middlewares
const logger = (req, res, next) => {
    // console.log("log info", req.method, req.url)
    next()
}

const verifyToken = (req, res, next) => {
    const token = req?.cookies?.token
    // console.log('token in the middle ware', token)
    if (!token) {
        return res.status(401).send({ message: 'unauthorized access' })
    }
    jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
        if (err) {
            return res.status(401).send({ message: 'unauthorized access' })
        }
        req.user = decoded
        next()
    })

}

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();


        const addPostCollection = client.db('VolunteerDB').collection('addPostDB')
        const requestCollection = client.db('VolunteerDB').collection('requestDB')
        // Send a ping to confirm a successful connection


        //auth related api
        app.post('/jwt', logger, verifyToken, async (req, res) => {
            const user = req.body;
            // console.log('user for toker', user)
            const token = jwt.sign(user, process.env.ACCESS_TOKEN, { expiresIn: '1h' })

            res.cookie('token', token, {
                httpOnly: true,
                secure: true,
                sameSite: 'none'
            })
                .send({ success: true })

        })

        app.post('/logout', async (req, res) => {
            const user = req.body;
            // console.log('login out user', user)
            res.clearCookie('token', { maxAge: 0 }).send({ success: true })
        })


        //service ralated api
        app.get('/addpost', logger, verifyToken, async (req, res) => {

            const cursor = addPostCollection.find()
            const result = await cursor.toArray()
            res.send(result)
        })

        app.get('/addpost/:id', logger, verifyToken, async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await addPostCollection.findOne(query)
            res.send(result)
        })

        app.get('/addposts/:email', logger, verifyToken, async (req, res) => {
            const email = req.params.email
            // console.log('cookcook', req.cookies)
            const query = { email: email }
            const result = await addPostCollection.find(query).toArray()
            res.send(result)
        })

        app.post('/addpost', async (req, res) => {
            const addPost = req.body;
            const result = await addPostCollection.insertOne(addPost)
            res.send(result)
        })

        app.put('/updated/:id', async (req, res) => {
            const id = req.params.id
            const filter = { _id: new ObjectId(id) }
            const options = { upsert: true }
            const updatedData = req.body

            const updatedDoc = {
                $set: {
                    postTile: updatedData.postTile,
                    thumbnail: updatedData.thumbnail,
                    description: updatedData.description,
                    needPeoples: updatedData.needPeoples,
                    location: updatedData.location,
                    category: updatedData.category,
                    deadline: updatedData.deadline
                }
            }
            const result = await addPostCollection.updateOne(filter, updatedDoc, options)
            res.send(result)
        })

        app.delete('/delete/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await addPostCollection.deleteOne(query)
            res.send(result)
        })

        //request volunteer 
        app.get('/request', logger, verifyToken, async (req, res) => {
            const cursor = requestCollection.find()
            const result = await cursor.toArray()
            res.send(result)
        })

        app.get('/request/:email', logger, verifyToken, async (req, res) => {
            const email = req.params.email
            const query = { email: email }
            const result = await requestCollection.find(query).toArray()
            res.send(result)
        })

        app.post('/request', async (req, res) => {
            const addRequest = req.body;
            const result = await requestCollection.insertOne(addRequest)
            res.send(result)
        })

        app.delete('/request/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await requestCollection.deleteOne(query)
            res.send(result)
        })

        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);



app.get('/', (req, res) => {
    res.send('Voluteer Data is Server Done')
})

app.listen(port, () => {
    console.log(`There is no problem in the server on port: ${port}`)
})