import { supabaseClient } from './supabase.js';
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

    const activeTabClass = "pb-2 border-b-2 border-[#213f8c] font-bold text-sm text-[#213f8c] transition-colors";
    const inactiveTabClass = "pb-2 border-b-2 border-transparent font-medium text-sm text-gray-400 hover:text-gray-600 transition-colors";

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
                        <span class="text-xs text-gray-800 font-medium pr-1">${roleText}</span>
                        <svg class="h-3 w-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                    
                    <div class="member-dropdown hidden absolute top-full right-0 mt-1 bg-white border border-gray-100 shadow-[0_4px_12px_rgba(0,0,0,0.1)] rounded-lg py-1.5 w-20 z-30 text-center">
                        <button onclick="removeMember('${member.user_id}')" class="text-[#e92b58] text-xs font-medium w-full py-1 cursor-pointer">ลบ</button>
                    </div>
                </div>
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
        });
    } else {
        console.error("ระบบหาปุ่มเพิ่มสมาชิกไม่เจอ ตรวจสอบ id='add-btn' ในไฟล์ HTML");
    }

    const backButton = document.getElementById('back-button');
    if (backButton) {
        backButton.addEventListener('click', () => {
            window.location.href = 'dashboard-student.html';
        });
    }

    // เรียกโหลด 3 คอลัมน์ด้านล่างให้ทำงาน;
    await Promise.all([
        loadDocumentFormats(),
        loadSubmissionHistory(projectId)
    ]);
});


// ฟังก์ชันจัดการ ประวัติ, PDF, AI
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
        formatSelect.innerHTML = '<option value="" disabled selected>เลือกประวัติมาตรฐาน...</option>';
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

    if (error || !submissions || submissions.length === 0) {
        listContainer.innerHTML = `<p class="text-sm text-gray-400 text-center py-4">ยังไม่มีประวัติการส่ง</p>`;
        return;
    }

    listContainer.innerHTML = submissions.map((sub, index) => {
        const isLatest = index === 0;
        const isPass = sub.processing_status === "ผ่าน";
        const dateStr = new Date(sub.submission_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.';

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
        .single();

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
                    // 1. อัปโหลดไฟล์ขึ้น Supabase Storage
                    const { error: uploadError } = await supabaseClient
                        .storage
                        .from(bucketName)
                        .upload(safeFileName, file);

                    if (uploadError) throw uploadError;

                    // 2. ขอ URL ไฟล์แบบสาธารณะ
                    const { data: publicUrlData } = supabaseClient
                        .storage
                        .from(bucketName)
                        .getPublicUrl(safeFileName);

                    const filePublicUrl = publicUrlData.publicUrl;

                    // 3. ดึงข้อมูล User และ ID โครงงาน (ต้องประกาศตรงนี้ก่อนนำไปใช้)
                    const projectId = new URLSearchParams(window.location.search).get('id');
                    const { data: { user } } = await supabaseClient.auth.getUser();

                    // 4. คำนวณหาลำดับการส่ง (submission_number) ล่าสุด
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

                    // 5. บังคับแปลงค่าจากข้อความให้เป็นตัวเลข ป้องกัน Error 400
                    const numProjectId = parseInt(projectId);
                    const numFormatId = parseInt(formatId);

                    // 6. บันทึกข้อมูลลงฐานข้อมูล
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

                    // 7. รีเซ็ต UI และโหลดประวัติทางซ้ายใหม่
                    resetFileInput();
                    formatSelect.value = "";
                    await loadSubmissionHistory(projectId);

                } catch (err) {
                    console.log("Upload Error:", err);
                    alert("เกิดข้อผิดพลาดในการส่งเอกสาร: " + (err.message || "ไม่ทราบสาเหตุ"));
                } finally {
                    // 8. ปลดล็อกปุ่มส่ง
                    uploadBtn.disabled = false;
                    uploadBtn.innerHTML = originalBtnContent;
                }
            })();
        });
    }
});