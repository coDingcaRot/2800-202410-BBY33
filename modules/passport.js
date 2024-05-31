const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require("bcrypt");
const User = require('./user.js');

/**
 * Logging in and sign up function replacing express-session 
 * for easier logging in functins and authorizatoin checking
 * 
 * @author https://chat.openai.com/
 * @author Jonathaniel Alipes
 * 
 * @param {*} passport 
 */
module.exports = function (passport) {
    passport.use(new LocalStrategy({ usernameField: 'email', passwordField: 'password'},
        async (email, password, done) => { //params are req.body from login form field
            try {
                const user = await User.findOne({ email: email }); // find user with this email and store the whole user
                if(user === null){
                    return done(user, false, {message: `user doesnt exist with email ${email}`})
                }

                if (!user) {
                    // console.log("user doesnt exist")
                    return done(null, false, { message: 'username' }); 
                }
                // password match checking
                const isMatch = await bcrypt.compare(password, user.password);  //check with given pass and stored user.password
                if (!isMatch) { 
                    // console.log("not a match")
                    return done(null, false, { message: `password not a match`});
                }

                //if match return the user
                return done(null, user); //return the valid usesr
                
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