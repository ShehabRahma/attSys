exports = function(changeEvent) {

    const courses = context.services.get('Cluster0').db("attendance").collection("courses");
    let room_ID = changeEvent.fullDocument._id;
    let course_ID = changeEvent.fullDocument.courseID;
  
    courses.updateOne(
      { "courseID": course_ID },
      {
        $push: {
          roomID : room_ID
        }
      }
    );
  };