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
app.use(express.static(__dirname + '/modules'));
app.use(express.static(__dirname + '/views')); // Serve static files from the 'views' directory


/** MONGO/MONGOOSE SETUP **/
const mongoose = require('mongoose');
const { ObjectId } = require('mongodb');
const mongodb_host = process.env.MONGODB_HOST;
const mongodb_user = process.env.MONGODB_USER;
const mongodb_password = process.env.MONGODB_PASSWORD;
const mongodb_database = process.env.MONGODB_DATABASE;
const mongodb_session_secret = process.env.MONGODB_SESSION_SECRET;

// Configure session management with MongoDB storage + session creation
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

//Mongodb connection
mongoose.connect(`mongodb+srv://${mongodb_user}:${mongodb_password}@${mongodb_host}/comp2800-a1`)
    .then(async () => {
        console.log(("\n***MongoDB connected successfully***\n").toUpperCase()); // indicate we are connected to db
    })
    .catch(err => {
        console.error("Failed to connect to MongoDB:", err);
        process.exit(1);
    });

// Mongodb schema fetching
const User = require('./modules/user.js');
const Project = require('./modules/project.js');
const Task = require('./modules/task.js');
const { access } = require('fs');
//Authentication function with passport
function ensureAuth(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/');
}

/***** GET USER LOCATION AND TIMEZONE *****/
const getLocationAndTimezone = async (req) => {
    let clientIp = requestIp.getClientIp(req);
    //console.log(`Initial Detected IP: ${clientIp}`);

    if (req.headers['x-forwarded-for']) {
        const forwardedIps = req.headers['x-forwarded-for'].split(',');
        clientIp = forwardedIps[0];
    }

    console.log(`Client IP used for location: ${clientIp}`);

    let location = "LocalHost";
    let timezone = "LocalTimezone";

    try {
        const response = await axios.get(`https://ipinfo.io/${clientIp}?token=${process.env.IPINFO_TOKEN}`);
        //console.log("IPInfo API Response:", response.data);

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

    return { location, timezone };
};

module.exports = getLocationAndTimezone;

/*** PAGES ***/
app.get('/', (req, res) => {
    res.render('main');
});

/***** SIGN UP FEATURE *****/
app.get('/signup', (req, res) => {
    res.render('signup');
});

//signup handling function after pressing signup button
app.post('/signupSubmit', async (req, res) => {
    const { username, email, password, location, timezone } = req.body;
    // checks if the fields are empty
    if (!username || !email || !password || !location || !timezone) {
        res.status(400);
        return res.render("signupError", { error: 'All fields are required.' });
    }

    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            res.status(400);
            return res.render("signupError", { error: 'User already exists with that email.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ username, email, password: hashedPassword, location, timezone });
        await newUser.save();

        req.login(newUser, loginErr => {
            if (loginErr) {
                res.status(500);
                return res.render("signupError", { error: `Error during signup process. ${loginErr}` });
            }
            res.redirect('/homepage');
        });

    } catch (err) {
        res.status(500);
        return res.render("signupError", { error: 'Error during signup process: ' + err.message });
    }
});

//Gets user timezone when signup
app.post('/initializeTimezone', async (req, res) => {
    try {
        const { location, timezone } = await getLocationAndTimezone(req);
        const { username, email, password } = req.body;
        res.render('initializeTimezone', { location, timezone, username, email, password, page: "/initializeTimezone", backlink: "/signup" });

    } catch (error) {
        console.error("Failed to get user's location and timezone", error.message);
        res.status(500).render('initializeTimezone', { location: "Unknown", timezone: "Unknown" });
    }
});


/***** LOGIN ROUTES *****/
app.get('/login', (req, res) => {
    res.render('login');
});

//logging function
app.post('/loggingin', (req, res, next) => {
    passport.authenticate('local', async (err, user, info) => {
        if (err) {
            console.error("Passport authentication error:", err);
            return res.status(500).render("loginError", { error: err.message });
        }
        if (!user) {
            console.error("Authentication failed, user not found:", info.message);
            return res.status(401).render("loginError", { error: info.message });
        }
        req.login(user, async (loginErr) => {
            if (loginErr) {
                console.error("Login error:", loginErr);
                return res.status(500).render("loginError", { error: loginErr.message });
            }
            try {
                // Fetch user's location and timezone
                const { location, timezone } = await getLocationAndTimezone(req);

                // Retrieve the user document from the database
                const dbUser = await User.findOne({ email: user.email });
                if (!dbUser) {
                    return res.status(404).render("loginError", { error: "User not found" });
                }

                // Update user's location and timezone
                dbUser.location = location;
                dbUser.timezone = timezone;
                await dbUser.save();

                //Redirect to homepage
                return res.render('userLocationNotification', { username: dbUser.username, location: dbUser.location, timezone: dbUser.timezone });
            } catch (error) {
                console.error("Failed to update user's location and timezone:", error);
                return res.status(500).render("loginError", { error: "Failed to update user's location and timezone in database" });
            }
        });
    })(req, res, next);
});

/***** FORGET PASS ROUTES (Not working)*****/
app.get('/forgotPass', (req, res) => {
    res.render('forgotPass');
});

//forget password function
app.post('/forgotPass', async (req, res) => {
    const { email, password } = req.body


    const user = await User.findOne({ email: email });
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

/***** PROJECT CREATION *****/
//create project funx
app.post('/createProjectSubmit', async (req, res) => {
    const { projectName } = req.body;

    if (!projectName) {
        res.render(`errorMessage`, { error: "All fields need to be filled", backlink: "/homepage" });
    }

    try {
        const existingProjectName = await Project.findOne({ name: projectName });
        const user = await User.findOne({ email: req.user.email });
        if (existingProjectName) {
            res.status(400)
            return res.render("errorMessage",
                {
                    error: `Project exists with name ${projectName}`,
                    backlink: "/homepage"
                });
        }

        const newProject = new Project({ projectOwner: req.user._id, name: projectName, projectMembers: [req.user.email] });
        await newProject.save();

        await User.updateOne({ _id: user._id }, { $push: { projectList: newProject._id } });

        const message = "Project Created!";
        res.render('successMessage', { success: message, backlink: "/homepage" });
    } catch (dbError) {
        res.render('errorMessage', { error: `This error is: ${dbError.message}`, backlink: "/homepage" });
    }
});

//delete project funx
app.post('/deleteProject', ensureAuth, async (req, res) => {
    const { projectId } = req.body;

    const project = await Project.findOne({ _id: new ObjectId(projectId) });

    //removes members from this project
    project.projectMembers.forEach(async member => {
        await User.updateOne(
            { email: member },
            { $pull: { projectList: projectId } }
        );
    });

    //Deletes task belonging to this project
    project.taskList.forEach(async task => {
        await Task.findOneAndDelete({ _id: new ObjectId(task) });
    })
    //finds and deletes the project with given id
    const deletedProject = await Project.findOneAndDelete({ _id: new ObjectId(projectId) });

    //Success or error message
    if (deletedProject) {
        res.render("successMessage", { success: "Project Deleted", backlink: "/homepage" });
    } else {
        console.log('Project not found');
        res.render("errorMessage", { error: "Project could not be deleted", backlink: "/homepage" });
    }
})

/***** MEMBER ADDITION  *****/
app.get('/addMembersPage', ensureAuth, async (req, res) => {
    const projectId = req.query.projectId;
    const project = await Project.findOne({ _id: new ObjectId(projectId) });

    res.render("addMembersPage", { project: project });
});

//adding member function
app.post('/addMembersPageSubmit', async (req, res) => {
    const { memberEmail, projectId } = req.body;
    try {
        const projectID = new ObjectId(projectId)
        const project = await Project.findById({ _id: projectID });
        //Checks if project exists
        if (!project) {
            return res.render("errorMessage", { error: "Project not found", backlink: "/homepage" });
        }

        //Checks if member exists
        const member = await User.findOne({ email: memberEmail });
        if (!member) {
            return res.render("errorMessage", { error: "Member does not exist", backlink: "/homepage" });
        }

        //checks if member added already
        if (project.projectMembers.includes(member.email)) {
            return res.render("errorMessage", { error: "Member already added", backlink: "/homepage" });
        }

        //adds user to project members list and saves it 
        project.projectMembers.push(
            member.email
        );
        await project.save();

        // before updating user list
        console.log(`Before adding the member to the project list: ${member.projectList}`);

        //adding the project id to members list
        await User.updateOne(
            { email: memberEmail },
            { $addToSet: { projectList: projectID } }
        );

        //error checking to see if update worked
        const updatedMember = await User.findOne({ email: memberEmail });
        console.log(`After adding member to project: ${updatedMember.projectList}`);

        res.render("successMessage", { success: "Member added successfully", backlink: "/homepage" });
    } catch (error) {
        // console.error("Error adding member to project:", error);
        res.render("errorMessage", { error: error, backlink: "/homepage" });
    }
});

//deletes a member
app.post('/deleteMember', async (req, res) => {
    const { projectId, memberEmail } = req.body;
    try {
        // Find the project by ID and pull the member's email from the projectMembers array
        const result = await Project.updateOne(
            { _id: projectId },
            { $pull: { projectMembers: memberEmail } }
        );

        const memberResult = await User.updateOne(
            { email: memberEmail },
            { $pull: { projectList: projectId } }
        )

        if (result.modifiedCount === 1 && memberResult.modifiedCount === 1) {
            res.render("successMessage", { success: "Member deleted successfully", backlink: `/addMembersPage?projectId=${projectId}` });
        } else {
            res.render("errorMessage", { error: "Member not found in the project", backlink: `/addMembersPage?projectId=${projectId}` });
        }
    } catch (error) {
        res.render("errorMessage", { error: "An error occurred while deleting the member", backlink: `/addMembersPage?projectId=${projectId}` });
    }
})

/***** HOMEPAGE *****/
app.get('/homepage', ensureAuth, async (req, res) => {
    const user = await User.findOne({ email: req.user.email });

    // Fetch all projects in the projectList
    const projectPromises = user.projectList.map(projectId => Project.findById(projectId));
    const pList = await Promise.all(projectPromises);

    res.render("homepage", { projects: pList, username: req.user.username, createProject: false, location: req.user.location, timezone: req.user.timezone });
});

/***** PROFILE ROUTES *****/
app.get('/profile', ensureAuth, async (req, res) => {
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

/* TaskPage START */
// get the task data of specific project, matching same projectId and userId 
async function fetchProjectTasks(projectId, userId) {
    try {
        const project = await Project.findById(projectId);

        if (!project) {
            throw new Error("Project not found");
        }

        const taskList = project.taskList;

        // find all the tasks that meet the same taskId get from project.taskList and the userId get from passin parameter
        const accessibleTasks = await Task.find({ _id: { $in: taskList }, taskMembers: userId });

        // get the time zone info stored in accessible tasks
        const accessibleTaskDatas = await enrichTaskData(accessibleTasks);

        return accessibleTaskDatas;
    } catch (error) {
        console.error('Error fetching project tasks:', error);
        throw new Error("Internal server error");
    }
}

// get users time zones by their ids and return their username and time zones
async function getUserTimeZone(userId) {
    try {
        const user = await User.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }
        return {
            username: user.username,
            timezone: user.timezone
        };
    } catch (error) {
        console.error('Error fetching user timezone:', error);
        return null;
    }
}

// get the tasks also with the time zone of each member in group
async function enrichTaskData(tasks) {
    const enrichedTasks = [];

    for (const task of tasks) {
        const taskOwnerData = await getUserTimeZone(task.taskOwner);
        const taskMembersData = await Promise.all(task.taskMembers.map(async memberId => {
            const memberData = await getUserTimeZone(memberId);
            return { _id: memberId, ...memberData };
        }));

        const enrichedTask = {
            _id: task._id,
            title: task.title,
            description: task.description,
            startDate: task.startDate,
            startTime: task.startTime,
            dueDate: task.dueDate,
            dueTime: task.dueTime,
            taskOwner: {
                _id: task.taskOwner,
                username: taskOwnerData.username,
                timezone: taskOwnerData.timezone
            },
            taskMembers: taskMembersData.map(memberData => ({
                _id: memberData._id,
                username: memberData.username,
                timezone: memberData.timezone
            })),
            reminder: task.reminder,
            status: task.status,
            completedMembers: task.completedMembers,
        };

        enrichedTasks.push(enrichedTask);
    }
    return enrichedTasks;
}

// Task page for users who are logged in
app.get('/taskPage', ensureAuth, async (req, res) => {
    if (req.isAuthenticated()) {
        const projectId = req.query.projectId;
        const userId = req.user._id;

        if (projectId) {
            try {
                const tasksData = await fetchProjectTasks(projectId, userId);
                res.render('taskPage', {
                    authenticated: req.isAuthenticated(),
                    userId: userId.toString(),
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
                userId: userId,
                username: req.user.username,
                isTaskPage: true,
                projectId: ""
            });
        }
    } else {
        res.redirect('/homepage');
    }
});

// get current user id
app.get('/getCurrentUserId', (req, res) => {
    const userId = req.user.id;
    res.json({ userId: userId });
});

// Get a list of project names of users to put into navbar
app.get('/getUserProjectList', ensureAuth, async (req, res) => {
    try {
        const userId = req.user._id;

        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }

        const user = await User.findOne({ _id: userId });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const projectList = user.projectList || [];

        if (projectList.length === 0) {
            return res.json([]);
        }

        const projects = await Project.find({
            _id: { $in: projectList }
        }).select('_id name');

        const projectNames = projects.map(project => ({ id: project._id.toString(), name: project.name }));

        res.json(projectNames);
    } catch (error) {
        console.error('Error fetching user projects:', error);
        res.status(500).json({ error: 'Error fetching user projects' });
    }
});

// get project name based on projectId in URL query
app.get('/getProjectName', ensureAuth, async (req, res) => {
    try {
        const projectId = req.query.projectId;
        const project = await Project.findById(projectId).select('name');
        if (project) {
            res.json({ projectName: project.name });
        } else {
            res.status(404).json({ message: "Project not found" });
        }
    } catch (error) {
        console.error('Error fetching project name:', error);
        res.status(500).json({ message: "ProjectId is null" });
    }
});

// Get user task for specific project from mongoDB
app.get('/getProjectTasks', ensureAuth, async (req, res) => {
    try {
        const projectId = req.query.projectId;
        const userId = req.user._id;

        const project = await Project.findById(projectId);

        if (project) {
            const taskList = project.taskList;

            const tasks = await Task.find({ _id: { $in: taskList } });

            const accessibleTasks = tasks.filter(task => task.taskMembers.includes(userId));

            const accessibleTaskDatas = await enrichTaskData(accessibleTasks);

            res.json(accessibleTaskDatas);
        } else {
            res.status(404).json({ message: "Project not found" });
        }
    } catch (error) {
        console.error('Error fetching tasks:', error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Get members from a project and display
app.get('/getProjectMembers', ensureAuth, async (req, res) => {
    try {
        const projectId = req.query.projectId;

        const project = await Project.findById(projectId);

        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }
        console.log(project);

        // const memberIds = project.projectMembers.map(member => member._id);
        // const users = await User.find({ _id: { $in: memberIds } });

        const memberEmails = project.projectMembers;
        const users = await User.find({ email: { $in: memberEmails } });

        const userData = users.map(user => ({
            _id: user._id.toString(), // return as string type
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
    const userId = req.user._id;
    try {
        // Extract data from the request body
        const { title, description, startDate, startTime, dueDate, dueTime, reminderDatetime, selectedTaskMembers, projectId } = req.body;

        // Determine the value of the reminder field based on the value of reminderDatetime
        const reminder = reminderDatetime ? reminderDatetime : 'none';

        // Parse the selectedMembers from JSON string to an array
        const taskMembers = JSON.parse(selectedTaskMembers);

        // Check if the current user's ID already exists in taskMembers array
        if (!taskMembers.includes(userId)) {
            // Add the current user's ID to taskMembers array
            taskMembers.push(userId);
        } else {
            console.log('Current user already exists in taskMembers array');
        }

        // Create a new document object with the extracted data
        const newTask = new Task({
            title,
            description,
            startDate,
            startTime,
            dueDate,
            dueTime,
            reminder,
            taskOwner: userId,
            taskMembers
            // Add other fields as needed
        });

        // Insert the new document into the MongoDB tasks collection
        const savedTask = await newTask.save();

        // Insert the task id with string type
        const taskId = savedTask._id.toString();

        await Project.findByIdAndUpdate(
            projectId,
            { $push: { taskList: taskId } }
        );

        res.redirect(`/taskPage?projectId=${projectId}`);
    } catch (err) {
        console.error('Error adding task: ', err);
        res.status(500).send('Error adding task')
    }

});

// delete the task by taskId
app.delete('/deleteTask/:taskId', async (req, res) => {
    const taskId = req.params.taskId;
    try {
        // Remove the taskId from all projects that have it in their taskList
        await Project.updateMany(
            { taskList: taskId },
            { $pull: { taskList: taskId } }
        );

        // Delete the task from the Task collection
        await Task.findByIdAndDelete(taskId);

        res.sendStatus(200);
    } catch (error) {
        console.error('Error deleting task:', error);
        res.sendStatus(500);
    }
});

// Add tasks, get data from users and insert to mongoDB
app.post('/addTaskCalendar', async (req, res) => {
    const userId = req.user._id;
    try {
        // Extract data from the request body
        const { title, description, startDate, startTime, dueDate, dueTime, reminderDatetime, selectedTaskMembers, projectId } = req.body;

        // Determine the value of the reminder field based on the value of reminderDatetime
        const reminder = reminderDatetime ? reminderDatetime : 'none';

        // Parse the selectedMembers from JSON string to an array
        const taskMembers = JSON.parse(selectedTaskMembers);

        // Create a new document object with the extracted data
        const newTask = new Task({
            title,
            description,
            startDate,
            startTime,
            dueDate,
            dueTime,
            reminder,
            taskOwner: userId,
            taskMembers
            // Add other fields as needed
        });

        // Insert the new document into the MongoDB tasks collection
        const savedTask = await newTask.save();

        // Insert the task id with string type
        const taskId = savedTask._id.toString();
        console.log("TESTS");
        console.log(req.user._id);
        console.log(projectId);
        console.log(taskId);

        await Project.findByIdAndUpdate(
            projectId,
            { $push: { taskList: taskId } }
        );

        res.redirect(`/calendarPage?projectId=${projectId}`);
    } catch (err) {
        console.error('Error adding task: ', err);
        res.status(500).send('Error adding task')
    }

});

// get user data based on their id for showing user name on task card
app.get('/getUserById/:userId', ensureAuth, async (req, res) => {
    try {
        const userId = req.params.userId;
        const user = await User.findById(userId);
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
app.put('/updateTaskStatus/:id', ensureAuth, async (req, res) => {
    try {
        const taskId = req.params.id;
        const { status } = req.body;

        const task = await Task.findByIdAndUpdate(
            taskId,
            { status },
            { new: true }
        );

        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }

        res.json({ message: 'Task status updated', task });
    } catch (error) {
        console.error('Error updating task status:', error);
        res.status(500).json({ error: 'Error updating task status' });
    }
});

// update the completed members of the specific task - add user to completedMembers array when checked
app.post('/updateCompletedMembers/:taskId', async (req, res) => {
    const taskId = req.params.taskId;
    const userId = req.user._id;

    try {
        const user = await User.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }

        const task = await Task.findById(taskId);
        if (!task) {
            throw new Error('Task not found');
        }

        // Check if user is already in completedMembers array
        if (task.completedMembers.includes(userId)) {
            // If user is already in completedMembers array, do nothing
            return res.json({ message: 'User already marked as completed' });
        }

        task.completedMembers.push(userId);
        await task.save();

        res.json({ message: 'User marked as completed', task });
    } catch (error) {
        console.error('Error updating completed members:', error);
        res.status(500).send('Internal Server Error');
    }
});

// update the completed members of the specific task - remove user to completedMembers array when unchecked
app.post('/removeUserFromCompletedMembers/:taskId', async (req, res) => {
    const taskId = req.params.taskId;
    const userId = req.user._id;

    try {
        const task = await Task.findById(taskId);
        if (!task) {
            throw new Error('Task not found');
        }

        const userIndex = task.completedMembers.indexOf(userId);
        if (userIndex !== -1) {
            task.completedMembers.splice(userIndex, 1);

            await task.save();
        }

        res.sendStatus(200);
    } catch (error) {
        console.error('Error removing user from completed members:', error);
        res.status(500).send('Internal Server Error');
    }
});

//gets details of a task card for the specific project
app.get('/getTaskcardDetails/:taskId', async (req, res) => {
    try {
        const taskId = req.params.taskId;
        const task = await Task.findById(taskId);
        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }

        // get details from task
        const { title, description, startDate, startTime, dueDate, dueTime, taskOwner, taskMember, status, completedMembers } = task;

        // get username of taskOwner 
        const taskOwnerUser = await User.findById(taskOwner);
        const taskOwnerUsername = taskOwnerUser ? taskOwnerUser.username : null;

        // get all usernames in taskMember 
        const taskMemberUsernames = [];
        for (const memberId of task.taskMembers) {
            const memberUser = await User.findById(memberId);
            if (memberUser) {
                taskMemberUsernames.push({
                    _id: memberUser._id,
                    username: memberUser.username,
                    email: memberUser.email,
                    timezone: memberUser.timezone
                });
            }
        }

        // get all the usernames in completedMembers, if its [] return []
        const completedMembersUsernames = [];
        if (completedMembers.length > 0) {
            for (const memberId of completedMembers) {
                const memberUser = await User.findById(memberId);
                if (memberUser) {
                    completedMembersUsernames.push(memberUser.username);
                }
            }
        }

        const responseData = {
            title,
            description,
            startDate,
            startTime,
            dueDate,
            dueTime,
            taskOwner: taskOwnerUsername,
            taskMember: taskMemberUsernames,
            status,
            completedMembers: completedMembersUsernames
        };

        console.log(responseData);
        res.json(responseData);
    } catch (error) {
        console.error('Error fetching task details:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
/* TaskPage END */

/***** TIMELINE PAGE ROUTE *****/
app.get('/timelinePage', ensureAuth, async (req, res) => {
    if (req.isAuthenticated()) {
        const projectId = req.query.projectId;

        if (projectId) {
            try {
                res.render('timelinePage', {
                    authenticated: req.isAuthenticated(),
                    username: req.user.username,
                    isTaskPage: false,
                    projectId: projectId
                });
            } catch (error) {
                console.error('Error occurred: ', error);
                res.status(500).send('Internal Server Error');
            }
        } else {
            res.render('timelinePage', {
                authenticated: req.isAuthenticated(),
                username: req.user.username,
                isTaskPage: false,
                projectId: ""
            });
        }
    } else {
        res.redirect('/homepage');
    }
});

//get project members timezones and location for timezone difference calc
async function getProjectMembersInfo(projectId) {
    try {
        const project = await Project.findById(projectId);
        if (!project) {
            throw new Error('Project not found');
        }

        const memberEmails = project.projectMembers;
        const users = await User.find({ email: { $in: memberEmails } });

        return users.map(user => ({
            _id: user._id.toString(), // return as string type
            username: user.username,
            email: user.email,
            location: user.location,
            timezone: user.timezone
        }));
    } catch (error) {
        throw new Error('Error fetching project members: ' + error.message);
    }
}

//gets details of a task for the project function
async function getOneTaskDetails(taskId) {
    try {
        // Find the task by taskId
        const taskInfo = await Task.findById(taskId);

        if (!taskInfo) {
            throw new Error('Task not found');
        }

        // Get info of taskOwner
        const taskOwnerInfo = await getUserTimeZone(taskInfo.taskOwner);

        // Get taskMembers details
        const taskMembersInfo = await Promise.all(taskInfo.taskMembers.map(memberId => getUserTimeZone(memberId)));

        // Construct task detail info
        const taskDetail = {
            title: taskInfo.title,
            description: taskInfo.description,
            startDate: taskInfo.startDate,
            startTime: taskInfo.startTime,
            dueDate: taskInfo.dueDate,
            dueTime: taskInfo.dueTime,
            taskOwner: {
                username: taskOwnerInfo.username,
                timezone: taskOwnerInfo.timezone
            },
            taskMembers: taskMembersInfo.map(memberInfo => ({
                username: memberInfo.username,
                timezone: memberInfo.timezone
            }))
        };
        console.log(taskDetail);

        return taskDetail;
    } catch (error) {
        throw new Error('Error getting task details: ' + error.message);
    }
}

//get the task data from chart in timeline page
app.get("/timelineData", ensureAuth, async (req, res) => {
    if (req.isAuthenticated()) {
        const projectId = req.query.projectId;

        // Check if projectId is null
        if (!projectId) {
            return res.status(400).send('Project ID is required');
        }

        // const userId = req.user._id;
        try {
            // Fetch the project by ID
            const project = await Project.findOne({ _id: new ObjectId(projectId) });

            // Check if the project exists
            if (!project) {
                return res.status(404).send('Project not found');
            }

            // Fetch all tasks in parallel
            const tasks = await Promise.all(project.taskList.map(async taskId => await Task.findOne({ _id: new ObjectId(taskId) })));
            // Extract necessary fields
            const taskData = await Promise.all(tasks.map(task => ({
                id: task._id.toString(),
                name: task.title,
                actualStart: task.startDate.toISOString().split('T')[0],
                actualEnd: task.dueDate.toISOString().split('T')[0]
            })
            ));

            // Log the taskData to verify
            console.log(taskData);
            res.json(taskData);
        } catch (error) {
            console.error('Error occurred: ', error);
            res.status(500).send('Internal Server Error');
        }
    } else {
        res.redirect('/homepage');
    }
})

//gets project members 
app.get('/getProjectMembersInfo', async (req, res) => {
    try {
        const projectId = req.query.projectId;
        const membersInfo = await getProjectMembersInfo(projectId);
        res.json(membersInfo);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

//gets the current users timezone 
app.get('/getUserTimezone', ensureAuth, async (req, res) => {
    if (req.isAuthenticated()) {
        try {
            const userId = req.user._id;
            const userTimeZone = await getUserTimeZone(userId);

            if (userTimeZone) {
                res.json({ userTimezone: userTimeZone.timezone });
            } else {
                res.status(404).json({ message: "Timezone not found" });
            }
        } catch (error) {
            console.error('Error fetching timezone:', error);
            res.status(500).json({ message: "Internal server error" });
        }
    }
});

//get details of a singular task route
app.get('/getOneTaskDetails', async (req, res) => {
    try {
        const taskId = req.query.taskId;
        const taskInfo = await getOneTaskDetails(taskId);
        res.json(taskInfo);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

/***** CALENDAR ROUTE *****/
app.get('/calendarPage', ensureAuth, async (req, res) => {
    const projectId = req.query.projectId;
    const userId = req.user._id;
    // Fetch calendar data or other data using projectId
    // const calendarData = await fetchProjectCalendar(projectId, req.user._id);
    res.render('calendarPage', {
        authenticated: req.isAuthenticated(),
        username: req.user.username,
        projectId: projectId,
        userId: userId
    });
});

/***** EASTER EGG ROUTE *****/
app.get('/easterEgg', ensureAuth, (req, res) => {
    res.render('easterEgg');
});

/***** LOGOUT ROUTE *****/
app.get('/logout', (req, res) => {
    req.logout((err) => {
        if (err) {
            return next(err);
        }
        req.session.destroy((err) => {
            if (err) {
                return next(err);
            }
            res.redirect('/');
        });
    });
});

/***** 404 PAGE ROUTE *****/
app.get('*', (req, res) => {
    res.status(404);
    res.render('404error');
});

/**** END OF PAGES ****/
app.listen(port, () => {
    console.log(`SyncPro node application listening on port ${port}`);
});
