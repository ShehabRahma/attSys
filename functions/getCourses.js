const Course        = require("../Models/courseModel")

const getCourses = async (email) => {
    try {
        let temp = await Course.find({instructor_email: email}, {_id: 0, roomID:0})
        temp = JSON.parse(JSON.stringify(temp))
        // console.log(temp)
        const cardVals = []
        for(let i=0;i<temp.length;i++){
            cardVals.push(temp[i].courseID)
        }
        // console.log(cardVals)
        return cardVals;
        
    } catch (err) {
        console.log(err.message)
    }
}

module.exports = getCourses