const bcrypt        = require('bcrypt');
const User          = require('../Models/userModel')
const Course        = require("../Models/courseModel")
const Room          = require('../Models/roomModel')


const loginGET = (req, res) => {
    res.render("login", {title: "Login"})
}

const logoutGET = (req, res) => {
    req.logout();
    res.redirect('/login');
}

const homeGET = async (req, res) => {
    try {
        if(req.session.coursesQueried){
            res.render("home", {title: "Home", user: req.user, courses: req.session.coursesQueried, message: false})       // deniedAccess: used for a condition related to courseGET rout
        }else{
            const courses = await queryCourses(req.user.email); 
            req.session.coursesQueried = courses;
            res.render("home", {title: "Home", user: req.user, courses, message: false})       // deniedAccess: used for a condition related to courseGET rout
        }
    } catch (err) {
        console.log(err)
        res.send(err.message)      
    }

}

const quickRecord = async(req, res) => {
    try {
        const courseID = req.body.courseID;
        const stID = Number(req.body.stID);
        const date = req.body.date;
        const choice = req.body.choice;
    
        const query = await Course.find( {instructor_email: "akbar.alsaleh@gmail.com", courseID: courseID}, {_id: 0, students: 1, days: 1, roomID: 1} );    // check if Dr has access to that course
        const parsedQuery = JSON.parse(JSON.stringify(query));
    
        if(parsedQuery.length === 0) {
            res.render("home", {title: "Home", user: req.user, courses: req.session.coursesQueried, message: true, messageContent: "You don't have access to this course: " + courseID, messageTheme: 'warning'}); 
        }else{
            const stExists = Object.values(parsedQuery[0].students).includes(stID);
            if(!stExists){
                res.render("home", {title: "Home", user: req.user, courses: req.session.coursesQueried, message: true, messageContent: "This student: "+ stID + " is not registered in this course: " + courseID, messageTheme: 'warning'}); 
            } else{
                const week = "UMTWHFS";
                const checkDay = new Date(date).getDay();;
                if(! parsedQuery[0].days.includes(week[checkDay])){
                    res.render("home", {title: "Home", user: req.user, courses: req.session.coursesQueried, message: true, messageContent: "There is no lecture in this chosen date: " + date, messageTheme: 'warning'}); 
                } else {
                    const nestedPath = 'studAtt.' + date
                    if(choice === 'Attendant') await Room.findByIdAndUpdate(parsedQuery[0].roomID, { $addToSet: { [nestedPath] : stID } });
                    else{
                        await Room.findByIdAndUpdate(parsedQuery[0].roomID, { $pull: { [nestedPath] : stID } });
                    }
                    res.render("home", {title: "Home", user: req.user, courses: req.session.coursesQueried, message: true, messageContent: "Recorded Successfully!", messageTheme: 'success'}); 
                }
            }            
        }
    } catch (err) {
        console.log(err)
        res.send(err.message)
    }     
}

const courseGET = async (req, res) => {
    try {
        let source;
        (req.query.searchCourse) ? source = req.query.searchCourse.toUpperCase(): source = req.params.id;     // To differentiate between searchbar(type: url query) and course-cards(type: req param)
    
        const courses = req.session.coursesQueried; 
        const found = courses.some(course => course.courseID === source);           // check if the Dr teaches this requested course 
    
        if( found ) res.render("course", {title: source, id: source});
        else res.render("home", {title: "Home", user: req.user, courses, message: true, messageContent: "You don't have access to this course: " + source, messageTheme: 'warning'}); 
    
    } catch (err) {
        console.log(err)
        res.send(err.message)      

    }    
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

module.exports = {homeGET, loginGET, quickRecord, logoutGET, courseGET, flagsGET, adminPOST, Auth, NotAuth}