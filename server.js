const express = require('express');
const app = express();

// const bcrypt = require('bcrypt');
// const passport = require('passport');
// const initialPassport = require('./initialPassport.js');
// initialPassport(passport)

app.set('view engine', 'ejs')
// app.get('/', (req, res) => {
//     res.render("index.ejs", {name:"Akbar"})
// });

app.get('/', (req, res) => {
    res.render("index", {title: "Home"})
});
app.get('/login', (req, res) => {
    res.render("login", {title: "Login"})
});
// app.post('/login', (req, res) => {
//     // res.render("views/login/index.ejs")
// });

app.listen(process.env.PORT || 3000, (req, res) => {
    console.log('Server is on port 3000')
});