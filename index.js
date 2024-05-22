/***** REQUIRED TO START! *****/
require('dotenv').config();
const express = require('express');
const app = express();
const session = require('express-session');
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
app.use(express.static(path.join(__dirname, 'public')));
app.set("view engine", "ejs"); // ejs engine setup


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

/**
 *  mongoStart().catch(console.error); <--- Original way of starting doesnt work. 
 *  Since we are using mongoose we need to use mongoose to connect and to use its features
 * */ 

// Mongodb schema fetching
const User = require('./modules/user.js');

// const projectCollection = database.db(mongodb_database).collection('projects');
// const projectMemberCollection = database.db(mongodb_database).collection('projectMembers');

/*** MIDDLEWARE FUNCTIONS  ***/
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
        return res.render("signupError", {error: 'All fields are required.'});
    }

    try {
        console.log(User);
        const existingUser = await User.findOne({email}); //find this email
        // console.log(existingUser);
        if (existingUser) {
            res.status(400);
            return res.render("signupError", {error: 'User already exists with that email.'});
        } else{
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
                return res.render("signupError", {error: `Error during signup process. ${loginErr}`});
            }
            res.redirect('/homepage');
        });

        /***** Move functions to /initializeTimezone *****/

    } catch (err) {
        res.status(500)
        return res.render("signupError", {error: 'Error during signup process: ' + err.message});
    }
});

/***** INITIALIZE TIMEZONE *****/
app.get('/initializeTimezone', (req, res) => {
    res.render('initializeTimezone');
});

app.post('/initializeTimezoneSubmit', (req, res) => {
});

/***** HOMEPAGE *****/
app.get('/homepage', ensureAuth, (req, res) => {
    res.render("homepage");
});

/***** LOGIN ROUTES *****/
app.get('/login', (req, res) => {
    res.render('login');
});


app.post('/loggingin', (req, res, next) => {
    passport.authenticate('local', (err, email, info) => {
        // console.log(email)
        if (err) {
            console.log(err);
            return res.status(500).render("loginError", {error: "User does not exist"});
        }
        if (!email) {
            return res.status(401).render("loginError", {error: "Someone has your email"});
        }

        //logins in the user
        req.login(email, loginErr => {
            if (loginErr) {
                return res.status(500).render("loginError", {error: "Password not a match"});
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

// Members only page
// app.get('/members', (req, res) => {
//     if (!req.session.authenticated) {
//         return res.redirect('/login');
//     } else {
//         res.render('members', {user: req.session.username});   
//     }
// });

/***** PROFILE ROUTES *****/
app.get('/profile', ensureAuth, async(req, res) => {
        // const email = req.User.email;
        // const name = req.User.username;
        console.log(req.user)
        // console.log('User info:', userinfo);  // Add this line to log userinfo
        res.render('profile', {userinfo: req.user});
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

/***** WORKSPACE SETTING ROUTES *****/
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
