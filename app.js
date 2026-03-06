// CNPG System - Application Module
// โรงพยาบาลชลบุรี - Clinical Nursing Practice Guideline System

/**
 * App Class - จัดการหลักการทำงานของระบบ
 */
class App {
    constructor() {
        this.gasUrl = 'https://script.google.com/macros/s/AKfycbx5u9vEesY18yBkXt-oIqw_QD1yeOmig9GWB9THxcGUNJaIfQRNUzlf17CtP9v7LFIt/exec';
        this.guidelines = [];
        this.departments = [];
        this.currentUser = null;
    }
    
    /**
     * เริ่มต้นระบบ
     */
    async init() {
        this.currentUser = JSON.parse(localStorage.getItem('cnpg_user'));
        if (!this.currentUser) {
            window.location.href = 'index.html';
            return;
        }
        
        await this.loadDepartments();
        await this.loadGuidelines();
        this.setupEventListeners();
        this.updateUI();
    }
    
    /**
     * เรียก API จาก Google Apps Script
     * @param {string} action - ชื่อ Action
     * @param {Object} data - ข้อมูลที่จะส่ง
     * @returns {Promise<Object>}
     */
    async callAPI(action, data = {}) {
        try {
            const response = await fetch(this.gasUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: action,
                    ...data
                })
            });
            
            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }
    
    /**
     * โหลดรายการแผนก
     */
    async loadDepartments() {
        try {
            const result = await this.callAPI('getDepartments');
            if (result.success) {
                this.departments = result.data;
            }
        } catch (error) {
            this.showToast('ไม่สามารถโหลดข้อมูลแผนกได้', 'danger');
        }
    }
    
    /**
     * โหลดรายการ Guidelines
     */
    async loadGuidelines() {
        try {
            const result = await this.callAPI('getGuidelines');
            if (result.success) {
                this.guidelines = result.data;
                this.updateStats();
                this.renderGuidelineTable();
            }
        } catch (error) {
            this.showToast('ไม่สามารถโหลดข้อมูล Guidelines ได้', 'danger');
        }
    }
    
    /**
     * อัปเดตสถิติ
     */
    updateStats() {
        const stats = {
            guidelines: this.guidelines.filter(g => g.Category === 'Guideline').length,
            protocols: this.guidelines.filter(g => g.Category === 'Protocol').length,
            sops: this.guidelines.filter(g => g.Category === 'SOP').length
        };
        
        this.animateCounter('totalGuidelines', stats.guidelines);
        this.animateCounter('totalProtocols', stats.protocols);
        this.animateCounter('totalSOP', stats.sops);
    }
    
    /**
     * Animate ตัวเลข
     * @param {string} elementId - ID ของ Element
     * @param {number} target - ตัวเลขเป้าหมาย
     */
    animateCounter(elementId, target) {
        const element = document.getElementById(elementId);
        if (!element) return;
        
        const duration = 1000;
        const start = 0;
        const increment = target / (duration / 16);
        let current = start;
        
        const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
                element.textContent = target;
                clearInterval(timer);
            } else {
                element.textContent = Math.floor(current);
            }
        }, 16);
    }
    
    /**
     * แสดงตาราง Guidelines
     * @param {Array} data - ข้อมูลที่จะแสดง
     */
    renderGuidelineTable(data = this.guidelines) {
        const tbody = document.getElementById('guidelineTableBody');
        if (!tbody) return;
        
        if (data.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center py-5">
                        <i class="bi bi-inbox" style="font-size: 3rem; color: #cbd5e1;"></i>
                        <p class="mt-3 text-muted">ไม่พบข้อมูล</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        const isAdmin = this.currentUser.Role === 'admin';
        
        tbody.innerHTML = data.map(item => `
            <tr>
                <td><code>${item.ID}</code></td>
                <td>${this.escapeHtml(item.Title)}</td>
                <td>
                    <span class="badge badge-category badge-${item.Category.toLowerCase()}">${item.Category}</span>
                </td>
                <td>${this.escapeHtml(item.GroupName)}</td>
                <td>${this.escapeHtml(item.DepartmentName)}</td>
                <td>${this.formatDate(item.Created_Date)}</td>
                <td>
                    <a href="${item.PDF_Link}" target="_blank" class="btn btn-action btn-view">
                        <i class="bi bi-file-earmark-pdf"></i> เปิด PDF
                    </a>
                </td>
                ${isAdmin ? `
                <td>
                    <button class="btn btn-action btn-edit" onclick="app.showEditModal('${item.ID}')">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-action btn-delete" onclick="app.showDeleteModal('${item.ID}')">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
                ` : ''}
            </tr>
        `).join('');
    }
    
    /**
     * ค้นหา Guidelines
     */
    searchGuidelines() {
        const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
        const category = document.getElementById('filterCategory')?.value || '';
        const group = document.getElementById('filterGroup')?.value || '';
        
        let filtered = this.guidelines;
        
        if (searchTerm) {
            filtered = filtered.filter(item => 
                item.Title.toLowerCase().includes(searchTerm) ||
                item.DepartmentName.toLowerCase().includes(searchTerm) ||
                item.Category.toLowerCase().includes(searchTerm)
            );
        }
        
        if (category) {
            filtered = filtered.filter(item => item.Category === category);
        }
        
        if (group) {
            filtered = filtered.filter(item => item.GroupName === group);
        }
        
        this.renderGuidelineTable(filtered);
    }
    
    /**
     * แสดง Modal เพิ่ม Guideline
     */
    showAddModal() {
        document.getElementById('modalTitle').innerHTML = '<i class="bi bi-plus-lg me-2"></i>เพิ่ม Guideline ใหม่';
        document.getElementById('guidelineForm').reset();
        document.getElementById('guidelineId').value = '';
        
        const modal = new bootstrap.Modal(document.getElementById('guidelineModal'));
        modal.show();
    }
    
    /**
     * แสดง Modal แก้ไข Guideline
     * @param {string} id - ID ของ Guideline
     */
    showEditModal(id) {
        const item = this.guidelines.find(g => g.ID === id);
        if (!item) return;
        
        document.getElementById('modalTitle').innerHTML = '<i class="bi bi-pencil me-2"></i>แก้ไข Guideline';
        document.getElementById('guidelineId').value = item.ID;
        document.getElementById('formTitle').value = item.Title;
        document.getElementById('formCategory').value = item.Category;
        document.getElementById('formGroupName').value = item.GroupName;
        document.getElementById('formDepartmentCode').value = item.DepartmentCode;
        document.getElementById('formDepartmentName').value = item.DepartmentName;
        document.getElementById('formPdfLink').value = item.PDF_Link;
        
        const modal = new bootstrap.Modal(document.getElementById('guidelineModal'));
        modal.show();
    }
    
    /**
     * แสดง Modal ยืนยันการลบ
     * @param {string} id - ID ของ Guideline
     */
    showDeleteModal(id) {
        document.getElementById('deleteGuidelineId').value = id;
        const modal = new bootstrap.Modal(document.getElementById('deleteModal'));
        modal.show();
    }
    
    /**
     * บันทึก Guideline (เพิ่ม/แก้ไข)
     */
    async saveGuideline() {
        const id = document.getElementById('guidelineId').value;
        const title = document.getElementById('formTitle').value.trim();
        const category = document.getElementById('formCategory').value;
        const groupName = document.getElementById('formGroupName').value;
        const deptCode = document.getElementById('formDepartmentCode').value;
        const deptName = document.getElementById('formDepartmentName').value;
        const pdfLink = document.getElementById('formPdfLink').value.trim();
        
        if (!title || !category || !groupName || !deptCode || !pdfLink) {
            this.showToast('กรุณากรอกข้อมูลให้ครบถ้วน', 'warning');
            return;
        }
        
        this.showLoading(true, id ? 'กำลังแก้ไข...' : 'กำลังบันทึก...');
        
        try {
            const action = id ? 'updateGuideline' : 'addGuideline';
            const result = await this.callAPI(action, {
                data: {
                    ID: id || this.generateId(),
                    Title: title,
                    Category: category,
                    GroupName: groupName,
                    DepartmentCode: deptCode,
                    DepartmentName: deptName,
                    PDF_Link: pdfLink,
                    Created_Date: id ? this.guidelines.find(g => g.ID === id)?.Created_Date : new Date().toISOString().split('T')[0],
                    Created_By: this.currentUser.username
                }
            });
            
            if (result.success) {
                this.showToast(id ? 'แก้ไขข้อมูลสำเร็จ' : 'เพิ่มข้อมูลสำเร็จ', 'success');
                bootstrap.Modal.getInstance(document.getElementById('guidelineModal')).hide();
                await this.loadGuidelines();
            } else {
                this.showToast(result.message || 'เกิดข้อผิดพลาด', 'danger');
            }
        } catch (error) {
            this.showToast('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', 'danger');
        } finally {
            this.showLoading(false);
        }
    }
    
    /**
     * ยืนยันการลบ Guideline
     */
    async confirmDelete() {
        const id = document.getElementById('deleteGuidelineId').value;
        
        this.showLoading(true, 'กำลังลบ...');
        
        try {
            const result = await this.callAPI('deleteGuideline', { id: id });
            
            if (result.success) {
                this.showToast('ลบข้อมูลสำเร็จ', 'success');
                bootstrap.Modal.getInstance(document.getElementById('deleteModal')).hide();
                await this.loadGuidelines();
            } else {
                this.showToast(result.message || 'เกิดข้อผิดพลาด', 'danger');
            }
        } catch (error) {
            this.showToast('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', 'danger');
        } finally {
            this.showLoading(false);
        }
    }
    
    /**
     * โหลดแผนกตามกลุ่มงาน
     */
    loadDepartmentsByGroup() {
        const groupName = document.getElementById('formGroupName')?.value;
        const deptSelect = document.getElementById('formDepartmentCode');
        
        if (!deptSelect) return;
        
        deptSelect.innerHTML = '<option value="">เลือกแผนก</option>';
        
        const filtered = this.departments.filter(d => d.GroupName === groupName);
        filtered.forEach(dept => {
            const option = document.createElement('option');
            option.value = dept.DepartmentCode;
            option.textContent = `${dept.DepartmentCode} - ${dept.DepartmentName}`;
            deptSelect.appendChild(option);
        });
    }
    
    /**
     * Auto-fill ชื่อแผนก
     */
    autoFillDeptName() {
        const deptCode = document.getElementById('formDepartmentCode')?.value;
        const dept = this.departments.find(d => d.DepartmentCode === deptCode);
        
        if (dept && document.getElementById('formDepartmentName')) {
            document.getElementById('formDepartmentName').value = dept.DepartmentName;
        }
    }
    
    /**
     * Setup Event Listeners
     */
    setupEventListeners() {
        // Search
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.searchGuidelines();
            });
        }
        
        // Filter change
        const filterCategory = document.getElementById('filterCategory');
        const filterGroup = document.getElementById('filterGroup');
        
        if (filterCategory) {
            filterCategory.addEventListener('change', () => this.searchGuidelines());
        }
        
        if (filterGroup) {
            filterGroup.addEventListener('change', () => this.searchGuidelines());
        }
        
        // Form events
        const formGroupName = document.getElementById('formGroupName');
        if (formGroupName) {
            formGroupName.addEventListener('change', () => this.loadDepartmentsByGroup());
        }
        
        const formDeptCode = document.getElementById('formDepartmentCode');
        if (formDeptCode) {
            formDeptCode.addEventListener('change', () => this.autoFillDeptName());
        }
    }
    
    /**
     * อัปเดต UI ตาม Role
     */
    updateUI() {
        const isAdmin = this.currentUser.Role === 'admin';
        
        // Update user info
        const userName = document.getElementById('userName');
        const userRole = document.getElementById('userRole');
        const userAvatar = document.getElementById('userAvatar');
        
        if (userName) userName.textContent = this.currentUser.Name || this.currentUser.username;
        if (userRole) userRole.textContent = this.currentUser.Role;
        if (userAvatar) {
            const name = this.currentUser.Name || this.currentUser.username;
            userAvatar.textContent = name.charAt(0).toUpperCase();
        }
        
        // Show/hide admin elements
        document.querySelectorAll('.admin-only').forEach(el => {
            el.style.display = isAdmin ? '' : 'none';
        });
    }
    
    /**
     * แสดง Loading Overlay
     * @param {boolean} show - แสดงหรือไม่
     * @param {string} text - ข้อความ
     */
    showLoading(show, text = 'กำลังโหลด...') {
        const overlay = document.getElementById('loadingOverlay');
        const loadingText = document.getElementById('loadingText');
        
        if (overlay) {
            overlay.classList.toggle('active', show);
        }
        if (loadingText) {
            loadingText.textContent = text;
        }
    }
    
    /**
     * แสดง Toast Notification
     * @param {string} message - ข้อความ
     * @param {string} type - ประเภท (success, danger, warning, info)
     */
    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        if (!container) return;
        
        const icons = {
            success: 'bi-check-circle-fill',
            danger: 'bi-exclamation-triangle-fill',
            warning: 'bi-exclamation-circle-fill',
            info: 'bi-info-circle-fill'
        };
        
        const colors = {
            success: 'bg-success',
            danger: 'bg-danger',
            warning: 'bg-warning',
            info: 'bg-primary'
        };
        
        const toast = document.createElement('div');
        toast.className = `toast show align-items-center text-white ${colors[type]}`;
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">
                    <i class="bi ${icons[type]} me-2"></i>${this.escapeHtml(message)}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        `;
        
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }
    
    /**
     * Generate ID ใหม่
     * @returns {string}
     */
    generateId() {
        const num = Date.now().toString().slice(-4);
        return `GUIDE-${num}`;
    }
    
    /**
     * Format วันที่
     * @param {string} dateStr - วันที่ในรูปแบบ string
     * @returns {string}
     */
    formatDate(dateStr) {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        return date.toLocaleDateString('th-TH', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }
    
    /**
     * Escape HTML เพื่อป้องกัน XSS
     * @param {string} text - ข้อความ
     * @returns {string}
     */
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    /**
     * Logout
     */
    logout() {
        if (confirm('คุณต้องการออกจากระบบหรือไม่?')) {
            localStorage.removeItem('cnpg_user');
            localStorage.removeItem('cnpg_token');
            window.location.href = 'index.html';
        }
    }
}

// สร้าง Instance สำหรับใช้งาน
const app = new App();

// เริ่มต้นระบบเมื่อ DOM พร้อม
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});

// Export สำหรับใช้งานในไฟล์อื่น
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { App, app };
}
// ตัวแปรสำหรับเก็บข้อมูลแผนกทั้งหมด
let allDepartments = [];

// 1. ฟังก์ชันดึงข้อมูลแผนกจากฐานข้อมูล (Google Sheet)
async function loadDepartments() {
    try {
        const response = await fetch(GAS_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'getDepartments' })
        });
        const result = await response.json();
        
        if (result.success) {
            allDepartments = result.data;
            populateGroupDropdown(); // พอได้ข้อมูลมาแล้ว สั่งให้วาด Dropdown กลุ่มงาน
        }
    } catch (error) {
        console.error('ดึงข้อมูลแผนกไม่สำเร็จ:', error);
    }
}

// 2. ฟังก์ชันใส่ข้อมูลลงใน Dropdown "กลุ่มงาน"
function populateGroupDropdown() {
    // ⚠️ ต้องเช็คว่า ID ของ select ตรงกับใน HTML ไหม (สมมติว่าชื่อ id="groupName")
    const groupSelect = document.getElementById('groupName'); 
    if (!groupSelect) return;

    // กรองเอาเฉพาะชื่อกลุ่มงานที่ไม่ซ้ำกัน
    const groups = [...new Set(allDepartments.map(item => item.GroupName))];
    
    groupSelect.innerHTML = '<option value="">-- เลือกกลุ่มงาน --</option>';
    groups.forEach(group => {
        if(group) {
            groupSelect.innerHTML += `<option value="${group}">${group}</option>`;
        }
    });
}

// 3. ฟังก์ชันใส่ข้อมูลลงใน Dropdown "หอผู้ป่วย" (จะเปลี่ยนตามกลุ่มงานที่เลือก)
function populateDepartmentDropdown(selectedGroup) {
    // ⚠️ ต้องเช็คว่า ID ของ select ตรงกับใน HTML ไหม (สมมติว่าชื่อ id="departmentCode")
    const deptSelect = document.getElementById('departmentCode'); 
    if (!deptSelect) return;

    deptSelect.innerHTML = '<option value="">-- เลือกหอผู้ป่วย --</option>';
    
    // กรองเอาเฉพาะหอผู้ป่วยที่อยู่ในกลุ่มงานที่เลือก
    const filteredDepts = allDepartments.filter(item => item.GroupName === selectedGroup);
    
    filteredDepts.forEach(dept => {
        // ให้ Value เป็นรหัส และ Text เป็นชื่อหอผู้ป่วย
        deptSelect.innerHTML += `<option value="${dept.DepartmentCode}">${dept.DepartmentName} (รหัส: ${dept.DepartmentCode})</option>`;
    });
}

// 4. สั่งให้ทำงานเมื่อหน้าเว็บโหลดเสร็จ และเมื่อมีการเปลี่ยนกลุ่มงาน
document.addEventListener('DOMContentLoaded', function() {
    // เรียกใช้ฟังก์ชันดึงข้อมูลแผนกตอนเปิดหน้าเว็บ
    loadDepartments(); 
    
    // ดักจับเหตุการณ์เมื่อผู้ใช้เลือก "กลุ่มงาน" ให้เปลี่ยนรายชื่อ "หอผู้ป่วย" ให้ตรงกัน
    const groupSelectElement = document.getElementById('groupName');
    if(groupSelectElement) {
        groupSelectElement.addEventListener('change', function(e) {
            populateDepartmentDropdown(e.target.value);
        });
    }
});