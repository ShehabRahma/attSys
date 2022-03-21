const bcrypt        = require('bcrypt');
const User          = require('../Models/userModel')
const Course        = require("../Models/courseModel")


const homeGET = async (req, res) => {
    const query = await Course.find({instructor_email: req.user.email}, {_id: 0, courseID: 1})
    const courses = JSON.parse(JSON.stringify(query))   // must be done, cause the object received from mongo is type BSON

    res.render("home", {title: "Home", user: req.user, courses})
}

const courseGET = async (req, res) => {
    res.render("course", {title: req.params.id, id: req.params.id})
}

const loginGET = (req, res) => {
    res.render("login", {title: "Login"})
}

const logoutGET = (req, res) => {
    req.logout();
    res.redirect('/login');
}

const flagsGET = (req, res) => {
    res.render("flags", {title: "Flags"})
}

const adminPOST = async (req, res) => {
    try{
        const hashedPass = await bcrypt.hash(req.body.password, 10);
        const newUser = new User({email:req.body.email, name: req.body.name, password: hashedPass})
        newUser.save((err, user) => {
            if (err) return console.log(err.message);

            res.send("Good")
        })

    }catch (err){
        console.log(err)
        res.send("Bad")
    }
}


const Auth = (req, res, next) => {
    if(req.isAuthenticated()) next();

    else res.redirect('/login');
}
const NotAuth = (req, res, next) => {
    if(req.isAuthenticated()) res.redirect('/home');

    else next();
}

module.exports = {homeGET, loginGET, logoutGET, courseGET, flagsGET, adminPOST, Auth, NotAuth}