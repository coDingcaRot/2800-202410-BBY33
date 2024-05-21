require("./utils.js");
require('dotenv').config();
const express = require('express');
const app = express();
const session = require('express-session');
const MongoStore = require('connect-mongo');
const bcrypt = require('bcrypt');
const Joi = require('joi');
const favicon = require('serve-favicon');
const path = require('path');
const saltRounds = 12;
const port = process.env.Port || 3000;
const expireTime = 1 * 60 * 60 * 1000; // Expires after 1 hour
app.set("view engine", "ejs");

// Configure session management with MongoDB storage
var mongoStore = MongoStore.create({
    mongoUrl: `mongodb+srv://${process.env.MONGODB_USER}:${process.env.MONGODB_PASSWORD}@${process.env.MONGODB_HOST}/sessions`,
    crypto: {
        secret: process.env.MONGODB_SESSION_SECRET
    }
});

/* secret info section */
const mongodb_host = process.env.MONGODB_HOST;
const mongodb_user = process.env.MONGODB_USER;
const mongodb_password = process.env.MONGODB_PASSWORD;
const mongodb_database = process.env.MONGODB_DATABASE;
const mongodb_session_secret = process.env.MONGODB_SESSION_SECRET;
const node_session_secret = process.env.NODE_SESSION_SECRET;
/* end of secret section */

var { database } = include('databaseConnection');

const userCollection = database.db(mongodb_database).collection('users');

const projectCollection = database.db(mongodb_database).collection('projects');
const projectMemberCollection = database.db(mongodb_database).collection('projectMembers');

app.use(express.urlencoded({ extended: false }));

app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));

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

// const navLinks = [
//     { name: 'Home', link: '/' },
//     { name: 'Login', link: '/login' },
//     { name: 'Sign Up', link: '/signup' },
//     { name: 'Profile', link:'/profile'},
//     { name: 'Workspace', link: '/workspaceSetting'}
// ];
// const images = ['/image1.jpg', '/image2.jpg', '/image3.jpg'];

// Members only page
app.get('/members', (req, res) => {
    if (!req.session.authenticated) {
        return res.redirect('/login');
    } else {
        res.render('members', {user: req.session.username});   
    }
});

//profile page
app.get('/profile', sessionValidation, async(req, res) => {
        const userinfo = await userCollection.findOne({ _id: new ObjectId(req.session.userId)});
        console.log('User info:', userinfo);  // Add this line to log userinfo
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
        res.render('profile', {userinfo: userinfo});
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
