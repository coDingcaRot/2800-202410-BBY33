/**
 * Task template to replace joi using mongoose and more efficient CRUD operations
 * 
 * @author https://chat.openai.com/
 * @author Jonathaniel Alipes
 */
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    username: {
        type: String, 
        unique: false, 
        required: [true, 'username is required'], 
    },
    email: { 
        type: String, 
        unique: true, 
        required: [true, 'email is required'], 
    },
    password: { 
        type: String,  
        required: [true, 'password is required'], 
    },
    location: {
        type: String,
        required: [true, 'location is required']
    },
    timezone: {
        type: String,
        required: [true, 'timezone is required']
    },
    projectList: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: 'Project', // references projects mongodb
        default: []  // Default value to ensure the list starts as empty
    },
    // resetPassword: {type: String, unique: false, required: false},
});

/**
 * Constructor function creates 'User' based on userSchema. 
 * We can then do CRUD operations with User's in the database.
 * 
 * 'Users' is pluralized and then lowercased by mongoose
 */
const User = mongoose.model('User', userSchema); 

module.exports = User; // passes the values for usage in index.js

