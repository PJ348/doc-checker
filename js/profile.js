document.addEventListener("DOMContentLoaded", async () => {
  
    const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
    if (sessionError || !session) {
        console.error("ไม่พบข้อมูลผู้ใช้งาน (ยังไม่ได้ล็อกอิน)");
        return;
    }

    const userId = session.user.id;
    const userEmail = session.user.email;
    let currentAvatarUrl = "";

    const modalSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-320 -1280 1600 1600" width="100%" height="100%" fill="#94a3b8"><path d="M234-276q51-39 114-61.5T480-360q69 0 132 22.5T726-276q35-41 54.5-93T800-480q0-133-93.5-226.5T480-800q-133 0-226.5 93.5T160-480q0 59 19.5 111t54.5 93Zm146.5-204.5Q340-521 340-580t40.5-99.5Q421-720 480-720t99.5 40.5Q620-639 620-580t-40.5 99.5Q539-440 480-440t-99.5-40.5ZM480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm100-95.5q47-15.5 86-44.5-39-29-86-44.5T480-280q-53 0-100 15.5T294-220q39 29 86 44.5T480-160q53 0 100-15.5ZM523-537q17-17 17-43t-17-43q-17-17-43-17t-43 17q-17 17-17 43t17 43q17 17 43 17t43-17Zm-43-43Zm0 360Z" /></svg>`;
    const defaultSvgDataUrl = `data:image/svg+xml;utf8,` + encodeURIComponent(modalSvg);

    // โหลดข้อมูลและสร้าง UI โปรไฟล์
    const loadAndRenderProfile = async () => {
        // 🌟 1. เพิ่มการดึง avatar_url มาด้วย
        const { data: userData, error: userError } = await supabaseClient
            .from('users')
            .select('first_name, last_name, avatar_url') // 👈 ดึงคอลัมน์รูปโปรไฟล์มาด้วย
            .eq('user_id', userId)
            .single();

        let displayName = userEmail.split('@')[0].toUpperCase();

        if (!userError && userData) {
            displayName = `${userData.first_name || ''} ${userData.last_name || ''}`.trim();
        }

        // เช็กรูปภาพถ้ามีรูปใช้รูป ถ้าไม่มีใช้ SVG ไอคอน
        const avatarUrl = userData?.avatar_url;
        let profileDisplay = "";

        if (avatarUrl) {
            profileDisplay = `<img src="${avatarUrl}" alt="Profile" class="w-full h-full object-cover rounded-full">`;
            currentAvatarUrl = avatarUrl;
        } else {
            profileDisplay = `
                <svg xmlns="http://www.w3.org/2000/svg" height="28px" viewBox="0 -960 960 960" width="28px" fill="currentColor">
                    <path d="M234-276q51-39 114-61.5T480-360q69 0 132 22.5T726-276q35-41 54.5-93T800-480q0-133-93.5-226.5T480-800q-133 0-226.5 93.5T160-480q0 59 19.5 111t54.5 93Zm146.5-204.5Q340-521 340-580t40.5-99.5Q421-720 480-720t99.5 40.5Q620-639 620-580t-40.5 99.5Q539-440 480-440t-99.5-40.5ZM480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm100-95.5q47-15.5 86-44.5-39-29-86-44.5T480-280q-53 0-100 15.5T294-220q39 29 86 44.5T480-160q53 0 100-15.5ZM523-537q17-17 17-43t-17-43q-17-17-43-17t-43 17q-17 17-17 43t17 43q17 17 43 17t43-17Zm-43-43Zm0 360Z" />
                </svg>
            `;
            currentAvatarUrl = "";
        }

        const container = document.getElementById('profile-menu-container');
        if (!container) return;

        container.innerHTML = `
            <button id="profile-btn" 
                class="w-10 h-10 bg-[#93c5fd]/20 text-white flex items-center justify-center rounded-full hover:bg-[#93c5fd]/40 transition-colors cursor-pointer">
                ${profileDisplay}
            </button>

            <!-- Dropdown Menu -->
            <div id="profile-dropdown" class="hidden absolute right-0 mt-3 w-[320px] bg-white rounded-2xl shadow-xl border border-gray-200 z-50 p-5">
                <div class="flex justify-between items-start gap-4">
                    <div class="flex items-center gap-3">
                        <!-- รูปโปรไฟล์ด้านใน Dropdown -->
                        <div id="open-avatar-modal-btn" class="relative group w-12 h-12 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center shrink-0 overflow-hidden cursor-pointer">
                            ${profileDisplay}
                            <div class="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
                                <span class="text-white text-xs">แก้ไข</span>
                            </div>
                        </div>
                        
                        <div class="flex flex-col overflow-hidden">
                            <span class="text-[13px] font-bold text-gray-900 truncate">${displayName}</span>
                            <span class="text-[12px] text-gray-500 truncate mt-0.5">${userEmail}</span>
                        </div>
                    </div>  
                    
                        <button id="logout-btn" class="text-[12px] text-[#c81e1e] hover:text-[#8b0000] transition-colors cursor-pointer focus:outline-none">
                            ออกจากระบบ
                        </button>
                   
                </div> 
            </div>
        `;
        injectModalHTML();

        // 🌟 แก้ไขตรงนี้: ดันรูปล่าสุดเข้าไปใน Modal ทันที 🌟
        const previewImg = document.getElementById('avatar-preview');
        if (previewImg) {
            previewImg.src = currentAvatarUrl || defaultSvgDataUrl;
        }
        setupProfileEvents();
    };

    const injectModalHTML = () => {
        if (document.getElementById('avatar-modal')) return;
        const modalHTML = `
            <div id="avatar-modal" class="hidden fixed inset-0 bg-black/40 z-[100] flex items-center justify-center backdrop-blur-sm">
                <div class="bg-white rounded-[20px] w-[340px] p-6 shadow-2xl relative text-center">
                    <h2 class="text-lg font-bold text-gray-800 mb-6 text-left">แก้ไขรูปโปรไฟล์</h2>
                    
                    <div class="w-28 h-28 mx-auto rounded-full overflow-hidden border border-gray-200 bg-gray-50 flex items-center justify-center text-gray-400 mb-4">
                        <img id="avatar-preview" src="" alt="Preview" class="w-full h-full object-cover" />
                    </div>
                    
                    <label class="cursor-pointer text-sm text-gray-500 flex items-center justify-center gap-1.5 hover:text-gray-800 transition-colors mb-2">
                        <!-- ดึง SVG ออกมาอยู่นอก span เพื่อให้ gap-2 ทำงานได้ และใช้ currentColor ให้สีลิงก์กับ text-gray-600 -->
                        <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor">
                            <path d="M444-336v-342L339-573l-51-51 192-192 192 192-51 51-105-105v342h-72ZM263.72-192Q234-192 213-213.15T192-264v-72h72v72h432v-72h72v72q0 29.7-21.16 50.85Q725.68-192 695.96-192H263.72Z"/>
                        </svg>
                        <span>เลือกรูปภาพใหม่</span>
                        <input type="file" id="modal-avatar-upload" class="hidden" accept="image/jpeg, image/png, image/webp">
                    </label>
                    
                    <button id="delete-avatar-btn" class="cursor-pointer text-sm text-[#C81E1E] flex items-center justify-center gap-1.5 hover:text-[#8B0000] transition-colors w-full mb-6">
                        <!-- แยก SVG ออกมา และใช้ currentColor -->
                        <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor">
                            <path d="M312-144q-29.7 0-50.85-21.15Q240-186.3 240-216v-480h-48v-72h192v-48h192v48h192v72h-48v479.57Q720-186 698.85-165T648-144H312Zm336-552H312v480h336v-480ZM384-288h72v-336h-72v336Zm120 0h72v-336h-72v336ZM312-696v480-480Z"/>
                        </svg>
                        <span>ลบรูปภาพ</span>
                    </button>

                    <div class="flex justify-end gap-3">
                        <button id="cancel-avatar-btn" class="text-sm font-semibold px-5 py-2.5 text-gray-700 hover:bg-gray-100 rounded-xl transition-colors">ยกเลิก</button>
                        <button id="save-avatar-btn" class="text-sm font-semibold px-5 py-2.5 bg-[#213f8c] text-white rounded-xl hover:bg-[#082570] transition-colors shadow-sm">บันทึก</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    };


    // เปิดปิด Dropdown และ Logout
    const setupProfileEvents = () => {
        const profileBtn = document.getElementById('profile-btn');
        const profileDropdown = document.getElementById('profile-dropdown');
        const logoutBtn = document.getElementById('logout-btn');


        profileBtn.onclick = (e) => {
            e.stopPropagation();
            profileDropdown.classList.toggle('hidden');
        };

        window.onclick = (e) => {
            if (!profileDropdown.contains(e.target) && !profileDropdown.classList.contains('hidden')) {
                profileDropdown.classList.add('hidden');
            }
        };

        logoutBtn.onclick = async () => {
            const confirmLogout = confirm("คุณต้องการออกจากระบบใช่หรือไม่?");
            if (!confirmLogout) return;

            const { error } = await supabaseClient.auth.signOut();
            if (error) {
                alert("เกิดข้อผิดพลาดในการออกจากระบบ");
            } else {
                window.location.replace("../index.html");
            }
        };

        // แก้ไขรูปโปรไฟล์
        const modal = document.getElementById('avatar-modal');
        const previewImg = document.getElementById('avatar-preview');
        const fileInput = document.getElementById('modal-avatar-upload');
        const openAvatarBtn = document.getElementById('open-avatar-modal-btn');
        const cancelAvatarBtn = document.getElementById('cancel-avatar-btn');
        const deleteAvatarBtn = document.getElementById('delete-avatar-btn');
        const saveBtn = document.getElementById('save-avatar-btn');
        let selectedFile = null;
        let isDeleting = false;

        if (openAvatarBtn) {
            openAvatarBtn.onclick = () => {
                modal.classList.remove('hidden');
                selectedFile = null;
                isDeleting = false;
                previewImg.src = currentAvatarUrl || defaultSvgDataUrl;
                window.onclick = (e) => {
                    profileDropdown.classList.add('hidden');
                };
            };
        }

        if (cancelAvatarBtn) {
            cancelAvatarBtn.onclick = () => {
                modal.classList.add('hidden');
            };
        }

        if (modal) {
            modal.onclick = (e) => {
                if (e.target === modal) {
                    modal.classList.add('hidden');
                }
            };
        }

        if (fileInput) {
            fileInput.onchange = (e) => {
                const file = e.target.files[0];
                if (!file) return;
                selectedFile = file;
                isDeleting = false;
                previewImg.src = URL.createObjectURL(file);
            };
        }

        if (deleteAvatarBtn) {
            deleteAvatarBtn.onclick = () => {
                selectedFile = null;
                isDeleting = true;
                fileInput.value = "";
                previewImg.src = defaultSvgDataUrl;
            };
        }

        if (saveBtn) {
            saveBtn.onclick = async () => {

                // ลบรูป
                if (isDeleting) {
                    saveBtn.innerText = "กำลังลบ...";

                    if (currentAvatarUrl) {
                        const oldFileName = currentAvatarUrl.split('/').pop(); // ดึงชื่อไฟล์เก่าจากลิงก์
                        await supabaseClient.storage.from('avatars').remove([oldFileName]);
                    }

                    await supabaseClient
                        .from('users')
                        .update({ avatar_url: null })
                        .eq('user_id', userId);

                    saveBtn.innerText = "บันทึก";
                    modal.classList.add('hidden');
                    loadAndRenderProfile();
                    return;
                }

                if (!selectedFile) {
                    modal.classList.add('hidden');
                    return;
                }

                saveBtn.innerText = "กำลังอัปโหลด...";

                // เปลี่ยนรูป
                if (currentAvatarUrl) {
                    const oldFileName = currentAvatarUrl.split('/').pop();
                    await supabaseClient.storage.from('avatars').remove([oldFileName]);
                }

                const fileExt = selectedFile.name.split('.').pop();
                const fileName = `avatar-${userId}-${Date.now()}.${fileExt}`;
                const bucketName = 'avatars';

                const { error: uploadError } = await supabaseClient.storage
                    .from(bucketName)
                    .upload(fileName, selectedFile, {
                        upsert: true
                    });

                if (uploadError) {
                    alert("อัปโหลดรูปไม่สำเร็จ: " + uploadError.message);
                    saveBtn.innerText = "บันทึก";
                    return;
                }

                const { data: publicUrlData } = supabaseClient.storage
                    .from(bucketName)
                    .getPublicUrl(fileName);

                const newAvatarUrl = publicUrlData.publicUrl;

                const { error: updateError } = await supabaseClient
                    .from('users')
                    .update({ avatar_url: newAvatarUrl })
                    .eq('user_id', userId);

                if (updateError) {
                    alert("บันทึกลิงก์รูปล้มเหลว: " + updateError.message);
                    saveBtn.innerText = "บันทึก";
                    return;
                }
                saveBtn.innerText = "บันทึก";
                modal.classList.add('hidden');
                loadAndRenderProfile();

            };
        }
    };
    loadAndRenderProfile();
});

