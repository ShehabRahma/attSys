const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema()

const Course = mongoose.model('courses', courseSchema);
module.exports = Course