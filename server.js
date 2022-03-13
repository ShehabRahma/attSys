const express = require('express');
const app = express();
const bcrypt = require('bcrypt');
const passport = require('passport');
const initialPassport = require('./initialPassport.js');
initialPassport(passport)

app.set('view-engine', 'ejs')
app.get('/', (req, res) => {
    res.render("index.ejs", {name:"Akbar"})
});
app.get('/login', (req, res) => {
    res.render("views/login/index.ejs")
});
app.post('/login', (req, res) => {
    // res.render("views/login/index.ejs")
});

app.listen(3000, (req, res) => {
    console.log('Server is on port 3000')
});