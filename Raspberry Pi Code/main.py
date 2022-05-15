#!/usr/bin/env python3
from MongoDB.courses import Course
from tkinter import *
from datetime import datetime


if __name__ == "__main__":
    time = int(datetime.now().strftime('%H%M'))
    course = Course()
    window = Tk()
    stars_up = Label(window, text="*******************************",
                     fg='#004d99', font=("Times", 22))
    stars_up.place(relx=0.01, rely=0.01)

    stars_down = Label(
        window, text="*******************************", fg='#004d99', font=("Times", 22))
    stars_down.place(relx=0.01, rely=0.9)

    if time < 1100:
        lbl1 = Label(window, text="Good Morning",
                     fg='#004d99', font=("Times", 24))
    else:
        lbl1 = Label(window, text="Good Evening",
                     fg='#004d99', font=("Times", 24))
    lbl1.place(relx=0.3, rely=0.2)

    lbl2 = Label(window, text="Place your ID in the scanner below",
                 fg='#333333', font=("", 16))
    lbl2.place(relx=0.15, rely=0.4)

    txtfld = Entry(window, bd=8, justify='center', font=("Times", 16))
    txtfld.place(relx=0.25, rely=0.65)
    txtfld.focus()

    def change_view(event):
        course.CPR_INP(txtfld.get())

        Condition, studentID, courseID = course.query()

        if Condition:
            course.insert_att()
            course.Capture_Image()
            lbl1.place_forget()
            lbl2.place_forget()
            txtfld.place_forget()
            # Success
            lbl3 = Label(window, text="Welcome!",
                         fg='#004d99', font=("Arial", 28))
            lbl3.place(x=160, y=60)
            lbl4 = Label(window, text=studentID,
                         fg='#006600', font=("Times", 22))
            lbl4.place(x=180, y=160)
        else:
            # failure
            lbl1.place_forget()
            lbl2.place_forget()
            txtfld.place_forget()
            lbl3 = Label(window, text="Sorry",
                         fg='#800000', font=("Arial", 22))
            lbl3.place(relx=0.4, rely=0.2)
            lbl4 = Label(
                window, text=f'Not registered ! {courseID}', fg='#800000', font=("Arial", 16))
            lbl4.place(x=60, y=170)

        def change_view_again():
            lbl3.place_forget()
            lbl4.place_forget()

            lbl1.place(relx=0.3, rely=0.2)
            lbl2.place(relx=0.15, rely=0.4)
            txtfld.place(relx=0.25, rely=0.65)
            txtfld.delete(0, 'end')

        lbl3.after(1600, change_view_again)

    txtfld.bind('<Return>', change_view)

    window.title('UOB-attSys')
    window.geometry("480x320")
    # window.attributes('-fullscreen', True)
    window.mainloop()
