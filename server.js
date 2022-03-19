const path          = require('path');
const bcrypt        = require('bcrypt');
const express       = require('express');
const app           = express();
const mongoose      = require("mongoose")
const dotenv        = require('dotenv').config({path : path.join(__dirname,'.env')})
const DB_LINK       = process.env.DB_LINK
const User          = require('./Models/userModel')
const Course          = require('./Models/courseModel')
const passport      = require('passport');
const flash         = require('express-flash')
const session       = require('express-session')
const initializePassport = require('./passport-config');
const {homeGET, loginGET, adminPOST, Auth, NotAuth} = require('./Routes/routes')
if(process.env.NODE_ENV !== 'production') require('dotenv').config()

initializePassport(passport)

mongoose.connect(DB_LINK)
.then( () => console.log("connected to db"))
.catch( err => console.error(err.message))

app.set('view engine', 'ejs');
app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(flash())
app.use(session({
    secret: process.env.SESSION_SECRETE,
    resave: false,
    saveUninitialized: false
}))
app.use(passport.initialize())
app.use(passport.session())


app.get('/home', Auth, homeGET);
app.get('/login', NotAuth, loginGET);
app.post('/admin', adminPOST);
app.post('/login', passport.authenticate('local', {
    successRedirect:'/home',
    failureRedirect:'/login',
    failureFlash: true
}));

// app.get('/temp', async(req, res) => {

//     const queriedCourses = await Course.find({instructor_email: req.body.email})
//     console.log(queriedCourses)
//     res.sendStatus(200)
// });


app.listen(process.env.PORT || 3000, (req, res) => {
    console.log('Server is on port 3000')
});