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
const {homeGET, loginGET, logoutGET, courseGET, flagsGET, adminPOST, Auth, NotAuth} = require('./Routes/routes')
if(process.env.NODE_ENV !== 'production') require('dotenv').config()

initializePassport(passport)

mongoose.connect(DB_LINK)
.then( () => console.log("connected to db"))
.catch( err => console.error(err.message))

app.set('view engine', 'ejs');
app.use( express.static("static") );
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(flash())
app.use(session({
    secret: process.env.SESSION_SECRETE,
    resave: false,
    saveUninitialized: false
}))
app.use(passport.initialize())
app.use(passport.session())


app.get('/', Auth, homeGET);
app.get('/login', NotAuth, loginGET);
app.get('/home', Auth, homeGET);
app.get('/course/:id', Auth, courseGET);
app.get('/course', Auth, courseGET);
app.get('/logout', logoutGET);
app.get('/flags', flagsGET);

app.post('/admin', Auth, adminPOST);
// ! add auth below later
app.post('/quickRecord', async(req, res) => {
    const courseID = req.body.courseID;
    const stID = Number(req.body.stID);
    const date = req.body.date;
    const choice = req.body.choice;

    const query = await Course.find({instructor_email: "akbar.alsaleh@gmail.com", courseID: courseID}, {_id: 0, students: 1});
    const parsedQuery = JSON.parse(JSON.stringify(query));

    if(parsedQuery.length === 0) res.send("You can't access this course");

    const stExists = Object.values(parsedQuery[0].students).includes(stID);
    if(!stExists) res.send("This student is not registered in this course");
    else res.send([courseID, stID, date, choice])

    // console.log(courseID)
    // console.log(stID)
    // console.log(date)
    // console.log(choice)
    

    
});
app.post('/login', passport.authenticate('local', {
    successRedirect:'/home',
    failureRedirect:'/login',
    failureFlash: true
}));



// app.get('/temp', async(req, res) => {
//     console.log(req.query.id)
//     res.send(req.query.id)
// });


app.listen(process.env.PORT || 3000, (req, res) => {
    console.log('Server is on port 3000')
});