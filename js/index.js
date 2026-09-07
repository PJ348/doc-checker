import { supabaseClient } from './supabase.js';
document.addEventListener("DOMContentLoaded", () => {
    
    const inputFields = [
        { inputId: 'email', errorId: 'email_error' },
        { inputId: 'password', errorId: 'password_error' }
    ];

    const loginError = document.getElementById('login_error');

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

    // Login
    const loginButton = document.getElementById("login-btn");
    if (!loginButton) return;

    loginButton.addEventListener("click", async () => {
        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');
        const emailError = document.getElementById('email_error');
        const passwordError = document.getElementById('password_error');

        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();

        let isValid = true;

        const validateField = (value, errorEl, message) => {
            if (!value) {
                errorEl.innerText = message;
                errorEl.classList.remove('hidden');
                isValid = false;
            } else {
                errorEl.classList.add('hidden');
            }
        };

        validateField(email, emailError, "กรุณากรอกอีเมล");
        validateField(password, passwordError, "กรุณากรอกรหัสผ่าน");

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (email && !emailRegex.test(email)) {
            emailError.innerText = "รูปแบบอีเมลไม่ถูกต้อง";
            emailError.classList.remove('hidden');
            isValid = false;
        }

        if (!isValid) return;

        console.log("กำลังตรวจสอบข้อมูลเข้าสู่ระบบ...");

        // Supabase Auth ตรวจสอบ
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) {
            console.error("เข้าสู่ระบบไม่สำเร็จ:", error.message);

            if (loginError) {
                loginError.innerText = "อีเมลหรือรหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง";
                loginError.classList.remove('hidden');
            } else {
                alert("อีเมลหรือรหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง");
            }
            return;
        }

        if (data.user) {
            console.log("เข้าสู่ระบบสำเร็จ!");

            const { data: roleData, error: roleError } = await supabaseClient
                .from('user_role')
                .select('role_id')
                .eq('user_id', data.user.id)
                .single();

            if (roleError || !roleData) {
                console.error("ไม่พบข้อมูลสิทธิ์:", roleError?.message);
                alert("เกิดข้อผิดพลาด: ไม่พบสิทธิ์การเข้าใช้งานของบัญชีนี้");
                return;
            }

            const roleId = roleData.role_id;
            if (roleId === 1) {
                window.location.href = "/html/dashboard-student.html";
            } else if (roleId === 2) {
                window.location.href = "/html/dashboard-teacher.html"; 
            } else if (roleId === 3) {
                window.location.href = "/html/dashboard-admin.html"; 
            } else {
                alert("สิทธิ์ผู้ใช้งานไม่ถูกต้องในระบบ");
            }
        }
    });
});