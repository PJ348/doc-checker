import { supabaseClient } from './supabase.js';
// ฟังก์ชันป้องกัน XSS
const escapeHtml = (unsafe) => {
    if (!unsafe) return "";
    return unsafe.toString().replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m]));
};
// console.log("เริ่มรันไฟล์ Dashboard");
document.addEventListener("DOMContentLoaded", async () => {
    const projectContainer = document.getElementById("project-container");
    const createBtn = document.getElementById("create-project-btn");
    const statusFilter = document.getElementById("status-filter");

    const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();

    if (sessionError || !session) {
        alert("กรุณาเข้าสู่ระบบก่อนใช้งาน");
        window.location.href = "../index.html";
        return;
    }

    const userId = session.user.id;
    // Role Guard: เช็กว่าเป็นนิสิต (role_id === 1) จริงหรือไม่
    const { data: roleData } = await supabaseClient
        .from('user_role')
        .select('role_id')
        .eq('user_id', userId)
        .maybeSingle();

    if (!roleData || roleData.role_id !== 1) {
        alert("คุณไม่มีสิทธิ์เข้าถึงหน้าสำหรับนิสิต");
        if (roleData?.role_id === 2) window.location.replace("./dashboard-teacher.html");
        else if (roleData?.role_id === 3) window.location.replace("./dashboard-admin.html");
        else window.location.replace("../index.html");
        return;
    }

    // ดึงข้อมูลจาก Supabase มาแสดงผล await supabaseClient ทำโครงงานเป็นแถวๆ
    let allProjects = [];
    const renderProjects = () => {
        const selectedStatus = statusFilter ? statusFilter.value : "all";

        const filtered = allProjects.filter(project => {
            if (selectedStatus === "all") return true;
            return project.status === selectedStatus;
        });

        projectContainer.innerHTML = "";

        if (filtered.length === 0) {
            projectContainer.innerHTML = `
                <div class="py-12 text-center text-sm text-gray-400">
                    ไม่พบรายการโครงงาน${selectedStatus !== 'all' ? `ที่มีสถานะ "${selectedStatus}"` : ''}
                </div>
            `;
            return;
        }

        filtered.forEach(project => {
            const dateObj = project.created_at ? new Date(project.created_at) : new Date();
            const dateStr = `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${dateObj.getFullYear() + 543}`;

            let statusColors = "bg-gray-100 text-gray-600";
            if (project.status === "เสร็จสิ้น" || project.status === "ผ่าน") {
                statusColors = "bg-[#dcfce7] text-[#16a34a]";
            } else if (project.status === "กำลังดำเนิน") {
                statusColors = "bg-blue-100 text-[#213f8c]";
            } else if (project.status === "ต้องแก้ไข" || project.status === "ไม่ผ่าน") {
                statusColors = "bg-red-100 text-red-600";
            }

            const isOwner = project.creator_id === userId;

            // ปุ่มเมนู 3 จุดท้ายแถว (สำหรับเจ้าของโครงงาน)
            const deleteButtonHTML = isOwner ? `
                <button onclick="event.stopPropagation(); toggleDeletePopup('popup-${project.project_id}')" class="rounded-full w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-200/70 transition-all cursor-pointer" title="ตัวเลือกเพิ่มเติม">
                    <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor">
                        <path d="M480-160q-33 0-56.5-23.5T400-240q0-33 23.5-56.5T480-320q33 0 56.5 23.5T560-240q0 33-23.5 56.5T480-160Zm0-240q-33 0-56.5-23.5T400-480q0-33 23.5-56.5T480-560q33 0 56.5 23.5T560-480q0 33-23.5 56.5T480-400Zm0-240q-33 0-56.5-23.5T400-720q0-33 23.5-56.5T480-800q33 0 56.5 23.5T560-720q0 33-23.5 56.5T480-640Z"/>
                    </svg>
                </button>
                <div id="popup-${project.project_id}" onclick="event.stopPropagation()" class="hidden absolute top-12 right-4 bg-white rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.12)] border border-gray-100 p-5 w-[250px] z-30">
                    <div class="text-center mb-4">
                        <h3 class="text-[14px] font-bold text-gray-800">คุณต้องการลบโครงงานหรือไม่ ?</h3>
                    </div>
                    <div class="flex gap-2.5">
                        <button onclick="toggleDeletePopup('popup-${project.project_id}')" class="flex-1 py-1.5 bg-gray-100 text-gray-700 font-semibold text-xs rounded-lg hover:bg-gray-200 transition-colors cursor-pointer">ยกเลิก</button>
                        <button onclick="deleteProject('${project.project_id}')" class="flex-1 py-1.5 bg-[#c81e1e] text-white font-semibold text-xs rounded-lg hover:bg-[#a51515] transition-all cursor-pointer">ยืนยัน</button>
                    </div>
                </div>
            ` : `<div class="w-8 h-8"></div>`;

            const targetUrl = `./dashboard-project.html?id=${project.project_id}`;
            const safeTitle = escapeHtml(project.thai_project_title);
            const safeYear = escapeHtml(project.academic_year || "-");

            const rowHTML = `
                <div id="project-card-${project.project_id}" onclick="window.location.href='${targetUrl}'"  class="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 items-center px-4 md:px-5 py-2 bg-white hover:bg-blue-50/50 rounded-xl transition-colors cursor-pointer relative group">
                    
                    <!-- ไอคอนเอกสาร + ชื่อโครงงาน -->
                    <div class="md:col-span-6 flex items-center gap-6 min-w-0" title="${safeTitle}">
                        <div class="w-8.5 h-8.5 rounded-lg bg-blue-50 text-[#213f8c] flex items-center justify-center shrink-0 ">
                            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <p title="${safeTitle}" class="text-[14px] text-gray-800 font-semibold truncate group-hover:text-[#213f8c] transition-colors">
                            ${safeTitle}
                        </p>
                    </div>

                    <!-- ปีการศึกษา -->
                    <div class="md:col-span-2 flex md:justify-center items-center text-xs text-gray-500">
                        <span class="md:hidden font-medium mr-1">ปีการศึกษา:</span> ${safeYear}
                    </div>

                    <!-- สถานะ -->
                    <div class="md:col-span-2 flex md:justify-center items-center">
                        <span class="px-3 py-1 ${statusColors} text-[11px] font-bold rounded-full">${escapeHtml(project.status)}</span>
                    </div>

                    <!-- วันที่เริ่ม + ปุ่มจุด 3 จุด -->
                    <div class="md:col-span-2 flex items-center justify-between md:justify-end gap-2">
                        <span class="text-xs text-gray-500 font-medium">${dateStr}</span>
                        ${deleteButtonHTML}
                    </div>
                </div>
            `;

            projectContainer.insertAdjacentHTML("beforeend", rowHTML);
        });
    };

    if (statusFilter) {
        statusFilter.addEventListener("change", () => renderProjects());
    }

    // ดึงข้อมูลจาก Supabase มาเก็บและสั่งวาดแถว
    const loadProjects = async () => {
        const { data: responsibilities, error } = await supabaseClient
            .from('responsible_for')
            .select(`
                project (
                    project_id,
                    thai_project_title,
                    academic_year,
                    status,
                    created_at,
                    creator_id
                )
            `)
            .eq('user_id', userId);

        if (error) {
            console.error("ดึงข้อมูลล้มเหลว:", error.message);
            alert("ไม่สามารถโหลดข้อมูลโครงงานได้ กรุณาลองใหม่อีกครั้ง");
            return;
        }

        allProjects = responsibilities.map(item => item.project).filter(p => p !== null);
        allProjects.sort((a, b) => {
            const aIsDone = a.status === "เสร็จสิ้น";
            const bIsDone = b.status === "เสร็จสิ้น";
            if (aIsDone && !bIsDone) return 1;
            if (!aIsDone && bIsDone) return -1;
            return new Date(b.created_at || 0) - new Date(a.created_at || 0);
        });

        renderProjects();
    };

    // สร้างโครงงานใหม่
    const modal = document.getElementById('project-modal');
    const form = document.getElementById('create-project-form');
    const closeBtn = document.getElementById('close-modal-btn');
    const cancelBtn = document.getElementById('cancel-btn');

    createBtn.addEventListener('click', () => { modal.classList.remove('hidden'); });
    closeBtn.addEventListener('click', () => { modal.classList.add('hidden'); form.reset(); });
    cancelBtn.addEventListener('click', () => { modal.classList.add('hidden'); form.reset(); });

    // ดึง Element ของช่องรหัสวิชาและช่องชื่อโครงงาน
    const joinCodeInput = document.getElementById('subject-join-code');
    const subjectPreview = document.getElementById('subject-preview');
    const subjectCodeError = document.getElementById('subject-code_error');
    const thaiTitleInput = document.getElementById('thai-title');
    const thaiTitleError = document.getElementById('thai-title_error');
    let matchedSubject = null;

    // พอเริ่มพิมพ์ชื่อโครงงาน ให้ข้อความสีแดงข้างๆ หายไปทันที
    if (thaiTitleInput && thaiTitleError) {
        thaiTitleInput.addEventListener('input', () => {
            if (thaiTitleInput.value.trim() !== "") {
                thaiTitleError.classList.add('hidden');
            }
        });
    }

    // พอเริ่มพิมพ์รหัสเข้าวิชา ให้ข้อความสีแดงข้างๆ หายไปทันที + ค้นหาวิชาอัตโนมัติ
    if (joinCodeInput) {
        joinCodeInput.addEventListener('input', async () => {
            const code = joinCodeInput.value.trim().toLowerCase();
            matchedSubject = null;

            // ซ่อนตัวหนังสือสีแดงทันทีที่เริ่มพิมพ์
            if (code !== "" && subjectCodeError) {
                subjectCodeError.classList.add('hidden');
            }

            if (code.length < 3) {
                if (subjectPreview) subjectPreview.classList.add('hidden');
                return;
            }

            const { data: subj } = await supabaseClient
                .from('subject')
                .select(`subject_id, join_code, semester_year, subject_name, section, teacher_id, users ( first_name )`)
                .ilike('join_code', code)
                .maybeSingle();

            if (subj) {
                matchedSubject = subj;
                if (subjectCodeError) subjectCodeError.classList.add('hidden');
                if (subjectPreview) {
                    const secLabel = subj.section ? ` ชั้น ${subj.section}` : '';
                    // subjectPreview.innerText = `พบวิชา: [${subj.semester_year}] ${subj.subject_name}${secLabel} (อ.${subj.users?.first_name || 'ประจำวิชา'})`;
                    subjectPreview.className = "text-xs text-[#16a34a] font-semibold mt-1.5";
                }
            } else {
                if (subjectPreview) {
                    // subjectPreview.innerText = `ไม่พบรหัสวิชา "${code}"`;
                    subjectPreview.className = "text-xs text-red-500 font-semibold mt-1.5";
                }
            }
        });
    }
    
    // เมื่อกดปุ่ม สร้างโครงงาน
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // ป้องกันกดซ้ำ
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerText = "กำลังสร้าง... ";
            submitBtn.classList.add('opacity-50', 'cursor-not-allowed'); // เปลี่ยนหน้าตาปุ่มให้ดูรู้ว่าโหลดอยู่
        }

        const resetSubmitButton = () => {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerText = "สร้างโครงงาน";
                submitBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            }
        };

        const userEmail = session.user.email.toLowerCase();

        const joinCodeVal = joinCodeInput ? joinCodeInput.value.trim().toLowerCase() : "";
        const thaiTitle = document.getElementById('thai-title').value.trim();
        const engTitle = document.getElementById('eng-title').value.trim();

        const engTitleError = document.getElementById('eng-title_error');
        const teamEmailsRaw = document.getElementById('team-emails').value.toLowerCase();
        const teamEmails = [...new Set(teamEmailsRaw.split(',').map(e => e.trim()).filter(e => e !== "" && e !== userEmail))];
        const teamEmailError = document.getElementById('team-email_error');

        let isValid = true;
        const validateField = (value, errorEl, message) => {
            if (!value) {
                if (errorEl) {
                    errorEl.innerText = message;
                    errorEl.classList.remove('hidden');
                }
                isValid = false;
            } else if (errorEl) {
                errorEl.classList.add('hidden');
            }
        };

        // ตรวจสอบฟิลด์ที่บังคับกรอก (ชื่อโครงงานภาษาไทย, ปีการศึกษา, อาจารย์ที่ปรึกษา)
        validateField(joinCodeVal, subjectCodeError, "กรุณากรอกรหัสเข้าวิชา");
        validateField(thaiTitle, thaiTitleError, "กรุณากรอกชื่อโครงงาน");

        if (joinCodeVal) {
            if (!matchedSubject || matchedSubject.join_code.toLowerCase() !== joinCodeVal) {
                const { data: subjCheck } = await supabaseClient
                    .from('subject')
                    .select(`subject_id, join_code, semester_year, subject_name, section, teacher_id`)
                    .ilike('join_code', joinCodeVal)
                    .maybeSingle();

                if (subjCheck) {
                    matchedSubject = subjCheck;
                    if (subjectCodeError) subjectCodeError.classList.add('hidden');
                } else {
                    if (subjectCodeError) {
                        subjectCodeError.innerText = "ไม่พบรหัสวิชานี้ในระบบ";
                        subjectCodeError.classList.remove('hidden');
                    }
                    isValid = false;
                }
            }
        }

        const thaiRegex = /[\u0E00-\u0E7F]/;
        if (engTitle && thaiRegex.test(engTitle)) {
            if (engTitleError) {
                engTitleError.innerText = "กรุณากรอกเป็นภาษาอังกฤษเท่านั้น";
                engTitleError.classList.remove('hidden');
            }
            isValid = false;
        } else if (engTitleError) {
            engTitleError.classList.add('hidden');
        }

        // เช็กอีเมลสมาชิกในทีม (นิสิต)
        const isInvalidTeamEmail = teamEmails.some(email => !emailRegex.test(email));
        if (teamEmails.length > 0 && isInvalidTeamEmail) {
            teamEmailError.innerText = "รูปแบบอีเมลสมาชิกในทีมไม่ถูกต้อง";
            teamEmailError.classList.remove('hidden');
            isValid = false;
        } else {
            teamEmailError.classList.add('hidden');
        }

        if (!isValid) {
            resetSubmitButton();
            return;
        }

        if (teamEmails.length > 0) {
            const { data: studentUsers, error: studentError } = await supabaseClient
                .from('users')
                .select(`
                    email,
                    user_role ( role_id )
                `)
                .in('email', teamEmails);

            if (studentError) {
                console.error("ตรวจสอบอีเมลนิสิตล้มเหลว:", studentError.message);
                alert("เกิดข้อผิดพลาดในการตรวจสอบระบบฐานข้อมูล");
                resetSubmitButton();
                return;
            }

            if (studentUsers.length < teamEmails.length) {
                alert("ไม่พบอีเมลสมาชิกบางคนในระบบ (เพื่อนอาจจะยังไม่ได้สมัครสมาชิก)");
                resetSubmitButton();
                return;
            }

            const hasInvalidStudentRole = studentUsers.some(u => {
                const roleIds = Array.isArray(u.user_role)
                    ? u.user_role.map(r => r.role_id)
                    : [u.user_role?.role_id];

                return !roleIds.includes(1);
            });

            if (hasInvalidStudentRole) {
                teamEmailError.innerText = "อีเมลที่ระบุไม่ใช่บัญชีนิสิต/นักศึกษา กรุณาตรวจสอบอีกครั้ง";
                teamEmailError.classList.remove('hidden');
                resetSubmitButton();
                return;
            }
        }

        // สร้างโครงงานลงตาราง project
        const { data: newProject, error: projectError } = await supabaseClient
            .from('project')
            .insert([{
                thai_project_title: thaiTitle,
                english_project_title: engTitle,
                academic_year: matchedSubject.semester_year,
                subject_id: matchedSubject.subject_id,
                status: "กำลังดำเนิน",
                creator_id: userId
            }])
            .select();

        if (projectError) {
            console.log("สร้างโครงงานล้มเหลว: " + projectError.message);
            alert("เกิดข้อผิดพลาดในการสร้างโครงงาน กรุณาลองใหม่อีกครั้ง");
            resetSubmitButton();
            return;
        }
        const projectId = newProject[0].project_id;

        let responsibilityData = [
            { user_id: userId, project_id: projectId }
        ];

        if (matchedSubject.teacher_id && matchedSubject.teacher_id !== userId) {
            responsibilityData.push({ user_id: matchedSubject.teacher_id, project_id: projectId });
        }

        const notFoundEmail = document.getElementById('some-email-notfound');
        if (teamEmails.length > 0) {
            const { data: foundUsers, error: userError } = await supabaseClient
                .from('users')
                .select('user_id, email')
                .in('email', teamEmails);

            if (userError) {
                await supabaseClient.from('project').delete().eq('project_id', projectId);
                resetSubmitButton();
                return;
            }

            if (foundUsers) {
                foundUsers.forEach(user => {
                    if (user.user_id !== userId && user.user_id !== matchedSubject.teacher_id) {
                        responsibilityData.push({ user_id: user.user_id, project_id: projectId });
                    }
                });

                if (foundUsers.length < teamEmails.length) {
                    if (notFoundEmail) notFoundEmail.classList.remove('hidden');
                }
            }
        }

        const { error: respError } = await supabaseClient
            .from('responsible_for')
            .insert(responsibilityData)
            .select();

        if (respError) {
            await supabaseClient.from('project').delete().eq('project_id', projectId);
            console.log("บันทึกสมาชิกทีมล้มเหลว:", respError.message);
            alert("บันทึกสมาชิกทีมล้มเหลว");
            resetSubmitButton();
            return;
        }

        modal.classList.add('hidden');
        form.reset();
        matchedSubject = null;
        if (subjectPreview) subjectPreview.classList.add('hidden');
        resetSubmitButton();
        loadProjects();
    });
    loadProjects();
});

// เปิดปิด Popup
let currentOpenPopupId = null;

window.toggleDeletePopup = function (popupId, event) {
    if (event) {
        event.stopPropagation();
    }

    if (currentOpenPopupId && currentOpenPopupId !== popupId) {
        const oldPopup = document.getElementById(currentOpenPopupId);
        if (oldPopup) oldPopup.classList.add('hidden');
    }

    const popup = document.getElementById(popupId);
    if (!popup) return;

    if (popup.classList.contains('hidden')) {
        popup.classList.remove('hidden');
        setTimeout(() => {
            currentOpenPopupId = popupId;
        }, 10);
    } else {
        popup.classList.add('hidden');
        currentOpenPopupId = null;
    }
};

// ซ่อน Popup
window.addEventListener('click', (e) => {
    if (currentOpenPopupId) {
        const activePopup = document.getElementById(currentOpenPopupId);

        if (activePopup && !activePopup.contains(e.target)) {
            activePopup.classList.add('hidden');
            currentOpenPopupId = null;
        }
    }
});


// ดึงตัวแปรกล่องสร้างโครงงาน (ใส่ ID ของกล่องคุณตรงนี้)
const projectModal = document.getElementById('project-modal');
if (projectModal) {
    projectModal.addEventListener('click', (e) => {
        if (e.target === projectModal) {
            projectModal.classList.add('hidden');
        }
    });
}

// ฟังก์ชันลบข้อมูลโครงงาน
window.deleteProject = async function (projectId) {
    if (!confirm("ยืนยันการลบโครงงานนี้อย่างถาวร?")) return;

    try {
        // หาชื่อไฟล์ทั้งหมดของโครงงานนี้เพื่อนำไปลบออกจาก Storage
        const { data: submissions, error: fetchError } = await supabaseClient
            .from('document_submission')
            .select('file_link')
            .eq('project_id', projectId);

        if (fetchError) throw fetchError;

        // สั่งลบไฟล์ออกจาก Bucket 'student_submissions'
        if (submissions && submissions.length > 0) {
            const filesToDelete = submissions
                .filter(sub => sub.file_link)
                .map(sub => {
                    const parts = sub.file_link.split('/');
                    return decodeURIComponent(parts[parts.length - 1].split('?')[0]);
                });

            if (filesToDelete.length > 0) {
                await supabaseClient.storage.from('student_submissions').remove(filesToDelete);
            }
        }

        // เรียกใช้ Function จาก Supabase เพื่อลบทั้งแม่และลูกในครั้งเดียว
        const { error: funcError } = await supabaseClient.rpc('delete_project_completely', {
            p_project_id: projectId
        });

        if (funcError) throw funcError;

        // ซ่อน Popup ก่อนลบการ์ด
        const popup = document.getElementById(`popup-${projectId}`);
        if (popup) popup.classList.add('hidden');

        // ลบการ์ดในหน้าเว็บให้จางหายไป
        const card = document.getElementById(`project-card-${projectId}`);
        if (card) {
            card.style.opacity = '0';
            setTimeout(() => {
                card.remove();
            }, 300);
        }

    } catch (err) {
        console.error("เกิดข้อผิดพลาดในการลบ:", err.message);
        alert("ไม่สามารถลบโครงงานได้: " + err.message);
    }
};