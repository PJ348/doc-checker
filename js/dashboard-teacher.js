import { supabaseClient } from './supabase.js';

const escapeHtml = (unsafe) => {
    if (!unsafe) return "";
    return unsafe.toString().replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m]));
};

document.addEventListener("DOMContentLoaded", async () => {
    const projectContainer = document.getElementById("project-container");
    const statusFilter = document.getElementById("status-filter");
    const subjectChips = document.getElementById("subject-chips");
    const activeSubjectBar = document.getElementById("active-subject-bar");

    const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();

    if (sessionError || !session) {
        alert("กรุณาเข้าสู่ระบบก่อนใช้งาน");
        window.location.href = "../index.html";
        return;
    }

    const userId = session.user.id;

    // Role Guard: เช็กสิทธิ์อาจารย์ (role_id === 2)
    const { data: roleData } = await supabaseClient
        .from('user_role')
        .select('role_id')
        .eq('user_id', userId)
        .maybeSingle();

    if (!roleData || roleData.role_id !== 2) {
        alert("คุณไม่มีสิทธิ์เข้าถึงหน้าสำหรับอาจารย์");
        if (roleData?.role_id === 1) window.location.replace("./dashboard-student.html");
        else if (roleData?.role_id === 3) window.location.replace("./dashboard-admin.html");
        else window.location.replace("../index.html");
        return;
    }

    let allProjects = [];
    let mySubjects = [];
    let selectedSemester = "latest"; // ดึงเทอมล่าสุดอัตโนมัติ
    let selectedGroupKey = "all"; // เก็บวิชาที่เลือก (semester_year||subject_name)
    let selectedSubjectId = "all"; // เก็บห้องเรียน (subject_id) ที่เลือก

    // ดึงรายการเทอมทั้งหมด(เรียงเทอมล่าสุดขึ้นก่อน)
    const getAllSemesters = () => {
        const sems = [...new Set(mySubjects.map(s => s.semester_year).filter(Boolean))];
        return sems.reverse();
    };

    // จัดกลุ่มห้องเรียน เทอมเดียวกัน + ชื่อวิชาเดียวกัน เข้าด้วยกัน
    const getSubjectGroups = () => {
        const groups = {};
        mySubjects.forEach(s => {
            if (selectedSemester !== "all" && s.semester_year !== selectedSemester) return;
            const key = `${s.semester_year}||${s.subject_name}`;
            if (!groups[key]) {
                groups[key] = {
                    key,
                    semester_year: s.semester_year,
                    subject_name: s.subject_name,
                    rooms: []
                };
            }
            groups[key].rooms.push(s);
        });
        return Object.values(groups);
    };

    const loadSubjects = async () => {
        const { data, error } = await supabaseClient
            .from('subject')
            .select('*')
            .eq('teacher_id', userId)
            .order('created_at', { ascending: true });

        if (!error && data) {
            mySubjects = data;

            // ถ้าเปิดหน้าเว็บมาครั้งแรก ให้เลือก "เทอมล่าสุด" อัตโนมัติ จะได้ไม่รก
            const semesters = getAllSemesters();
            if (selectedSemester === "latest" || (selectedSemester !== "all" && !semesters.includes(selectedSemester))) {
                selectedSemester = semesters.length > 0 ? semesters[0] : "all";
            }

            const dataList = document.getElementById("existing-subjects-list");
            if (dataList) {
                const uniqueNames = [...new Set(mySubjects.map(s => s.subject_name))];
                dataList.innerHTML = uniqueNames.map(n => `<option value="${escapeHtml(n)}">`).join('');
            }

            renderSubjectUI();
        }
    };

    // แถวบนปุ่มแคปซูล
    const renderSubjectUI = () => {
        if (!subjectChips) return;

        const semesters = getAllSemesters();
        const groups = getSubjectGroups();

        if (mySubjects.length === 0) {
            subjectChips.innerHTML = `<span class="text-xs text-gray-400">ยังไม่มีรายวิชา กดปุ่ม "+ สร้างรายวิชาใหม่" ด้านบนเพื่อเริ่มต้น</span>`;
            if (activeSubjectBar) activeSubjectBar.innerHTML = "";
            return;
        }

        // ปุ่มปีการศึกษา ปุ่มรายวิชา
        subjectChips.innerHTML = `
            <!-- ตัวเลือกเทอม/ปีการศึกษา -->
            <div class="inline-flex items-center bg-gray-100 rounded-full px-3 py-1 text-xs font-bold text-gray-700 mr-1">
                <span class="text-gray-400 mr-1.5 font-medium">เทอม:</span>
                <select onchange="handleSemesterChange(this.value)" class="bg-transparent text-[#213f8c] font-bold focus:outline-none cursor-pointer">
                    ${semesters.map(sem => `
                        <option value="${escapeHtml(sem)}" ${selectedSemester === sem ? 'selected' : ''}>${escapeHtml(sem)}</option>
                    `).join('')}
                    <option value="all" ${selectedSemester === 'all' ? 'selected' : ''}>ทุกเทอมรวมกัน</option>
                </select>
            </div>

            <span class="text-gray-300 mx-0.5">|</span>

            <!-- ปุ่มรายวิชา (แสดงเฉพาะวิชาของเทอมที่เลือก) -->
            <button onclick="selectCourseGroup('all')" class="px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${selectedGroupKey === 'all' ? 'bg-[#213f8c] text-white shadow-xs' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}">
                ทั้งหมด
            </button>
        ` + groups.map(g => {
            const isSelected = selectedGroupKey === g.key;
            return `
                <button onclick="selectCourseGroup('${escapeHtml(g.key)}')" title="${escapeHtml(g.subject_name)}"
                    class="px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 max-w-[220px] ${isSelected ? 'bg-[#213f8c] text-white shadow-xs' : 'bg-blue-50/90 text-[#213f8c] hover:bg-blue-100'}">
                    <span class="truncate">${escapeHtml(g.subject_name)}</span>
                </button>
            `;
        }).join('');

        // แถบเลือกชั้นเรียน
        if (!activeSubjectBar) return;

        const activeGroup = groups.find(g => g.key === selectedGroupKey);
        if (!activeGroup) {
            activeSubjectBar.innerHTML = "";
            return;
        }

        const activeRoom = activeGroup.rooms.find(r => r.subject_id === selectedSubjectId);

        activeSubjectBar.innerHTML = `
            <div class="inline-flex flex-wrap items-center justify-center gap-3 bg-gray-50 border border-gray-200/80 px-4 py-1.5 rounded-xl text-xs text-gray-600">
                
                <!-- เลือกชั้นเรียนผ่าน Dropdown -->
                <div class="flex items-center gap-1.5">
                    <span class="text-gray-500 font-medium">ชั้นเรียน:</span>
                    <select onchange="handleRoomChange(this.value)" class="bg-white border border-gray-200 rounded-lg px-2.5 py-1 text-xs font-bold text-[#213f8c] focus:outline-none focus:ring-1 focus:ring-[#213f8c] cursor-pointer">
                        <option value="all" ${selectedSubjectId === 'all' ? 'selected' : ''}>ทุกชั้นเรียน (${activeGroup.rooms.length} ห้อง)</option>
                        ${activeGroup.rooms.map(r => `
                            <option value="${r.subject_id}" ${selectedSubjectId === r.subject_id ? 'selected' : ''}>
                                ${escapeHtml(r.section || 'ม.1/1')}
                            </option>
                        `).join('')}
                    </select>
                    <button onclick="openAddSectionModal('${escapeHtml(activeGroup.semester_year)}', '${escapeHtml(activeGroup.subject_name)}')" 
                        class="text-[#213f8c] hover:bg-blue-100/60 px-2 py-1 rounded-lg font-semibold transition-colors cursor-pointer" title="เพิ่มชั้นเรียนในวิชานี้">
                        + เพิ่มห้อง
                    </button>
                </div>

                <span class="text-gray-300">|</span>

                ${activeRoom ? `
                    <span class="flex items-center gap-1.5">
                        รหัสเข้าวิชา: 
                        <code class="bg-white border border-gray-200 px-2 py-0.5 rounded text-[#213f8c] font-bold">${escapeHtml(activeRoom.join_code)}</code>
                        <button onclick="copyJoinCode('${escapeHtml(activeRoom.join_code)}')" class="text-gray-400 hover:text-[#213f8c] p-1 rounded hover:bg-gray-200/60 transition-colors cursor-pointer" title="คัดลอกรหัสวิชา">
                            <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                        </button>
                    </span>
                    <span class="text-gray-300">|</span>
                ` : ''}

                <!-- ปุ่มแก้ไขปีการศึกษา/ชื่อวิชา -->
                <button onclick="editCourseGroup('${escapeHtml(activeGroup.semester_year)}', '${escapeHtml(activeGroup.subject_name)}')" class="text-gray-500 hover:text-[#213f8c] font-medium transition-colors cursor-pointer">
                    แก้ไขวิชา/ปี
                </button>

                <span class="text-gray-300">|</span>

                ${activeRoom ? `
                    <button onclick="deleteSubject('${activeRoom.subject_id}', 'ห้อง ${escapeHtml(activeRoom.section || '')} ในวิชา ${escapeHtml(activeRoom.subject_name)}')" class="text-gray-400 hover:text-red-600 font-medium transition-colors cursor-pointer">
                        ลบห้องนี้
                    </button>
                    <span class="text-gray-300">|</span>
                ` : ''}

                <!-- ปุ่มลบปีการศึกษา (ลบทุกห้องในวิชานี้) -->
                <button onclick="deleteEntireCourseGroup('${escapeHtml(activeGroup.semester_year)}', '${escapeHtml(activeGroup.subject_name)}')" class="text-red-500 hover:text-red-700 font-semibold transition-colors cursor-pointer">
                    ลบปีการศึกษานี้
                </button>
            </div>
        `;
    };

    // สลับตัวกรองปีการศึกษา
    window.handleSemesterChange = (sem) => {
        selectedSemester = sem;
        selectedGroupKey = "all";
        selectedSubjectId = "all";
        renderSubjectUI();
        renderProjects();
    };

    // คลิกปุ่มวิชา
    window.selectCourseGroup = (groupKey) => {
        selectedGroupKey = groupKey;
        if (groupKey === "all") {
            selectedSubjectId = "all";
        } else {
            const groups = getSubjectGroups();
            const grp = groups.find(g => g.key === groupKey);
            selectedSubjectId = (grp && grp.rooms.length > 0) ? grp.rooms[0].subject_id : "all";
        }
        renderSubjectUI();
        renderProjects();
    };

    // เปลี่ยนชั้นเรียนใน Dropdown
    window.handleRoomChange = (subjectId) => {
        selectedSubjectId = subjectId;
        renderSubjectUI();
        renderProjects();
    };

    // ปุ่มเพิ่มห้อง วิชาเดิม
    window.openAddSectionModal = (semesterYear, subjectName) => {
        const modal = document.getElementById("subject-modal");
        const semInput = document.getElementById("semester-year");
        const nameInput = document.getElementById("subject-name");
        const secInput = document.getElementById("subject-section");

        if (semInput) semInput.value = semesterYear;
        if (nameInput) nameInput.value = subjectName;
        if (secInput) secInput.value = "";
        if (modal) modal.classList.remove("hidden");
        if (secInput) secInput.focus();
    };

    window.copyJoinCode = (code) => {
        navigator.clipboard.writeText(code);
        alert(`คัดลอกรหัสเข้าวิชา "${code}" เรียบร้อย`);
    };

    // ฟังก์ชันแก้ไขเทอม/ปีการศึกษา หรือชื่อวิชา
    window.editCourseGroup = async (oldSemester, oldName) => {
        const newSemester = prompt("แก้ไขเทอม / ปีการศึกษา:", oldSemester);
        if (newSemester === null || !newSemester.trim()) return;

        const newName = prompt("แก้ไขชื่อรายวิชา:", oldName);
        if (newName === null || !newName.trim()) return;

        const { error } = await supabaseClient
            .from('subject')
            .update({
                semester_year: newSemester.trim(),
                subject_name: newName.trim()
            })
            .eq('teacher_id', userId)
            .eq('semester_year', oldSemester)
            .eq('subject_name', oldName);

        if (error) {
            alert("แก้ไขไม่สำเร็จ: " + error.message);
            return;
        }

        selectedSemester = newSemester.trim();
        selectedGroupKey = `${newSemester.trim()}||${newName.trim()}`;
        await loadSubjects();
        await loadProjects();
    };

    // ฟังก์ชันลบเฉพาะห้องเดียว
    window.deleteSubject = async (subjectId, label) => {
        if (!confirm(`ต้องการลบ "${label}" หรือไม่?`)) return;
        const { error } = await supabaseClient.from('subject').delete().eq('subject_id', subjectId);
        if (error) {
            alert("ลบไม่สำเร็จ: " + error.message);
            return;
        }
        await loadSubjects();
        const groups = getSubjectGroups();
        const currentGrp = groups.find(g => g.key === selectedGroupKey);
        if (!currentGrp) {
            selectedGroupKey = "all";
            selectedSubjectId = "all";
        } else {
            selectedSubjectId = currentGrp.rooms[0]?.subject_id || "all";
        }
        renderSubjectUI();
        await loadProjects();
    };

    // ฟังก์ชันลบทั้งวิชา/ปีการศึกษา รวดเดียว
    window.deleteEntireCourseGroup = async (semesterYear, subjectName) => {
        if (!confirm(`ยืนยันการลบรายวิชา "${subjectName} (${semesterYear})" ทั้งหมดทุกชั้นเรียนหรือไม่?`)) return;

        const { error } = await supabaseClient
            .from('subject')
            .delete()
            .eq('teacher_id', userId)
            .eq('semester_year', semesterYear)
            .eq('subject_name', subjectName);

        if (error) {
            alert("ลบรายวิชาไม่สำเร็จ: " + error.message);
            return;
        }

        selectedGroupKey = "all";
        selectedSubjectId = "all";
        await loadSubjects();
        await loadProjects();
    };

    // ฟังก์ชันลบทั้งปีการศึกษา
    window.deleteEntireSemester = async (semesterYear) => {
        if (!confirm(`ต้องการลบรายวิชาและชั้นเรียนทั้งหมดในปีการศึกษา "${semesterYear}" ใช่หรือไม่?`)) return;

        const { error } = await supabaseClient
            .from('subject')
            .delete()
            .eq('teacher_id', userId)
            .eq('semester_year', semesterYear);

        if (error) {
            alert("ลบปีการศึกษาไม่สำเร็จ: " + error.message);
            return;
        }

        selectedSemester = "all";
        selectedGroupKey = "all";
        selectedSubjectId = "all";
        await loadSubjects();
        await loadProjects();
    };

    // วาดแถวตารางโครงงาน
    const renderProjects = () => {
        const selectedStatus = statusFilter ? statusFilter.value : "all";
        const groups = getSubjectGroups();
        const activeGroup = groups.find(g => g.key === selectedGroupKey);
        const validSubjectIdsInGroup = activeGroup ? activeGroup.rooms.map(r => r.subject_id) : [];

        const filtered = allProjects.filter(project => {
            const subj = Array.isArray(project.subject) ? project.subject[0] : project.subject;
            const projSemester = subj?.semester_year || project.academic_year;

            const matchStatus = selectedStatus === "all" || project.status === selectedStatus;
            const matchSemester = selectedSemester === "all" || projSemester === selectedSemester;
            let matchSubject = true;

            if (selectedGroupKey !== "all") {
                if (selectedSubjectId !== "all") {
                    matchSubject = project.subject_id === selectedSubjectId;
                } else {
                    matchSubject = validSubjectIdsInGroup.includes(project.subject_id);
                }
            }
            return matchStatus && matchSemester && matchSubject;
        });

        projectContainer.innerHTML = "";

        if (filtered.length === 0) {
            projectContainer.innerHTML = `
                <div class="py-12 text-center text-sm text-gray-400">
                    ไม่พบรายการโครงงานในหมวดหมู่นี้
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

            const targetUrl = `./dashboard-project-th.html?id=${project.project_id}`;
            const safeTitle = escapeHtml(project.thai_project_title);

            const subj = Array.isArray(project.subject) ? project.subject[0] : project.subject;
            const secText = subj?.section ? ` (${escapeHtml(subj.section)})` : "";
            const subjectLabel = subj 
                ? `${escapeHtml(subj.semester_year)} • ${escapeHtml(subj.subject_name)}${secText}`
                : escapeHtml(project.academic_year || "-");

            const rowHTML = `
                <div id="project-card-${project.project_id}" onclick="window.location.href='${targetUrl}'" class="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 items-center px-4 md:px-5 py-2.5 bg-white hover:bg-blue-50/50 rounded-xl transition-colors cursor-pointer relative group">
                    
                    <div class="md:col-span-6 flex items-center gap-6 min-w-0" title="${safeTitle}">
                        <div class="w-8.5 h-8.5 rounded-lg bg-blue-50 text-[#213f8c] flex items-center justify-center shrink-0">
                            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <p class="text-[14px] text-gray-800 font-semibold truncate group-hover:text-[#213f8c] transition-colors">
                            ${safeTitle}
                        </p>
                    </div>

                    <div class="md:col-span-2 flex md:justify-center items-center text-xs text-gray-600 min-w-0">
                        <span title="${subjectLabel}" class="truncate">${subjectLabel}</span>
                    </div>

                    <div class="md:col-span-2 flex md:justify-center items-center">
                        <span class="px-3 py-1 ${statusColors} text-[11px] font-bold rounded-full">${escapeHtml(project.status)}</span>
                    </div>

                    <div class="md:col-span-2 flex items-center justify-between md:justify-end gap-2 pr-9">
                        <span class="text-xs text-gray-500 font-medium">${dateStr}</span>
                    </div>
                </div>
            `;

            projectContainer.insertAdjacentHTML("beforeend", rowHTML);
        });
    };

    if (statusFilter) statusFilter.addEventListener("change", renderProjects);

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
                    creator_id,
                    subject_id,
                    subject ( join_code, semester_year, subject_name, section )
                )
            `)
            .eq('user_id', userId);

        if (error) {
            console.error("ดึงข้อมูลล้มเหลว:", error.message);
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

    // ดึงเลขรหัสล่าสุดเพื่อรันรหัส si0001, si0002
    const getNextCodeNumber = async () => {
        const { data } = await supabaseClient
            .from('subject')
            .select('join_code')
            .ilike('join_code', 'si%')
            .order('created_at', { ascending: false })
            .limit(1);

        if (data && data.length > 0) {
            const lastNum = parseInt(data[0].join_code.replace(/^si/i, ''), 10);
            if (!isNaN(lastNum)) return lastNum + 1;
        }
        return 1;
    };

    const modal = document.getElementById("subject-modal");
    const openBtn = document.getElementById("create-subject-btn");
    const closeBtn = document.getElementById("close-subject-modal");
    const cancelBtn = document.getElementById("cancel-subject-btn");
    const form = document.getElementById("create-subject-form");

    // ดึง Element ของช่องกรอกและข้อความแจ้งเตือนสีแดง
    const semInput = document.getElementById("semester-year");
    const secInput = document.getElementById("subject-section");
    const nameInput = document.getElementById("subject-name");

    const semError = document.getElementById("semester-year_error");
    const secError = document.getElementById("subject-section_error");
    const nameError = document.getElementById("subject-name_error");
    const formBottomError = document.getElementById("subject-form_error");

    const clearSubjectErrors = () => {
        if (semError) semError.classList.add("hidden");
        if (secError) secError.classList.add("hidden");
        if (nameError) nameError.classList.add("hidden");
        if (formBottomError) formBottomError.classList.add("hidden");
    };

    // พออาจารย์เริ่มพิมพ์ใหม่ ให้ตัวหนังสือสีแดงหายไปเองทันทีเหมือนฝั่งนิสิต
    [
        { input: semInput, err: semError },
        { input: secInput, err: secError },
        { input: nameInput, err: nameError }
    ].forEach(({ input, err }) => {
        if (input) {
            input.addEventListener("input", () => {
                if (input.value.trim() !== "" && err) err.classList.add("hidden");
                if (formBottomError) formBottomError.classList.add("hidden");
            });
        }
    });

    if (openBtn && modal && form) {
        openBtn.addEventListener("click", () => {
            form.reset();
            clearSubjectErrors();
            modal.classList.remove("hidden");
        });
        closeBtn.addEventListener("click", () => {
            modal.classList.add("hidden");
            form.reset();
            clearSubjectErrors();
        });
        cancelBtn.addEventListener("click", () => {
            modal.classList.add("hidden");
            form.reset();
            clearSubjectErrors();
        });

        form.addEventListener("submit", async (e) => {
            e.preventDefault();
            clearSubjectErrors();

            const semesterYear = (semInput?.value || "").trim();
            const sectionRaw = (secInput?.value || "").trim();
            const subjectName = (nameInput?.value || "").trim();

            // 1. เช็กว่ากรอกครบทุกช่องไหม ถ้าไม่ใส่ให้ขึ้นตัวแดงข้างๆ ชื่อช่องเหมือนฝั่งนิสิต
            let isValid = true;
            if (!semesterYear) {
                if (semError) semError.classList.remove("hidden");
                isValid = false;
            }
            if (!sectionRaw) {
                if (secError) secError.classList.remove("hidden");
                isValid = false;
            }
            if (!subjectName) {
                if (nameError) nameError.classList.remove("hidden");
                isValid = false;
            }
            if (!isValid) return;

            const submitBtn = document.getElementById("submit-subject-btn");
            submitBtn.disabled = true;
            submitBtn.innerText = "กำลังบันทึก...";

            const inputSections = [...new Set(sectionRaw.split(',').map(s => s.trim()).filter(Boolean))];
            const normalize = (str) => (str || "").toLowerCase().replace(/\s+/g, "");

            // 2. เช็กห้องเรียนซ้ำในเทอมและวิชาเดียวกัน
            const existingRoomsInCourse = mySubjects.filter(s =>
                normalize(s.semester_year) === normalize(semesterYear) &&
                normalize(s.subject_name) === normalize(subjectName)
            );
            const existingSectionSet = new Set(existingRoomsInCourse.map(r => normalize(r.section)));

            const duplicateSections = [];
            const newSections = [];

            inputSections.forEach(sec => {
                if (existingSectionSet.has(normalize(sec))) {
                    duplicateSections.push(sec);
                } else {
                    newSections.push(sec);
                }
            });

            // ถ้าซ้ำทั้งหมด ให้แสดงตัวหนังสือสีแดงด้านล่างฟอร์ม (ไม่เด้ง alert)
            if (newSections.length === 0) {
                if (formBottomError) {
                    formBottomError.innerText = `มีชั้นเรียน "${duplicateSections.join(', ')}" ในรายวิชา ${subjectName} (${semesterYear}) อยู่แล้วในระบบ`;
                    formBottomError.classList.remove("hidden");
                }
                submitBtn.disabled = false;
                submitBtn.innerText = "บันทึก";
                return;
            }

            let nextNum = await getNextCodeNumber();

            const rowsToInsert = newSections.map((sec, idx) => ({
                join_code: `si${String(nextNum + idx).padStart(4, '0')}`,
                semester_year: semesterYear,
                subject_name: subjectName,
                section: sec,
                teacher_id: userId
            }));

            const { data: inserted, error } = await supabaseClient
                .from("subject")
                .insert(rowsToInsert)
                .select();

            submitBtn.disabled = false;
            submitBtn.innerText = "บันทึก";

            if (error) {
                if (formBottomError) {
                    formBottomError.innerText = "สร้างชั้นเรียนไม่สำเร็จ: " + error.message;
                    formBottomError.classList.remove("hidden");
                }
                return;
            }

            modal.classList.add("hidden");
            form.reset();
            clearSubjectErrors();

            if (typeof selectedSemester !== "undefined") selectedSemester = semesterYear;
            selectedGroupKey = `${semesterYear}||${subjectName}`;
            selectedSubjectId = (inserted && inserted.length > 0) ? inserted[0].subject_id : "all";
            await loadSubjects();
            renderProjects();
        });
    }

    await loadSubjects();
    await loadProjects();
});