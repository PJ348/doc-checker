# ระบบตรวจสอบรูปแบบเอกสารโครงงานด้วย AI (Project Document Format Validation System using AI)

![Project Status](https://img.shields.io/badge/Project_Status-Active-green) ![Academic Year](https://img.shields.io/badge/Academic_Year-2026_(2569)-blue)

โปรเจกต์นี้เป็นส่วนหนึ่งของรายวิชา Fundamental of Database System 227202 สำหรับปีการศึกษา 2569 โดยเป็นเว็บไซต์ที่พัฒนาขึ้นเพื่อช่วยจัดการการส่งเอกสารโครงงานของนิสิต และนำเทคโนโลยี AI มาช่วยตรวจสอบเบื้องต้นว่าเอกสารมีความสอดคล้องกับมาตรฐานและรูปแบบที่กำหนดไว้หรือไม่ เพื่อลดภาระและเวลาในการตรวจเอกสารของทั้งอาจารย์และนิสิต

> This project is a website developed by Fundamental of Database System 227202, for the academic year 2026. The system aims to manage student project document submissions and utilize AI to automatically validate document formatting against predefined standards, significantly reducing the manual checking time for both instructors and students.

---

## Table of Contents
- [Completed Functions](#completed-functions)
- [Limitations & Out of Scope](#limitations--out-of-scope)
- [Technologies Used](#technologies-used)
- [Database Architecture](#database-architecture)
- [Installation & Setup](#installation--setup)
- [User Manual](#user-manual)
- [Team Job Position](#team-job-position)
- [Demo](#demo)
- [Contact](#contact)

---

## Completed Functions

ฟังก์ชันการทำงานที่เสร็จสมบูรณ์และสามารถใช้งานได้จริง:

### นิสิต (Student)
- **ระบบส่งและติดตามสถานะเอกสาร:**
  - รองรับการอัปโหลดไฟล์เอกสารโครงงาน (เฉพาะไฟล์ .pdf ขนาดไม่เกิน 10MB)
  - จัดเก็บประวัติการส่งเอกสารทุกเวอร์ชันโดยไม่เขียนทับไฟล์เดิม (Versioning)
  - สามารถติดตามสถานะการดำเนินงานของเอกสารได้
- **ระบบตรวจสอบเอกสารด้วย AI:**
  - ส่งเอกสารให้ AI ภายนอกประมวลผลตามมาตรฐานเอกสารที่เลือก
  - แสดงผลลัพธ์รายการข้อผิดพลาด โดยแยกจุดที่ "ผ่าน" (สีเขียว) และ "ไม่ผ่าน" (สีแดง)
  - ระบุตำแหน่งที่พบปัญหาพร้อมคำแนะนำในการแก้ไขเบื้องต้น
- **ระบบจัดการข้อมูลโครงงาน:**
  - สามารถสร้างโครงงาน กำหนดรายชื่อสมาชิกกลุ่ม และระบุอาจารย์ที่ปรึกษาได้

### อาจารย์ (Instructor)
- **หน้าภาพรวมโครงงานที่ปรึกษา:**
  - ดูรายการโครงงานทั้งหมดที่อยู่ในความดูแล และกรอง (Filter) ตามสถานะได้
- **ระบบจัดการข้อเสนอแนะและประเมินผล:**
  - ตรวจสอบผลลัพธ์จาก AI และอ่านไฟล์เอกสารฉบับล่าสุด
  - พิมพ์ข้อเสนอแนะเพิ่มเติมให้นิสิต โดยแยกจากผลของ AI อย่างชัดเจน
  - เปลี่ยนสถานะการประเมินเอกสาร (เช่น "ผ่าน", "ต้องแก้ไข" หรือ "อนุมัติโครงงาน")

### ผู้ดูแลระบบ (System Administrator)
- **ระบบจัดการมาตรฐานเอกสาร:**
  - เพิ่ม ปรับปรุง หรืออัปโหลดข้อกำหนดมาตรฐานเอกสาร (เช่น ขนาดฟอนต์, ระยะขอบ) 
  - กำหนดขอบเขตการบังคับใช้มาตรฐาน (เช่น ตามคณะ, หลักสูตร, หรือปีการศึกษา)
  - เก็บประวัติมาตรฐานเดิมย้อนหลังแบบไม่เขียนทับ
- **ระบบจัดการผู้ใช้งานและตรวจสอบระบบ:**
  - จัดการบัญชีผู้ใช้ และกำหนดสิทธิ์ (Role) ว่าเป็น นิสิต, อาจารย์, หรือ แอดมิน
  - ตรวจสอบประวัติการทำงานของระบบ (Audit Log) ย้อนหลังเพื่อความปลอดภัย

---

## Limitations & Out of Scope

ข้อจำกัดและขอบเขตการทำงานที่อยู่นอกเหนือระบบ (สิ่งที่ระบบไม่ครอบคลุม):

- **ไม่มีการพัฒนาโมเดล AI ด้วยตนเอง:** ระบบใช้บริการ AI ภายนอก (External API Service) ในการประมวลผล ระบบเพียงส่งข้อมูลไปตรวจและรับผลกลับมาแสดงเท่านั้น
- **รองรับเฉพาะไฟล์ .pdf:** ระบบไม่อนุญาตให้อัปโหลดไฟล์เอกสารประเภทอื่น (เช่น .docx) เพื่อให้มั่นใจว่า AI จะประมวลผลข้อความได้แม่นยำ
- **จำกัดขนาดไฟล์:** ไฟล์เอกสารที่อัปโหลดต้องมีขนาดไม่เกิน 10MB เพื่อป้องกันข้อจำกัดของ Storage และ External AI
- **ประวัติและมาตรฐานไม่สามารถลบหรือเขียนทับได้:** เพื่อรักษาความโปร่งใสและตรวจสอบย้อนหลัง ข้อมูลที่ถูกส่งแล้วจะถูกบันทึกแยกเป็นเวอร์ชันใหม่เสมอ

---

## Technologies Used

เครื่องมือและเทคโนโลยีที่ใช้ในการพัฒนาระบบ:

*   **Frontend:** HTML, Tailwind, JavaScript
*   **Backend / Database:** Supabase
*   **AI Integration:** Gemini API
*   **Version Control:** Git & GitHub

---

## Database Architecture

โครงสร้างฐานข้อมูลของระบบถูกออกแบบด้วยความสัมพันธ์แบบ Relational Database รองรับการทำ Audit Log, Versioning และ Role-based Access Control 

  * รูป ER Diagram
    <img width="2467" height="1962" alt="ER drawio" src="https://github.com/user-attachments/assets/ebd1b036-d2fb-48a5-bf05-806c6d14ae5a" />
    หากภาพไม่ชัด สามารถคลิกดูไฟล์ PDF ได้ที่ลิงก์นี้: [ลิงก์ดู ER Diagram ฉบับเต็ม](https://drive.google.com/file/d/1JtRKfmBdhFsp18bkuMi4ElZBJIF7mSG-/view?usp=sharing)

* รูป Schema
  <img width="1197" height="1858" alt="SCHEMA  drawio" src="https://github.com/user-attachments/assets/c1749f06-cf2d-4522-a3b9-50b3138bf844" />
  หากภาพไม่ชัด สามารถคลิกดูไฟล์ PDF ได้ที่ลิงก์นี้: [ลิงก์ดู ER Diagram ฉบับเต็ม](https://drive.google.com/file/d/12pAeKD42PSYLX5ceezn8fhYxcE0lnKh4/view?usp=sharing) 

---

## User Manual

คู่มือการใช้งานระบบสำหรับผู้ใช้ (นิสิต, อาจารย์, ผู้ดูแลระบบ) สามารถดูรายละเอียดเพิ่มเติมได้ที่ลิงก์ด้านล่าง: 
*(รอแนบลิงก์ Google Docs หรือคู่มือ PDF)*

---

## Team Job Position

รายชื่อสมาชิก และตำแหน่งหน้าที่รับผิดชอบ:

| Student ID | Name | Position |
| --- | --- | --- |
| 68023403 | นางสาวภรณ์ทินรดา จันทร์เพ็ญ | *(Front-End, Back-End Developer & System Analyst (SA) / Project Leader)* |
| 68025461 | นางสาวพิชญดา ใสโสภณ | *(UX/UI Design & Business Analyst (BA))* |

---

## Demo

สามารถทดลองใช้งานเว็บไซต์จริงได้ที่นี่:
- * ลิงก์สำหรับเข้าใช้งานเว็บไซต์: https://teams.public.onecdn.static.microsoft/evergreen-assets/safelinks/2/atp-safelinks.html](https://doc-checker-12mu.vercel.app/)

---

## Contact

หากมีข้อสงสัยหรือคำถามเกี่ยวกับโปรเจกต์ สามารถติดต่อผู้ดูแลโปรเจกต์ได้ที่:
- อีเมล:  pornthinrada.janphen@gmail.com
- GitHub:  *PJ348 (PJ)*
- อีเมล: phichayada.saisophon@gmail.com 
- GitHub: *(  68025461-bit (mei) )*
