exports = function(changeEvent) {
  
    const sem = 1;                       //first sem = 1 / second = 2 / summer = 3
    const year = 2022;                    //study start date
    const month = 1;                      //study start date (Jan = 0, Feb = 1 ...etc)
    const day = 6;                       //study start date
  
    
    const rooms = context.services.get('Cluster0').db("attendance").collection("rooms");
    const course_ID = changeEvent.fullDocument.courseID;
    const weekDays = changeEvent.fullDocument.days;
  
    let records = {};                                   //object to hold final dates
    weekDays.forEach( weekday => {
      let dates = getDates(year, month, day, sem, weekday).reduce((previous,current)=> (previous[current]=[],previous),{});     //generate dates for that weekday (ex: "U") for the whole semester (this transform recieved array to objects)
      Object.assign(records, dates);                    //add dates to the records
    });
    records = Object.keys(records).sort().reduce(       // sort the dates
      (obj, key) => { 
        obj[key] = records[key]; 
        return obj;
      }, 
      {}
    );
    const new_room = {
     courseID: course_ID,
     studAtt:records,
      flags:records
    };
    
    rooms.insertOne(new_room);
  

    function getDates(year, month, day, sem, weekDay){
  
        let date = new Date(year, month, day);
        let endOfsem = new Date(year, month, day);
        switch (sem) {                              //get the end of semester month 
            case 3:                                   
                endOfsem.setMonth(date.getMonth() + 2);  //summer course
                endOfsem = endOfsem.getMonth();
            break;

            default:
                endOfsem.setMonth(date.getMonth() + 4);  //normal course
                endOfsem = endOfsem.getMonth();
            break;
        }

        const arr = ["U", "M", "T", "W", "H"];      //week days
        weekDay = arr.indexOf(weekDay);             //set week day to int value
        while (date.getDay() != weekDay) {          //set week day in date object
            date.setDate(date.getDate() + 1);
        }

        let days = [];
        let m;
        let d;
        while (date.getMonth() != endOfsem) {     //format the date and insert it to array
            m = date.getMonth() + 1;
            d = date.getDate();
            days.push(
            year + '-' +
            (m < 10 ? '0' + m : m) + '-' +
            (d < 10 ? '0' + d : d)
            );
            date.setDate(date.getDate() + 7);       //set the date to next week
        }

        return days;
    }
};