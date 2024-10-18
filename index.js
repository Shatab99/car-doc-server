const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken')
var cookieParser = require('cookie-parser') //use as middleware 
const app = express()
const port = process.env.PORT || 5000;
require('dotenv').config()



// default middle ware
app.use(cors())
app.use(express.json())
app.use(cookieParser()) // for seeing the actual token in cookies and for  verifying purpose  

app.get('/', (req, res) => {
    res.send('<h1 style="text-align : center; margin-top:200px; font-size:76px;">Welcome To Car Doctor Sever</h1>')
})

//  Custom middle ware for security purpose  and verifyng purpose 

const logger = (req, res, next) => {
    console.log("logged Info : ", req.method, req.url)
    next()
}

const verifyToken = (req, res, next) => {
    const token = req.cookies.token;
    console.log("Your Token is : ", token)
    if(!token){
        return res.status(401).send({message:"No access"});
    }
    jwt.verify(token, process.env.ACCESS_TOKEN_secret, (err, decoded)=>{
        if(err){
            return res.status(401).send({message:'Failed to authenticate'})
        }
        req.user= decoded;
        next()
    })
}



const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://shatab:1999shatab@cluster0.0yjfhb9.mongodb.net/?retryWrites=true&w=majority`;

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
        // await client.connect();

        const services = client.db('CarDocDB').collection('services')
        const userOders = client.db('CarDocDB').collection('UserOrders')
        const users = client.db('CarDocDB').collection('Users')


        // authentication api

        app.post('/jwt', async (req, res) => {
            try {
                const user = req.body
                //generate the jwt 
                const token = jwt.sign(user, process.env.ACCESS_TOKEN_secret, { expiresIn: '1h' })
                console.log(user, token)
                // set the token in cookies 
                res
                    .cookie('token', token, {
                        httpOnly: false,
                        secure: true,
                        sameSite : 'none' 
                    })
                    .send({ success: true })
            }
            catch (error) {
                console.log(error)
            }
        })

        app.post('/sessionout', async (req, res) => {
            try {
                const user = req.body;
                console.log("loggin Out ", user)
                res.clearCookie('token', { 
                    maxAge: 0,
                    secure : process.env.NODE_ENV === 'production' ? true : false,
                    sameSite : process.env.NODE_ENV === 'production' ? 'none': 'strict'
                 }).send({ success: true })
            }
            catch (error) {
                console.log(error)
            }
        })

        //users

        app.post("/create-user", async(req, res)=>{
            const {email}= req.body;
            const isExists = await users.findOne({email})
            if(isExists){
                throw new Error("user is already exists !")
            }
            const result = await users.insertOne(req.body)
            res.send(result)
        })

        app.get("/users", async(req,res)=>{
            res.send(await users.find().toArray())
        })

        app.get("/users/:email", async(req,res)=>{
            const email = req.params.email;
            res.send(await users.findOne({email}))
        })


        app.get('/services', async (req, res) => {
            try {
                const cursor = services.find()
                const result = await cursor.toArray()
                res.send(result)
            }
            catch (error) {
                console.log(error)
            }
        })

        app.get('/services/:id', async (req, res) => {
            try {
                const id = req.params.id;
                const query = { _id: new ObjectId(id) }
                const result = await services.findOne(query)
                res.send(result)
            }
            catch (error) {
                console.log(error)
            }
        })

        app.post("/addService", async(req, res)=>{
            res.send(await services.insertOne(req.body));
        } )

        // user order 
        app.get('/userorder', logger,verifyToken, async (req, res) => {
            try {
                console.log("valid User : ", req.user);
                console.log('Cookies : ', req.cookies.token)
                // set up authorized person to get data 
                if(req.user.email !== req.query.email){
                    return res.status(403).send({message : 'forbiden access !!'}) 
                }
                let query = {}
                if (req.query?.email) {
                    query = { email: req.query.email }
                }
                const cursor = userOders.find(query)
                const result = await cursor.toArray()
                res.send(result)
            }
            catch (error) {
                console.log(error)
            }
        })

        app.post('/userorder', async (req, res) => {

            try {
                const newOrder = req.body;
                const result = await userOders.insertOne(newOrder);
                res.send(result)
            }
            catch (error) {
                console.log(error)
            }
        })

        app.delete('/userorder/:id', async (req, res) => {
            try {
                const id = req.params.id;
                const filter = { _id: new ObjectId(id) }
                const result = await userOders.deleteOne(filter)
                res.send(result)
            }
            catch (error) {
                console.log(error)
            }
        })

        app.patch('/userorder/:id', async (req, res) => {
            try {
                const id = req.params.id;
                const filter = { _id: new ObjectId(id) };
                const orders = req.body
                const updateDoc = {
                    $set: {
                        status: orders.status
                    }
                }
                const result = await userOders.updateOne(filter, updateDoc)
                res.send(result)
            }
            catch (error) {
                console.log(error)
            }
        })




        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);






app.listen(port, () => {
    console.log("Server Running on", port)
})
