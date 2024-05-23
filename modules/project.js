const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema({
    name: {
        type: String
    },
    projectMembers: {
        type: [{
            userId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User' // references the User model
            },
            email: {
                type: String,
                required: true
            }
        }],
        default: []  // Default value to ensure the list starts as empty
    }

});

/**
 * Constructor function creates 'User' based on userSchema. 
 * We can then do CRUD operations with User's in the database.
 * 
 * 'Users' is pluralized and then lowercased by mongoose
 */
const Project = mongoose.model('Project', projectSchema); 

module.exports = Project; // passes the values for usage in index.js