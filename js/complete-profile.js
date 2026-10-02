import { supabaseClient } from './supabase.js';
document.addEventListener("DOMContentLoaded", async () => {
    // document.body.style.visibility = 'hidden';
    // ดึงข้อมูล Session จาก Supabase
    const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();

    if (!session || sessionError) {
        window.location.href = '../index.html';
        return;
    }

    const userId = session.user.id;
    const userEmail = session.user.email;
    const googleName = session.user.user_metadata?.full_name || '';

    // เช็กว่า User ID นี้ มีในตาราง users ยัง
    const { data: existingUser } = await supabaseClient
        .from('users')
        .select('user_id')
        .eq('user_id', userId)
        .maybeSingle();

    if (existingUser) {
        // กรณีเป็นผู้ใช้เก่า: ดึงสิทธิ์แล้วพาเข้า Dashboard ทันที
        const { data: roleData } = await supabaseClient
        .from('user_role')
        .select('role_id')
        .eq('user_id', userId)
        .maybeSingle();

        if (roleData?.role_id === 1) window.location.href = "/html/dashboard-student.html";
        else if (roleData?.role_id === 2) window.location.href = "/html/dashboard-teacher.html";
        else if (roleData?.role_id === 3) window.location.href = "/html/dashboard-admin.html";
        return;
    }
    //  const roleId = roleData.role_id;
    //         if (roleId === 1) {
    //             window.location.href = "/html/dashboard-student.html";
    //         } else if (roleId === 2) {
    //             window.location.href = "/html/dashboard-teacher.html";
    //         } else if (roleId === 3) {
    //             window.location.href = "/html/dashboard-admin.html";
    //         } else {
    //             alert("สิทธิ์ผู้ใช้งานไม่ถูกต้องในระบบ");
    //         }

    // กรณีเป็นผู้ใช้ใหม่: ดำเนินการต่อในหน้านี้
    // เอาชื่อจาก Google มาแยกใส่ช่อง ชื่อ-นามสกุล ให้ล่วงหน้า (ถ้ามี)
    const nameParts = googleName.split(' ');
    if (nameParts.length > 0) document.getElementById('firstname').value = nameParts[0];
    if (nameParts.length > 1) document.getElementById('lastname').value = nameParts.slice(1).join(' ');

    const inputFields = [
        { inputId: 'firstname', errorId: 'first_name_error' },
        { inputId: 'lastname', errorId: 'last_name_error' }
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

    const signupBtn = document.getElementById('signup-btn');
    document.addEventListener("keydown", (e) => {
        if (e.key === "Enter") signupBtn.click();
    });

    // รอรับข้อมูลตอนกดปุ่ม "สร้างบัญชี"
    signupBtn.addEventListener('click', async () => {

        const firstName = document.getElementById('firstname').value.trim();
        const lastName = document.getElementById('lastname').value.trim();

        // ดึงค่าจาก Radio Button ที่ถูกเลือก (1=นิสิต, 2=อาจารย์)
        const roleInput = document.querySelector('input[name="role"]:checked');
        const roleId = roleInput ? parseInt(roleInput.value) : 1;

        const firstNameError = document.getElementById('first_name_error');
        const lastNameError = document.getElementById('last_name_error');

        let isValid = true;

        // ฟังก์ชันเช็กช่องว่าง
        const validateField = (value, errorEl) => {
            if (!value) {
                errorEl.classList.remove('hidden');
                isValid = false;
            } else {
                errorEl.classList.add('hidden');
            }
        };

        validateField(firstName, firstNameError);
        validateField(lastName, lastNameError);

        // ถ้าข้อมูลไม่ครบ หยุดการทำงาน
        if (!isValid) return;

        // ฟังก์ชันรีเซ็ตปุ่มกลับเป็นปกติเมื่อเกิด Error
        const resetButton = () => {
            // signupBtn.innerText = "สร้างบัญชี";
            signupBtn.disabled = false;
            signupBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        };

        try {
            // เปลี่ยนหน้าตาปุ่มเพื่อบอกสถานะกำลังโหลด
            // signupBtn.innerText = "กำลังสร้างบัญชี...";
            signupBtn.disabled = true;
            signupBtn.classList.add('opacity-50', 'cursor-not-allowed');

            // บันทึกข้อมูลส่วนตัวลงตาราง users
            const { error: userInsertError } = await supabaseClient
                .from('users')
                .insert([
                    {
                        user_id: userId,
                        email: userEmail,
                        first_name: firstName,
                        last_name: lastName
                    }
                ]);

            if (userInsertError) throw userInsertError;

            // บันทึกสิทธิ์ลงตาราง user_role
            const { error: roleInsertError } = await supabaseClient
                .from('user_role')
                .insert([
                    {
                        user_id: userId,
                        role_id: roleId
                    }
                ]);

            if (roleInsertError) throw roleInsertError;

            // แยกให้เด้งไปตามสิทธิ์เมื่อสำเร็จ
            if (roleId === 1) {
                window.location.href = "/html/dashboard-student.html";
            } else if (roleId === 2) {
                window.location.href = "/html/dashboard-teacher.html";
            }

        } catch (error) {
            console.error("เกิดข้อผิดพลาด: ", error);
            alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล: " + error.message);
            resetButton();
        }
    });
});