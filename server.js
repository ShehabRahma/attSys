if(process.env.NODE_ENV !== 'production'){
    require('dotenv').config()
}
const path          = require('path');
const bcrypt        = require('bcrypt');
const express       = require('express');
const app           = express();
const mongoose      = require("mongoose")
const dotenv        = require('dotenv').config({path : path.join(__dirname,'.env')})
const DB_LINK       = process.env.DB_LINK
const user          = require('./Models/userModel')
const passport      = require('passport');
const flash         = require('express-flash')
const session       = require('express-session')

const initializePassport = require('./passport-config');
initializePassport(
    passport, 
    email => {
        const x=user.findOne({email: email}, (err,doc)=>{
            if(err) console.log(err.message);
            console.log("Res",doc);
            return doc;
        })
        if(x.email===email){return doc.email}
        else{return(console.error("bitch"))}
    },
    id => {
    
})


mongoose.connect(DB_LINK)
    .then( () => console.log("connected to db"))
    .catch( err => console.error(err.message))

app.use(express.json());
app.use(flash())
app.use(session({
    secret: process.env.SESSION_SECRETE,
    resave: false,
    saveUninitialized: false
}))
app.use(passport.initialize())
app.use(passport.session())
app.set('view engine', 'ejs');


app.get('/home', (req, res) => {
    res.render("home", {title: "Home"})
});

app.get('/login', (req, res) => {
    res.render("login", {title: "Login"})
});

app.post('/login', passport.authenticate('local', {
    successRedirect:'/home',
    failureRedirect:'/login',
    failureFlash: true
}));

app.post('/admin', async (req, res) => {
    try{
        const hashedPass = await bcrypt.hash(req.body.pass, 10);
        const newUser = new user({email:req.body.email, name: req.body.name, password: hashedPass})
        newUser.save((err, user) => {
            if (err) return console.log(err.message);

            res.send("Good")
        })

    }catch{
        res.send("Bad")
    }
}); 

// app.post('/login', (req, res) => {
//     // res.render("views/login/index.ejs")
// });

app.listen(process.env.PORT || 3000, (req, res) => {
    console.log('Server is on port 3000')
});