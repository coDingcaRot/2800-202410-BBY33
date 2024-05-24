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
        type: date,
        required: true
    },
    startTime: {
        type: time,
        required: true
    }, 
    dueDate: {
        type: date,
        required: true
    }, 
    dueTime: {
        type: time,
        required: true
    },
    taskMembers: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Task', // references the Task model
    }
});

/**
 * Constructor function creates 'User' based on userSchema. 
 * We can then do CRUD operations with User's in the database.
 * 
 * 'Users' is pluralized and then lowercased by mongoose
 */
const Task = mongoose.model('Project', taskSchema); 

module.exports = Task; // passes the values for usage in index.js