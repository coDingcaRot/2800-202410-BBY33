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

const userCollection = database.db(mongodb_database).collection('users');

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