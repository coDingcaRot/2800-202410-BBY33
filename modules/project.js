const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true, // Assuming project name should be required
        unique: true
    },
    projectOwner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // references the User model
        required: true // Assuming project must have an owner
    },
    projectMembers: {
        type: [{
            userId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User', // references the User model
                required: true
            },
            email: {
                type: String,
                required: true
            }
        }],
        default: []  // Default value to ensure the list starts as empty
    },
    taskList: {
        type: [{
            taskId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Task', // references the Task model
                required: true
            },
        }],
        default: [] // Default value to ensure the list starts as empty
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