require('dotenv').config();
const {MongoClient} = require('mongodb');

const mongodb_host = process.env.MONGODB_HOST;
const mongodb_user = process.env.MONGODB_USER;
const mongodb_password = process.env.MONGODB_PASSWORD;

const mongoClient = new MongoClient(`mongodb+srv://${mongodb_user}:${mongodb_password}@${mongodb_host}/`);

async function mongoStart(){
    try{
        mongoClient.connect();
        console.log(("\n****mongoStart() called successfully***\n").toUpperCase()); //testing if connected to mongoclient
    }catch(e){ 
        console.log(e);
    }finally{
        mongoClient.close();
    }
}

module.exports = {mongoStart};
