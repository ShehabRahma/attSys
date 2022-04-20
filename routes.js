const bcrypt        = require('bcrypt');
const User          = require('./Models/userModel')
const Course        = require("./Models/courseModel")
const Room          = require('./Models/roomModel')
const fs            = require('fs');
const archiver      = require('archiver');
const xl            = require('excel4node');


const loginGET = (req, res) => {
    res.render("login", {title: "Login"})
}

const logoutGET = (req, res) => {
    req.logout();
    res.redirect('/login');
}


// home page
const homeGET = async (req, res) => {
    try {
        if(req.session.coursesQueried){                                                                         // check if courses list were already stored in session variable (already logged in)
            res.render("home", {title: "Home", user: req.user, courses: req.session.coursesQueried, message: false})       
        }else{
            const courses = await queryCourses({instructor_email: req.user.email}, {_id: 0, courseID: 1});      // query courses list
            req.session.coursesQueried = courses;                                                               // save courses in session variable (to be used globally in other routes)

            res.render("home", {title: "Home", user: req.user, courses, message: false})       
        }
    } catch (err) {
        console.log(err)
        res.send(err.message)      
    }

}
// inside home page
const quickRecord = async(req, res) => {
    try {
        const courseID = req.body.courseID.toUpperCase();
        const stID = Number(req.body.stID);
        const date = req.body.date;
        const choice = req.body.choice;
    
        const parsedQuery = await queryCourses({instructor_email: req.user.email, courseID: courseID},
             {_id: 0, students: 1, days: 1, roomID: 1})       
    
        if(parsedQuery.length === 0) {                                                      // check if Dr has access to this course
            res.render("home", {title: "Home", user: req.user, courses: req.session.coursesQueried, message: true, messageContent: "You don't have access to this course: " + courseID, messageTheme: 'warning'}); 
        }else{
            const stExists = Object.values(parsedQuery[0].students).includes(stID);
            if(!stExists){                                                                  // check if the ID exists in the list of course students
                res.render("home", {title: "Home", user: req.user, courses: req.session.coursesQueried, message: true, messageContent: "This student: "+ stID + " is not registered in this course: " + courseID, messageTheme: 'warning'}); 
            } else{

                const studAtt = JSON.parse(JSON.stringify(await Room.findById(parsedQuery[0].roomID, { _id: 0, studAtt: 1 }))).studAtt;
                const allDates = Object.keys(studAtt);

                if(! allDates.includes(date)){                                              // check if the chosen date exists in the database
                    res.render("home", {title: "Home", user: req.user, courses: req.session.coursesQueried, message: true, messageContent: "There is no lecture in this chosen date: " + date, messageTheme: 'warning'}); 
                }else {
                    const nestedPath = 'studAtt.' + date
                    if(choice === 'Attendant') await Room.findByIdAndUpdate(parsedQuery[0].roomID, { $addToSet: { [nestedPath] : stID } });
                    else{
                        await Room.findByIdAndUpdate(parsedQuery[0].roomID, { $pull: { [nestedPath] : stID } });                                // record as absent (remove student ID if existed in the record)
                    }
                    res.render("home", {title: "Home", user: req.user, courses: req.session.coursesQueried, message: true, messageContent: "Recorded Successfully!", messageTheme: 'success'}); 
                }
            }            
        }
    } catch (err) {
        console.log(err)
        res.send(err.message)
    }     
}
// inside home page
const exportAll = async (req, res) => {
    try {

        const targetDir = `./attExport/${req.user.email}`;
        const targetZip = `./attExport/${req.user.email}.zip`;
        
        await createDir(targetDir);
        await new Promise(resolve => setTimeout(resolve, 500));     // wait

        await insertFiles();
        await new Promise(resolve => setTimeout(resolve, 500));     // wait

        await zipDir(targetDir, targetZip);
        await new Promise(resolve => setTimeout(resolve, 500));     // wait
        
        res.download(targetZip);
        await new Promise(resolve => setTimeout(resolve, 500));     // wait

        await deleteDir(targetZip, false);
        await new Promise(resolve => setTimeout(resolve, 500));     // wait

        await deleteDir(targetDir, true);

        

        async function createDir(path){
            fs.mkdir(path, (err) => {
                if (err) { return console.error(err);}
                else { console.log('Dir created');}
            });
        }
        async function insertFiles(){
            const courses = req.session.coursesQueried;
            courses.forEach( async (course) => {
    
                var from            = req.body.fromDate;
                var to              = req.body.toDate;
                const courseID      = course.courseID;
                const parsedQuery   = await queryCourses({instructor_email: req.user.email, courseID: courseID}, {_id: 0, students: 1, days: 1, roomID: 1})
                const students      = Object.values(parsedQuery[0].students);
                const studAtt       = JSON.parse(JSON.stringify(await Room.findById(parsedQuery[0].roomID, { _id: 0, studAtt: 1 }))).studAtt;
                const days          = parsedQuery[0].days;
                const allDates      = Object.keys(studAtt);
                const docFormat     = req.body.docFormat;

                [from, to]          = await properDate(allDates, from, to, days);
                const selectedDates = allDates.slice(allDates.indexOf(from), allDates.indexOf(to) + 1);

                const report = { Course: courseID, All:{}, Warning:{}, WF:{} };
                let warning; let wf;
                if (days.length == 2) { warning = 4; wf = 8; }
                else { warning = 6; wf = 12; }
                
                await getAttendance();

                await writeToFile();



                async function getAttendance(){
                    students.forEach( student => {
                        report.All[student] = 0;
                        
                        selectedDates.forEach( date => {
                            if(! studAtt[date].includes(student)) { report.All[student] = report.All[student] + 1; }
                        })
            
                        if(report.All[student] >= wf) { report.WF[student] = report.All[student]; }
                        else if(report.All[student] >= warning) { report.Warning[student] = report.All[student]; }
                    });
                }
                async function writeToFile(){

                    if(docFormat == "EXCEL") EXCEL();
                    else if (docFormat == "JSON") JSOON();

                    function EXCEL(){
                        const wb = new xl.Workbook();
                        const ws = wb.addWorksheet('Worksheet Name');

                        ws.cell(1, 1).string(courseID);
                        ws.cell(1, 3).string(`From: ${from}`);
                        ws.cell(1, 5).string(`To: ${to}`);
    
                        ws.cell(3, 1).string("All");
                        ws.cell(4, 1).string("ID");
                        ws.cell(4, 2).string("Absence");
    
                        ws.cell(3, 4).string("Warning");
                        ws.cell(4, 4).string("ID");
                        ws.cell(4, 5).string("Absence");
    
                        ws.cell(3, 7).string("WF");
                        ws.cell(4, 7).string("ID");
                        ws.cell(4, 8).string("Absence");
    
    
                        const All_IDs = Object.keys(report.All);
                        insertToSheet(All_IDs, 5, 1);
                        const All_Abs = Object.values(report.All);
                        insertToSheet(All_Abs, 5, 2);
                        
                        const Warning_IDs = Object.keys(report.Warning);
                        if(Warning_IDs.length > 0){
                            insertToSheet(Warning_IDs, 5, 4);
                            const Warning_Abs = Object.values(report.Warning);
                            insertToSheet(Warning_Abs, 5, 5);
                        }
    
                        const WF_IDs = Object.keys(report.WF);
                        if(WF_IDs.length > 0){
                            insertToSheet(WF_IDs, 5, 7);
                            const WF_Abs = Object.values(report.WF);
                            insertToSheet(WF_Abs, 5, 8);
                        }
    


                        async function insertToSheet(data, initRow, col){
                            data.forEach( item => {
                                ws.cell(initRow, col).number(Number(item))
                                initRow++;
                            })
                        }
    
                        wb.write(`./attExport/${req.user.email}/${course.courseID}.xlsx`);
                    }
                    function JSOON(){
                        fs.writeFile(`./attExport/${req.user.email}/${course.courseID}.json`, JSON.stringify(report), err => {
                            if (err) throw err;
                        });
                    }
                }
            })

            console.log('Files inserted')
        }
        function zipDir(sourceDir, outPath) {
            const archive = archiver('zip', { zlib: { level: 9 }});
            const stream = fs.createWriteStream(outPath);
          
            return new Promise((resolve, reject) => {
              archive
                .directory(sourceDir, false)
                .on('error', err => reject(err))
                .pipe(stream)
              ;
          
              stream.on('close', () => resolve());
              archive.finalize();
              console.log('File zipped')
            });
        }
        async function deleteDir(path, recurChoice){
            fs.rm(path, { recursive: recurChoice }, err => {
                if(err) {console.error(err.message);}
                else { console.log("Dir deleted");}
            })
        }

    } catch (err) {
        console.log(err);
        res.send(err.message);
    }  
}


// course page
const courseGET = async (req, res) => {
    try {
        let source;
        (req.query.searchCourse) ? source = req.query.searchCourse.toUpperCase(): source = req.params.id.toUpperCase();     // To differentiate between searchbar(type: url query) and course-cards(type: req param)
    
        const courses   = req.session.coursesQueried; 
        const found     = courses.some(course => course.courseID === source);           // check if the Dr teaches this requested course 
        
        if( found ) {
            const parsedQuery = await queryCourses({instructor_email: req.user.email, courseID: source},{_id: 0, roomID: 1})
            const studAtt = JSON.parse(JSON.stringify(await Room.findById(parsedQuery[0].roomID, { _id: 0, studAtt: 1 }))).studAtt;
            const allDates = Object.keys(studAtt);                                                              // all lecture dates available for this course in the DB
        
            res.render("course", {title: source, id: source, allDates: allDates, message: false});

        }else {
            res.render("home", {title: "Home", user: req.user, courses, message: true,
                messageContent:  `You don't have access to this course: ${source}`, messageTheme: 'warning'});
        } 

    } catch (err) {
        console.log(err)
        res.send(err.message)      
    }    
}
// inside course page
const exportSingle = async (req, res) => {

    try {
        var from            = req.body.fromDate;
        var to              = req.body.toDate;
        const courseID      = req.params.id;
        const targetDir     = `./attExport/`;
        const fileName      = courseID;
        const parsedQuery   = await queryCourses({instructor_email: req.user.email, courseID: courseID}, {_id: 0, students: 1, days: 1, roomID: 1})
        const students      = Object.values(parsedQuery[0].students);
        const studAtt       = JSON.parse(JSON.stringify(await Room.findById(parsedQuery[0].roomID, { _id: 0, studAtt: 1 }))).studAtt;
        const days          = parsedQuery[0].days;
        const allDates      = Object.keys(studAtt);
        const docFormat     = req.body.docFormat;
        
    
        [from, to]          = await properDate(allDates, from, to, days);
        const selectedDates = allDates.slice(allDates.indexOf(from), allDates.indexOf(to) + 1);
        
        const report        = { Course: courseID, All:{}, Warning:{}, WF:{} };
        let warning; let wf;
        if (days.length == 2) { warning = 4; wf = 8; }
        else { warning = 6; wf = 12; }
    
        await getAttendance();
    
        let targetFile;
        if(docFormat == "EXCEL") {
            targetFile = `${targetDir}/${fileName}.xlsx`; 
            await EXCEL(targetFile);
        }else {
            targetFile = `${targetDir}/${fileName}.json`; 
            await JSOON(targetFile);
        }

        console.log('File written'); 
        await new Promise(resolve => setTimeout(resolve, 500));     // wait
    
        res.download(targetFile)
        await new Promise(resolve => setTimeout(resolve, 500));     // wait
    
        deleteFile(targetFile);
        
    
    
        async function getAttendance(){
            students.forEach( student => {
                report.All[student] = 0;
                
                selectedDates.forEach( date => {
                    if(! studAtt[date].includes(student)) { report.All[student] = report.All[student] + 1; }
                })
    
                if(report.All[student] >= wf) { report.WF[student] = report.All[student]; }
                else if(report.All[student] >= warning) { report.Warning[student] = report.All[student]; }
            });
        }
        async function EXCEL(targetFile){
            const wb = new xl.Workbook();
            const ws = wb.addWorksheet('Worksheet Name');
    
            ws.cell(1, 1).string(courseID);
            ws.cell(1, 3).string(`From: ${from}`);
            ws.cell(1, 5).string(`To: ${to}`);
    
            ws.cell(3, 1).string("All");
            ws.cell(4, 1).string("ID");
            ws.cell(4, 2).string("Absence");
    
            ws.cell(3, 4).string("Warning");
            ws.cell(4, 4).string("ID");
            ws.cell(4, 5).string("Absence");
    
            ws.cell(3, 7).string("WF");
            ws.cell(4, 7).string("ID");
            ws.cell(4, 8).string("Absence");
    
    
            const All_IDs = Object.keys(report.All);
            insertToSheet(All_IDs, 5, 1);
            const All_Abs = Object.values(report.All);
            insertToSheet(All_Abs, 5, 2);
            
            const Warning_IDs = Object.keys(report.Warning);
            if(Warning_IDs.length > 0){
                insertToSheet(Warning_IDs, 5, 4);
                const Warning_Abs = Object.values(report.Warning);
                insertToSheet(Warning_Abs, 5, 5);
            }
    
            const WF_IDs = Object.keys(report.WF);
            if(WF_IDs.length > 0){
                insertToSheet(WF_IDs, 5, 7);
                const WF_Abs = Object.values(report.WF);
                insertToSheet(WF_Abs, 5, 8);
            }
    
            async function insertToSheet(data, initRow, col){
                data.forEach( item => {
                    ws.cell(initRow, col).number(Number(item))
                    initRow++;
                })
            }
    
            wb.write(targetFile);
        }
        async function JSOON(targetFile){
            fs.writeFile(targetFile, JSON.stringify(report), err => {
                if (err) throw err;
            });
        }
        async function deleteFile(targetFile){
            fs.rm(targetFile, { recursive: false }, err => {
                if(err) {console.error(err.message);}
                else { console.log("File deleted");}
            })
        }
    
    } catch (err) {
        console.log(err);
        res.send(err.message);
    }
   
}
// inside course page
const averageAtt = async (req, res) => {

    try {
        var from            = req.query.fromDate;
        var to              = req.query.toDate;
        const courseID      = req.params.courseID;
        const parsedQuery   = await queryCourses({instructor_email: req.user.email, courseID: courseID}, {_id: 0, students: 1, days:1, roomID: 1})
        const numOfStu      = Object.keys(parsedQuery[0].students).length;
        const studAtt       = JSON.parse(JSON.stringify(await Room.findById(parsedQuery[0].roomID, { _id: 0, studAtt: 1 }))).studAtt;
        const days          = parsedQuery[0].days;
        const allDates      = Object.keys(studAtt);
    

        [from, to] = await properDate(allDates, from, to, days);
        const selectedDates = allDates.slice(allDates.indexOf(from), allDates.indexOf(to) + 1);
    
        let sum = 0;
        let numOfLectures = selectedDates.length;
        selectedDates.forEach( date => {
            sum += (studAtt[date].length)/numOfStu;
        })
        const average = ((sum/numOfLectures) * 100).toFixed(1);
        res.render("course", {title: courseID, id: courseID, message: true, messageContent: `From: [${from}] To: [${to}] = ${average}%`, messageTheme: 'info'});
    
    } catch (err) {
        console.log(err);
        res.send(err.message);
    }

}
// inside course page
const recordCourseAtt = async (req, res) => {
    
    try {
        const courseID      = req.params.courseID;
        const stuList       = req.body.stuList;
        const date          = req.body.date;
        const choice        = req.body.choice;
        const parsedQuery   = await queryCourses({instructor_email: req.user.email, courseID: courseID}, {_id: 0, students: 1, days: 1, roomID: 1})
        const courseStuList = Object.values(parsedQuery[0].students);
        const studAtt       = JSON.parse(JSON.stringify(await Room.findById(parsedQuery[0].roomID, { _id: 0, studAtt: 1 }))).studAtt;
        const allDates      = Object.keys(studAtt);
        const separated     = stuList.trim().split(" ");
        const IDs           = []
        const refused       = []
    
        

        if(! allDates.includes(date)){                              // check if chosen date exists in the database
            res.render("course", {title: courseID, id: courseID, allDates, message: true,
                messageContent: "There is no lecture in this chosen date: " + date, messageTheme: 'warning'}); 
        }else{
            
            const nestedPath = 'studAtt.' + date
            
            if(stuList.trim().toLowerCase() == 'all'){              // for select all action on course students
                if(choice === 'Attendant'){
                    await Room.findByIdAndUpdate(parsedQuery[0].roomID, { $addToSet: { [nestedPath] : {$each: courseStuList} }});
                }else if(choice === 'Absent'){
                    await Room.findByIdAndUpdate(parsedQuery[0].roomID, { $pullAll: { [nestedPath] : courseStuList }});
                }
                res.render("course", {title: courseID, id: courseID, allDates, message: true,
                    messageContent: "Students recorded successfully!", messageTheme: "success"});


            }else{
                separated.forEach( id => {
                    IDs.push(Number(id));                           // anything not a number will be pushed as = null
                })
                            
                await recordAtt();
                if(refused.length > 0){                             // if user entered IDs which are not in the course student list. (works as well on chars & symbols entered) 
                    res.render("course", {title: courseID, id: courseID, allDates, message: true,
                        messageContent: `recorded successfully except these students (Not registered in this course): ${refused}`,
                        messageTheme: "warning"});
                }else{
                    res.render("course", {title: courseID, id: courseID, allDates, message: true,
                        messageContent: "Students recorded successfully!", messageTheme: "success"});
                }
                
                async function recordAtt(){
                    if(choice === 'Attendant'){
                        IDs.forEach( async (id) => {
                            if(id != null){                             // if id is actually a number (like mentioned above)
                                if(courseStuList.includes(id)){         // if the student id is actually registered in the course
                                    await Room.findByIdAndUpdate(parsedQuery[0].roomID, { $addToSet: { [nestedPath] : id } });
                                }else{
                                    refused.push(id)
                                }
                            }
                        })
                    }else if(choice === 'Absent'){
                        IDs.forEach( async (id) => {
                            if(id != null){                             // if id is actually a number (like mentioned above)
                                if(courseStuList.includes(id)){         // if the student id is actually registered in the course
                                    await Room.findByIdAndUpdate(parsedQuery[0].roomID, { $pull: { [nestedPath] : id } });
                                }else{
                                    refused.push(id)
                                }
                            }
                        })
                    }
                }
            }

        }

    } catch (err) {
        console.log(err);
        res.send(err.message);
    }


}



const picsGET = async (req, res) => {
    try {
        const courseID          = req.params.courseID;
        const date              = req.params.date;
        const courses           = req.session.coursesQueried; 
        const found             = courses.some(course => course.courseID == courseID);           // check if the Dr teaches this requested course & get that course 
    
        if( found ){
            const parsedQuery   = await queryCourses({instructor_email: req.user.email, courseID: courseID},{_id: 0, roomID: 1})
            const studAtt       = JSON.parse(JSON.stringify(await Room.findById(parsedQuery[0].roomID, { _id: 0, studAtt: 1 }))).studAtt;
            const attendants    = studAtt[date]
            const allDates      = Object.keys(studAtt);                                                              // all lecture dates available for this course in the DB
    
    
            if(! allDates.includes(date)){
                res.render("home", {title: "Home", user: req.user, courses, message: true, messageContent: `There is no lecture in this chosen date: ${date}`, messageTheme: 'warning'})
            }else{
                res.render("pics", {title: "Pics", courseID, date: req.params.date, attendants})
            }
            
        }else{
            res.render("home", {title: "Home", user: req.user, courses, message: true, messageContent: `You dont have access to this course: ${courseID}`, messageTheme: 'warning'})
        }
    
    } catch (err) {
        console.log(err);
        res.send(err.message);        
    }
}

const makeAbsent = async(req, res) => {
    try {
        const courseID      = req.params.courseID
        const date          = req.params.date
        const courses       = req.session.coursesQueried; 
        const found         = courses.some(course => course.courseID == courseID);           // check if the Dr teaches this requested course & get that course 
        const nestedPath    = 'studAtt.' + date
        
        if( found ){
            const parsedQuery = await queryCourses({instructor_email: req.user.email, courseID: source},{_id: 0, roomID: 1})
            let list = req.body.list.trim().split(" ").map(Number);
    
            await Room.findByIdAndUpdate(parsedQuery[0].roomID, { $pullAll: { [nestedPath] : list }});
            res.sendStatus(200)
            
        }else{
            res.render("home", {title: "Home", user: req.user, courses, message: true, messageContent: `You dont have access to this course: ${courseID}`, messageTheme: 'warning'})
        }
    } catch (err) {
        console.log(err);
        res.send(err.message);
    }
}

const adminPOST = async (req, res) => {
    try{
        if(req.body.action.toLowerCase() == 'add'){
            const hashedPass = await bcrypt.hash(req.body.password, 10);
            const newUser = new User({email:req.body.email, name: req.body.name, password: hashedPass})
            newUser.save((err, user) => {
                if (err) { console.log(err.message); res.send("Bad");}
                else { res.send("Good");}
            })
        }else if (req.body.action.toLowerCase() == 'remove'){
            await User.deleteOne({ email: req.body.email })
            res.send('Good')
        }

    }catch (err){
        console.log(err)
        res.send(err.message)
    }
}



const Auth = (req, res, next) => {                              // similar to isLoggedIn 
    if(req.isAuthenticated()) next();
    else res.redirect('/login');
}
const NotAuth = (req, res, next) => {                           // used on login page (redirect user to home if already logged) 
    if(req.isAuthenticated()) res.redirect('/home');
    else next();
}

const queryCourses = async (condition, projection) => {
    try {
        const query = await Course.find(condition, projection);
        const courses = JSON.parse(JSON.stringify(query));      // must be done, cause the object received from mongo is type BSON
        
        return courses;
    } catch (err) {
        console.log(err.message)
        return null;
    }
}
// check if user selected dates exists in db, if not: 
// (from date = move week forward until find a [monday(MW)/sunday(UTH)] that exists in db) 
// (to date = move week backward until find a [wednesday(MW)/thursday(UTH)] that exists in db) 
const properDate = async (allDates, from, to, days) => {        

    if(allDates.includes(from) != true) {
        const checkFrom = new Date(from);

        if (days.length == 2){      // MW
            while (! allDates.includes(checkFrom.toISOString().split("T")[0])) {
                checkFrom.setDate(checkFrom.getDate() + (((1 + 7 - checkFrom.getDay()) % 7) || 7));     // get next monday
            }
            
        }else{      // UTH
            while (! allDates.includes(checkFrom.toISOString().split("T")[0])) {
                checkFrom.setDate(checkFrom.getDate() + (((1 + 6 - checkFrom.getDay()) % 7) || 7));     // get next sunday
            }
        }

        from = checkFrom.toISOString().split("T")[0];

    }
    if(! allDates.includes(to)) {
        const checkTo = new Date(to);

        if (days.length == 2){      // MW
            while (! allDates.includes(checkTo.toISOString().split("T")[0])) {
                checkTo.setDate(checkTo.getDate() - (((4 + checkTo.getDay()) % 7) || 7));         // get previous wednesday
            }
            
        }else{      // UTH
            while (! allDates.includes(checkTo.toISOString().split("T")[0])) {
                checkTo.setDate(checkTo.getDate() - (((3 + checkTo.getDay()) % 7) || 7));         // get previous thursday
            }
        }

        to = checkTo.toISOString().split("T")[0];
    }

    return [from, to]
}

module.exports = {homeGET, loginGET, quickRecord, exportAll, exportSingle, makeAbsent, averageAtt, recordCourseAtt, logoutGET, courseGET, picsGET, adminPOST, Auth, NotAuth}
