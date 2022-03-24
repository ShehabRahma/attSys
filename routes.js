const bcrypt        = require('bcrypt');
const User          = require('./Models/userModel')
const Course        = require("./Models/courseModel")
const Room          = require('./Models/roomModel')
const fs            = require('fs');
const archiver      = require('archiver');

const loginGET = (req, res) => {
    res.render("login", {title: "Login"})
}

const logoutGET = (req, res) => {
    req.logout();
    res.redirect('/login');
}

const homeGET = async (req, res) => {
    try {
        if(req.session.coursesQueried){
            res.render("home", {title: "Home", user: req.user, courses: req.session.coursesQueried, message: false})       // deniedAccess: used for a condition related to courseGET rout
        }else{
            const courses = await queryCourses({instructor_email: req.user.email}, {_id: 0, courseID: 1}); 
            req.session.coursesQueried = courses;
            res.render("home", {title: "Home", user: req.user, courses, message: false})       // deniedAccess: used for a condition related to courseGET rout
        }
    } catch (err) {
        console.log(err)
        res.send(err.message)      
    }

}

const quickRecord = async(req, res) => {
    try {
        const courseID = req.body.courseID;
        const stID = Number(req.body.stID);
        const date = req.body.date;
        const choice = req.body.choice;
    
        const parsedQuery = await queryCourses({instructor_email: req.user.email, courseID: courseID}, {_id: 0, students: 1, days: 1, roomID: 1})
    
        if(parsedQuery.length === 0) {  // check if Dr has access to this course
            res.render("home", {title: "Home", user: req.user, courses: req.session.coursesQueried, message: true, messageContent: "You don't have access to this course: " + courseID, messageTheme: 'warning'}); 
        }else{
            const stExists = Object.values(parsedQuery[0].students).includes(stID);
            if(!stExists){
                res.render("home", {title: "Home", user: req.user, courses: req.session.coursesQueried, message: true, messageContent: "This student: "+ stID + " is not registered in this course: " + courseID, messageTheme: 'warning'}); 
            } else{
                const week = "UMTWHFS";
                const checkDay = new Date(date).getDay();;
                if(! parsedQuery[0].days.includes(week[checkDay])){
                    res.render("home", {title: "Home", user: req.user, courses: req.session.coursesQueried, message: true, messageContent: "There is no lecture in this chosen date: " + date, messageTheme: 'warning'}); 
                } else {
                    const nestedPath = 'studAtt.' + date
                    if(choice === 'Attendant') await Room.findByIdAndUpdate(parsedQuery[0].roomID, { $addToSet: { [nestedPath] : stID } });
                    else{
                        await Room.findByIdAndUpdate(parsedQuery[0].roomID, { $pull: { [nestedPath] : stID } });
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

const exportAtt = async (req, res) => {
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
    
                var from = req.body.fromDate;
                var to = req.body.toDate;
                const courseID = course.courseID;
                const parsedQuery = await queryCourses({instructor_email: req.user.email, courseID: courseID}, {_id: 0, students: 1, days: 1, roomID: 1})
                const students = Object.values(parsedQuery[0].students);
                const shit = await Room.findById(parsedQuery[0].roomID, { _id: 0, studAtt: 1 });
                const studAtt = JSON.parse(JSON.stringify(shit)).studAtt;
                const days = parsedQuery[0].days;
                const allDates = Object.keys(studAtt);      



                await properDate();
                const selectedDates = allDates.slice(allDates.indexOf(from), allDates.indexOf(to) + 1);

                const report = { course: courseID, All:{}, Warning:{}, WF:{} };
                let warning; let wf;
                if (days.length == 2) { warning = 4; wf = 8; }
                else { warning = 6; wf = 12; }
                
                
                await getAttendance();

                await writeToFile();





                async function properDate(){

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
                }
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
                    fs.writeFile(`./attExport/${req.user.email}/${course.courseID}.json`, JSON.stringify(report), err => {
                        if (err) throw err;
                    });
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

const courseGET = async (req, res) => {
    try {
        let source;
        (req.query.searchCourse) ? source = req.query.searchCourse.toUpperCase(): source = req.params.id;     // To differentiate between searchbar(type: url query) and course-cards(type: req param)
    
        const courses = req.session.coursesQueried; 
        const found = courses.some(course => course.courseID === source);           // check if the Dr teaches this requested course 
    
        if( found ) res.render("course", {title: source, id: source});
        else res.render("home", {title: "Home", user: req.user, courses, message: true, messageContent: "You don't have access to this course: " + source, messageTheme: 'warning'}); 
    
    } catch (err) {
        console.log(err)
        res.send(err.message)      

    }    
}


const flagsGET = (req, res) => {
    res.render("flags", {title: "Flags"})
}

const adminPOST = async (req, res) => {
    try{
        const hashedPass = await bcrypt.hash(req.body.password, 10);
        const newUser = new User({email:req.body.email, name: req.body.name, password: hashedPass})
        newUser.save((err, user) => {
            if (err) return console.log(err.message);

            res.send("Good")
        })

    }catch (err){
        console.log(err)
        res.send(err.message)
    }
}


const Auth = (req, res, next) => {
    if(req.isAuthenticated()) next();
    else res.redirect('/login');
}
const NotAuth = (req, res, next) => {
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

module.exports = {homeGET, loginGET, quickRecord, exportAtt, logoutGET, courseGET, flagsGET, adminPOST, Auth, NotAuth}


// const del=new Promise((resolve,reject)=>{
//     setTimeout(()=>{
//         fs.writeFile(`./attExport/${courseID}.json`, JSON.stringify(report), err => {
//             if (err) throw err;
//         });
//     }, 5000)
    //
// })

// Promise.all(del).then(res=>{console.log("res:=",res)})