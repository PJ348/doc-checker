import { supabaseClient } from './supabase.js';
document.addEventListener("DOMContentLoaded", () => {

    // ระบบสลับหน้า
    const tabs = {
        home: { btn: document.getElementById('tab-home'), section: document.getElementById('section-home') },
        roles: { btn: document.getElementById('tab-roles'), section: document.getElementById('section-roles') },
        formats: { btn: document.getElementById('tab-formats'), section: document.getElementById('section-formats') },
        logs: { btn: document.getElementById('tab-logs'), section: document.getElementById('section-logs') }
    };

    const switchTab = (activeKey) => {
        Object.keys(tabs).forEach(key => {
            const tab = tabs[key];
            if (!tab.btn || !tab.section) return;

            if (key === activeKey) {
                tab.btn.className = "bg-[#213f8c] text-white px-5 py-2 rounded-xl whitespace-nowrap transition-all cursor-pointer";
                tab.section.classList.remove('hidden');
            } else {
                tab.btn.className = "text-gray-500 hover:text-gray-700 px-5 py-2 rounded-xl whitespace-nowrap transition-all cursor-pointer";
                tab.section.classList.add('hidden');
            }
        });
    };

    if (tabs.home.btn) tabs.home.btn.addEventListener('click', () => switchTab('home'));
    if (tabs.roles.btn) tabs.roles.btn.addEventListener('click', () => switchTab('roles'));
    if (tabs.formats.btn) tabs.formats.btn.addEventListener('click', () => switchTab('formats'));
    if (tabs.logs.btn) tabs.logs.btn.addEventListener('click', () => switchTab('logs'));

    // ฟังก์ชันสร้างแถบปุ่มแบ่งหน้า
    function renderPaginationUI(prefix, totalItems, currentPage, itemsPerPage, changePageCallback) {
        const totalPages = Math.ceil(totalItems / itemsPerPage);
        const startItem = totalItems === 0 ? 0 : ((currentPage - 1) * itemsPerPage) + 1;
        const endItem = Math.min(currentPage * itemsPerPage, totalItems);

        const elStart = document.getElementById(`${prefix}-start`);
        const elEnd = document.getElementById(`${prefix}-end`);
        const elTotal = document.getElementById(`${prefix}-total`);
        if (elStart) elStart.innerText = startItem;
        if (elEnd) elEnd.innerText = endItem;
        if (elTotal) elTotal.innerText = totalItems;

        const pagContainer = document.getElementById(`${prefix}-pagination`);
        if (!pagContainer) return;
        pagContainer.innerHTML = '';

        const prevBtn = document.createElement('button');
        prevBtn.className = `px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium transition-colors ${currentPage === 1 ? 'text-gray-300 cursor-not-allowed bg-gray-50' : 'text-gray-600 hover:bg-gray-100 bg-white'}`;
        prevBtn.innerText = 'ก่อนหน้า';
        prevBtn.onclick = () => { if (currentPage > 1) changePageCallback(currentPage - 1); };
        pagContainer.appendChild(prevBtn);

        for (let i = 1; i <= totalPages; i++) {
            const pageBtn = document.createElement('button');
            const isActive = i === currentPage;
            pageBtn.className = `w-8 h-8 flex items-center justify-center border rounded-lg text-xs font-bold transition-colors ${isActive ? 'bg-[#213f8c] text-white border-[#213f8c]' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-100'}`;
            pageBtn.innerText = i;
            pageBtn.onclick = () => changePageCallback(i);
            pagContainer.appendChild(pageBtn);
        }

        const nextBtn = document.createElement('button');
        nextBtn.className = `px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium transition-colors ${currentPage === totalPages || totalPages === 0 ? 'text-gray-300 cursor-not-allowed bg-gray-50' : 'text-gray-600 hover:bg-gray-100 bg-white'}`;
        nextBtn.innerText = 'ถัดไป';
        nextBtn.onclick = () => { if (currentPage < totalPages) changePageCallback(currentPage + 1); };
        pagContainer.appendChild(nextBtn);
    }

    // โหลดข้อมูลจัดการสิทธิ์ 
    let allUsersData = [];
    let allRolesData = [];
    let allFormatsData = [];
    const rolesPerPage = 10;

    async function loadUsersAndRoles() {
        const tbody = document.getElementById('table-roles-body');
        if (!tbody) return;
        tbody.innerHTML = '<tr><td colspan="4" class="text-center py-8 text-gray-500 font-medium">กำลังโหลดข้อมูลผู้ใช้งาน...</td></tr>';

        const { data: usersData, error: usersError } = await supabaseClient.from('users').select('*');
        const { data: rolesData, error: rolesError } = await supabaseClient.from('user_role').select('*');
        const { data: formatsData, error: formatsError } = await supabaseClient.from('document_format').select('*');

        if (usersError || rolesError || formatsError) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center py-8 text-red-500">เกิดข้อผิดพลาดในการดึงข้อมูล</td></tr>';
            return;
        }

        allUsersData = usersData;
        allRolesData = rolesData;
        allFormatsData = formatsData;

        const totalUsersEl = document.getElementById('total-users');
        if (totalUsersEl) totalUsersEl.innerHTML = `${allUsersData.length} <span class="text-sm font-normal text-gray-500">คน</span>`;

        const totalFormatsEl = document.getElementById('total-formats');
        if (totalFormatsEl) totalFormatsEl.innerHTML = `${allFormatsData.length} <span class="text-sm font-normal text-gray-500">รูปแบบ</span>`;

        renderRolesTable(1);
    }

    function renderRolesTable(page) {
        const tbody = document.getElementById('table-roles-body');
        tbody.innerHTML = '';

        const startIndex = (page - 1) * rolesPerPage;
        const endIndex = startIndex + rolesPerPage;
        const currentUsers = allUsersData.slice(startIndex, endIndex);

        currentUsers.forEach(user => {
            const userRole = allRolesData.find(r => r.user_id === user.user_id);
            const roleId = userRole ? userRole.role_id : 1;

            let roleBadge = '';
            let initialColor = '';

            if (roleId === 1) {
                roleBadge = '<span class="px-4 py-1 bg-green-50 text-green-600 border border-green-200 rounded-full text-xs font-bold">นิสิต</span>';
                initialColor = 'bg-gray-100 text-gray-600';
            } else if (roleId === 2) {
                roleBadge = '<span class="px-4 py-1 bg-blue-50 text-blue-600 border border-blue-200 rounded-full text-xs font-bold">อาจารย์</span>';
                initialColor = 'bg-blue-100 text-blue-600';
            } else {
                roleBadge = '<span class="px-4 py-1 bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-full text-xs font-bold">Admin</span>';
                initialColor = 'bg-indigo-100 text-indigo-600';
            }

            const initial = user.first_name ? user.first_name.charAt(0) : '?';
            const fullName = `${user.first_name || ''} ${user.last_name || ''}`;
            const userEmail = user.email || '-';

            const tr = document.createElement('tr');
            tr.className = 'border-b border-gray-100 hover:bg-gray-50/80 transition-colors';
            tr.innerHTML = `
                <td class="px-6 py-4 truncate">
                    <div class="flex items-center gap-4 w-full">
                        <span class="text-gray-800 truncate" title="${fullName}">${fullName}</span>
                    </div>
                </td>
                <td class="px-6 py-4 text-gray-500 text-[13px] truncate" title="${userEmail}">
                    ${userEmail}
                </td>
                <td class="px-6 py-4">${roleBadge}</td>
                <td class="px-6 py-4">
                    <select data-userid="${user.user_id}" data-name="${fullName}" class="role-selector border border-gray-200 rounded-md px-2 py-1.5 text-xs text-gray-700 bg-white focus:outline-none focus:border-[#213f8c] shadow-sm cursor-pointer w-full">
                        <option value="1" ${roleId === 1 ? 'selected' : ''}>นิสิต (Student)</option>
                        <option value="2" ${roleId === 2 ? 'selected' : ''}>อาจารย์ (Advisor)</option>
                        <option value="3" ${roleId === 3 ? 'selected' : ''}>ผู้ดูแล (Admin)</option>
                    </select>
                </td>
            `;
            tbody.appendChild(tr);
        });

        document.querySelectorAll('.role-selector').forEach(select => {
            select.addEventListener('change', async (e) => {
                const userId = e.target.getAttribute('data-userid');
                const userName = e.target.getAttribute('data-name');
                const newRoleId = parseInt(e.target.value);

                const confirmChange = confirm(`ยืนยันการเปลี่ยนสิทธิ์ของ "${userName}" ใช่หรือไม่?`);
                if (!confirmChange) {
                    renderRolesTable(page);
                    return;
                }

                const { error } = await supabaseClient.from('user_role').update({ role_id: newRoleId }).eq('user_id', userId);
                if (error) {
                    alert("เปลี่ยนสิทธิ์ไม่สำเร็จ: " + error.message);
                    return;
                }
                await loadUsersAndRoles();
                await loadAuditLogs();
            });
        });

        renderPaginationUI('roles', allUsersData.length, page, rolesPerPage, renderRolesTable);
    }

    // โหลดข้อมูล Audit Logs
    let allLogsData = [];
    let filteredLogsData = [];
    const logsPerPage = 10;

    async function loadAuditLogs() {
        const fullBody = document.getElementById('table-logs-full');
        const recentBody = document.getElementById('table-logs-recent');
        if (!fullBody) return;

        // ดึงข้อมูลทั้งหมดจากฐานข้อมูล
        const { data: logsData, error } = await supabaseClient
            .from('operation_history')
            .select(`*, users (first_name, last_name)`)
            .order('submission_time', { ascending: false });

        if (error) {
            console.error("เกิดข้อผิดพลาดในการดึง Logs:", error);
            return;
        }
        
        allLogsData = logsData || [];
        
        filteredLogsData = [...allLogsData]; 

        const dateFilterInput = document.getElementById('log-date-filter');
        const clearFilterBtn = document.getElementById('clear-log-filter');
        if (dateFilterInput) dateFilterInput.value = '';
        if (clearFilterBtn) clearFilterBtn.classList.add('hidden');

        // วาดตาราง 6 รายการล่าสุดในหน้าหลัก
        if (recentBody) {
            recentBody.innerHTML = '';
            const top6 = allLogsData.slice(0, 6);
            top6.forEach(log => recentBody.innerHTML += createLogHTML(log));
        }

        renderLogsTable(1);
    }

    function renderLogsTable(page) {
        const fullBody = document.getElementById('table-logs-full');
        fullBody.innerHTML = '';

        const startIndex = (page - 1) * logsPerPage;
        const endIndex = startIndex + logsPerPage;
        
        const currentLogs = filteredLogsData.slice(startIndex, endIndex);

        currentLogs.forEach(log => { fullBody.innerHTML += createLogHTML(log); });
        
        renderPaginationUI('logs', filteredLogsData.length, page, logsPerPage, renderLogsTable);
    }

    function createLogHTML(log) {
        const dateObj = new Date(log.submission_time);
        const dateOptions = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        const timeString = dateObj.toLocaleDateString('th-TH', dateOptions) + ' น.';

        // จัดการแกะ JSON ให้แสดงผลสวยงาม
        const userName = log.users ? `${log.users.first_name || ''} ${log.users.last_name || ''}`.trim() : 'System';

        let detailText = log.details || '-';
        try {
            const parsed = typeof log.details === 'string' ? JSON.parse(log.details) : log.details;
            if (log.action_type === 'INSERT_PROJECT') detailText = `สร้างโครงงานใหม่ชื่อ: "${parsed.thai_project_title}"`;
            else if (log.action_type === 'DELETE_PROJECT') detailText = `ลบโครงงานชื่อ: "${parsed.thai_project_title}"`;
            else if (log.action_type === 'UPDATE_USER_ROLE') detailText = `แก้ไขสิทธิ์จาก ID: ${parsed.old_data.role_id} เป็น ID: ${parsed.new_data.role_id}`;
            else if (log.action_type === 'INSERT_DOCUMENT_FORMAT') detailText = `เพิ่มมาตรฐานเอกสารใหม่: "${parsed.document_name}"`;
            else if (log.action_type === 'DELETE_DOCUMENT_FORMAT') detailText = `ลบมาตรฐานเอกสาร: "${parsed.document_name}"`;
        } catch (e) { }

        const displayAction = `
            <div>
                <span class="font-bold text-[#213f8c] text-[13px]">${log.action_type || 'SYSTEM_ACTION'}</span>
                <span class="block text-[11px] text-gray-500 truncate w-[300px] mt-0.5" title='${detailText}'>${detailText}</span>
            </div>
        `;

        const statusIcon = `<div class="w-5 h-5 bg-[#22c55e] rounded flex justify-center items-center mx-auto"><svg class="h-3.5 w-3.5 text-white" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg></div>`;

        return `
            <tr class="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <!-- แสดงวันและเวลาแบบครบถ้วน -->
                <td class="px-6 py-4 font-medium text-[13px]">${timeString}</td>
                <td class="px-6 py-4">${userName}</td>
                <td class="px-6 py-4">${displayAction}</td>
                <td class="px-6 py-4 text-center">${statusIcon}</td>
            </tr>
        `;
    }

    // จัดการเหตุการณ์เมื่อผู้ใช้กดเลือกวันที่
    const dateFilterInput = document.getElementById('log-date-filter');
    const clearFilterBtn = document.getElementById('clear-log-filter');

    if (dateFilterInput) {
        dateFilterInput.addEventListener('change', (e) => {
            const selectedDate = e.target.value; // จะได้ฟอร์แมต 'YYYY-MM-DD'
            
            if (selectedDate) {
                // กรองเอาเฉพาะข้อมูลที่วันที่ตรงกัน
                filteredLogsData = allLogsData.filter(log => {
                    const logDate = new Date(log.submission_time).toISOString().split('T')[0];
                    return logDate === selectedDate;
                });
                clearFilterBtn.classList.remove('hidden');
            } else {
                filteredLogsData = [...allLogsData];
                clearFilterBtn.classList.add('hidden');
            }
            
            renderLogsTable(1);
        });
    }

    if (clearFilterBtn) {
        clearFilterBtn.addEventListener('click', () => {
            dateFilterInput.value = '';
            filteredLogsData = [...allLogsData]; // คืนค่าข้อมูลทั้งหมด
            clearFilterBtn.classList.add('hidden');
            renderLogsTable(1);
        });
    }

    // 4. ระบบจัดการและเพิ่มมาตรฐานเอกสาร 
    //  ส่วนดึงข้อมูลและแสดงผล
    let allFormatsList = [];
    const formatsPerPage = 5;

    async function loadFormats() {
        const container = document.getElementById('formats-list-container');
        if (!container) return;
        container.innerHTML = '<div class="p-8 text-center text-gray-500 font-medium">กำลังโหลดข้อมูลมาตรฐานเอกสาร...</div>';

        const { data, error } = await supabaseClient
            .from('document_format')
            .select(`
                *,
                consists_of (
                    document_requirement (
                        requirement_id,
                        category_name,
                        requirement_details
                    )
                ),
                use_by (
                    faculty (
                        faculty_id,
                        faculty_name
                    ),
                    program (
                        program_id,
                        program_name
                    )
                )
            `)
            .eq('is_deleted', false)
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Error fetching formats:", error);
            container.innerHTML = '<div class="p-8 text-center text-red-500">โหลดข้อมูลล้มเหลว</div>';
            return;
        }

        allFormatsList = data || [];
        const totalFormatsEl = document.getElementById('total-formats');
        if (totalFormatsEl) totalFormatsEl.innerHTML = `${allFormatsList.length} <span class="text-sm font-normal text-gray-500">รูปแบบ</span>`;

        renderFormatsList(1);
    }

    function renderFormatsList(page) {
        const container = document.getElementById('formats-list-container');
        container.innerHTML = '';

        if (allFormatsList.length === 0) {
            container.innerHTML = '<div class="p-8 text-center text-gray-500">ยังไม่มีข้อมูลมาตรฐานเอกสารในระบบ</div>';
            renderPaginationUI('formats', 0, 1, formatsPerPage, renderFormatsList);
            return;
        }

        const startIndex = (page - 1) * formatsPerPage;
        const endIndex = startIndex + formatsPerPage;
        const currentFormats = allFormatsList.slice(startIndex, endIndex);

        currentFormats.forEach(format => {
            let facultyName = 'ไม่ระบุคณะ';
            let majorName = 'ไม่ระบุสาขา';
            if (format.use_by && format.use_by.length > 0) {
                const usage = format.use_by[0];
                if (usage.faculty) facultyName = usage.faculty.faculty_name || 'ไม่ระบุคณะ';
                if (usage.program) majorName = usage.program.program_name || 'ไม่ระบุสาขา';
            }

            const isActive = format.is_active !== false;

            let dateStr = 'ไม่ระบุวันที่';
            if (format.created_at) {
                const dateObj = new Date(format.created_at);
                dateStr = dateObj.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
            }

            const div = document.createElement('div');
            div.className = `grid grid-cols-12 gap-4 items-center p-4 border-b border-gray-100 transition-colors group ${isActive ? 'hover:bg-blue-50/30' : 'opacity-75 hover:opacity-100 hover:bg-gray-50'}`;

            div.innerHTML = `
                <div class="col-span-5 md:col-span-4 flex items-center gap-3 pl-2">
                    <div class="w-10 h-10 rounded-xl ${isActive ? 'bg-blue-50 text-[#213f8c]' : 'bg-gray-100 text-gray-400'} flex items-center justify-center shrink-0">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                    </div>
                    <div class="min-w-0">
                        <div class="flex items-center gap-2">
                            <h2 class="text-sm font-bold ${isActive ? 'text-gray-900' : 'text-gray-700'} truncate">${format.document_name || 'ไม่ระบุชื่อ'}</h2>
                            <span class="text-[10px] font-bold ${isActive ? 'text-[#213f8c] bg-blue-100/50 border-blue-100' : 'text-gray-500 bg-gray-100 border-gray-200'} px-2 py-0.5 rounded-md border shrink-0">${format.version || 'v1.0'}</span>
                        </div>
                        <p class="text-[13px] ${isActive ? 'text-gray-500' : 'text-gray-400'} truncate mt-0.5">${majorName}</p>
                    </div>
                </div>

                <div class="hidden md:flex md:col-span-3 flex-col items-start justify-center gap-1">
                    <span class="inline-block px-2.5 py-1 bg-gray-100 ${isActive ? 'text-gray-600' : 'text-gray-500'} text-[10px] font-semibold rounded-md">${facultyName}</span>
                    <span class="text-[13px] ${isActive ? 'text-gray-600' : 'text-gray-400'} font-medium ml-1">ปีการศึกษา ${format.academic_year || '-'}</span>
                </div>

                <div class="hidden lg:flex lg:col-span-2 items-center text-[13px] ${isActive ? 'text-gray-500' : 'text-gray-400'} font-medium">
                    ${dateStr}
                </div>

                <div class="col-span-7 md:col-span-5 lg:col-span-3 flex justify-end items-center gap-4 pr-2">
                    <label class="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" class="sr-only peer toggle-active-btn" data-id="${format.format_id}" ${isActive ? 'checked' : ''}>
                        <div class="w-8 h-4.5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-green-500"></div>
                        <span class="ml-2 text-[11px] font-bold ${isActive ? 'text-green-600' : 'text-gray-400'} w-12 hidden sm:block">${isActive ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}</span>
                    </label>
                    
                    <div class="w-px h-5 bg-gray-200 hidden sm:block"></div>

                    <!--ปุ่มดูรายละเอียด -->
                    <button class="view-format-btn p-1.5 text-[#213f8c] hover:bg-blue-50 rounded-md transition-colors opacity-60 group-hover:opacity-100 cursor-pointer" data-id="${format.format_id}" title="ดูรายละเอียด">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                    </button>
                    
                    <button class="delete-format-btn p-1.5 ${isActive ? 'text-gray-400' : 'text-gray-300'} hover:text-red-500 hover:bg-red-50 rounded-md transition-colors opacity-60 group-hover:opacity-100 cursor-pointer" data-id="${format.format_id}" data-name="${format.document_name}">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                </div>
            `;
            container.appendChild(div);
        });

        // Event: กด Toggle เปิด/ปิด
        document.querySelectorAll('.toggle-active-btn').forEach(toggle => {
            toggle.addEventListener('change', async (e) => {
                const id = e.target.getAttribute('data-id');
                const newStatus = e.target.checked;

                const { error } = await supabaseClient.from('document_format').update({ is_active: newStatus }).eq('format_id', id);
                if (error) {
                    alert("เปลี่ยนสถานะไม่สำเร็จ: " + error.message);
                    e.target.checked = !newStatus;
                    return;
                }
                loadFormats();
            });
        });

        // ปุ่มดูรายละเอียด
        document.querySelectorAll('.view-format-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                openFormatDetails(id);
            });
        });

        // Event: กดปุ่มลบ
        document.querySelectorAll('.delete-format-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.currentTarget.getAttribute('data-id');

                if (confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบมาตรฐานนี้ออกจากระบบ`)) {
                    const { error } = await supabaseClient
                        .from('document_format')
                        .update({ is_deleted: true })
                        .eq('format_id', id);

                    if (error) {
                        alert("ลบไม่สำเร็จ: " + error.message);
                        return;
                    }
                    loadFormats();
                }
            });
        });

        renderPaginationUI('formats', allFormatsList.length, page, formatsPerPage, renderFormatsList);
    }

    // สร้างป๊อปอัปรายละเอียด Model
    function injectDetailModal() {
        if (document.getElementById('format-detail-modal')) return;

        const modalDiv = document.createElement('div');
        modalDiv.id = 'format-detail-modal';
        modalDiv.className = 'hidden fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm transition-opacity opacity-0';

        modalDiv.innerHTML = `
            <div class="bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 overflow-hidden transform scale-95 transition-transform duration-300">
                <div class="bg-[#213f8c] px-6 py-4 flex justify-between items-center">
                    <h3 class="text-white text-lg font-bold flex items-center gap-2">
                        <svg class="w-5 h-5 text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                        รายละเอียดมาตรฐานเอกสาร
                    </h3>
                    <button id="close-modal-btn" class="text-blue-200 hover:text-white transition-colors cursor-pointer">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>
                <div class="p-6 md:p-8">
                    <div class="flex items-start justify-between mb-6">
                        <div>
                            <h2 id="modal-format-name" class="text-xl font-bold text-gray-900">ชื่อมาตรฐาน</h2>
                            <div class="flex items-center gap-2 mt-2">
                                <span id="modal-version" class="text-[11px] font-bold text-[#213f8c] bg-blue-100/50 px-2 py-0.5 rounded-md border border-blue-100">v1.0</span>
                                <span id="modal-academic-year" class="text-xs text-gray-500 font-medium">ปีการศึกษา -</span>
                            </div>
                        </div>
                        <div class="text-right">
                            <p id="modal-faculty" class="text-sm font-bold text-gray-700">คณะ</p>
                            <p id="modal-major" class="text-xs text-gray-500 mt-0.5">สาขา</p>
                        </div>
                    </div>
                    <div class="w-full h-px bg-gray-100 mb-6"></div>
                    <h4 class="text-[13px] font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <span class="bg-[#213f8c] w-1.5 h-3.5 rounded-full"></span> กฎการตรวจสอบ (Rules)
                    </h4>
                    <div class="bg-gray-50 rounded-xl p-5 border border-gray-100">
                        <div class="grid grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-4">
                            <div><p class="text-[11px] text-gray-500 font-medium mb-1">ฟอนต์ (Font)</p><p id="modal-font" class="text-[13px] font-bold text-gray-800">-</p></div>
                            <div><p class="text-[11px] text-gray-500 font-medium mb-1">ขนาดฟอนต์</p><p id="modal-font-size" class="text-[13px] font-bold text-gray-800">- pt</p></div>
                            <div><p class="text-[11px] text-gray-500 font-medium mb-1">ระยะบรรทัด</p><p id="modal-line-spacing" class="text-[13px] font-bold text-gray-800">-</p></div>
                            <div><p class="text-[11px] text-gray-500 font-medium mb-1">กั้นหน้าซ้าย (นิ้ว)</p><p id="modal-margin-left" class="text-[13px] font-bold text-gray-800">-</p></div>
                            <div><p class="text-[11px] text-gray-500 font-medium mb-1">กั้นหลังขวา (นิ้ว)</p><p id="modal-margin-right" class="text-[13px] font-bold text-gray-800">-</p></div>
                            <div><p class="text-[11px] text-gray-500 font-medium mb-1">ขอบบน / ล่าง (นิ้ว)</p><p id="modal-margin-top-bottom" class="text-[13px] font-bold text-gray-800">- / -</p></div>
                        </div>
                    </div>

                    <div class="w-full h-px bg-gray-100 mt-6 mb-5"></div>
                    <div class="flex items-center justify-between bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 bg-white rounded-lg shadow-sm flex items-center justify-center text-[#213f8c]">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                            </div>
                            <div>
                                <p class="text-[13px] font-bold text-gray-800">ไฟล์มาตรฐานเอกสาร</p>
                                <p class="text-[11px] text-gray-500 mt-0.5">คลิกเพื่อดูหรือดาวน์โหลดไฟล์ต้นแบบ</p>
                            </div>
                        </div>
                        
                        <!-- ปุ่มลิงก์ไฟล์ -->
                        <a id="modal-file-link" href="#" target="_blank" class="hidden px-4 py-2 bg-[#213f8c] text-white text-xs font-bold rounded-lg shadow-sm hover:bg-[#18306b] transition-colors items-center gap-2">
                            เปิดดูไฟล์
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                        </a>
                        <!-- ข้อความแสดงเมื่อไม่มีไฟล์ -->
                        <span id="modal-no-file" class="hidden text-xs font-bold text-gray-400 bg-gray-100 border border-gray-200 px-3 py-1.5 rounded-md">ไม่มีไฟล์แนบ</span>
                    </div>

                </div>
            </div>
        `;
        document.body.appendChild(modalDiv);
    }
    injectDetailModal();

    function openFormatDetails(formatId) {
        const detailModal = document.getElementById('format-detail-modal');
        const closeModalBtn = document.getElementById('close-modal-btn');
        if (!detailModal) {
            console.error("หา Modal ไม่เจอ!");
            return;
        }

        const format = allFormatsList.find(f => f.format_id == formatId || f.id == formatId);
        if (!format) {
            alert("ไม่พบข้อมูลมาตรฐานเอกสารนี้");
            return;
        }

        // แกะข้อมูลกฎ (Rules)
        let fontName = '-', fontSize = '-', lineSpacing = '-';
        let marginLeft = '-', marginRight = '-', marginTop = '-', marginBottom = '-';

        if (format.consists_of && format.consists_of.length > 0) {
            format.consists_of.forEach(item => {
                const req = item.document_requirement;
                if (!req) return;

                if (req.category_name === 'ฟอนต์') fontName = req.requirement_details;
                if (req.category_name === 'ขนาดฟอนต์') fontSize = req.requirement_details;
                if (req.category_name === 'ระยะบรรทัด') lineSpacing = req.requirement_details;
                if (req.category_name === 'ระยะขอบ') {
                    const marginText = req.requirement_details;
                    const leftMatch = marginText.match(/ซ้าย\s*([\d.]+)/);
                    if (leftMatch) marginLeft = leftMatch[1];

                    const rightMatch = marginText.match(/ขวา\s*([\d.]+)/);
                    if (rightMatch) marginRight = rightMatch[1];

                    const topMatch = marginText.match(/บน\s*([\d.]+)/);
                    if (topMatch) marginTop = topMatch[1];

                    const bottomMatch = marginText.match(/ล่าง\s*([\d.]+)/);
                    if (bottomMatch) marginBottom = bottomMatch[1];
                }
            });
        }

        let facultyName = 'ไม่ระบุคณะ';
        let programName = 'ไม่ระบุสาขา';

        if (format.use_by && format.use_by.length > 0) {
            const usage = format.use_by[0];
            if (usage.faculty) facultyName = usage.faculty.faculty_name || 'ไม่ระบุคณะ';
            if (usage.program) programName = usage.program.program_name || 'ไม่ระบุสาขา';
        }

        // นำข้อมูลไปใส่ในหน้าจอ Modal
        document.getElementById('modal-format-name').innerText = format.document_name || format.format_name || 'ไม่ระบุชื่อ';
        document.getElementById('modal-version').innerText = format.version || 'v1.0';
        document.getElementById('modal-academic-year').innerText = `ปีการศึกษา ${format.academic_year || '-'}`;
        document.getElementById('modal-faculty').innerText = facultyName; 
        document.getElementById('modal-major').innerText = programName;

        document.getElementById('modal-font').innerText = fontName;
        // กรณีขนาดฟอนต์ ถ้ามีคำว่า pt ติดมาแล้วก็แสดงได้เลย ถ้าไม่มีค่อยเติม
        document.getElementById('modal-font-size').innerText = fontSize !== '-' && !fontSize.includes('pt') ? `${fontSize} pt` : fontSize;
        document.getElementById('modal-line-spacing').innerText = lineSpacing;
        document.getElementById('modal-margin-left').innerText = marginLeft;
        document.getElementById('modal-margin-right').innerText = marginRight;
        document.getElementById('modal-margin-top-bottom').innerText = `${marginTop} / ${marginBottom}`;

        // จัดการปุ่มลิงก์เปิดไฟล์
        const fileLinkBtn = document.getElementById('modal-file-link');
        const noFileMsg = document.getElementById('modal-no-file');
        const mdViewer = document.getElementById('modal-md-viewer');

        // ซ่อนกล่องดำ (ถ้าใน HTML ยังมีค้างไว้)
        if (mdViewer) mdViewer.classList.add('hidden');

        if (format.file_url && format.file_url.trim() !== "") {
            fileLinkBtn.classList.remove('hidden');
            fileLinkBtn.classList.add('flex');
            fileLinkBtn.innerHTML = `
                ดาวน์โหลดไฟล์
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
            `;
            noFileMsg.classList.add('hidden');

            // ดึงไฟล์มาดาวน์โหลดลงเครื่อง
            fileLinkBtn.onclick = async (e) => {
                e.preventDefault();

                // เปลี่ยนปุ่มเป็นสถานะกำลังโหลด
                const originalText = fileLinkBtn.innerHTML;
                fileLinkBtn.innerHTML = `
                    กำลังโหลด... 
                    <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                `;
                fileLinkBtn.classList.add('opacity-80', 'cursor-wait');

                try {
                    // ใช้ Fetch ดึงข้อมูลไฟล์จาก Supabase
                    const response = await fetch(format.file_url);
                    const blob = await response.blob();

                    // สร้าง URL จำลองในเครื่องเพื่อดาวน์โหลด
                    const downloadUrl = window.URL.createObjectURL(blob);

                    // สร้างปุ่มลิงก์ที่มองไม่เห็นเพื่อสั่งโหลด
                    const a = document.createElement('a');
                    a.style.display = 'none';
                    a.href = downloadUrl;

                    // สกัดชื่อไฟล์จาก URL (หรือตั้งชื่อเริ่มต้นถ้าหาไม่เจอ)
                    let fileName = format.file_url.substring(format.file_url.lastIndexOf('/') + 1).split('?')[0];
                    a.download = decodeURIComponent(fileName) || `format_${format.format_id}`;

                    // สั่งคลิกดาวน์โหลด
                    document.body.appendChild(a);
                    a.click();

                    // เคลียร์หน่วยความจำ
                    window.URL.revokeObjectURL(downloadUrl);
                    document.body.removeChild(a);
                } catch (error) {
                    console.error("ดาวน์โหลดด้วย Fetch ไม่สำเร็จ:", error);
                    const fallbackUrl = format.file_url.includes('?') ? `${format.file_url}&download=true` : `${format.file_url}?download=true`;
                    window.open(fallbackUrl, '_blank');
                } finally {
                    fileLinkBtn.innerHTML = originalText;
                    fileLinkBtn.classList.remove('opacity-80', 'cursor-wait');
                }
            };
        }
        else {
            fileLinkBtn.classList.add('hidden');
            fileLinkBtn.classList.remove('flex');
            noFileMsg.classList.remove('hidden');
        }

        // ส่วนจัดการการปิด Modal (เหมือนเดิม)
        const closeModal = () => {
            detailModal.classList.add('opacity-0');
            detailModal.querySelector('div').classList.add('scale-95');
            setTimeout(() => detailModal.classList.add('hidden'), 300);
        };
        closeModalBtn.onclick = closeModal;
        detailModal.onclick = (e) => { if (e.target === detailModal) closeModal(); };

        detailModal.classList.remove('hidden');
        setTimeout(() => {
            detailModal.classList.remove('opacity-0');
            detailModal.querySelector('div').classList.remove('scale-95');
        }, 10);
    }

    // โหลดข้อมูลคณะและสาขาสำหรับฟอร์ม
    function setDefaultAcademicYear() {
        const yearInput = document.getElementById('academic_year');
        if (!yearInput) return;

        const currentDate = new Date();
        const currentMonth = currentDate.getMonth() + 1;
        let currentYear = currentDate.getFullYear();

        // โลจิกปีการศึกษาไทย: ถ้าเป็นเดือนมกราคม - พฤษภาคม (ช่วงเทอม 2 หรือซัมเมอร์) 
        // จะยังถือว่าเป็นปีการศึกษาของปีที่แล้วอยู่ (เช่น ต้นปี 69 จะเป็นปีการศึกษา 68)
        if (currentMonth < 6) {
            currentYear -= 1;
        }

        const thaiAcademicYear = currentYear + 543;

        yearInput.value = thaiAcademicYear;
    }

    async function loadFacultiesForForm() {
        const facultySelect = document.getElementById('faculty');
        if (!facultySelect) return;

        // เคลียร์ค่าเก่าและใส่ตัวเลือกเริ่มต้น
        facultySelect.innerHTML = '<option value="">-- กรุณาเลือกคณะ --</option>';

        const { data, error } = await supabaseClient.from('faculty').select('*');
        if (error) {
            console.error("Error loading faculties:", error);
            return;
        }

        // วนลูปนำชื่อคณะมาใส่ใน Dropdown
        data.forEach(fac => {
            const option = document.createElement('option');
            option.value = fac.faculty_id;
            option.textContent = fac.faculty_name;
            facultySelect.appendChild(option);
        });
    }

    async function loadProgramsForForm(facultyId = null) {
        const majorSelect = document.getElementById('major');
        if (!majorSelect) return;

        // เคลียร์ค่าเก่าและใส่ตัวเลือกเริ่มต้น
        majorSelect.innerHTML = '<option value="">-- กรุณาเลือกสาขา --</option>';

        // สร้างคำสั่งดึงข้อมูลสาขา
        let query = supabaseClient.from('program').select('*');

        if (facultyId) {
            query = query.eq('faculty_id', facultyId);
        }

        const { data, error } = await query;
        if (error) {
            console.error("Error loading programs:", error);
            return;
        }

        // วนลูปนำชื่อสาขามาใส่ใน Dropdown
        data.forEach(prog => {
            const option = document.createElement('option');
            option.value = prog.program_id;
            option.textContent = prog.program_name;
            majorSelect.appendChild(option);
        });
    }

    // จับเหตุการณ์เมื่อผู้ใช้เปลี่ยนคณะ ให้โหลดสาขาใหม่ที่ตรงกัน
    const facultySelectDropdown = document.getElementById('faculty');
    if (facultySelectDropdown) {
        facultySelectDropdown.addEventListener('change', (e) => {
            const selectedFacultyId = e.target.value;
            loadProgramsForForm(selectedFacultyId);
        });
    }

    // คุมฟอร์มสร้างมาตรฐานใหม่ 
    const btnAddFormat = document.getElementById('btn-add-format');
    const btnCancelFormat = document.getElementById('btn-cancel-format');
    const btnBackFormat = document.getElementById('btn-back-format'); 
    const formatsMainView = document.getElementById('formats-main-view');
    const addFormatContainer = document.getElementById('add-format-container');

    function toggleFormatView(showForm) {
        if (showForm) {
            formatsMainView.classList.add('hidden');
            addFormatContainer.classList.remove('hidden');
            setDefaultAcademicYear();
        } else {
            formatsMainView.classList.remove('hidden');
            addFormatContainer.classList.add('hidden');
            document.getElementById('upload-format-form').reset();
            resetFileUploader();
        }
    }

    if (btnAddFormat) btnAddFormat.addEventListener('click', () => toggleFormatView(true));
    if (btnCancelFormat) btnCancelFormat.addEventListener('click', () => toggleFormatView(false));
    if (btnBackFormat) btnBackFormat.addEventListener('click', () => toggleFormatView(false));

    const fileInput = document.getElementById('file_input');
    const dropZone = document.getElementById('drop-zone');
    const uploadContent = document.getElementById('upload-content');
    const filePreview = document.getElementById('file-preview');
    const fileNameDisplay = document.getElementById('file-name');
    const removeFileBtn = document.getElementById('remove-file-btn');

    if (dropZone && fileInput) {
        dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('border-[#213f8c]', 'bg-blue-50/50'); });
        dropZone.addEventListener('dragleave', () => { dropZone.classList.remove('border-[#213f8c]', 'bg-blue-50/50'); });
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('border-[#213f8c]', 'bg-blue-50/50');
            if (e.dataTransfer.files.length > 0) {
                fileInput.files = e.dataTransfer.files;
                handleFileSelect(fileInput.files[0]);
            }
        });
        fileInput.addEventListener('change', function () { if (this.files.length > 0) handleFileSelect(this.files[0]); });
        removeFileBtn.addEventListener('click', (e) => { e.preventDefault(); resetFileUploader(); });
    }

    function handleFileSelect(file) {
        fileNameDisplay.textContent = file.name;
        uploadContent.classList.add('hidden');
        filePreview.classList.remove('hidden');
        filePreview.classList.add('flex');
    }

    function resetFileUploader() {
        if (fileInput) fileInput.value = '';
        if (uploadContent) uploadContent.classList.remove('hidden');
        if (filePreview) { filePreview.classList.add('hidden'); filePreview.classList.remove('flex'); }
    }

    // --- ส่วนบันทึกข้อมูลลง Database ---
    const btnSaveFormat = document.getElementById('btn-save-format');
    if (btnSaveFormat) {
        btnSaveFormat.addEventListener('click', async () => {
            const formatName = document.getElementById('format_name').value;
            const academicYear = document.getElementById('academic_year').value;
            const faculty = document.getElementById('faculty').value;
            const major = document.getElementById('major').value;

            const font = document.getElementById('rule_font').value;
            const fontSize = document.getElementById('rule_font_size').value;
            const lineSpacing = document.getElementById('rule_line_spacing').value;
            const marginLeft = document.getElementById('rule_margin_left').value;
            const marginRight = document.getElementById('rule_margin_right').value;
            const marginTop = document.getElementById('rule_margin_top').value;
            const marginBottom = document.getElementById('rule_margin_bottom').value;

            const fileInput = document.getElementById('file_input');

            if (!formatName || !academicYear || !faculty || !major || (!fileInput.files || fileInput.files.length === 0)) {
                alert('กรุณากรอกข้อมูลหลักและอัปโหลดไฟล์ให้ครบถ้วน');
                return;
            }

            const originalText = btnSaveFormat.innerHTML;
            btnSaveFormat.innerHTML = 'กำลังบันทึกและอัปโหลดไฟล์...';
            btnSaveFormat.disabled = true;

            try {
                // 1. อัปโหลดไฟล์
                const file = fileInput.files[0];
                const fileExt = file.name.split('.').pop();
                const safeFileName = `format_${Date.now()}_${Math.random().toString(36).substring(2, 6)}.${fileExt}`;

                const bucketName = 'format_templates';

                const { error: uploadError } = await supabaseClient
                    .storage
                    .from(bucketName)
                    .upload(safeFileName, file);

                if (uploadError) throw uploadError;

                const { data: publicUrlData } = supabaseClient
                    .storage
                    .from(bucketName)
                    .getPublicUrl(safeFileName);

                const filePublicUrl = publicUrlData.publicUrl;

                // 2. บันทึกข้อมูลหลัก
                const requirementsList = [
                    { category_name: 'ฟอนต์', requirement_details: font },
                    { category_name: 'ขนาดฟอนต์', requirement_details: `${fontSize} pt` },
                    { category_name: 'ระยะบรรทัด', requirement_details: lineSpacing },
                    { category_name: 'ระยะขอบ', requirement_details: `ซ้าย ${marginLeft} นิ้ว, ขวา ${marginRight} นิ้ว, บน ${marginTop} นิ้ว, ล่าง ${marginBottom} นิ้ว` }
                ];

                const { error: rpcError } = await supabaseClient.rpc('save_new_format', {
                    p_format_name: formatName,
                    p_academic_year: academicYear.toString(),
                    p_file_url: filePublicUrl,
                    p_faculty_id: parseInt(faculty),
                    p_program_id: parseInt(major),
                    p_requirements: requirementsList
                });

                if (rpcError) throw rpcError;

                alert('บันทึกมาตรฐานและอัปโหลดไฟล์สำเร็จ!');
                toggleFormatView(false);
                loadFormats();

            } catch (err) {
                console.error("Save Format Error:", err);
                alert('เกิดข้อผิดพลาด: ' + err.message);
            } finally {
                btnSaveFormat.innerHTML = originalText;
                btnSaveFormat.disabled = false;
            }
        });
    }

    loadUsersAndRoles();
    loadAuditLogs();
    loadFormats();

    loadFacultiesForForm();
    loadProgramsForForm();
});