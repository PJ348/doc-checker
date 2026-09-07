import { supabaseClient } from './supabase.js';
console.log("เริ่มรันไฟล์ Dashboard");
document.addEventListener("DOMContentLoaded", async () => {
    const projectContainer = document.getElementById("project-container");
    const createBtn = document.getElementById("create-project-btn");

    const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();

    if (sessionError || !session) {
        alert("กรุณาเข้าสู่ระบบก่อนใช้งาน");
        window.location.href = "../index.html";
        return;
    }

    const userId = session.user.id;

    // ดึงข้อมูลจาก Supabase มาแสดงผล await supabaseClient
    const loadProjects = async () => {

        const { data: responsibilities, error } = await supabaseClient
            .from('responsible_for')
            .select(`
                project (
                    project_id,
                    thai_project_title,
                    academic_year,
                    status,
                    created_at
                )
            `)
            .eq('user_id', userId

            );

        if (error) {
            console.error("ดึงข้อมูลล้มเหลว:", error.message);
            return;
        }
       

        let projects = responsibilities.map(item => item.project).filter(p => p !== null);
        projects.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
        // ล้างกล่องให้ว่างก่อนใส่ของใหม่
        projectContainer.innerHTML = "";

        // วนลูปข้อมูลสร้างเป็นการ์ดทีละใบ
        projects.forEach(project => {
            const dateObj = project.created_at ? new Date(project.created_at) : new Date();
            const dateStr = `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${dateObj.getFullYear() + 543}`;

            // กำหนดสีของสถานะโครงงาน
            let statusColors = project.status === "ผ่าน"
                ? "bg-[#dcfce7] text-[#16a34a]"
                : "bg-red-100 text-red-500"; // ค่าเริ่มต้น

            const cardHTML = `
                    <div id="project-card-${project.project_id}" onclick="window.location.href='dashboard-project.html?id=${project.project_id}'" class="bg-white rounded-3xl shadow-[0_4px_24px_rgba(0,0,0,0.06)] shadow-xl p-8 relative group border border-gray-50 hover:bg-gray-50 transition-all cursor-pointer min-h-[180px]">
                        
                        <div class="absolute top-4 right-4">
                            <!-- 1. เพิ่ม event.stopPropagation() ตรงปุ่มสามจุด -->
                            <button onclick="event.stopPropagation(); toggleDeletePopup('popup-${project.project_id}')" class=" rounded-xl w-8 h-6 flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all cursor-pointer">
                                <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#1f1f1f"><path d="M273.02-428q-21.54 0-36.66-15.34-15.13-15.34-15.13-36.87 0-21.54 15.34-36.66Q251.91-532 273.44-532q21.54 0 36.67 15.34 15.12 15.34 15.12 36.87 0 21.54-15.34 36.66Q294.56-428 273.02-428Zm206.77 0q-21.54 0-36.66-15.34Q428-458.68 428-480.21q0-21.54 15.34-36.66Q458.68-532 480.21-532q21.54 0 36.66 15.34Q532-501.32 532-479.79q0 21.54-15.34 36.66Q501.32-428 479.79-428Zm206.77 0q-21.54 0-36.67-15.34-15.12-15.34-15.12-36.87 0-21.54 15.34-36.66Q665.44-532 686.98-532t36.66 15.34q15.13 15.34 15.13 36.87 0 21.54-15.34 36.66Q708.09-428 686.56-428Z"/></svg>
                            </button>
                        </div>

                        <!-- 2. เพิ่ม onclick="event.stopPropagation()" และ z-10 ที่ตัวกล่อง Popover ลบด้วย เพื่อกันการคลิกทะลุตอนกดปุ่มข้างใน -->
                        <div id="popup-${project.project_id}" onclick="event.stopPropagation()" class="hidden absolute top-11 right-4 bg-white rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.08)] p-6 w-full max-w-[280px] z-10">
                            <div class="text-center mb-6 mt-2">
                                <h3 class="text-[15px] font-bold text-gray-800 mb-1.5">คุณต้องการลบโครงงานหรือไม่ ?</h3>
                            </div>
                            <div class="flex gap-3">
                                <button onclick="toggleDeletePopup('popup-${project.project_id}')"
                                    class="flex-1 py-2 bg-white text-gray-700 font-semibold text-sm rounded-xl hover:bg-gray-100 transition-colors cursor-pointer">
                                    ยกเลิก
                                </button>
                                <button onclick="deleteProject('${project.project_id}')"
                                    class="flex-1 py-2 bg-[#c81e1e] text-white font-semibold text-sm rounded-xl hover:bg-[#a51515] transition-all cursor-pointer">
                                    ยืนยัน
                                </button>
                            </div>
                        </div>

                        <div class="flex justify-between items-center mt-4 mb-6">
                            <span class="text-xs text-gray-500 font-medium">${dateStr}</span>
                            <span class="px-3 py-1 ${statusColors} text-[10px] font-bold rounded-full">${project.status}</span>
                        </div>
                        <p class="text-[14px] text-gray-800 font-semibold leading-relaxed">
                            ${project.thai_project_title}
                        </p>
                    </div>
                `;

            projectContainer.insertAdjacentHTML("beforeend", cardHTML);
        });
    };

    // สร้างโครงงานใหม่
    const modal = document.getElementById('project-modal');
    const form = document.getElementById('create-project-form');
    const closeBtn = document.getElementById('close-modal-btn');
    const cancelBtn = document.getElementById('cancel-btn');
   
    createBtn.addEventListener('click', () => {
        modal.classList.remove('hidden');
    });

    closeBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
        form.reset(); 
    });

    cancelBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
        form.reset();
    });

    // เมื่อกดปุ่ม สร้างโครงงาน
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const thaiTitle = document.getElementById('thai-title').value.trim();
        const engTitle = document.getElementById('eng-title').value.trim();
        const academicYear = document.getElementById('academic-year').value.trim();

        const thaiTitleError = document.getElementById('thai-title_error');
        const academicYearError = document.getElementById('academic-year_error');
        const advisorEmailError = document.getElementById('advisor-email_error');

        const engTitleError = document.getElementById('eng-title_error');

        const advisorEmailRaw = document.getElementById('advisor-email').value;
        const advisorEmails = advisorEmailRaw ? advisorEmailRaw.split(',').map(email => email.trim()).filter(email => email !== "") : [];

        const teamEmailsRaw = document.getElementById('team-emails').value;
        const teamEmails = teamEmailsRaw ? teamEmailsRaw.split(',').map(email => email.trim()).filter(email => email !== "") : [];

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

        // ตรวจสอบฟิลด์ที่บังคับกรอก (ชื่อโครงงานภาษาไทย, ปีการศึกษา, อาจารย์ที่ปรึกษา)
        validateField(thaiTitle, thaiTitleError, "กรุณากรอกชื่อโครงงาน");
        validateField(academicYear, academicYearError, "กรุณากรอกปีการศึกษา");

        // เช็คว่าต้องกรอกอาจารย์ที่ปรึกษาอย่างน้อย 1 คน
        if (advisorEmails.length === 0) {
            advisorEmailError.innerText = "กรุณากรอกอีเมลอาจารย์ที่ปรึกษา";
            advisorEmailError.classList.remove('hidden');
            isValid = false;
        } else {
            advisorEmailError.classList.add('hidden');
        }

        const thaiRegex = /[\u0E00-\u0E7F]/;
        if (engTitle && thaiRegex.test(engTitle)) {
            if (engTitleError) {
                engTitleError.innerText = "กรุณากรอกเป็นภาษาอังกฤษเท่านั้น";
                engTitleError.classList.remove('hidden');
            } else {
                return;// alert("ชื่อโครงงานภาษาอังกฤษต้องเป็นภาษาอังกฤษเท่านั้น");
            }
            isValid = false;
        } else if (engTitleError) {
            engTitleError.classList.add('hidden');
        }
        // ตรวจสอบรูปแบบอีเมลอาจารย์
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (advisorEmails && !emailRegex.test(advisorEmails)) {
            advisorEmailError.innerText = "รูปแบบอีเมลไม่ถูกต้อง";
            advisorEmailError.classList.remove('hidden');
            isValid = false;
        }

        if (!isValid) {
            return;
        }

        // สร้างโครงงานลงตาราง project
        const { data: newProject, error: projectError } = await supabaseClient
            .from('project')
            .insert([{
                thai_project_title: thaiTitle,
                english_project_title: engTitle,
                academic_year: academicYear,
                status: "กำลังดำเนิน"
            }])
            .select();

        if (projectError) {
            alert("สร้างโครงงานล้มเหลว: " + projectError.message);
            return;
        }

        const projectId = newProject[0].project_id;

        // รวบรวมอีเมลทั้งหมดที่ต้องดึงเข้าโครงงาน (เพื่อน + อาจารย์)
        const allEmails = [...teamEmails, ...advisorEmails];
        let responsibilityData = [
            { user_id: userId, project_id: projectId }
        ];

        const notFoundEmail = document.getElementById('some-email-notfound');
        // ค้นหา user_id ของเพื่อนและอาจารย์จากตาราง users
        if (allEmails.length > 0) {
            const { data: foundUsers, error: userError } = await supabaseClient
                .from('users')
                .select('user_id, email')
                .in('email', allEmails);

            if (!userError && foundUsers) {
                foundUsers.forEach(user => {
                    responsibilityData.push({ user_id: user.user_id, project_id: projectId });
                });

                // แจ้งเตือนถ้ามีอีเมลไหนที่ยังไม่ได้สมัครสมาชิก
                if (foundUsers.length < allEmails.length) {
                    notFoundEmail.classList.remove('hidden');
                }
            }
        }

        // บันทึกทุกคนลงตาราง responsible_for 
        const { data: respData, error: respError } = await supabaseClient
            .from('responsible_for')
            .insert(responsibilityData)
            .select();

        if (respError) {
            console.error("บันทึกสมาชิกทีมล้มเหลว:", respError.message);
        }

        modal.classList.add('hidden');
        form.reset();
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

        // ถ้าจุดที่คลิก (e.target) ไม่ได้อยู่ข้างในกล่อง Popup (คลิกข้างนอกกรอบ)
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
        // ลบความสัมพันธ์ในตาราง responsible_for ก่อน
        const { error: relError } = await supabaseClient
            .from('responsible_for')
            .delete()
            .eq('project_id', projectId);

        if (relError) throw relError;

        //ลบลูกออกแล้ว ค่อยสั่งลบตัวโครงงานหลัก
        const { error: projError } = await supabaseClient
            .from('project')
            .delete()
            .eq('project_id', projectId);

        if (projError) throw projError;

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