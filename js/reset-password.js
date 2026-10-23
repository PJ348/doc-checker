import { supabaseClient } from './supabase.js';

document.addEventListener("DOMContentLoaded", () => {

    // ลืมรหัสผ่าน
    const inputFields = [
        { inputId: 'email', errorId: 'email_error' },
        { inputId: 'new-password', errorId: 'password_error' },
        { inputId: 'confirm-password', errorId: 'password_error' }
    ];

    // ผูก event input เพื่อล้างแจ้งเตือนทันทีเมื่อเริ่มพิมพ์
    inputFields.forEach(field => {
        const inputEl = document.getElementById(field.inputId);
        const errorEl = document.getElementById(field.errorId);

        if (inputEl && errorEl) {
            inputEl.addEventListener('input', () => {
                if (inputEl.value.trim() !== "") {
                    errorEl.classList.add('hidden');
                }
            });
        }
    });
    
    const resetBtn = document.getElementById('reset-btn');
    if (resetBtn) {
        resetBtn.addEventListener('click', async () => {
            const emailInput = document.getElementById('email');
            const email = emailInput ? emailInput.value.trim() : "";
            const emailError = document.getElementById('email_error');

            const currentUrl = window.location.origin;
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

            if (!email) {
                emailError.innerText = "กรุณากรอกอีเมล";
                emailError.classList.remove('hidden');
                return;
            }

            if (!emailRegex.test(email)) {
                emailError.innerText = "รูปแบบอีเมลไม่ถูกต้อง";
                emailError.classList.remove('hidden');
                return;
            } else {
                emailError.classList.add('hidden');
            }

            // ป้องกันการกดปุ่มซ้ำ
            const originalText = resetBtn.innerText;
            resetBtn.disabled = true;
            resetBtn.classList.add('opacity-50', 'cursor-not-allowed');

            const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
                redirectTo: `${currentUrl}/html/update-password.html`
            });

            resetBtn.disabled = false;
            resetBtn.innerText = originalText;
            resetBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            
            if (error) {
                alert("เกิดข้อผิดพลาด: " + error.message);
            } else {
                alert("ส่งลิงก์ไปที่อีเมลแล้ว กรุณาเช็กกล่องจดหมายของคุณ");
                if (emailInput) emailInput.value = "";
            }
        });
    }

    // ตั้งรหัสใหม่ 
    const updateBtn = document.getElementById('update-btn');
    if (updateBtn) {
        sessionStorage.setItem('is_resetting_password', 'true');

        const backLinks = document.querySelectorAll('a[href*="index.html"], #back-btn, #cancel-btn');
        backLinks.forEach(link => {
            link.addEventListener('click', async (e) => {
                e.preventDefault();
                sessionStorage.removeItem('is_resetting_password');
                await supabaseClient.auth.signOut(); // ล้าง Session ชั่วคราวทิ้ง
                window.location.replace("../index.html");
            });
        });

        updateBtn.addEventListener('click', async () => {
            const newPassword = document.getElementById('new-password').value;
            const confirmPassword = document.getElementById('confirm-password').value;
            const passwordError = document.getElementById('password_error');

            if (!newPassword || newPassword.length < 6) {
                passwordError.innerText = "กรุณากรอกรหัสใหม่อย่างน้อย 6 ตัวอักษร";
                passwordError.classList.remove('hidden');
                return;
            }

            if (newPassword !== confirmPassword) {
                passwordError.innerText = "รหัสผ่านไม่ตรงกัน กรุณาตรวจสอบอีกครั้ง";
                passwordError.classList.remove('hidden');
                return;
            }

            passwordError.classList.add('hidden');

            // ป้องกันการกดปุ่มซ้ำ
            updateBtn.disabled = true;
            updateBtn.classList.add('opacity-50', 'cursor-not-allowed');

            const { data, error } = await supabaseClient.auth.updateUser({
                password: newPassword
            });

            if (error) {
                alert("เปลี่ยนรหัสผ่านไม่สำเร็จ: " + error.message);
                updateBtn.disabled = false;
                updateBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            } else {
                sessionStorage.removeItem('is_resetting_password');
                await supabaseClient.auth.signOut();
                
                alert("เปลี่ยนรหัสผ่านเรียบร้อยแล้ว ระบบจะพากลับไปหน้าเข้าสู่ระบบ");
                window.location.href = "../index.html";
            }
        });
    }

});