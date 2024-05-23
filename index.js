require("./utils.js");
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const bcrypt = require('bcrypt');
const Joi = require('joi');
const favicon = require('serve-favicon');
const path = require('path');
const saltRounds = 12;
const port = process.env.Port || 3000;

const app = express();
const expireTime = 1 * 60 * 60 * 1000; // Expires after 1 hour
app.set("view engine", "ejs");

/* secret info section */
const mongodb_host = process.env.MONGODB_HOST;
const mongodb_user = process.env.MONGODB_USER;
const mongodb_password = process.env.MONGODB_PASSWORD;
const mongodb_database = process.env.MONGODB_DATABASE;
const mongodb_session_secret = process.env.MONGODB_SESSION_SECRET;
const node_session_secret = process.env.NODE_SESSION_SECRET;
/* end of secret section */

var { database } = include('databaseConnection');

const { ObjectId } = require('mongodb');
const { captureRejectionSymbol } = require("events");
const userCollection = database.db(mongodb_database).collection('users');
const projectCollection = database.db(mongodb_database).collection('projects');
const taskCollection = database.db(mongodb_database).collection('tasks');

app.use(express.urlencoded({ extended: false }));

app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));

//MongoStore for session storage
var mongoStore = MongoStore.create({
    mongoUrl: `mongodb+srv://${mongodb_user}:${mongodb_password}@${mongodb_host}/comp2800-a1`,
    crypto: {
        secret: mongodb_session_secret
    }
})

app.use(session({
    secret: node_session_secret, //key that will sign cookie
    store: mongoStore, //default is memory store 
    saveUninitialized: false,  //not touched, modify the session, we don't want to save
    resave: true
})
);

/*** MIDDLEWARE VALIDATIONS ***/
function isValidSession(req) {
    if (req.session.authenticated) {
        return true;
    }
    return false;
}

function sessionValidation(req, res, next) {
    if (isValidSession(req)) {
        next();
    } else {
        res.redirect('/login');
    }
}


/*** PAGES ***/

//Checks if the user is logged in or not
app.get('/', (req, res) => {
    if (req.session.authenticated) {
        res.render('index', { username: req.session.username });
    }
    else {
        res.render('main');
    }
});


app.get("/nosql-injection", sessionValidation, async (req, res) => {
    var username = req.query.user;

    if (!username) {
        res.send(
            `<h3>no user provided - try /nosql-injection?user=name</h3> <h3>or /nosql-injection?user[$ne]=name</h3>`
        );
        return;
    }
    console.log("user: " + username);

    const schema = Joi.string().max(20).required();
    const validationResult = schema.validate(username);

    if (validationResult.error != null) {
        res.redirect("/login");
        res.send(
            "<h1 style='color:darkred;'>A NoSQL injection attack was detected!!</h1>"
        );
        return;
    }

    const result = await userCollection.find({ email: email }).project({ email: 1, password: 1, username: 1, _id: 1 }).toArray();

    console.log(result);

    res.send(`<h1>Hello ${username}</h1>`);
});

//Sign up function for new users
app.get('/signup', (req, res) => {
    res.render('signup');
});

//Takes in the inputs of the user for sign up
app.post('/signupSubmit', async (req, res) => {
    var username = req.body.username;
    var email = req.body.email;
    var password = req.body.password;

    if (!username) {
        res.render('signupError', { error: 'Username' });
    }

    else if (!email) {
        res.render('signupError', { error: 'Email' });
    }

    else if (!password) {
        res.render('signupError', { error: 'Password' });
    }

    const schema = Joi.object({
        username: Joi.string().alphanum().min(3).max(30).required(),
        email: Joi.string().email().required(),
        password: Joi.string().min(6).max(30).required()
    });

    const validationRes = schema.validate({ username, email, password });
    if (validationRes.error != null) {
        res.render('signupError', { error: `${validationRes.error.details[0].message}` });
        return;
    }

    const user = await userCollection.findOne({ email: email });
    if (user) {
        res.render('signupError', { error: 'Email already exists' });
        return;
    }

    var hashedPassword = await bcrypt.hash(password, saltRounds);
    await userCollection.insertOne({
        username: username,
        email: email,
        password: hashedPassword,
        user_type: 'user',
    });

    req.session.authenticated = true;
    req.session.username = username;
    req.session.cookie.maxAge = expireTime;

    res.redirect('/members');
});

//Log in function for existing users
app.get('/login', (req, res) => {
    res.render('login');
});

//Takes in the inputs of the user for log in
app.post('/loggingin', async (req, res) => {
    var email = req.body.email;
    var password = req.body.password;

    const schema = Joi.string().max(20).required();
    const validationRes = schema.validate(email);
    if (validationRes.error != null) {
        res.render('loginError', { error: 'Email' });
        return;
    }

    const result = await userCollection.find({ email: email }).project({ username: 1, password: 1, user_type: 1, _id: 1 }).toArray();

    if (result.length == 0) {
        res.render('loginError', { error: 'Invalid Email or Password' });
        return;
    } else if (result.length != 1) {
        res.redirect('/login');
        return;
    }

    if (await bcrypt.compare(password, result[0].password)) {
        req.session.authenticated = true;
        req.session.email = email;
        req.session.userId = result[0]._id;
        req.session.username = result[0].username;
        req.session.user_type = result[0].user_type;
        req.session.cookie.maxAge = expireTime;
        res.redirect('/loggedin');
        return;
    } else {
        res.render('loginError', { error: 'Invalid Password', authenticated: req.session.authenticated });
        return;
    }
});

app.use('/loggedin', sessionValidation);
app.get('/loggedin', (req, res) => {
    if (!req.session.authenticated) {
        res.redirect('/');
    } else {
        res.redirect('/members');
    }
});

//Forgot password function for users who forgot their password
app.get('/forgotPass', (req, res) => {
    res.render('forgotPass');
});

app.post('/forgotPass', async (req, res) => {
    var email = req.body.email;
    var password = req.body.password;

    const user = await userCollection.findOne({ email: email });
    if (!user) {
        res.render('forgotPassError', { error: 'Email ' });
        return;
    }

    const schema = Joi.string().min(6).max(30).required();
    const validationRes = schema.validate(password);
    if (validationRes.error != null) {
        res.render('forgotPassError', { error: `${validationRes.error.details[0].message}` });
        return;
    }

    var hashedPassword = await bcrypt.hash(password, saltRounds);
    await userCollection.updateOne({ email: email }, { $set: { password: hashedPassword } });

    res.render('passwordChanged');
});

//Members area for users who are logged in
app.get('/members', (req, res) => {
    if (!req.session.authenticated) {
        res.redirect('/login');
        return;
    } else {
        res.render('members', { authenticated: req.session.authenticated, username: req.session.username });

    }
});

// Serve static files from the 'views' directory
app.use(express.static(__dirname + '/views'));
// Use to parse json file
app.use(express.json());

// get the task data of specific project, matching same projectId and userId 
async function fetchProjectTasks(projectId, userId) {
    try {
        const project = await projectCollection.findOne({ _id: new ObjectId(projectId) });

        if (!project) {
            throw new Error("Project not found");
        }

        const taskList = project.taskList.map(taskId => new ObjectId(taskId));
        const tasks = await taskCollection.find({ _id: { $in: taskList } }).toArray();

        const accessibleTasks = [];
        for (const task of tasks) {
            if (task.taskMembers && task.taskMembers.includes(userId)) {
                accessibleTasks.push(task);
            }
        }

        return accessibleTasks;
    } catch (error) {
        console.error('Error fetching project tasks:', error);
        throw new Error("Internal server error");
    }
}

// Task page for users who are logged in
app.get('/taskPage', async (req, res) => {
    if (req.session.authenticated) {
        const projectId = req.query.projectId;
        const userId = req.session.userId;
        if(projectId){
            try{
                const tasksData = await fetchProjectTasks(projectId, userId);
                res.render('taskPage', {
                    authenticated: req.session.authenticated, 
                    username: req.session.username,
                    isTaskPage: true,
                    projectId: projectId, 
                    tasksData: tasksData
                });
            } catch (error) {
                console.error('Error occurred: ', error);
                res.status(500).send('Internal Server Error');
            }
        } else {
            res.render('taskPage', { 
                authenticated: req.session.authenticated, 
                username: req.session.username,
                isTaskPage: true,
                projectId: "" 
            });
        }
    } else {
        res.redirect('/');
    }
});


// Get a list of project names of users to put into navbar
app.get('/getUserProjectList', async (req, res) => {
    try {
        const userId = req.session.userId;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }

        const user = await userCollection.findOne({ _id: typeof userId === 'string' ? new ObjectId(userId) : userId });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const projectList = user.projectList || [];

        if (projectList.length === 0) {
            return res.json([]);
        }

        const projects = await projectCollection.find({
            _id: { $in: projectList.map(id => new ObjectId(id)) }
        }).toArray();

        const projectNames = projects.map(project => ({ id: project._id, name: project.projectName }));
        // console.log(projectNames);
        res.json(projectNames);
    } catch (error) {
        console.error('Error fetching user projects:', error);
        res.status(500).json({ error: 'Error fetching user projects' });
    }
});

// get project name based on projectId in URL query
app.get('/getProjectName', async (req, res) => {
    try {
        const projectId = req.query.projectId;
        const project = await projectCollection.findOne({ _id: new ObjectId(projectId) }, { projection: { projectName: 1 } });
        if (project) {
            res.json({ projectName: project.projectName });
        } else {
            res.status(404).json({ message: "Project not found" });
        }
    } catch (error) {
        console.error('Error fetching project name:', error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Get user task for specific project from mongoDB
app.get('/getProjectTasks', async (req, res) => {
    try {
        const projectId = req.query.projectId;
        const userId = req.session.userId;

        const project = await projectCollection.findOne({ _id: new ObjectId(projectId) });

        if (project) {
            const taskList = project.taskList.map(taskId => new ObjectId(taskId));

            const tasks = await taskCollection.find({ _id: { $in: taskList } }).toArray();

            const accessibleTasks = [];
            for (const task of tasks) {
                // checking if the user is in task members
                if (task.taskMembers && task.taskMembers.includes(userId)) {
                    accessibleTasks.push(task);
                }
            }

            res.json(accessibleTasks);
        } else {
            res.status(404).json({ message: "Project not found" });
        }
    } catch (error) {
        console.error('Error fetching tasks:', error);
        res.status(500).json({ message: "Internal server error" });
    }
});

app.get('/getProjectMembers', async (req, res) => {
    try {
        const projectId = req.query.projectId;

        const project = await projectCollection.findOne({ _id: new ObjectId(projectId) });

        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        const memberIds = project.projectMembers.map(memberId => new ObjectId(memberId));

        const users = await userCollection.find({ _id: { $in: memberIds } }).toArray();

        const userData = users.map(user => ({
            _id: user._id.toString(),
            username: user.username,
            email: user.email
        }));

        res.json(userData);
    } catch (error) {
        console.error('Error fetching project members:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Add tasks, get data from users and insert to mongoDB
app.post('/addTask', async (req, res) => {
    try{
        // Extract data from the request body
        const { title, description, startDate, startTime, dueDate, dueTime, reminderDatetime, selectedTaskMembers, projectId } = req.body;
        
        // Determine the value of the reminder field based on the value of reminderDatetime
        const reminder = reminderDatetime ? reminderDatetime : 'none';

        // Parse the selectedMembers from JSON string to an array
        const taskMembers = JSON.parse(selectedTaskMembers);

        // Create a new document object with the extracted data
        const newTask = {
            title,
            description,
            startDate,
            startTime,
            dueDate,
            dueTime,
            reminder,
            taskMembers,
            status: "pending"
            // Add other fields as needed
        };

        // Insert the new document into the MongoDB tasks collection
        const result = await taskCollection.insertOne(newTask);
        // Insert the task id with string type
        const taskId = result.insertedId.toString();

        await projectCollection.updateOne(
            { _id: new ObjectId(projectId) },
            { $push: { taskList: taskId } }
        );

        res.redirect(`/taskPage?projectId=${projectId}`);
    } catch(err){
        console.error('Error adding task: ', err);
        res.status(500).send('Error adding task')
    }
        
});


// get user data based on their id for showing user name on task card
app.get('/getUserById/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        const user = await userCollection.findOne({ _id: new ObjectId(userId) });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        console.error('Error fetching user from MongoDB by ID:', error);
        res.status(500).json({ error: 'Error fetching user from MongoDB by ID' });
    }
});


// update task status
app.put('/updateTaskStatus/:id', async (req, res) => {
    try {
        const taskId = req.params.id;
        const { status } = req.body;
        await taskCollection.updateOne({ _id: new ObjectId(taskId) }, { $set: { status } });
        res.json({ message: 'Task status updated' });
    } catch (error) {
        console.error('Error updating task status:', error);
        res.status(500).json({ error: 'Error updating task status' });
    }
});

// update the completed members of the specific task - add user to completedMembers array when checked
app.post('/updateCompletedMembers/:taskId', async (req, res) => {
    const taskId = req.params.taskId;
    const userId = req.session.userId;

    try {
        const user = await userCollection.findOne({ _id: new ObjectId(userId) });
        if (!user) {
            throw new Error('User not found');
        }

        const task = await taskCollection.findOne({ _id: new ObjectId(taskId) });
        if (!task) {
            throw new Error('Task not found');
        }

        // Check if user is already in completedMembers array
        if (user.user_type === 'user' && task.completedMembers && task.completedMembers.includes(userId)) {
            // If user is already in completedMembers array, do nothing
            res.sendStatus(200);
            return;
        }

        if (!task.completedMembers) {
            await taskCollection.updateOne({ _id: new ObjectId(taskId) }, { $set: { completedMembers: [] } });
        }

        if (user.user_type === 'user') {
            await taskCollection.updateOne({ _id: new ObjectId(taskId) }, { $push: { completedMembers: userId } });
        } else if (user.user_type === 'admin') {
            await taskCollection.updateOne({ _id: new ObjectId(taskId) }, { $set: { status: 'completed' } });
        }

        res.sendStatus(200);
    } catch (error) {
        console.error('Error updating completed members:', error);
        res.status(500).send('Internal Server Error');
    }
});


// update the completed members of the specific task - remove user to completedMembers array when unchecked
app.post('/removeUserFromCompletedMembers/:taskId', async (req, res) => {
    const taskId = req.params.taskId;
    const userId = req.session.userId;

    try {
        const task = await taskCollection.findOne({ _id: new ObjectId(taskId) });
        if (!task) {
            throw new Error('Task not found');
        }

        const userIndex = task.completedMembers.indexOf(userId);
        if (userIndex !== -1) {
            task.completedMembers.splice(userIndex, 1);

            await taskCollection.updateOne({ _id: new ObjectId(taskId) }, { $set: { completedMembers: task.completedMembers } });
        }

        res.sendStatus(200);
    } catch (error) {
        console.error('Error removing user from completed members:', error);
        res.status(500).send('Internal Server Error');
    }
});



app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

app.use(express.static(__dirname + '/public'));

app.get('*', (req, res) => {
    res.status(404);
    res.render('404error');
});


/**** END OF PAGES ****/
app.listen(port, () => {
    console.log(`SyncPro node application listening on port ${port}`);
}); 