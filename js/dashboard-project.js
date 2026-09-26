import { supabaseClient } from './supabase.js';

let currentSubmissionId = null;
window.togglePopup = function (popupID) {
    const popups = ['details-popup', 'members-popup'];
    popups.forEach(id => {
        const el = document.getElementById(id);
        if (id === popupID) {
            el.classList.toggle('hidden');
        } else {
            el.classList.add('hidden');
        }
    });

    // โค้ดล้างค่าตรงนี้
    const errorText = document.getElementById('add-member-error');
    if (errorText) {
        errorText.textContent = "";
        errorText.classList.add('hidden');
    }

    // เคลียร์ช่องพิมพ์อีเมล
    const emailInput = document.getElementById('add-member-email');
    if (emailInput) {
        emailInput.value = "";
    }
}

// ฟังก์ชันเปิด-ปิดเมนูของสมาชิกแต่ละคน
window.toggleMemberMenu = function (event, element) {
    event.stopPropagation(); // ป้องกันไม่ให้ Event วิ่งไปทำงานที่ window.click
    document.querySelectorAll('.member-dropdown').forEach(el => {
        if (el !== element.nextElementSibling) el.classList.add('hidden');
    });
    element.nextElementSibling.classList.toggle('hidden');
}

// ลบสมาชิกออกจากโครงงาน 
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

    const { data: checkProj } = await supabaseClient
        .from('project')
        .select('creator_id')
        .eq('project_id', projectId)
        .single();

    if (checkProj && checkProj.creator_id === userId) {
        showError("ไม่สามารถลบเจ้าของโครงงานออกจากโครงงานได้");
        return;
    }

    // ดึงข้อมูลสมาชิกทั้งหมดในโครงงานปัจจุบันเพื่อมาเช็คจำนวน
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

    // นับจำนวนนิสิตและอาจารย์ และหาบทบาทของคนที่กำลังจะถูกลบ
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

    if (targetRoleId === 1 && studentCount <= 1) {
        showError("ไม่สามารถลบได้ เนื่องจากต้องมีนิสิตอย่างน้อย 1 คนในโครงงาน");
        return;
    }

    if (targetRoleId === 2 && teacherCount <= 1) {
        showError("ไม่สามารถลบได้ เนื่องจากต้องมีอาจารย์อย่างน้อย 1 ท่านในโครงงาน");
        return;
    }

    // สั่งลบข้อมูลเมื่อผ่านเงื่อนไขทั้งหมด
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

// สลับแท็บ คำแนะนำ ai คำอาจารย์
window.switchFeedbackTab = function (tabName) {
    const tabAi = document.getElementById('tab-ai');
    const tabTeacher = document.getElementById('tab-teacher');
    const contentAi = document.getElementById('ai-content-area');
    const contentTeacher = document.getElementById('teacher-content-area');
    const activeTabClass = "cursor-pointer pb-2 border-b-2 border-[#213f8c] font-bold text-sm text-[#213f8c] transition-colors";
    const inactiveTabClass = "cursor-pointer pb-2 border-b-2 border-transparent font-medium text-sm text-gray-400 hover:text-gray-600 transition-colors";

    if (tabName === 'ai') {
        tabAi.className = activeTabClass;
        tabTeacher.className = inactiveTabClass;
        contentAi.classList.remove('hidden');
        contentTeacher.classList.add('hidden');
    } else {
        tabTeacher.className = activeTabClass;
        tabAi.className = inactiveTabClass;
        contentTeacher.classList.remove('hidden');
        contentAi.classList.add('hidden');
    }
};

document.addEventListener("DOMContentLoaded", async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const projectId = urlParams.get('id');

    const { data: projectData, error: projectError } = await supabaseClient
        .from('project')
        .select('*')
        .eq('project_id', projectId)
        .single();

    if (!projectId) {
        alert("ไม่พบข้อมูลโครงงาน");
        window.location.href = "dashboard-student.html";
        return;
    }

    if (projectError || !projectData) {
        console.log("Error:", projectError);
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
    updateElement('detail-eng-name', `ชื่อโครงการ(ภาษาอังกฤษ): ${projectData.english_project_title || "-"}`);
    updateElement('detail-year', `ปีการศึกษา: ${projectData.academic_year || "-"}`);
    updateElement('detail-created_at', `เริ่มโครงงาน: ${dateStr}`);

    if (projectData.status === 'เสร็จสิ้น') {
        const uploadBtn = document.getElementById('upload-btn');
        if (uploadBtn) {
            const uploadContainer = uploadBtn.closest('.absolute.bottom-4');
            if (uploadContainer) {
                uploadContainer.innerHTML = `
                    <div class="bg-green-100 border border-green-200 text-green-700 px-6 py-2.5 rounded-full font-bold shadow-lg pointer-events-auto text-[13px] flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                        </svg>
                        โครงงานนี้ได้รับการอนุมัติเสร็จสิ้นแล้ว
                    </div>
                `;
            }
        }
        const statusSelect = document.getElementById('doc-status-select');
        const commentInput = document.getElementById('teacher-comment');
        const submitFeedbackBtn = document.getElementById('submit-feedback-btn');

        if (statusSelect) statusSelect.disabled = true; // ล็อก Dropdown
        if (commentInput) {
            commentInput.disabled = true; // ล็อกกล่องพิมพ์
            commentInput.placeholder = "โครงงานนี้ถูกปิดแล้ว ไม่สามารถประเมินเพิ่มเติมได้";
        }
        if (submitFeedbackBtn) {
            submitFeedbackBtn.disabled = true; // ล็อกปุ่มเซฟ
            submitFeedbackBtn.innerText = "ปิดการประเมิน";
            submitFeedbackBtn.className = "bg-gray-200 text-gray-400 w-full py-2.5 rounded-xl text-[14px] font-bold cursor-not-allowed";
        }
    }

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
        membersContainer.innerHTML = `<p class="text-sm text-gray-400 text-center py-4">โหลดรายชื่อสมาชิกไม่สำเร็จ</p>`;
        return;
    }

    if (!membersData || membersData.length === 0) {
        membersContainer.innerHTML = `...`;
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

        const isCreator = member.user_id === projectData.creator_id;
        if (isCreator) {
            roleText += " (เจ้าของ)";
        }

        // เช็ครูปโปรไฟล์
        const avatarUrl = member.users?.avatar_url;
        const avatarHTML = avatarUrl
            ? `<img src="${avatarUrl}" class="w-8 h-8 rounded-full object-cover shrink-0">`
            : `<div class="w-8 h-8 bg-[#93c5fd] text-[#1e3a8a] rounded-full flex items-center justify-center shrink-0">
                   <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4"><path fill-rule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clip-rule="evenodd" /></svg>
               </div>`;

        const actionMenuHTML = isCreator ?
            `<span class="text-xs font-medium text-gray-800 pr-2">${roleText}</span>`
            : `
            <div class="relative">
                <div onclick="toggleMemberMenu(event, this)" class="flex items-center gap-1 cursor-pointer select-none py-1 px-2 rounded hover:bg-gray-50">
                    <span class="text-xs text-gray-800 font-medium pr-1">${roleText}</span>
                    <svg class="h-3 w-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
                <div class="member-dropdown hidden absolute top-full right-0 mt-1 bg-white border border-gray-100 shadow-[0_4px_12px_rgba(0,0,0,0.1)] rounded-lg py-1.5 w-20 z-30 text-center">
                    <button onclick="removeMember('${member.user_id}')" class="text-[#e92b58] text-xs font-medium w-full py-1 cursor-pointer">ลบ</button>
                </div>
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
                ${actionMenuHTML}
            </div>
        `;
        membersContainer.insertAdjacentHTML('beforeend', memberHTML);

    });

    // ปุ่มเพิ่มสมาชิก
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
                return;
            }

            const originalText = addBtn.textContent;
            addBtn.disabled = true;

            // ค้นหาผู้ใช้จากอีเมล
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
            // const someNotFound = foundUsers.length < emails.length;

            // บันทึกลงตาราง responsible_for
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
            // addBtn.disabled = false;

            // if (someNotFound) {
            //     await loadMembers(projectId);   // อัปเดตรายชื่อโดยไม่โหลดหน้าใหม่ ข้อความจะไม่หาย
            //     showError("มีบางอีเมลที่ยังไม่ได้สมัครสมาชิก ระบบเพิ่มเฉพาะคนที่มีบัญชีเท่านั้น");
            // } else {
            //     window.location.reload();
            // }
        });
    } else {
        console.log("ระบบหาปุ่มเพิ่มสมาชิกไม่เจอ ตรวจสอบ id='add-btn' ในไฟล์ HTML");
    }

    const backButton = document.getElementById('back-button');
    if (backButton) {
        backButton.addEventListener('click', async () => {
            backButton.style.opacity = '0.5';
            backButton.style.pointerEvents = 'none';

            // ดึงข้อมูล User ปัจจุบัน
            const { data: { user } } = await supabaseClient.auth.getUser();

            if (user) {
                // เช็ก Role ID ว่าเป็นใคร
                const { data: roleData } = await supabaseClient
                    .from('users')
                    .select('user_role(role_id)')
                    .eq('user_id', user.id)
                    .single();

                const roleId = Array.isArray(roleData?.user_role) ? roleData.user_role[0]?.role_id : roleData?.user_role?.role_id;

                // 2 = อาจารย์, 1 = นิสิต
                if (roleId === 2) {
                    window.location.href = 'dashboard-teacher.html';
                } else {
                    window.location.href = 'dashboard-student.html';
                }
            } else {
                window.location.href = '../index.html';
            }
        });
    }

    // ส่วนจัดการปุ่ม "บันทึกผลประเมิน" (ของอาจารย์)
    // ส่วนจัดการปุ่ม "บันทึกผลประเมิน" (ของอาจารย์)
    const submitFeedbackBtn = document.getElementById('submit-feedback-btn');

    if (submitFeedbackBtn) {
        submitFeedbackBtn.addEventListener('click', async () => {
            if (!currentSubmissionId) {
                alert("กรุณาเลือกเวอร์ชันเอกสารก่อนทำการประเมิน");
                return;
            }

            const statusSelect = document.getElementById('doc-status-select');
            const commentInput = document.getElementById('teacher-comment');

            const status = statusSelect ? statusSelect.value : null;
            const comment = commentInput ? commentInput.value.trim() : "";

            // ตรวจสอบความยาวข้อความ (จำกัด 1000 ตัวอักษร)
            if (comment.length > 1000) {
                alert("ข้อเสนอแนะยาวเกินไป (จำกัด 1000 ตัวอักษร) กรุณาสรุปให้กระชับขึ้น");
                return;
            }

            // ถ้าเลือก "ไม่ผ่าน" ต้องบังคับพิมพ์ข้อเสนอแนะ
            if (status === "ต้องแก้ไข" && comment === "") {
                alert("กรุณาพิมพ์ข้อเสนอแนะเพื่อให้นิสิตนำไปแก้ไข");
                commentInput.focus();
                return;
            }

            // เปลี่ยนหน้าตาปุ่มกันการกดซ้ำ
            const originalText = submitFeedbackBtn.innerText;
            submitFeedbackBtn.disabled = true;
            submitFeedbackBtn.innerText = "กำลังบันทึก...";

            // 1. อัปเดตสถานะเอกสาร
            if (status) {
                const { error: updateError } = await supabaseClient
                    .from('document_submission')
                    .update({ processing_status: status })
                    .eq('submission_id', currentSubmissionId);

                if (updateError) {
                    alert("เกิดข้อผิดพลาดในการอัปเดตสถานะ: " + updateError.message);
                    submitFeedbackBtn.disabled = false;
                    submitFeedbackBtn.innerText = originalText;
                    return;
                }
            }

            // 2. บันทึกข้อเสนอแนะอาจารย์ลงตาราง feedback
            if (comment) {
                const { data: { user } } = await supabaseClient.auth.getUser();

                const { error: insertError } = await supabaseClient
                    .from('feedback')
                    .insert([{
                        submission_id: currentSubmissionId,
                        user_id: user.id,
                        details: comment,
                        created_at: new Date().toISOString()
                    }]);

                if (insertError) {
                    alert("เกิดข้อผิดพลาดในการบันทึกคอมเมนต์: " + insertError.message);
                    submitFeedbackBtn.disabled = false;
                    submitFeedbackBtn.innerText = originalText;
                    return;
                }
                commentInput.value = ""; // ล้างช่องพิมพ์เมื่อบันทึกเสร็จ
            }

            const currentProjectId = new URLSearchParams(window.location.search).get('id');
            await loadSubmissionHistory(currentProjectId);

            if (typeof loadTeacherFeedback === 'function') {
                await loadTeacherFeedback(currentSubmissionId);
            }

            submitFeedbackBtn.disabled = false;
            submitFeedbackBtn.innerText = originalText;
        });
    }

    const approveProjectBtn = document.getElementById('approve-project-btn');

    if (approveProjectBtn) {
        approveProjectBtn.addEventListener('click', async () => {
            const urlParams = new URLSearchParams(window.location.search);
            const currentProjectId = urlParams.get('id');

            if (!currentProjectId) {
                alert("ไม่พบรหัสโครงงาน");
                return;
            }

            // เปลี่ยนหน้าตาปุ่มกันกดเบิ้ล
            const originalText = approveProjectBtn.innerText;
            approveProjectBtn.disabled = true;
            approveProjectBtn.innerText = "กำลังตรวจสอบ...";

            // ดช็กว่าเอกสารเวอร์ชันล่าสุด "ผ่าน" หรือยัง
            const { data: latestSub, error: subError } = await supabaseClient
                .from('document_submission')
                .select('processing_status')
                .eq('project_id', currentProjectId)
                .order('submission_time', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (subError) {
                alert("ตรวจสอบข้อมูลเอกสารขัดข้อง: " + subError.message);
                approveProjectBtn.disabled = false;
                approveProjectBtn.innerText = originalText;
                return;
            }

            if (!latestSub || latestSub.processing_status !== "ผ่าน") {
                alert("ไม่อนุญาตให้อนุมัติโครงงาน เนื่องจากเอกสารเวอร์ชันล่าสุดยังไม่ผ่านการประเมิน");
                approveProjectBtn.disabled = false;
                approveProjectBtn.innerText = originalText;
                return;
            }

            // ถ้าเอกสารล่าสุดผ่านแล้ว ค่อยถามเพื่อความชัวร์
            const confirmApprove = confirm("เอกสารล่าสุดผ่านการประเมินแล้ว คุณแน่ใจหรือไม่ว่าต้องการอนุมัติปิดโครงงานนี้?");
            if (!confirmApprove) {
                approveProjectBtn.disabled = false;
                approveProjectBtn.innerText = originalText;
                return;
            }

            approveProjectBtn.innerText = "กำลังอนุมัติ...";

            // อัปเดตคอลัมน์ status ในตาราง project 
            const { error: updateError } = await supabaseClient
                .from('project')
                .update({ status: 'เสร็จสิ้น' })
                .eq('project_id', currentProjectId);

            if (updateError) {
                alert("เกิดข้อผิดพลาดในการอนุมัติโครงงาน: " + updateError.message);
                approveProjectBtn.disabled = false;
                approveProjectBtn.innerText = originalText;
                return;
            }

            alert("อนุมัติโครงงานเรียบร้อยแล้ว!");
            window.location.reload();
        });
    }

    // เรียกโหลด 3 คอลัมน์ด้านล่างให้ทำงาน;
    await Promise.all([
        loadDocumentFormats(),
        loadSubmissionHistory(projectId),
    ]);
});


// ฟังก์ชันจัดการ ประวัติ, PDF, AI
// โหลดประวัติการส่ง
async function loadSubmissionHistory(projectId) {
    const listContainer = document.getElementById('version-list-container');
    if (!listContainer) return;

    const { data: submissions, error } = await supabaseClient
        .from('document_submission')
        .select(`
            submission_id,
            submission_number,
            submission_time,
            processing_status,
            file_link,
            users ( email, first_name, last_name ),
            document_format ( document_name )
        `)
        .eq('project_id', projectId)
        .order('submission_time', { ascending: false });

    const approveBtn = document.getElementById('approve-project-btn');
    if (approveBtn) {
        approveBtn.classList.remove('hidden');
        const { data: projData } = await supabaseClient
            .from('project')
            .select('status')
            .eq('project_id', projectId)
            .single();

        if (projData && projData.status === "เสร็จสิ้น") {
            // 1. ถ้าโครงงานเสร็จแล้ว -> เปลี่ยนเป็นป้ายสีเขียว กดไม่ได้
            approveBtn.disabled = true;
            approveBtn.innerText = "อนุมัติโครงงานแล้ว";
            approveBtn.className = "bg-[#dcfce7] text-[#16a34a] px-5 py-2 rounded-xl text-[13px] font-bold cursor-not-allowed";
            approveBtn.title = "";
        } else if (!submissions || submissions.length === 0 || submissions[0].processing_status !== "ผ่าน") {
            // 2. ถ้าเอกสารยังไม่ผ่าน -> ปุ่มสีเทา กดไม่ได้
            approveBtn.disabled = true;
            approveBtn.innerText = "อนุมัติโครงงาน";
            approveBtn.className = "bg-gray-200 text-gray-400 px-5 py-2 rounded-xl text-[13px] font-bold cursor-not-allowed transition-colors";
            approveBtn.title = "เอกสารเวอร์ชันล่าสุดต้องผ่านการประเมินก่อน";
        } else {
            // 3. ถ้าเอกสารผ่านแล้ว พร้อมอนุมัติ -> ปุ่มสีน้ำเงิน กดได้
            approveBtn.disabled = false;
            approveBtn.innerText = "อนุมัติโครงงาน";
            approveBtn.className = "bg-[#213f8c] text-white px-5 py-2 rounded-xl text-[13px] font-bold hover:bg-[#1a3270] shadow-md transition-colors cursor-pointer";
            approveBtn.title = "";
        }
    }

    if (error || !submissions || submissions.length === 0) {
        listContainer.innerHTML = `<p class="text-sm text-gray-400 text-center py-4">ยังไม่มีประวัติการส่ง</p>`;
        return;
    }

    listContainer.innerHTML = submissions.map((sub, index) => {
        const isLatest = index === 0;
        const isPass = sub.processing_status === "ผ่าน";
        const dateStr = new Date(sub.submission_time).toLocaleDateString('th-TH');
        // แยกตัวแปรชื่อ และ อีเมล
        const fName = sub.users?.first_name || '';
        const lName = sub.users?.last_name || '';
        const fullName = (fName || lName) ? `${fName} ${lName}`.trim() : 'ไม่ระบุชื่อ';
        const formatName = sub.document_format?.document_name || sub.document_format?.format_name || 'ไม่ระบุมาตรฐาน';

        return `
            <div onclick="selectVersion('${sub.submission_id}', '${sub.file_link}', '${fullName}', '${formatName}', '${sub.submission_time}', this)" 
                class="version-card ${isLatest ? 'bg-gray-100' : ''} hover:bg-gray-50 rounded-2xl p-4 cursor-pointer border-transparent transition-colors">
                <div class="flex items-center gap-2 mb-1">
                    <span class="font-bold text-gray-800">v${sub.submission_number}</span>
                    <span class="text-[11px] font-bold px-2 py-0.5 rounded-full ${isPass ? 'text-green-600 bg-green-100' : 'text-red-500 bg-red-100'}">
                        ${sub.processing_status || 'รอดำเนินการ'}
                    </span>
                </div>
                <p class="text-xs text-gray-500 mt-1">${dateStr}</p>
            </div>
        `;
    }).join('');

    // โหลดเวอร์ชันล่าสุดเมื่อเปิดหน้าเว็บ
    if (submissions.length > 0) {
        const latest = submissions[0];
        const fName = latest.users?.first_name || '';
        const lName = latest.users?.last_name || '';
        const latestFullName = (fName || lName) ? `${fName} ${lName}`.trim() : 'ไม่ระบุชื่อ';
        const latestFormat = latest.document_format?.document_name || latest.document_format?.format_name || 'ไม่ระบุมาตรฐาน';

        // แยกส่ง fullName และ email เข้าไปใน selectVersion
        selectVersion(latest.submission_id, latest.file_link, latestFullName, latestFormat, latest.submission_time, null);
    }
}

// จัดการเมื่อกดเลือกประวัติ
window.selectVersion = async function (submissionId, fileUrl, submittedBy, formatName, submissionTime, element) {
    currentSubmissionId = submissionId;
    // ล้างไฮไลท์สีเทาออกจากการ์ดทุกใบ
    document.querySelectorAll('.version-card').forEach(el => el.classList.remove('bg-gray-100'));

    // ไฮไลท์การ์ดใบที่ถูกเลือก 
    if (element) {
        element.classList.add('bg-gray-100');
    } else {
        const firstCard = document.querySelector('.version-card');
        if (firstCard) firstCard.classList.add('bg-gray-100');
    }

    // อัปเดตข้อมูลคนส่ง
    const submitterNameEl = document.getElementById('submitter-name');
    const formatDisplayEl = document.getElementById('display-format-name');
    const submitTimeEl = document.getElementById('submit-time');

    if (submitterNameEl) submitterNameEl.innerText = submittedBy;
    if (formatDisplayEl) formatDisplayEl.innerText = `อ้างอิง: ${formatName}`;
    if (submitTimeEl) submitTimeEl.innerText = new Date(submissionTime).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.';

    // โชว์เอกสาร
    const viewer = document.getElementById('document-viewer-container');
    if (viewer) {
        if (fileUrl && fileUrl !== 'null') {
            viewer.innerHTML = `
                <div class="bg-white mx-auto h-full flex flex-col">
                    <iframe src="${fileUrl}" class="w-full h-full border-0"></iframe>
                </div>
            `;
        } else {
            viewer.innerHTML = `<div class="flex h-full items-center justify-center text-gray-400">ไม่พบไฟล์เอกสาร</div>`;
        }
    }

    await loadAIInspection(submissionId);
    if (typeof loadTeacherFeedback === 'function') {
        await loadTeacherFeedback(submissionId);
    }
};

// โหลดและแสดงผลการตรวจจาก AI
async function loadAIInspection(submissionId) {
    const feedbackContainer = document.getElementById('ai-feedback-container');
    const metricsContainer = document.getElementById('ai-metrics-container');
    if (!feedbackContainer) return;

    feedbackContainer.innerHTML = `<p class="text-sm text-gray-400 text-center py-4">กำลังโหลดผลตรวจ...</p>`;
    if (metricsContainer) metricsContainer.classList.add('hidden');

    const { data: inspection } = await supabaseClient
        .from('ai_inspection')
        .select('ai_inspection_id')
        .eq('submission_id', submissionId)
        .maybeSingle();

    if (!inspection) {
        feedbackContainer.innerHTML = `<p class="text-sm text-gray-400 text-center py-4">ยังไม่ได้รัน AI ตรวจสอบ</p>`;
        return;
    }

    const { data: results } = await supabaseClient
        .from('ai_inspection_result')
        .select('*')
        .eq('ai_inspection_id', inspection.ai_inspection_id);

    if (!results || results.length === 0) {
        feedbackContainer.innerHTML = `<p class="text-sm text-gray-400 text-center py-4">ไม่มีข้อผิดพลาดที่พบ</p>`;
        return;
    }

    // แสดงป้ายบอกเปอร์เซ็นต์
    if (results.length > 0 && results[0].ai_confidence !== null && metricsContainer) {
        document.getElementById('confidence-badge').innerText = `ความมั่นใจ ${results[0].ai_confidence}%`;
        document.getElementById('severity-badge').innerText = `ความรุนแรง ${results[0].severity || '-'}`;
        metricsContainer.classList.remove('hidden');
    }

    // คัดแยกกลุ่มข้อมูล
    const passedItems = results.filter(item => item.pass_fail_result === true && item.passed_items);
    const failedItems = results.filter(item => item.pass_fail_result === false && item.detected_issues);
    const uncheckableItems = results.filter(item => item.uncheckable_items);

    let finalHTML = '';

    // สิ่งที่ตรวจผ่าน
    if (passedItems.length > 0) {
        finalHTML += `
            <div class="mb-6">
                <p class="font-bold mb-2 text-sm">สิ่งที่ตรวจผ่าน</p>
                <ul class="list-disc pl-5 space-y-1 text-gray-800">
                    ${passedItems.map(item => `<li>${item.passed_items}</li>`).join('')}
                </ul>
            </div>
        `;
    }

    // สิ่งที่ตรวจไม่ผ่าน (รวมข้อผิดพลาดและคำแนะนำไว้ในนี้)
    if (failedItems.length > 0) {
        finalHTML += `
            <div class="mb-6">
                <p class="font-bold mb-2 text-sm">สิ่งที่ตรวจไม่ผ่าน</p>
                <ul class="list-disc pl-5 space-y-4 text-gray-700">
                    ${failedItems.map(item => `
                        <li>
                            <p class="font-medium">${item.detected_issues}</p>
                            ${item.correction_suggestions ? `
                                <div class="mt-1">
                                    <p class="font-semibold text-[#213f8c] text-xsmb-1">คำแนะนำ</p>
                                    <p class="text-gray-500 text-[13px] bg-blue-50/50 p-2 rounded">${item.correction_suggestions}</p>
                                </div>
                            ` : ''}
                        </li>
                    `).join('')}
                </ul>
            </div>
        `;
    }

    // สิ่งที่ไม่สามารถตรวจสอบได้
    if (uncheckableItems.length > 0) {
        finalHTML += `
            <div class="mb-6">
                <p class="font-bold mb-2 text-sm">สิ่งที่ไม่สามารถตรวจสอบได้</p>
                <ul class="list-disc pl-5 space-y-1 text-gray-800">
                    ${uncheckableItems.map(item => `<li>${item.uncheckable_items}</li>`).join('')}
                </ul>
            </div>
        `;
    }

    // ลบคลาสของ <ul> ตัวนอกสุดออก เพื่อใช้การจัดรูปแบบใหม่ที่สะอาดขึ้น
    feedbackContainer.className = "text-[13px]";
    feedbackContainer.innerHTML = finalHTML;
}


// นิสิต
// โหลดตัวเลือกมาตรฐานเอกสารเข้า Dropdown 
async function loadDocumentFormats() {
    const formatSelect = document.getElementById('format-select');
    if (!formatSelect) return;

    const { data: formats, error: error } = await supabaseClient
        .from('document_format')
        .select('*');

    if (error) {
        console.error("โหลดข้อมูลมาตรฐานล้มเหลว:", error);
        formatSelect.innerHTML = '<option value="">โหลดข้อมูลล้มเหลว</option>';
        return;
    }

    if (formats && formats.length > 0) {
        formatSelect.innerHTML = '<option value="" disabled selected>เลือกมาตรฐานเอกสาร</option>';
        formats.forEach(format => {
            const option = document.createElement('option');
            option.value = format.format_id || format.id;
            option.textContent = format.document_name;
            formatSelect.appendChild(option);
        });
    } else {
        formatSelect.innerHTML = '<option value="" disabled selected>ไม่มีข้อมูลในฐานข้อมูล</option>';
    }
}

// ระบบจัดการกล่องอัปโหลดไฟล์ (แจ้งเตือน & เช็คเงื่อนไข & ลบไฟล์)
document.addEventListener("DOMContentLoaded", () => {
    const fileUpload = document.getElementById('file-upload');
    const fileLabel = document.getElementById('file-label');
    const fileIndicator = document.getElementById('file-indicator');
    const clearFileBtn = document.getElementById('clear-file-btn');
    const formatSelect = document.getElementById('format-select');
    const uploadBtn = document.getElementById('upload-btn');

    // ฟังก์ชันช่วยเคลียร์ไฟล์และรีเซ็ต UI กลับเป็นค่าเริ่มต้น
    const resetFileInput = () => {
        if (fileUpload) fileUpload.value = "";
        if (fileIndicator) fileIndicator.classList.add('hidden');
        if (clearFileBtn) clearFileBtn.classList.add('hidden');
        if (fileLabel) {
            fileLabel.classList.remove('text-[#213f8c]', 'bg-blue-50');
            fileLabel.title = "แนบไฟล์เอกสาร";
        }
    };

    // ตรวจสอบตอนผู้ใช้กดเลือกไฟล์ (จำกัด 1 ไฟล์)
    if (fileUpload) {
        fileUpload.addEventListener('change', function () {
            if (this.files && this.files.length > 1) {
                alert("สามารถแนบได้เพียงครั้งละ 1 ไฟล์เท่านั้น");
                resetFileInput();
                return;
            }

            if (this.files && this.files.length === 1 && !this.files[0].name.toLowerCase().endsWith('.pdf')) {
                alert("รองรับเฉพาะไฟล์ PDF");
                resetFileInput();
                return;
            }

            if (this.files && this.files.length === 1) {
                fileIndicator.classList.remove('hidden');
                clearFileBtn.classList.remove('hidden'); // โชว์ปุ่ม X
                fileLabel.classList.add('text-[#213f8c]', 'bg-blue-50');
                fileLabel.title = "ไฟล์ที่เตรียมส่ง: " + this.files[0].name;
            } else {
                resetFileInput();
            }
        });
    }

    // จัดการเมื่อกดปุ่ม X เพื่อเอาไฟล์ออก
    if (clearFileBtn) {
        clearFileBtn.addEventListener('click', (e) => {
            e.preventDefault();
            resetFileInput(); // ล้างไฟล์ทิ้ง
        });
    }

    // ตรวจสอบเงื่อนไขตอนกดปุ่มส่ง
    if (uploadBtn) {
        uploadBtn.addEventListener('click', () => {
            const hasFile = fileUpload.files && fileUpload.files.length > 0;
            const hasFormat = formatSelect.value !== "";

            if (!hasFile && !hasFormat) return;

            if (hasFile && !hasFormat) {
                alert("กรุณาเลือกประวัติมาตรฐานก่อนกดส่งเอกสาร");
                return;
            }

            if (!hasFile && hasFormat) {
                alert("กรุณาแนบไฟล์เอกสารที่ต้องการตรวจ");
                return;
            }

            // เริ่มกระบวนการส่งไฟล์
            const originalBtnContent = uploadBtn.innerHTML;
            uploadBtn.disabled = true; // ล็อกปุ่มไว้กันกดซ้ำ
            uploadBtn.innerHTML = `<svg class="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>`;

            const file = fileUpload.files[0];
            const formatId = formatSelect.value;

            // สร้างชื่อไฟล์ใหม่เป็นภาษาอังกฤษ+ตัวเลข (ป้องกัน error ชื่อไฟล์ภาษาไทย)
            const projectId = new URLSearchParams(window.location.search).get('id');
            const fileExt = file.name.split('.').pop();
            const safeFileName = `doc_proj${projectId}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}.${fileExt}`;
            const bucketName = 'student_submissions';

            (async () => {
                try {
                    // อัปโหลดไฟล์ขึ้น Supabase Storage
                    const { error: uploadError } = await supabaseClient
                        .storage
                        .from(bucketName)
                        .upload(safeFileName, file);

                    if (uploadError) throw uploadError;

                    // ขอ URL ไฟล์แบบสาธารณะ
                    const { data: publicUrlData } = supabaseClient
                        .storage
                        .from(bucketName)
                        .getPublicUrl(safeFileName);

                    const filePublicUrl = publicUrlData.publicUrl;

                    // ดึงข้อมูล User และ ID โครงงาน (ต้องประกาศตรงนี้ก่อนนำไปใช้)
                    const projectId = new URLSearchParams(window.location.search).get('id');
                    const { data: { user } } = await supabaseClient.auth.getUser();

                    // คำนวณหาลำดับการส่ง (submission_number) ล่าสุด
                    const { data: existingSubs, error: checkError } = await supabaseClient
                        .from('document_submission')
                        .select('submission_number')
                        .eq('project_id', projectId)
                        .order('submission_number', { ascending: false })
                        .limit(1);

                    if (checkError) throw checkError;

                    let nextSubNumber = 1;
                    if (existingSubs && existingSubs.length > 0) {
                        nextSubNumber = existingSubs[0].submission_number + 1;
                    }

                    // บังคับแปลงค่าจากข้อความให้เป็นตัวเลข ป้องกัน Error 400
                    const numProjectId = parseInt(projectId);
                    const numFormatId = parseInt(formatId);

                    // บันทึกข้อมูลลงฐานข้อมูล
                    const { error: insertError } = await supabaseClient
                        .from('document_submission')
                        .insert([{
                            project_id: numProjectId,
                            format_id: numFormatId,
                            file_link: filePublicUrl,
                            processing_status: 'รอดำเนินการ',
                            user_id: user?.id,
                            submission_number: nextSubNumber
                        }]);

                    if (insertError) throw insertError;

                    alert("ส่งเอกสารสำเร็จเรียบร้อย! (v" + nextSubNumber + ")");

                    // รีเซ็ต UI และโหลดประวัติทางซ้ายใหม่
                    resetFileInput();
                    formatSelect.value = "";
                    await loadSubmissionHistory(projectId);

                } catch (err) {
                    console.log("Upload Error:", err);
                    alert("เกิดข้อผิดพลาดในการส่งเอกสาร: " + (err.message || "ไม่ทราบสาเหตุ"));
                } finally {
                    // ปลดล็อกปุ่มส่ง
                    uploadBtn.disabled = false;
                    uploadBtn.innerHTML = originalBtnContent;
                }
            })();
        });
    }
});




// อาจารย์
// โหลดประวัติคอมเมนต์ที่อาจารย์เคยพิมพ์ไว้
async function loadTeacherFeedback(submissionId) {
    const historyContainer = document.getElementById('teacher-feedback-history') || document.getElementById('teacher-feedback-container');
    if (!historyContainer) return;

    // 1. ดึง ID ของคนที่กำลังล็อกอินอยู่ เพื่อเอาไปเช็กว่าใครเป็นเจ้าของคอมเมนต์
    const { data: { user } } = await supabaseClient.auth.getUser();
    const currentUserId = user?.id;

    // 2. ดึงข้อมูลคอมเมนต์ 
    const { data: feedbacks } = await supabaseClient
        .from('feedback')
        .select('feedback_id, details, created_at, user_id, users(first_name)')
        .eq('submission_id', submissionId)
        .order('created_at', { ascending: false });

    if (!feedbacks || feedbacks.length === 0) {
        historyContainer.innerHTML = `<p class="text-sm text-gray-400 text-center py-4">ยังไม่มีคำแนะนำจากอาจารย์ในเวอร์ชันนี้</p>`;
        return;
    }

    // 3. สร้างการ์ดคอมเมนต์พร้อมปุ่ม (ถ้าเป็นเจ้าของคอมเมนต์ ถึงจะเห็นปุ่ม)
    historyContainer.innerHTML = feedbacks.map(f => {
        const isOwner = f.user_id === currentUserId; // เช็กว่าเป็นคอมเมนต์ของตัวเองไหม

        // โค้ดปุ่ม แก้ไข/ลบ
        const actionButtons = isOwner ? `
            <div class="flex gap-3 mt-2 justify-end">
                <button onclick="editFeedback('${f.feedback_id}')" class="text-[11px] text-[#213f8c] hover:text-blue-800 font-bold transition-colors cursor-pointer">แก้ไข</button>
                <button onclick="deleteFeedback('${f.feedback_id}', '${submissionId}')" class="text-[11px] text-red-500 hover:text-red-700 font-bold transition-colors cursor-pointer">ลบ</button>
            </div>
        ` : '';

        return `
            <div class="bg-blue-50/50 p-3 rounded-lg border border-blue-100 mb-3" id="feedback-card-${f.feedback_id}">
                <p class="text-[11px] text-gray-500 mb-1">
                    ${new Date(f.created_at).toLocaleString('th-TH')} - โดยอาจารย์ ${f.users?.first_name || 'ไม่ทราบชื่อ'}
                </p>
                
                <!-- ส่วนแสดงข้อความปกติ -->
                <p class="text-[13px] text-gray-800" id="feedback-text-${f.feedback_id}">${f.details}</p>
                
                <div id="edit-form-${f.feedback_id}" class="hidden mt-2">
                    <textarea id="edit-input-${f.feedback_id}" class="w-full border border-gray-200 rounded p-2 text-[12px] mb-2 focus:outline-none focus:border-[#213f8c] resize-none" rows="3">${f.details}</textarea>
                    <div class="flex gap-2 justify-end">
                        <button onclick="cancelEdit('${f.feedback_id}')" class="text-[11px] text-gray-600 hover:text-gray-800 bg-gray-200 px-3 py-1.5 rounded-md transition-colors cursor-pointer">ยกเลิก</button>
                        <button onclick="saveEdit('${f.feedback_id}', '${submissionId}')" class="text-[11px] text-white bg-[#213f8c] hover:bg-[#1a3270] px-3 py-1.5 rounded-md transition-colors cursor-pointer">บันทึกการแก้ไข</button>
                    </div>
                </div>
                
                <!-- กล่องใส่ปุ่ม แก้ไข/ลบ -->
                <div id="action-btns-${f.feedback_id}">
                    ${actionButtons}
                </div>
            </div>
        `;
    }).join('');
}

// การแก้ไขและลบ (Global Scope)
// เปิดกล่องแก้ไข
window.editFeedback = function (feedbackId) {
    document.getElementById(`feedback-text-${feedbackId}`).classList.add('hidden'); // ซ่อนข้อความ
    document.getElementById(`action-btns-${feedbackId}`).classList.add('hidden'); // ซ่อนปุ่ม แก้ไข/ลบ
    document.getElementById(`edit-form-${feedbackId}`).classList.remove('hidden'); // โชว์กล่องพิมพ์
};

// ยกเลิกการแก้ไข
window.cancelEdit = function (feedbackId) {
    document.getElementById(`feedback-text-${feedbackId}`).classList.remove('hidden');
    document.getElementById(`action-btns-${feedbackId}`).classList.remove('hidden');
    document.getElementById(`edit-form-${feedbackId}`).classList.add('hidden');
};

// บันทึกการแก้ไขลงฐานข้อมูล
window.saveEdit = async function (feedbackId, submissionId) {
    const newText = document.getElementById(`edit-input-${feedbackId}`).value.trim();
    if (!newText) {
        alert("กรุณากรอกข้อความ");
        return;
    }

    const { error } = await supabaseClient
        .from('feedback')
        .update({ details: newText })
        .eq('feedback_id', feedbackId);

    if (error) {
        alert("แก้ไขไม่สำเร็จ: " + error.message);
        return;
    }

    // โหลดคอมเมนต์ใหม่มาโชว์
    await loadTeacherFeedback(submissionId);
};

// ลบคอมเมนต์
window.deleteFeedback = async function (feedbackId, submissionId) {
    if (!confirm("คุณต้องการลบคำแนะนำนี้ใช่หรือไม่?")) return;

    const { error } = await supabaseClient
        .from('feedback')
        .delete()
        .eq('feedback_id', feedbackId);

    if (error) {
        alert("ลบไม่สำเร็จ: " + error.message);
        return;
    }

    // โหลดคอมเมนต์ใหม่มาโชว์
    await loadTeacherFeedback(submissionId);
};



