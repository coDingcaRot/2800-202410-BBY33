const { string } = require("joi");
const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: false
    },
    startDate: {
        type: Date,
        required: true
    },
    startTime: {
        type: String,
        required: true
    }, 
    dueDate: {
        type: Date,
        required: true
    }, 
    dueTime: {
        type: String,
        required: true
    },
    taskOwner:{
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true
    },
    taskMembers: {
        type: [mongoose.Schema.Types.ObjectId], 
        ref: 'User'
    }, 
    reminder: {
        type: String, 
        require: false
    }, 
    status: {
        type: String,
        default: "pending"
    }, 
    completedMembers: {
        type: [mongoose.Schema.Types.ObjectId], 
        ref: 'User',
        default: [] 
    }
});

/**
 * Constructor function creates 'User' based on userSchema. 
 * We can then do CRUD operations with User's in the database.
 * 
 * 'Users' is pluralized and then lowercased by mongoose
 */
const Task = mongoose.model('Task', taskSchema); 

module.exports = Task; // passes the values for usage in index.js