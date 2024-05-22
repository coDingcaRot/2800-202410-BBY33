const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require("bcrypt");
const User = require('./user.js');

module.exports = function (passport) {
    passport.use(new LocalStrategy(
        { usernameField: 'email', passwordField: 'password'},
        async (email, password, done) => {
            try {
                //Fetching and checking for user in database
                const emailVerify = await User.findOne({ email: email });
                if (!emailVerify) {
                    return done(null, false, { message: 'username' }); 
                }

                // password match checkign
                const isMatch = await bcrypt.compare(password, user.password); 
                if (!isMatch) { 
                    return done(null, false, { message: 'password' });
                }

                //if match return the user
                return done(null, user);
            } catch (err) {
                return done(err);
            }
        }
    ));

    passport.serializeUser((user, done) => {
        done(null, user.id);
    });

    passport.deserializeUser(async (id, done) => {
        try {
            const user = await User.findById(id);
            done(null, user);
        } catch (err) {
            done(err);
        }
    });
};