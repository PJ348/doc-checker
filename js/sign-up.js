import { supabaseClient } from './supabase.js';
document.addEventListener("DOMContentLoaded", () => {

    const inputFields = [
        { inputId: 'firstname', errorId: 'first_name_error' },
        { inputId: 'lastname', errorId: 'last_name_error' },
        { inputId: 'email', errorId: 'email_error' },
        { inputId: 'password', errorId: 'password_error' }
    ];

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

    const signUpButton = document.getElementById("signup-btn");
    signUpButton.addEventListener("click", async () => {

        const firstNameInput = document.getElementById('firstname');
        const lastNameInput = document.getElementById('lastname');
        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');

        const first_name = firstNameInput.value.trim();
        const last_name = lastNameInput.value.trim();
        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();
        const roleValue = parseInt(document.querySelector('input[name="role"]:checked').value);

        const firstNameError = document.getElementById('first_name_error');
        const lastNameError = document.getElementById('last_name_error');
        const emailError = document.getElementById('email_error');
        const passwordError = document.getElementById('password_error');

        let isValid = true;

        const validateField = (value, errorEl) => {
            if (!value) {
                errorEl.classList.remove('hidden');
                isValid = false;
            } else {
                errorEl.classList.add('hidden');
            }
        };

        validateField(first_name, firstNameError);
        validateField(last_name, lastNameError);
        validateField(email, emailError);
        validateField(password, passwordError);

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (email && !emailRegex.test(email)) {
            emailError.innerText = "รูปแบบอีเมลไม่ถูกต้อง";
            emailError.classList.remove('hidden');
            isValid = false;
        }

        if (password && password.length < 6) {
            const passError = document.getElementById('password_error');
            passError.innerText = "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร";
            passError.classList.remove('hidden');
            isValid = false;
        }

        if (!isValid) {
            // console.log("ข้อมูลไม่ครบ หยุดการส่งข้อมูล!");
            return;
        }

        console.log("ข้อมูลครบถ้วน กำลังสมัครสมาชิก...");
        console.log("กำลังสมัครสมาชิก...");

        const { data, error } = await supabaseClient.auth.signUp({
            email: email,
            password: password
        });

        if (error) {
            if (error.status === 422 || error.message.toLowerCase().includes('already registered') || error.message.toLowerCase().includes('already exists')) {
                emailError.innerText = "อีเมลนี้มีผู้ใช้งานแล้ว กรุณาใช้อีเมลอื่น";
                emailError.classList.remove('hidden');
            } 
            else {
                alert('เกิดข้อผิดพลาดในการสมัคร: ' + error.message);
            }
            return;
        }

        // บันทึกข้อมูลผู้ใช้ลงในตาราง users และ user_role
        if (data.user) {
            const { error: userError } = await supabaseClient
                .from('users')
                .insert([
                    {
                        user_id: data.user.id,
                        first_name: first_name,
                        last_name: last_name,
                        email: email
                    }
                ]);

            if (userError) {
                console.error("พังที่ตาราง users:", userError);
                alert("บันทึกข้อมูลผู้ใช้ไม่สำเร็จ");
                return;
            }

            const { error: roleError } = await supabaseClient
                .from('user_role')
                .insert([
                    {
                        user_id: data.user.id,
                        role_id: roleValue
                    }
                ]);

            if (roleError) {
                console.error("พังที่ตาราง user_role:", roleError);
                alert("สมัครสำเร็จ แต่บันทึกตำแหน่ง (Role) ไม่สำเร็จ");
            } else {
                window.location.href = "../index.html";
            }
        }
    });
});
