const mongoose = require('mongoose');

const usersSchema = new mongoose.Schema({
    email:      {type:String, required:true, unique:true},
    name:       {type:String, required:true},
    password:   {type:String, required:true}   
}, {timestamp:true})

const User = mongoose.model('users', usersSchema);
module.exports = User