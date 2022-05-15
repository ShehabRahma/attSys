from ast import Str
from tokenize import String
from MongoDB.Database import Database
from datetime import datetime
from bson.objectid import ObjectId
import os


class Course:
    def __init__(self):
        """GETTING THE DATABASE Components"""
        db = Database().attendance()
        self.courses = db.courses
        self.rooms = db.rooms
       

    def CPR_INP(self, CPR: String):
        self.CPR = CPR

    def query(self):
        """Getting the courseID , studentID"""
        pi_room = "S40/2088"
        self.date = datetime.now().strftime('%Y-%m-%d')
        self.time = int(datetime.now().strftime('%H%M'))
        days = 'MTWHFSU'
        current_day = days[datetime.today().weekday()]
        self.query_result = list(self.courses.find({"room": pi_room, "days": {"$in": [current_day]}, "start": {
                                 "$lte": self.time}, "ends": {"$gte": self.time}}, {"roomID": 1, "students": {self.CPR: 1}, "courseID": 1, "_id": 0}))
        try:
            self.courseID = self.query_result[0]["courseID"]
            self.studentID = self.query_result[0]['students'][self.CPR]
            self.roomID = self.query_result[0]['roomID'][0]
            return True, self.studentID, self.courseID

        except:
            self.studentID = "NOT Registeres"
            self.courseID = "Check your instructor"
            return False, self.studentID, self.courseID

    def insert_att(self):
        """Checking if the student is registered in the course then insert the attendance"""
        if(len(self.query_result[0]['students']) > 0):
            self.rooms.update_one({"_id": ObjectId(self.roomID)}, {
                "$addToSet": {f"studAtt.{self.date}": self.studentID}})

    def Capture_Image(self):
        os.system(
            f'fswebcam -r 640x480 -d /dev/video0 /home/melon/Project/AttendanceProject/Images/{self.courseID}and{self.date}and{self.studentID}.jpg')
