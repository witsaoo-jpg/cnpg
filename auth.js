// CNPG System - Authentication Module
// โรงพยาบาลชลบุรี - Clinical Nursing Practice Guideline System

/**
 * Auth Class - จัดการการตรวจสอบสิทธิ์ผู้ใช้
 */
class Auth {
    constructor() {
        this.storageKey = 'cnpg_user';
        this.tokenKey = 'cnpg_token';
        this.currentUser = null;
    }
    
    /**
     * ตรวจสอบว่ามีผู้ใช้เข้าสู่ระบบหรือไม่
     * @returns {boolean}
     */
    isAuthenticated() {
        const user = localStorage.getItem(this.storageKey);
        return user !== null;
    }
    
    /**
     * ดึงข้อมูลผู้ใช้ปัจจุบัน
     * @returns {Object|null}
     */
    getCurrentUser() {
        if (this.currentUser) {
            return this.currentUser;
        }
        
        const user = localStorage.getItem(this.storageKey);
        if (user) {
            this.currentUser = JSON.parse(user);
            return this.currentUser;
        }
        return null;
    }
    
    /**
     * ตรวจสอบ Role ของผู้ใช้
     * @returns {string|null}
     */
    getUserRole() {
        const user = this.getCurrentUser();
        return user ? user.Role : null;
    }
    
    /**
     * ตรวจสอบว่าเป็น Admin หรือไม่
     * @returns {boolean}
     */
    isAdmin() {
        return this.getUserRole() === 'admin';
    }
    
    /**
     * บันทึกข้อมูลผู้ใช้หลัง Login สำเร็จ
     * @param {Object} userData - ข้อมูลผู้ใช้
     * @param {string} token - Token (ถ้ามี)
     */
    login(userData, token = null) {
        localStorage.setItem(this.storageKey, JSON.stringify(userData));
        if (token) {
            localStorage.setItem(this.tokenKey, token);
        }
        this.currentUser = userData;
    }
    
    /**
     * Logout - ลบข้อมูลผู้ใช้
     */
    logout() {
        localStorage.removeItem(this.storageKey);
        localStorage.removeItem(this.tokenKey);
        this.currentUser = null;
    }
    
    /**
     * ตรวจสอบสิทธิ์การเข้าถึงหน้า Dashboard
     */
    requireAuth() {
        if (!this.isAuthenticated()) {
            window.location.href = 'index.html';
            return false;
        }
        return true;
    }
    
    /**
     * ตรวจสอบสิทธิ์ Admin
     */
    requireAdmin() {
        if (!this.requireAuth()) {
            return false;
        }
        if (!this.isAdmin()) {
            alert('คุณไม่มีสิทธิ์เข้าถึงหน้านี้');
            window.location.href = 'dashboard.html';
            return false;
        }
        return true;
    }
    
    /**
     * ซ่อน/แสดง Element ตาม Role
     * @param {string} selector - CSS Selector
     * @param {string} requiredRole - Role ที่ต้องการ
     */
    toggleByRole(selector, requiredRole) {
        const elements = document.querySelectorAll(selector);
        const userRole = this.getUserRole();
        
        elements.forEach(el => {
            if (requiredRole === 'admin' && userRole !== 'admin') {
                el.style.display = 'none';
            } else {
                el.style.display = '';
            }
        });
    }
}

// สร้าง Instance สำหรับใช้งาน
const auth = new Auth();

/**
 * ฟังก์ชันสำหรับตรวจสอบการ Login ในหน้า Dashboard
 */
function checkAuth() {
    if (!auth.isAuthenticated()) {
        window.location.href = 'index.html';
        return false;
    }
    return true;
}

/**
 * ฟังก์ชัน Logout
 */
function doLogout() {
    if (confirm('คุณต้องการออกจากระบบหรือไม่?')) {
        auth.logout();
        window.location.href = 'index.html';
    }
}

/**
 * ฟังก์ชันแสดงข้อมูลผู้ใช้ใน UI
 * @param {HTMLElement} nameElement - Element สำหรับแสดงชื่อ
 * @param {HTMLElement} roleElement - Element สำหรับแสดง Role
 * @param {HTMLElement} avatarElement - Element สำหรับแสดง Avatar
 */
function displayUserInfo(nameElement, roleElement, avatarElement) {
    const user = auth.getCurrentUser();
    if (!user) return;
    
    if (nameElement) {
        nameElement.textContent = user.Name || user.username;
    }
    
    if (roleElement) {
        roleElement.textContent = user.Role;
    }
    
    if (avatarElement) {
        const name = user.Name || user.username;
        avatarElement.textContent = name.charAt(0).toUpperCase();
    }
}

/**
 * ฟังก์ชันตรวจสอบ Session Timeout
 * ตั้งเวลา Logout อัตโนมัติหลังจากไม่ใช้งาน
 * @param {number} minutes - จำนวนนาลีก่อน Timeout
 */
function setSessionTimeout(minutes = 30) {
    let timeout;
    
    function resetTimeout() {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            if (auth.isAuthenticated()) {
                if (confirm('Session หมดอายุ คุณต้องการเข้าสู่ระบบใหม่หรือไม่?')) {
                    auth.logout();
                    window.location.href = 'index.html';
                }
            }
        }, minutes * 60 * 1000);
    }
    
    // Reset timeout เมื่อมีกิจกรรม
    ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(event => {
        document.addEventListener(event, resetTimeout, true);
    });
    
    resetTimeout();
}

// Export สำหรับใช้งานในไฟล์อื่น
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Auth, auth, checkAuth, doLogout, displayUserInfo, setSessionTimeout };
}