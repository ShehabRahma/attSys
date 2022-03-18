const bcrypt        = require('bcrypt');
const User          = require('../Models/userModel')


const homeGET = (req, res) => {
    res.render("home", {title: "Home", name: req.user.name})
}

const loginGET = (req, res) => {
    res.render("login", {title: "Login"})
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

module.exports = {homeGET, loginGET, adminPOST, Auth, NotAuth}