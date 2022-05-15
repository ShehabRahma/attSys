#!/bin/bash
files=(/home/melon/Project/AttendanceProject/Images/*.jpg)
if [ ${#files[@]} -gt 0 ]; 

then
echo "Sending Images" >> /home/melon/logs/Images.log
aws s3 mv /home/melon/Project/AttendanceProject/Images s3://uob-attsys/ --recursive --exclude "*" --include "*.jpg" 2>> /home/melon/logs/Images.log 1>>/home/melon/logs/errors.log;

fi



