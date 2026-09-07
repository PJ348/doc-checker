import { supabaseClient } from './supabase.js';
window.togglePopup = function(popupID) {
    const popups = ['details-popup', 'members-popup'];
    popups.forEach(id => {
        const el = document.getElementById(id);
        if (id === popupID) {
            el.classList.toggle('hidden');
        } else {
            el.classList.add('hidden');
        }
    });

    // --- เพิ่มโค้ดล้างค่าตรงนี้ ---
    const errorText = document.getElementById('add-member-error');
    if (errorText) {
        errorText.textContent = "";
        errorText.classList.add('hidden');
    }

    // เคลียร์ช่องพิมพ์อีเมลด้วย (ถ้ามี)
    const emailInput = document.getElementById('add-member-email');
    if (emailInput) {
        emailInput.value = "";
    }
}

// ฟังก์ชันเปิด-ปิดเมนูลบของสมาชิกแต่ละคน
window.toggleMemberMenu = function(event, element) {
    event.stopPropagation(); // ป้องกันไม่ให้ Event วิ่งไปทำงานที่ window.click
    document.querySelectorAll('.member-dropdown').forEach(el => {
        if (el !== element.nextElementSibling) el.classList.add('hidden');
    });
    element.nextElementSibling.classList.toggle('hidden');
}

// ฟังก์ชันปิด Popover เมื่อคลิกพื้นที่นอกกรอบ
window.addEventListener('click', function (event) {
    const detailsPopup = document.getElementById('details-popup');
    const membersPopup = document.getElementById('members-popup');

    // เช็คว่าสิ่งที่คลิกอยู่ "นอกเหนือ" จากปุ่มและตัวกล่อง Popover หรือไม่
    const clickedInsideDetails = event.target.closest('#details-popup') || event.target.closest("button[onclick*='details-popup']");
    const clickedInsideMembers = event.target.closest('#members-popup') || event.target.closest("button[onclick*='members-popup']");

    if (!clickedInsideDetails) {
        detailsPopup.classList.add('hidden');
    }
    if (!clickedInsideMembers) {
        membersPopup.classList.add('hidden');
    }
    if (!event.target.closest('.member-dropdown') && !event.target.closest('[onclick*="toggleMemberMenu"]')) {
        document.querySelectorAll('.member-dropdown').forEach(el => el.classList.add('hidden'));
    }
});

document.addEventListener("DOMContentLoaded", async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const projectId = urlParams.get('id');

    if (!projectId) {
        alert("ไม่พบข้อมูลโครงงาน");
        window.location.href = "dashboard-student.html";
        return;
    }

    const { data: projectData, error: projectError } = await supabaseClient
        .from('project')
        .select('*')
        .eq('project_id', projectId)
        .single();

    if (projectError || !projectData) {
        console.error("Error:", projectError);
        alert("คุณไม่มีสิทธิ์เข้าถึง หรือไม่พบโครงงาน");
        window.location.href = "dashboard-student.html";
        return;
    }

    const dateStr = projectData.created_at ? `${String(new Date(projectData.created_at).getDate()).padStart(2, '0')}/${String(new Date(projectData.created_at).getMonth() + 1).padStart(2, '0')}/${new Date(projectData.created_at).getFullYear() + 543}` : '-';

    // ฟังก์ชันช่วยเช็คว่ามี ID นี้อยู่ในหน้า HTML จริงๆ ค่อยใส่ข้อความ
    const updateElement = (id, text) => {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    };

    updateElement('display-project-name', projectData.thai_project_title);
    updateElement('detail-thai-name', `ชื่อโครงการ(ภาษาไทย): ${projectData.thai_project_title}`);
    updateElement('detail-eng-name', `ชื่อโครงการ(ภาษาอังกฤษ): ${projectData.eng_project_title || "-"}`);
    updateElement('detail-year', `ปีการศึกษา: ${projectData.academic_year || "-"}`);
    updateElement('detail-created_at', `เริ่มโครงงาน: ${dateStr}`);


    const { data: membersData, error: membersError } = await supabaseClient
        .from('responsible_for')
        .select(`
            user_id,
            users ( 
                first_name, 
                last_name, 
                email, 
                avatar_url,
                user_role ( role_id )
            )
        `)
        .eq('project_id', projectId);

    if (membersError) {
        console.error("Error fetching members:", membersError);
        return;
    }

    const membersContainer = document.getElementById('members-list-container');
    membersContainer.innerHTML = "";

    if (!membersData || membersData.length === 0) {
        membersContainer.innerHTML = `<p class="text-sm text-gray-400 text-center py-4">ยังไม่มีสมาชิกในโครงงานนี้</p>`;
        return;
    }

    const { data: authData } = await supabaseClient.auth.getUser();
    const currentUserId = authData?.user?.id;
    membersData.forEach(member => {
        const firstName = member.users?.first_name || "ไม่ทราบชื่อ";
        const lastName = member.users?.last_name || "";
        const email = member.users?.email || "-";

        const roleData = member.users?.user_role;
        const roleId = Array.isArray(roleData) ? roleData[0]?.role_id : roleData?.role_id;

        let roleText = "นิสิต";

        if (roleId === 2) {
            roleText = "อาจารย์";
        } else if (roleId === 1) {
            roleText = "นิสิต";
        }

        if (member.user_id === currentUserId) {
            roleText += " (คุณ)";
        }

        // console.log(`คนชื่อ ${firstName} มี role จากฐานข้อมูลคือ:`, roleId);

        // เช็ครูปโปรไฟล์
        const avatarUrl = member.users?.avatar_url;
        const avatarHTML = avatarUrl
            ? `<img src="${avatarUrl}" class="w-8 h-8 rounded-full object-cover shrink-0">`
            : `<div class="w-8 h-8 bg-[#93c5fd] text-[#1e3a8a] rounded-full flex items-center justify-center shrink-0">
                   <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4"><path fill-rule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clip-rule="evenodd" /></svg>
               </div>`;

        const memberHTML = `
            <div class="flex items-center justify-between relative mb-3">
                <div class="flex items-center gap-3">
                    ${avatarHTML}
                    <div>
                        <p class="text-[13px] font-medium text-gray-800 leading-tight">${firstName} ${lastName}</p>
                        <p class="text-[11px] text-gray-400">${email}</p> 
                    </div>
                </div>
                <div class="relative">
                    <div onclick="toggleMemberMenu(event, this)" class="flex items-center gap-1 cursor-pointer select-none py-1 px-2 rounded hover:bg-gray-50">
                        <span class="text-[12px] text-gray-600 font-medium pr-1">${roleText}</span>
                        <svg class="h-3 w-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                    
                    <div class="member-dropdown hidden absolute top-full right-0 mt-1 bg-white border border-gray-100 shadow-[0_4px_12px_rgba(0,0,0,0.1)] rounded-lg py-1.5 w-20 z-30 text-center">
                        <button onclick="removeMember('${member.user_id}')" class="text-[#e92b58] text-[12px] font-medium w-full py-1 cursor-pointer">ลบ</button>
                    </div>
                </div>
            </div>
        `;
        membersContainer.insertAdjacentHTML('beforeend', memberHTML);
    });


    // ใช้ getElementById เพื่อความชัวร์
    const addBtn = document.getElementById("add-btn");
    if (addBtn) {
        addBtn.addEventListener('click', async () => {
            const emailInput = document.getElementById('add-member-email');
            const errorText = document.getElementById('add-member-error');

            const showError = (msg) => {
                if (errorText) {
                    errorText.textContent = msg;
                    errorText.classList.remove('hidden');
                } else {
                    alert(msg); // เผื่อหา tag ไม่เจอ
                }
            };

            // ล้างข้อความ Error ก่อนเริ่มทำงานใหม่
            if (errorText) {
                errorText.textContent = "";
                errorText.classList.add('hidden');
            }

            // เช็คว่าหาช่องกรอกเจอไหม
            if (!emailInput) {
                alert("เกิดข้อผิดพลาด: หาช่องกรอกอีเมลไม่เจอ (เช็ค ID ใน HTML)");
                return;
            }

            const emailRaw = emailInput.value;
            const emails = emailRaw ? emailRaw.split(',').map(email => email.trim()).filter(email => email !== "") : [];

            if (emails.length === 0) {
                // alert("กรุณากรอกอีเมลที่ต้องการเพิ่ม");
                return;
            }

            const originalText = addBtn.textContent;
            // addBtn.textContent = "กำลังโหลด...";
            addBtn.disabled = true;

            // 1. ค้นหาผู้ใช้จากอีเมล
            const { data: foundUsers, error: userError } = await supabaseClient
                .from('users')
                .select('user_id, email')
                .in('email', emails);

            if (userError) {
                showError("เกิดข้อผิดพลาดในการค้นหาบัญชีผู้ใช้: " + userError.message);
                addBtn.textContent = originalText;
                addBtn.disabled = false;
                return;
            }

            if (!foundUsers || foundUsers.length === 0) {
                showError("ไม่พบบัญชีผู้ใช้หรือรูปแบบอีเมลไม่ถูกต้อง");
                addBtn.textContent = originalText;
                addBtn.disabled = false;
                return;
            }

            if (foundUsers.length < emails.length) {
                showError("มีบางอีเมลที่ยังไม่ได้สมัครสมาชิก ระบบจะเพิ่มเฉพาะคนที่มีบัญชีเท่านั้น");
            }

            // 2. บันทึกลงตาราง responsible_for
            const responsibilityData = foundUsers.map(user => ({
                project_id: projectId,
                user_id: user.user_id,
            }));

            const { error: respError } = await supabaseClient
                .from('responsible_for')
                .insert(responsibilityData);

            if (respError) {
                // 23505 เป็นรหัสแจ้งเตือนมาตรฐานของ supabase เพื่อเช็คว่าข้อมูลซ้ำกันมั้ย
                if (respError.code === '23505') {
                    showError("อีเมลนี้มีอยู่ในโครงงานนี้แล้ว");
                } else {
                    showError("บันทึกสมาชิกล้มเหลว: " + respError.message);
                }
                addBtn.textContent = originalText;
                addBtn.disabled = false;
                return;
            }
            emailInput.value = "";
            window.location.reload();
        });
    } else {
        console.error("ระบบหาปุ่มเพิ่มสมาชิกไม่เจอ ตรวจสอบ id='add-btn' ในไฟล์ HTML");
    }
});

// ลบสมาชิกออกจากโครงงาน (ต้องกลับไปเพิ่มด้วยว่าอาจาร์ยต้องมีอย่างน้้อยน้อย1คนในโครงงาน, ถ้าเหลือ1คนแล้วจะไม่สามารถลบได้, มีนักศึกษาอย่างน้อย1คนในโครงงาน ถ้าเหลือ1คนแล้วจะไม่สามารถลบได้ ฟิวลบตัวเองไม่ได้)
window.removeMember = async function (userId) {
    if (!confirm('คุณต้องการลบสมาชิกคนนี้ออกจากโครงงานใช่หรือไม่?')) {
        return;
    }

    const errorText = document.getElementById('add-member-error');
    const showError = (msg) => {
        if (errorText) {
            errorText.textContent = msg;
            errorText.classList.remove('hidden');
        } else {
            alert(msg); // เผื่อหา tag ไม่เจอ
        }
    };

    // ล้างข้อความ Error ก่อนเริ่มทำงานใหม่
    if (errorText) {
        errorText.textContent = "";
        errorText.classList.add('hidden');
    }

    const urlParams = new URLSearchParams(window.location.search);
    const projectId = urlParams.get('id');

    if (!projectId) {
        showError("ไม่พบข้อมูลโครงงาน");
        return;
    }

    const { data: authData, error: authError } = await supabaseClient.auth.getUser();

    if (authError || !authData?.user) {
        showError("ไม่สามารถยืนยันตัวตนของคุณได้ กรุณาล็อกอินใหม่");
        return;
    }

    const currentLoggedInUserId = authData.user.id;

    // ตรวจสอบว่าคนที่กดลบ คือตัวเองหรือไม่
    if (userId === currentLoggedInUserId) {
        showError("ไม่สามารถลบตัวเองออกจากโครงงานได้");
        return;
    }

    // 1. ดึงข้อมูลสมาชิกทั้งหมดในโครงงานปัจจุบันเพื่อมาเช็คจำนวน
    const { data: currentMembers, error: fetchError } = await supabaseClient
        .from('responsible_for')
        .select(`
            user_id,
            users ( 
                user_role ( role_id ) 
            )
        `)
        .eq('project_id', projectId);

    if (fetchError) {
        console.error("เช็คข้อมูลสมาชิกล้มเหลว:", fetchError.message);
        showError("เกิดข้อผิดพลาดในการตรวจสอบข้อมูลสมาชิก");
        return;
    }

    // 2. นับจำนวนนิสิตและอาจารย์ และหาบทบาทของคนที่กำลังจะถูกลบ
    let studentCount = 0;
    let teacherCount = 0;
    let targetRoleId = null;

    currentMembers.forEach(member => {
        const roleData = member.users?.user_role;
        const roleId = Array.isArray(roleData) ? roleData[0]?.role_id : roleData?.role_id;

        if (roleId === 1) studentCount++;
        if (roleId === 2) teacherCount++;

        if (member.user_id === userId) {
            targetRoleId = roleId;
        }
    });

    // 3. ตรวจสอบเงื่อนไข (บังคับให้มีนิสิตอย่างน้อย 1 คน และอาจารย์อย่างน้อย 1 คน)
    if (targetRoleId === 1 && studentCount <= 1) {
        showError("ไม่สามารถลบได้ เนื่องจากต้องมีนิสิตอย่างน้อย 1 คนในโครงงาน");
        return;
    }

    if (targetRoleId === 2 && teacherCount <= 1) {
        showError("ไม่สามารถลบได้ เนื่องจากต้องมีอาจารย์อย่างน้อย 1 ท่านในโครงงาน");
        return;
    }

    // 4. สั่งลบข้อมูลเมื่อผ่านเงื่อนไขทั้งหมด
    const { error } = await supabaseClient
        .from('responsible_for')
        .delete()
        .eq('project_id', projectId)
        .eq('user_id', userId);

    if (error) {
        console.error("ลบสมาชิกไม่สำเร็จ:", error.message);
        showError("เกิดข้อผิดพลาดในการลบสมาชิก: " + error.message);
        return;
    }

    window.location.reload();
};

const backButton = document.getElementById('back-button');
if (backButton) {
    backButton.addEventListener('click', () => {
        window.location.href = 'dashboard-student.html';
    });
} 