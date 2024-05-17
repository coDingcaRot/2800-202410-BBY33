//boiler plate
const express = require('express');
const app = express();

//Sessions and session timer
const session = require('express-session');
const expireTime = 24*60*60*1000 

const Joi = require('joi'); //input validations
const url = require('url');
require('dotenv').config(); // process .env files

//Password hashing
const bcrypt = require('bcrypt'); 
const saltRounds = 12;


const port = process.env.PORT || 3000; //ports

app.set('view engine', 'ejs')

app.use(express.urlencoded({extended: false})); // req.body usage

/*** MONGO SETUP ***/
//mongo dependencies
const {MongoClient} = require('mongodb');
const { ObjectId } = require('mongodb');
const MongoStore = require('connect-mongo');
const mongodb_user = process.env.MONGODB_USER;
const mongodb_password = process.env.MONGODB_PASSWORD;
const mongodb_host = process.env.MONGODB_HOST;
const mongodb_database = process.env.MONGODB_DATABASE;

const mongodb_session_secret = process.env.MONGODB_SESSION_SECRET;
const mongodb_connect_string = process.env.MONGODB_CONNECTION_STRING;

var mongoStore = MongoStore.create({
    mongoUrl: `mongodb+srv://${mongodb_user}:${mongodb_password}@${mongodb_host}/${mongodb_database}`,
    crypto:{
        secret: mongodb_session_secret
    }
})

//Instantiation of mongo service
const client = new MongoClient(`mongodb+srv://${mongodb_user}:${mongodb_password}@${mongodb_host}/`); // uri is the connection string

//Connection start to mongodb
async function main(){
    try{
        client.connect();
        console.log("Mongo client connected");
    }catch (e){
        console.log(e);
    }finally{
        client.close();
    }
}
main().catch(console.error);
// const userCollection = client.db(mongodb_database).collection('Users'); 

/*** SESSION CREATION ***/
const node_session_secret = process.env.NODE_SESSION_SECRET;
app.use(session({
    secret: node_session_secret,
    store: mongoStore, //default is memory store
    saveUninitialized: false,
    resave: true
})
);

/*** MONGO FUNCTIONS ***/

async function createUser(client, newUser){
    await client.db(mongodb_database).collection(process.env.MONGODB_C1).insertOne(newUser);
}

/*** PAGES ***/
app.get("/", (req, res) =>{
    res.send("Starting point")
})

app.get("/timeline", (req, res) =>{
    res.render("timeline");
});

app.use(express.static(__dirname + "/public"));

/*** IF PAGE DOESNT EXIST ***/
app.get('*', (req, res) =>{
    res.status(404);
    res.render("404");
});

app.listen(port, ()=>{
    console.log(`Server is running on port ${port}`);
});