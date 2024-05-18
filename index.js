require("./utils.js");
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const bcrypt = require('bcrypt');
const url = require('url');
const saltRounds = 12;


const port = process.env.PORT || 3000;
const app = express();
const Joi = require("joi");

const expireTime = 60 * 60 * 1000; //expires after one hour

/* secret information section */
const mongodb_host = process.env.MONGODB_HOST;
const mongodb_user = process.env.MONGODB_USER;
const mongodb_password = process.env.MONGODB_PASSWORD;
const mongodb_database = process.env.MONGODB_DATABASE;
const mongodb_session_secret = process.env.MONGODB_SESSION_SECRET;
const node_session_secret = process.env.NODE_SESSION_SECRET;
/* END secret section */

var { database } = require('./databaseConnection');

const userCollection = database.db(mongodb_database).collection('users');

const projectCollection = database.db(mongodb_database).collection('projects');

const projectMemberCollection = database.db(mongodb_database).collection('projectMembers');

app.set('view engine', 'ejs');

// Parse URL-encoded bodies (as sent by HTML forms)
app.use(express.urlencoded({ extended: false })); // 'extended: true' allows for rich objects and arrays to be encoded.

// Configure session management with MongoDB storage
var mongoStore = MongoStore.create({
    mongoUrl: `mongodb+srv://${process.env.MONGODB_USER}:${process.env.MONGODB_PASSWORD}@${process.env.MONGODB_HOST}/sessions`,
    crypto: {
        secret: process.env.MONGODB_SESSION_SECRET
    }
});

app.use(session({
    secret: process.env.NODE_SESSION_SECRET,
    store: mongoStore,
    saveUninitialized: false,
    resave: false,

}));

function isValidSession(req) {
    if (req.session.authenticated) {
        return true;
    }
    return false;
}

//middleware function for checking authentification
function sessionValidation(req, res, next) {
    if (isValidSession(req)) {
        next();
    } else {
        res.redirect('/login');
    }
}


const navLinks = [
    { name: 'Home', link: '/' },
    { name: 'Login', link: '/login' },
    { name: 'Sign Up', link: '/signup' },
    { name: 'Profile', link:'/profile'},
    { name: 'Workspace', link: '/workspaceSetting'},

];

// Homepage route
app.get('/', (req, res) => {

    const authenticated = req.session.authenticated || false;
    const userName = req.session.userName || '';

    res.render('index', {
        authenticated,
        userName,
        navLinks,
        currentURL: req.url
    });
});

// Signup page 
app.get('/signup', (req, res) => {
    const message = req.query.error ? decodeURIComponent(req.query.error) : null;
    const retry = req.query.retry === 'true'; // Only show "Try again" link if retry is true
    res.render('signup', { message, retry, navLinks, currentURL: '/signup' });
});

// Handle signup submission
app.post('/signupSubmit', async (req, res) => {
    const { userName, email, password } = req.body;

    // Check if any field is empty
    if (!userName || !email || !password) {
        const errorMessage = "All fields (userName, email, password) are required.";
        res.render('signupSubmit', { errorMessage: errorMessage, navLinks: navLinks });
    }

    // Define the Joi validation schema for detailed validation
    const schema = Joi.object({
        userName: Joi.string().alphanum().min(3).max(20),
        email: Joi.string().email().max(30),
        password: Joi.string().min(3).max(20)
    });

    // Validate input using the Joi schema
    const validationResult = schema.validate({ userName, email, password });
    if (validationResult.error) {
        const errorMessage = validationResult.error.details[0].message;
        res.render('signupSubmit', { errorMessage: errorMessage, navLinks: navLinks });
        return; // Prevent further execution in case of error
    }

    try {
        // Check if user already exists
        const existingUser = await userCollection.findOne({ $or: [{ email }, { userName }] });
        if (existingUser) {
            res.render('signupSubmit', { errorMessage: "User already exists with the same email or username.", navLinks: navLinks });
            return;
        }

        // Hash password and insert new user
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        await userCollection.insertOne({ userName, email, password: hashedPassword });

        // Authenticate user and set session
        req.session.authenticated = true;
        req.session.userName = userName;

        // Redirect to members page
        res.redirect('/members');
    } catch (dbError) {
        //console.error("Signup error:", dbError);
        res.render('signupSubmit', { errorMessage: `Signup failed: ${error.message}`, navLinks: navLinks });
    }
});

// Login page
app.get('/login', (req, res) => {
    res.render('login', { navLinks, currentURL: '/login' });
});

// Handle login
app.post('/logingin', async (req, res) => {
    // Define Joi schema for validating email and password
    const loginSchema = Joi.object({
        email: Joi.string().email().max(30).required(),
        password: Joi.string().min(3).max(20).required()
    });

    // Validate the email and password against the schema
    const result = loginSchema.validate(req.body);
    if (result.error) {
        // If validation fails, send an error message and stop further processing
        const errorMessage = result.error.details[0].message;
        res.render('logingin', { errorMessage: errorMessage, navLinks });
        return;
    }

    // If validation is successful, proceed with checking the credentials
    const { email, password } = req.body;
    const user = await userCollection.findOne({ email });

    if (user && await bcrypt.compare(password, user.password)) {
        req.session.authenticated = true;
        req.session.userId = user._id;
        req.session.user_type = user.user_type;
        req.session.cookie.maxAge = expireTime;
        res.redirect('/members');
    } else {
        res.render('logingin', { navLinks });
    }
});

app.use('/loggedin', sessionValidation);
app.get('/loggedin', (req, res) => {
    if (!req.session.authenticated) {
        res.redirect('/login');
    }
    res.render("loggedin");
})

const images = ['/image1.jpg', '/image2.jpg', '/image3.jpg'];

// Members only page
app.get('/members', (req, res) => {
    if (!req.session.authenticated) {
        return res.redirect('/');
    }
    res.render("members", {
        user: req.session.userName,
        navLinks,
        currentURL: '/members',
        images
    });
});

//profile page
app.get('/profile', sessionValidation, async(req, res) => {
    try {
        const userinfo = await userCollection.findOne({ _id: new ObjectId(req.session.userId) });
        const timezones = [
            "Pacific/Midway (UTC-11:00)",
            "America/Adak (UTC-10:00)",
            "Pacific/Honolulu (UTC-10:00)",
            "America/Anchorage (UTC-09:00)",
            "America/Los_Angeles (UTC-08:00)",
            "America/Denver (UTC-07:00)",
            "America/Chicago (UTC-06:00)",
            "America/New_York (UTC-05:00)",
            "Europe/London (UTC+00:00)",
            "Europe/Paris (UTC+01:00)",
            "Europe/Moscow (UTC+03:00)",
            "Asia/Dubai (UTC+04:00)",
            "Asia/Kolkata (UTC+05:30)",
            "Asia/Singapore (UTC+08:00)",
            "Asia/Tokyo (UTC+09:00)",
            "Australia/Sydney (UTC+10:00)"
        ];
        res.render('profile', {userinfo, timezones, navLinks, currentURL:'/profile'});
    } catch (error) {
        console.error("Failed to fetch userinfo:", error);
        res.status(500).render('errormessage', { errorMessage: "Failed to load userinfo." });
    }

});

//handle profile update
app.post('/profile', sessionValidation, async (req, res) => {
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


//Workspace Setting page
app.get('/workspaceSetting', sessionValidation, (req, res) => {
    res.render('workspaceSetting', { navLinks, currentURL:'/workspaceSetting' }); // Adjust navLinks as needed
});

app.get('/projectManagement', sessionValidation, async (req, res) => {
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
app.post('/projectManagement', sessionValidation, async (req, res) => {
    
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
app.delete('/deleteProject', sessionValidation, async (req, res) => {
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
  

  app.get('/memberManagement', sessionValidation, async (req, res) => {
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
  app.post('/updateMembersPermissions', sessionValidation, async (req, res) => {
    const { projectId, members } = req.body;
  
    try {
      for (const email in members) {
        const member = members[email];
        await projectMemberCollection.updateOne(
          { projectId: new ObjectId(projectId), memberEmail: email },
          { $set: { view: member.view === 'on', edit: member.edit === 'on' } }
        );
      }
  
      res.redirect(`/memberManagement?projectId=${projectId}`);
    } catch (error) {
      console.error("Failed to update members permissions:", error);
      res.status(500).render('errorPage', { errorMessage: "Failed to update member permissions." });
    }
  });

  //remove member form a project
  app.delete('/removeMember', sessionValidation, async (req, res) => {
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

// Logout
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// Static files
app.use(express.static(__dirname + "/public"));

// 404 page
app.get('*', (req, res) => {
    res.status(404).render('404', { navLinks });
});

app.listen(port, () => {
    console.log("Node application listening on port " + port);
});
