const LocalStrategy         = require('passport-local').Strategy;
const bcrypt                = require('bcrypt');
const collection            = require('./Models/userModel')

function initializePassport(passport){
    const authenticateUser = async (email, password, done) => {
        const user = await collection.findOne({email: email})
        if (user == null) {return done(null, false, {message: 'No user with this email'})}
        try{
            if(await bcrypt.compare(password, user.password)){
                console.log("user authenticated")
                return done(null, user)
            }else{
                console.log("user NOT authenticated")
                return done(null, false, {message: "Password incorrect"})
            }
            
        }catch(err){
            console.log(err)
            return done(err)
        }
    }

    passport.use(new LocalStrategy({usernameField: 'email'}, authenticateUser));
    passport.serializeUser((user, done) => done(null, user._id.valueOf()));
    passport.deserializeUser(async (id, done) => {
        const user = await collection.findById(id);
        return done(null, user)
    })
}

module.exports = initializePassport