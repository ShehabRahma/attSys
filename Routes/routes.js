const bcrypt        = require('bcrypt');
const User          = require('../Models/userModel')
const Course        = require("../Models/courseModel")


const homeGET = async (req, res) => {
    try {
        const courses = await queryCourses(req.user.email); 
        res.render("home", {title: "Home", user: req.user, courses, deniedAccess: false})       // deniedAccess: used for a condition related to courseGET rout
    } catch (err) {
        console.log(err)
        res.send(err.message)      
    }

}

const courseGET = async (req, res) => {
    try {
        let source;
        (req.query.searchCourse) ? source = req.query.searchCourse.toUpperCase(): source = req.params.id;     // To differentiate between searchbar(type: url query) and course-cards(type: req param)
    
        const courses = await queryCourses(req.user.email); 
        const found = courses.some(course => course.courseID === source);           // check if the Dr teaches this requested course 
    
        if( found ) res.render("course", {title: source, id: source});
        else res.render("home", {title: "Home", user: req.user, courses, deniedAccess: true, deniedCourse: source}); 
    
    } catch (err) {
        console.log(err)
        res.send(err.message)      

    }    
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
        res.send(err.message)
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

const queryCourses = async (userEmail) => {
    try {
        const query = await Course.find({instructor_email: userEmail}, {_id: 0, courseID: 1});
        const courses = JSON.parse(JSON.stringify(query));      // must be done, cause the object received from mongo is type BSON
        
        return courses;
    } catch (err) {
        console.log(err.message)
        return null;
    }
}

module.exports = {homeGET, loginGET, logoutGET, courseGET, flagsGET, adminPOST, Auth, NotAuth}