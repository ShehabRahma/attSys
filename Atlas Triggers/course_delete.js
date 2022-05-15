exports = function (changeEvent) {

    const course_ID = changeEvent.documentKey._id;
    const rooms = context.services.get('Cluster0').db("attendance").collection("rooms");

    rooms.deleteOne({ courseID: course_ID });

};