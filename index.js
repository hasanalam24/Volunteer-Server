const express = require('express')
const cors = require('cors')
const jwt = require('jsonwebtoken')
const cookieParser = require('cookie-parser')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const axios = require('axios');
require('dotenv').config();
const app = express()

// const formData = require('form-data');
// const Mainlgun = require('mailgun.js');
// const mailgun = new Mainlgun(formData)


// const mg = mailgun.client({
//     username: process.env.Email,
//     key: process.env.MAIL_GUN_API_KEY
// })

const port = process.env.PORT || 5000;


// middleware
app.use(express.json())
app.use(express.urlencoded({ extended: true }));
app.use(cors({
    origin: [
        'http://localhost:5173'
    ],
    credentials: true
}))
app.use(cookieParser())

// , 'http://localhost:5174', "https://human-plannet-a11.web.app", "https://human-plannet-a11.firebaseapp.com"



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

const cookieOption = {
    httpOnly: true,
    sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
    secure: process.env.NODE_ENV === "production" ? true : false

}

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();


        const addPostCollection = client.db('VolunteerDB').collection('addPostDB')
        const requestCollection = client.db('VolunteerDB').collection('requestDB')
        const paymentCollection = client.db('VolunteerDB').collection('payment')
        // Send a ping to confirm a successful connection


        //auth related api
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN, { expiresIn: '12h' })
            res.cookie('token', token, cookieOption).send({ success: true })

        })

        app.post('/logout', async (req, res) => {
            const user = req.body;
            // console.log('login out user', user)
            res.clearCookie('token', { ...cookieOption, maxAge: 0 }).send({ success: true })
        })


        //service ralated api
        app.get('/addpost', async (req, res) => {
            const filter = req.query;
            console.log(filter)
            const query = {}
            const options = {
                sort: {
                    needPeoples: filter.sort === 'asc' ? 1 : -1
                }
            }
            const cursor = addPostCollection.find(query, options)
            const result = await cursor.toArray()
            res.send(result)
        })

        app.get('/addpost/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await addPostCollection.findOne(query)
            res.send(result)
        })


        app.get('/mypost/:email', async (req, res) => {
            const email = req.params.email
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
        app.get('/request', async (req, res) => {
            const cursor = requestCollection.find()
            const result = await cursor.toArray()
            res.send(result)
        })

        app.get('/request/:email', async (req, res) => {
            const email = req.params.email
            const query = { email: email }
            const result = await requestCollection.find(query).toArray()
            res.send(result)
        })

        app.post('/request', async (req, res) => {
            const addRequest = req.body;
            const result = await requestCollection.insertOne(addRequest)

            // //send mail
            // mg.messages
            //     .create(process.env.MAIL_SENDING_DOMAIN, {
            //         form: "Mailgun Sandbox <postmaster@sandbox145611d2a5f64742bb88a54747376b0d.mailgun.org>",
            //         to: ['alamislam955@gmail.com'],
            //         subject: 'For you for be a volunteer request',
            //         text: 'testing some mailgun awesomess!',

            //     })
            //     .then(msg => console.log(msg))
            //     .catch(err => console.log(err))

            res.send(result)
        })

        app.delete('/request/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await requestCollection.deleteOne(query)
            res.send(result)
        })

        //payments
        app.post('/payments', async (req, res) => {
            try {
                const paymentsInfo = req.body;

                const tranxId = new ObjectId().toString()

                const initiateData = {
                    store_id: "hasan666b38b05c981",
                    store_passwd: "hasan666b38b05c981@ssl",
                    total_amount: paymentsInfo.amount,
                    currency: "EUR",
                    tran_id: tranxId,
                    success_url: "http://localhost:5000/success-payments",
                    fail_url: "http://yoursite.com/fail.php",
                    cancel_url: "http://yoursite.com/cancel.php",
                    cus_name: "Customer Name",
                    cus_email: "cust@yahoo.com",
                    cus_add1: "Dhaka",
                    cus_add2: "Dhaka",
                    cus_city: "Dhaka",
                    cus_state: "Dhaka",
                    cus_postcode: "1000",
                    cus_country: "Bangladesh",
                    cus_phone: "01711111111",
                    cus_fax: "01711111111",
                    ship_name: "Customer Name",
                    ship_add1: "Dhaka",
                    ship_add2: "Dhaka",
                    ship_city: "Dhaka",
                    ship_state: "Dhaka",
                    ship_postcode: "1000",
                    ship_country: "Bangladesh",
                    multi_card_name: "mastercard,visacard,amexcard",
                    value_a: "ref001_A",
                    value_b: "ref002_B",
                    value_c: "ref003_C",
                    value_d: "ref004_D",
                    product_name: 'laptop',
                    product_category: 'laptop',
                    product_profile: 'general',
                    shipping_method: 'NO',
                };

                const response = await axios({
                    method: "POST",
                    url: "https://sandbox.sslcommerz.com/gwprocess/v4/api.php",
                    data: initiateData,
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                });

                const saveData = {
                    paymentId: tranxId,
                    amount: paymentsInfo.amount,
                    status: 'pending'
                }

                const confirmPay = await paymentCollection.insertOne(saveData)

                if (confirmPay) {
                    res.send({
                        paymentURL: response.data.GatewayPageURL
                    })
                }


            } catch (error) {
                console.error('Error initiating payment:', error);
                res.status(500).send('Internal Server Error');
            }
        });

        app.post('/success-payments', async (req, res) => {
            const successData = req.body;
            // console.log('successData:', successData);
            // Handle success data as needed

            if (successData.status !== 'VALID') {
                throw new Error("Unauthorized payment, Invalid payment")
            }

            //updated database

            const query = { paymentId: successData.tran_id } //successData k console korle eta pawa jabe initiate er tran_id save kora namee

            const updateDB = {
                $set: {
                    status: "Success"
                }
            }
            const result = await paymentCollection.updateOne(query, updateDB)

            res.redirect("http://localhost:5173/success")
        });

        // await client.db("admin").command({ ping: 1 });
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