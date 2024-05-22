const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    username: {
        type: String, 
        unique: true, 
        required: [true, 'username is required'], 
    },
    email: { 
        type: String, 
        unique: true, 
        required: [true, '\nemail is required'], 
    },
    password: { 
        type: String,  
        required: [true, '\npassword is required'], 
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