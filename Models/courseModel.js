const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
    courseID: {type:String, unique:true},
    start: Number,
    ends: Number,
    days: [String],
    room: String,
    instructor: String,
    instructor_email: String,
    students: Object,
    roomID: [String]
});

const Course = mongoose.model('courses', courseSchema);
module.exports = Course