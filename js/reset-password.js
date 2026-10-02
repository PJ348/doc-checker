import { supabaseClient } from './supabase.js';

document.addEventListener("DOMContentLoaded", () => {

    // ลืมรหัสผ่าน
    const resetBtn = document.getElementById('reset-btn');
    if (resetBtn) {
        
        resetBtn.addEventListener('click', async () => {
            const email = document.getElementById('email').value;
            const emailError = document.getElementById('email_error');

            const currentUrl = window.location.origin;
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

            const inputFields = [
                { inputId: 'email', errorId: 'email_error' }
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

            const { data, error } = await supabaseClient.auth.resetPasswordForEmail(email, {
                redirectTo: `${currentUrl}/html/update-password.html`
            });

            if (error) alert("เกิดข้อผิดพลาด: " + error.message);
            else alert("ส่งลิงก์ไปที่อีเมลแล้ว กรุณาเช็กกล่องจดหมายของคุณ");
        });
    }

    // ตั้งรหัสใหม่ 
    const updateBtn = document.getElementById('update-btn');
    if (updateBtn) {
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

            const { data, error } = await supabaseClient.auth.updateUser({
                password: newPassword
            });

            if (error) alert("เปลี่ยนรหัสผ่านไม่สำเร็จ: " + error.message);
            else {
                alert("เปลี่ยนรหัสผ่านเรียบร้อยแล้ว ระบบจะพากลับไปหน้าเข้าสู่ระบบ");
                window.location.href = "../index.html";
            }
        });
    }

});