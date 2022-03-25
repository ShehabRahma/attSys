const mongoose = require('mongoose');

const roomsSchema = new mongoose.Schema({
    courseID: {type:String, unique:true},
    studAtt: Object,
    flags: Object
});

const Room = mongoose.model('rooms', roomsSchema);
module.exports = Room