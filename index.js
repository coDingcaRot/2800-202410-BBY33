/***** REQUIRED TO START! *****/
require('dotenv').config();
const moment = require('moment');
const express = require('express');
const app = express();
const session = require('express-session');

const axios = require('axios');
const requestIp = require('request-ip');
/***** REQUIRED TO START! *****/

// storing or securing data
const bcrypt = require('bcrypt');
const Joi = require('joi');
const saltRounds = 12;

// utilities
require("./modules/utils.js");
const favicon = require('serve-favicon');
const passport = require('passport'); // ease in signup and login verifications
const path = require('path');
const port = process.env.PORT || 3000;

/***** SESSION SETUP *****/
const expireTime = 24 * 60 * 60 * 1000; // Expires after 1 day
const node_session_secret = process.env.NODE_SESSION_SECRET;

//node built in middleware
app.use(express.json()) //parsing json bodies
app.use(express.urlencoded({ extended: true })); // complex parsing set true: used for json formatting
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico'))); 
app.set("view engine", "ejs"); // ejs engine setup
app.use(express.static(__dirname + '/public'));
app.use(express.static(__dirname + '/views')); // Serve static files from the 'views' directory


/** MONGO/MONGOOSE SETUP **/
const mongoose = require('mongoose');
const mongodb_host = process.env.MONGODB_HOST;
const mongodb_user = process.env.MONGODB_USER;
const mongodb_password = process.env.MONGODB_PASSWORD;
const mongodb_database = process.env.MONGODB_DATABASE;
const mongodb_session_secret = process.env.MONGODB_SESSION_SECRET;

// Configure session management with MongoDB storage
const MongoStore = require('connect-mongo');
app.use(session({
    secret: node_session_secret, //key that will sign cookie
    store: MongoStore.create({
        mongoUrl: `mongodb+srv://${mongodb_user}:${mongodb_password}@${mongodb_host}/comp2800-a1`, //! DO NOT CHANGE
        crypto: {
            secret: mongodb_session_secret
        },
    }),
    saveUninitialized: false,  //not touched, modify the session, we don't want to save
    resave: true
})
);

//Passport ease of use for login and signup
app.use(passport.initialize()); //sets up passport
app.use(passport.session());
require('./modules/passport.js')(passport);

mongoose.connect(`mongodb+srv://${mongodb_user}:${mongodb_password}@${mongodb_host}/comp2800-a1`)
    .then(async () => {
        console.log(("\n***MongoDB connected successfully***\n").toUpperCase());

    })
    .catch(err => {
        console.error("Failed to connect to MongoDB:", err);
        process.exit(1);
    });

// Mongodb schema fetching
const User = require('./modules/user.js');
const Project = require('./modules/project.js');

function ensureAuth(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/');
}

/*** PAGES ***/
app.get('/', (req, res) => {
    res.render('main');
});

/***** SIGN UP FEATURE *****/
app.get('/signup', (req, res) => {
    res.render('signup');
});

app.post('/signupSubmit', async (req, res) => {
    const { username, name, email, password } = req.body;
    console.log(email);
    //checks if the fields are empty
    if (!username || !email || !password) {
        res.status(400);
        return res.render("signupError", { error: 'All fields are required.' });
    }

    try {
        console.log(User);
        const existingUser = await User.findOne({ email }); //find this email
        // console.log(existingUser);
        if (existingUser) {
            res.status(400);
            return res.render("signupError", { error: 'User already exists with that email.' });
        } else {
            // return res.redirect("/initializeTimezone");
        }

        /***** Move functions to /initializeTimezone *****/
        //creates the user and saves to db
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ username, name, email, password: hashedPassword });
        await newUser.save();

        //Attempst to log the user in unless an error is popped up
        req.login(newUser, loginErr => {
            if (loginErr) {
                res.status(500);
                return res.render("signupError", { error: `Error during signup process. ${loginErr}` });
            }
            res.redirect('/homepage');
        });

        /***** Move functions to /initializeTimezone *****/

    } catch (err) {
        res.status(500)
        return res.render("signupError", { error: 'Error during signup process: ' + err.message });
    }
});

/***** INITIALIZE TIMEZONE *****/
app.get('/initializeTimezone', async (req, res) => {
    let clientIp = requestIp.getClientIp(req); // Use requestIp to get the client IP
    console.log(`Initial Detected IP: ${clientIp}`);

    if (req.headers['x-forwarded-for']) {
        const forwardedIps = req.headers['x-forwarded-for'].split(',');
        clientIp = forwardedIps[0];
        console.log(`Forwarded IP: ${clientIp}`);
    }

    let location = "Localhost";
    let timezone = "Local Timezone";

    try {
        const response = await axios.get(`https://ipinfo.io/${clientIp}?token=${process.env.IPINFO_TOKEN}`);
        console.log('IPInfo Response:', response.data);

        const city = response.data.city || 'Unknown';
        const region = response.data.region || 'Unknown';
        const country = response.data.country || 'Unknown';
        timezone = response.data.timezone || 'Unknown';

        location = `${city}, ${region}, ${country}`;
    } catch (error) {
        console.error("Failed to fetch location:", error.response ? error.response.data : error.message);
        location = "Unknown";
        timezone = "Unknown";
    }

    res.render('initializeTimezone', { location, timezone, page: "/initializeTimezone", backlink: "/signup" });
});


app.post('/initializeTimezoneSubmit', (req, res) => {

});

/***** LOGIN ROUTES *****/
app.get('/login', (req, res) => {
    res.render('login');
});


app.post('/loggingin', (req, res, next) => {
    passport.authenticate('local', async (err, email, password, info) => {
        //After going into passport.js we recieve the done notifications stored into info 
        if (err) {
            if (!email) {
                return res.status(401).render("loginError", { error: info.message }); //extract info if there is an error
            }

            if (!password) {
                return res.status(401).render("loginError", { error: info.message });
            }
        }
        //Attempts to login in the user Goes to 
        req.login(email, loginErr => {
            if (loginErr) {
                return res.status(500).render("loginError", { error: "Username and password not a match" });
            }
            return res.redirect("/homepage");
        });
    })(req, res, next);
});

/***** FORGET PASS ROUTES *****/
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

//Calendar page
app.get('/calendar', (req, res) => {
    res.render('calendar');
});

/*****AUTHENTICATED PAGES *****/
//creating, storing project
app.get('/createProject', ensureAuth, (req, res) => {
    res.render("createProject");
})

app.post('/createProjectSubmit', (req, res) => {
    // console.log("Project Created Submitted");

    const { projectName } = req.body;
    const projectOwner = req.user._id;
    console.log(`
    projectName: ${projectName}
        projectOwner: ${projectOwner}`);
    res.redirect("/homepage");
})

/***** HOMEPAGE *****/
app.get('/homepage', ensureAuth, (req, res) => {
    res.render("homepage");
});

/***** PROFILE ROUTES *****/
app.get('/profile', ensureAuth, async (req, res) => {
    // const email = req.User.email;
    // const name = req.User.username;
    console.log(req.user)
    // console.log('User info:', userinfo);  // Add this line to log userinfo
    res.render('profile', { userinfo: req.user });
});

//handle profile update
app.post('/profile', ensureAuth, async (req, res) => {
    const { timezone } = req.body;
    console.log("Timezone received:", timezone);
    if (!timezone) {
        return res.render('profile', { errorMessage: "Timezone is required.", navLinks });
    }

    try {
        const result = await userCollection.updateOne(
            { _id: new ObjectId(req.session.userId) },
            { $set: { timezone } }
        );
        console.log("Update result:", result);
        res.redirect('/profile');
    } catch (error) {
        console.error("Failed to update timezone:", error);
        res.status(500).render('errormessage', { errorMessage: "Failed to update timezone." });
    }
});

/************************************************************************* NOT USED RN *****************************************************************/
//Workspace Setting page
app.get('/workspaceSetting', (req, res) => {
    res.render('workspaceSetting', { navLinks, currentURL: '/workspaceSetting' }); // Adjust navLinks as needed
});

app.get('/projectManagement', async (req, res) => {
    try {
        const projects = await projectCollection.find({ projectOwnerId: req.session.userId }).toArray();
        res.render('projectManagement', { projects, navLinks, currentURL: '/projectManagement' });
    } catch (error) {
        console.error("Failed to fetch projects:", error);
        res.status(500).render('errorPage', { errorMessage: "Failed to load projects." });
    }
});

// Route to add member to the list in createProject Modal
app.get('/addMember', async (req, res) => {
    const email = req.query.email;
    try {
        const user = await userCollection.findOne({ email });
        if (user) {
            res.json({ success: true, email: user.email, name: user.userName });
        } else {
            res.json({ success: false, error: "No user found with that email" });
        }
    } catch (err) {
        res.json({ success: false, error: err.message });
    }
});

const { ObjectId } = require('mongodb');

// Route to save project with members in createProject Modal
app.post('/projectManagement', async (req, res) => {

    const { projectName, description } = req.body;
    let members = JSON.parse(req.body.members || "[]");  // Ensure default to an empty array if undefined
    try {
        const project = await projectCollection.insertOne({
            projectOwnerId: req.session.userId,
            projectName,
            description
        });
        const projectId = project.insertedId;

        // Always add the project owner first
        const creator = await userCollection.findOne({ _id: new ObjectId(req.session.userId) });
        await projectMemberCollection.insertOne({
            projectId,
            projectName,
            memberEmail: creator.email,
            memberName: creator.userName,
        });

        // Add all other members
        for (let memberEmail of members) {
            if (memberEmail !== creator.email) {  // Skip adding creator again
                const user = await userCollection.findOne({ email: memberEmail });
                if (user) {
                    await projectMemberCollection.insertOne({
                        projectId,
                        projectName,
                        memberEmail: user.email,
                        memberName: user.userName,
                    });
                }
            }
        }

        // show message after successful insertion
        const message = "Project Created!";
        res.render('projectCreated', { message, navLinks });
    } catch (dbError) {
        res.render('createProjectSubmit', { errorMessage: `failed: ${dbError.message}`, navLinks: navLinks });
    }
});


//delete project and members in the project
app.delete('/deleteProject', async (req, res) => {
    const projectId = req.query.projectId;
    try {
        // Remove project from projectCollection
        await projectCollection.deleteOne({ _id: new ObjectId(projectId) });

        // Remove members associated with the project from projectMemberCollection
        await projectMemberCollection.deleteMany({ projectId: new ObjectId(projectId) });

        res.json({ success: true });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

app.get('/memberManagement', async (req, res) => {
    try {
        const projects = await projectCollection.find({ projectOwnerId: req.session.userId }).toArray();
        const selectedProjectId = req.query.projectId || (projects.length > 0 ? projects[0]._id.toString() : null);
        let filteredMembers = [];

        if (selectedProjectId) {
            filteredMembers = await projectMemberCollection.find({ projectId: new ObjectId(selectedProjectId) }).toArray();
        }

        res.render('memberManagement', {
            projects,
            filteredMembers,
            selectedProjectId,
            navLinks: [],
            authenticated: req.session.authenticated,
            userName: req.session.userName
        });
    } catch (error) {
        console.error("Failed to fetch projects or members:", error);
        res.status(500).render('errorPage', { errorMessage: "Failed to load data." });
    }
});

/**
 * update Members Permission
 * Generated by ChatGPT 3.5
 * need to fix, cannot update to db.
 * @author https://chat.openai.com/
 */
//   app.post('/updateMembersPermissions', sessionValidation, async (req, res) => {
//     const { projectId, members } = req.body;

//     try {
//       for (const email in members) {
//         const member = members[email];
//         await projectMemberCollection.updateOne(
//           { projectId: new ObjectId(projectId), memberEmail: email },
//           { $set: { view: member.view === 'on', edit: member.edit === 'on' } }
//         );
//       }

//       res.redirect(`/memberManagement?projectId=${projectId}`);
//     } catch (error) {
//       console.error("Failed to update members permissions:", error);
//       res.status(500).render('errorPage', { errorMessage: "Failed to update member permissions." });
//     }
//   });

//remove member form a project
app.delete('/removeMember', async (req, res) => {
    try {
        const { projectId, memberEmail } = req.query;
        await projectMemberCollection.deleteOne({
            projectId: new ObjectId(projectId),
            memberEmail: memberEmail
        });
        res.json({ success: true });
    } catch (error) {
        console.error("Error removing member:", error);
        res.json({ success: false, error: 'Database operation failed' });
    }
});

/************************************************************************* NOT USED RN *****************************************************************/

/* TaskPage START */

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
    if (req.isAuthenticated()) {
        const projectId = req.query.projectId;
        const userId = req.user.userId;
        if (projectId) {
            try {
                const tasksData = await fetchProjectTasks(projectId, userId);
                res.render('taskPage', {
                    authenticated: req.isAuthenticated(), 
                    username: req.user.username,
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
                authenticated: req.isAuthenticated(), 
                username: req.user.username,
                isTaskPage: true,
                projectId: ""
            });
        }
    } else {
        res.redirect('/homepage');
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
    try {
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
    } catch (err) {
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
/* TaskPage END */


app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

app.get('*', (req, res) => {
    res.status(404);
    res.render('404error');
});

/**** END OF PAGES ****/
app.listen(port, () => {
    console.log(`SyncPro node application listening on port ${port}`);
}); 
