const localStrategy = require('passport-local').Strategy;


function initialPassport(passport){
    passport.use(new LocalStrategy({ usernameField: 'email'}), (email, password, done) => {
        const user = getUserByEmail(email);
        if (user == null) {return done(null, false, {message: 'No user with this email'})}

        
    })

    passport.serializeUser((user, done) => {

    })
    passport.deserializeUser((id, done) => {

    })
}