from tkinter import EXCEPTION
from pymongo import MongoClient
import os
import dotenv


class Database:

    def __init__(self):
        """Setting the connection to the database"""
        dotenv.load_dotenv()
        CLUSTER_URL = os.getenv('CLUSTER_URL')
        try:
            self.client = MongoClient(CLUSTER_URL)
        except Exception as e:
            print("The Connnection failed", e)

    def attendance(self):
        """Return the attendance collection"""
        return self.client.attendance

    def test(self):
        print(self.client.attendance.list_collection_names())
