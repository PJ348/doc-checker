import { supabaseClient } from './supabase.js';
// console.log("เริ่มรันไฟล์ Dashboard");
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

        let projects = responsibilities.map(item => item.project).filter(p => p !== null); projects.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
        projects.sort((a, b) => {
            const aIsDone = a.status === "เสร็จสิ้น";
            const bIsDone = b.status === "เสร็จสิ้น";

            if (aIsDone && !bIsDone) return 1;  // ถ้า a เสร็จแล้ว ให้ a โดนดันลงไปข้างล่าง b
            if (!aIsDone && bIsDone) return -1; // ถ้า b เสร็จแล้ว ให้ b โดนดันลงไปข้างล่าง a

            return new Date(b.created_at || 0) - new Date(a.created_at || 0);
        });

        projectContainer.innerHTML = "";

        // วนลูปข้อมูลสร้างเป็นการ์ดทีละใบ
        projects.forEach(project => {
            const dateObj = project.created_at ? new Date(project.created_at) : new Date();
            const dateStr = `เริ่มโครงงาน: ${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${dateObj.getFullYear() + 543}`;

            let statusColors = "bg-gray-100 text-gray-600"; // ค่าเริ่มต้น (สีเทา)
            if (project.status === "เสร็จสิ้น" || project.status === "ผ่าน") {
                statusColors = "bg-[#dcfce7] text-[#16a34a]"; // สีเขียว (เสร็จสิ้น)
            } else if (project.status === "กำลังดำเนิน") {
                statusColors = "bg-blue-100 text-[#213f8c]"; // สีน้ำเงิน (กำลังดำเนิน)
            } else if (project.status === "ต้องแก้ไข" || project.status === "ไม่ผ่าน") {
                statusColors = "bg-red-100 text-red-600"; // สีแดง (มีปัญหา)
            }

            const isOwner = project.creator_id === userId;

            // โค้ดปุ่มลบ (สำหรับนิสิตที่เป็นเจ้าของ)
            const deleteButtonHTML = isOwner ? `
                <div class="absolute top-4 right-4">
                    <button onclick="event.stopPropagation(); toggleDeletePopup('popup-${project.project_id}')" class="rounded-xl w-8 h-6 flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all cursor-pointer">
                        <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#1f1f1f"><path d="M273.02-428q-21.54 0-36.66-15.34-15.13-15.34-15.13-36.87 0-21.54 15.34-36.66Q251.91-532 273.44-532q21.54 0 36.67 15.34 15.12 15.34 15.12 36.87 0 21.54-15.34 36.66Q294.56-428 273.02-428Zm206.77 0q-21.54 0-36.66-15.34Q428-458.68 428-480.21q0-21.54 15.34-36.66Q458.68-532 480.21-532q21.54 0 36.66 15.34Q532-501.32 532-479.79q0 21.54-15.34 36.66Q501.32-428 479.79-428Zm206.77 0q-21.54 0-36.67-15.34-15.12-15.34-15.12-36.87 0-21.54 15.34-36.66Q665.44-532 686.98-532t36.66 15.34q15.13 15.34 15.13 36.87 0 21.54-15.34 36.66Q708.09-428 686.56-428Z"/></svg>
                    </button>
                </div>
                <div id="popup-${project.project_id}" onclick="event.stopPropagation()" class="hidden absolute top-11 right-4 bg-white rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.08)] p-6 w-full max-w-[280px] z-10">
                    <div class="text-center mb-6 mt-2">
                        <h3 class="text-[15px] font-bold text-gray-800 mb-1.5">คุณต้องการลบโครงงานหรือไม่ ?</h3>
                    </div>
                    <div class="flex gap-3">
                        <button onclick="toggleDeletePopup('popup-${project.project_id}')" class="flex-1 py-2 bg-white text-gray-700 font-semibold text-sm rounded-xl hover:bg-gray-100 transition-colors cursor-pointer">ยกเลิก</button>
                        <button onclick="deleteProject('${project.project_id}')" class="flex-1 py-2 bg-[#c81e1e] text-white font-semibold text-sm rounded-xl hover:bg-[#a51515] transition-all cursor-pointer">ยืนยัน</button>
                    </div>
                </div>
            ` : '';

            const targetUrl = `./dashboard-project-th.html?id=${project.project_id}`;
            const cardHTML = `
                <div id="project-card-${project.project_id}" onclick="window.location.href='${targetUrl}'" class="bg-white rounded-3xl shadow-[0_4px_24px_rgba(0,0,0,0.06)] shadow-xl p-8 relative group border border-gray-50 hover:bg-gray-50 transition-all cursor-pointer min-h-[180px]">
                    
                    ${deleteButtonHTML}

                    <div class="flex justify-between items-center mt-4 mb-6">
                        <span class="text-[11px] text-gray-500 font-medium">${dateStr}</span>
                        <span class="px-3 py-1 ${statusColors} text-[10px] font-bold rounded-full">${project.status}</span>
                    </div>
                    <p title="${project.thai_project_title}" class="text-[14px] text-gray-800 font-semibold leading-relaxed line-clamp-2 break-words">
                        ${project.thai_project_title}
                    </p>
                </div>
            `;

            projectContainer.insertAdjacentHTML("beforeend", cardHTML);
        });
    };
    loadProjects();
});



