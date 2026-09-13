const API_BASE_URL = "https://temporary-sih-5.onrender.com";

// =========================================================================
// APPLICATION STATE
// =========================================================================
const state = {
    currentRole: 'student', // 'student' | 'faculty' | 'admin'
    authMode: 'login',      // 'login' | 'register'
    currentUser: null,
    token: localStorage.getItem('token') || null,
    activeTab: 'home',

    // Data collections fetched from API
    students: [],
    faculties: [],
    assignments: [],
    attendanceRecords: [],
    activities: [],
    creditTransfers: []
};

// =========================================================================
// INITIALIZATION & ROUTING
// =========================================================================
document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    setAuthRole('student');
    
    // Auto-login check if token exists
    if (state.token) {
        verifySession();
    }
});

function setAuthRole(role) {
    state.currentRole = role;
    
    ['student', 'faculty', 'admin'].forEach(r => {
        const btn = document.getElementById(`tab-btn-${r}`);
        if (btn) {
            btn.className = r === role 
                ? 'auth-tab py-2 text-xs sm:text-sm font-medium rounded-lg transition-all bg-blue-600 text-white shadow'
                : 'auth-tab py-2 text-xs sm:text-sm font-medium rounded-lg text-slate-400 hover:text-white transition-all';
        }
    });

    const titleMap = {
        student: 'Student Portal Access',
        faculty: 'Teacher / Faculty Portal Access',
        admin: 'Administrator Portal Access'
    };
    const hintMap = {
        student: 'STU202601 (Alex Morgan)',
        faculty: 'FAC101 (Dr. Robert Vance)',
        admin: 'ADMIN-01 (System Administrator)'
    };

    document.getElementById('auth-title').innerText = titleMap[role];
    document.getElementById('demo-account-label').innerText = hintMap[role];
    
    const extraFields = document.getElementById('reg-extra-fields');
    if (extraFields) {
        role === 'student' ? extraFields.classList.remove('hidden') : extraFields.classList.add('hidden');
    }
}

function toggleAuthMode() {
    state.authMode = state.authMode === 'login' ? 'register' : 'login';
    const loginForm = document.getElementById('login-form');
    const regForm = document.getElementById('register-form');
    const toggleBtn = document.getElementById('auth-toggle-btn');

    if (state.authMode === 'register') {
        loginForm.classList.add('hidden');
        regForm.classList.remove('hidden');
        toggleBtn.innerText = 'Existing User? Login';
    } else {
        loginForm.classList.remove('hidden');
        regForm.classList.add('hidden');
        toggleBtn.innerText = 'New Registration?';
    }
}

// =========================================================================
// API HELPERS & AUTHENTICATION
// =========================================================================
async function apiRequest(endpoint, method = 'GET', body = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (state.token) {
        headers['Authorization'] = `Bearer ${state.token}`;
    }

    const config = { method, headers };
    if (body) config.body = JSON.stringify(body);

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'API Request failed');
        return data;
    } catch (err) {
        console.error(`API Error (${endpoint}):`, err);
        alert(`Error: ${err.message}`);
        throw err;
    }
}

async function verifySession() {
    try {
        const user = await apiRequest('/api/auth/me');
        state.currentUser = user;
        state.currentRole = user.role || state.currentRole;
        state.activeTab = state.currentRole === 'student' ? 'home' : 'dashboard';
        await loadInitialData();
        launchApp();
    } catch {
        handleLogout();
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email')?.value || 'alex.m@univ.edu';
    const password = document.getElementById('login-password')?.value || 'password';

    try {
        const res = await apiRequest('/api/auth/login', 'POST', {
            email,
            password,
            role: state.currentRole
        });

        state.token = res.token || 'demo-token';
        state.currentUser = res.user;
        localStorage.setItem('token', state.token);

        state.activeTab = state.currentRole === 'student' ? 'home' : 'dashboard';
        await loadInitialData();
        launchApp();
    } catch (err) {
        // Fallback for development if backend API isn't fully set up yet
        console.warn("Backend auth unavailable. Using offline state.");
        state.currentUser = { name: 'Demo User', email, role: state.currentRole, id: 'STU202601' };
        launchApp();
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const payload = {
        name: document.getElementById('reg-name').value,
        email: document.getElementById('reg-email').value,
        department: document.getElementById('reg-dept').value,
        role: state.currentRole,
        program: document.getElementById('reg-program')?.value || 'B.S. General',
        semester: parseInt(document.getElementById('reg-semester')?.value) || 1
    };

    try {
        const res = await apiRequest('/api/auth/register', 'POST', payload);
        state.token = res.token;
        state.currentUser = res.user;
        localStorage.setItem('token', state.token);
        
        alert('Registration Successful!');
        await loadInitialData();
        launchApp();
    } catch (err) {
        console.warn("Backend register failed.");
    }
}

async function loadInitialData() {
    try {
        const [assignments, activities, transfers, attendance] = await Promise.all([
            apiRequest('/api/assignments').catch(() => []),
            apiRequest('/api/activities').catch(() => []),
            apiRequest('/api/credit-transfers').catch(() => []),
            apiRequest('/api/attendance').catch(() => [])
        ]);

        state.assignments = assignments.length ? assignments : state.assignments;
        state.activities = activities.length ? activities : state.activities;
        state.creditTransfers = transfers.length ? transfers : state.creditTransfers;
        state.attendanceRecords = attendance.length ? attendance : state.attendanceRecords;
    } catch (err) {
        console.error("Failed loading backend data", err);
    }
}

function launchApp() {
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('app-header').classList.remove('hidden');
    document.getElementById('app-viewport').classList.remove('hidden');

    document.getElementById('role-badge').innerText = state.currentRole.toUpperCase();
    document.getElementById('header-user-name').innerText = state.currentUser?.name || 'User';
    document.getElementById('header-user-sub').innerText = state.currentUser?.department || 'Admin Office';
    document.getElementById('header-avatar').innerText = state.currentUser?.avatar || 'US';

    renderRoleNavigation();
    renderView();
    lucide.createIcons();
}

function handleLogout() {
    localStorage.removeItem('token');
    state.token = null;
    state.currentUser = null;
    state.authMode = 'login';
    
    document.getElementById('auth-screen').classList.remove('hidden');
    document.getElementById('app-header').classList.add('hidden');
    document.getElementById('app-viewport').classList.add('hidden');
    document.getElementById('register-form').classList.add('hidden');
    document.getElementById('login-form').classList.remove('hidden');
}

// =========================================================================
// NAVIGATION & VIEW ROUTER
// =========================================================================
function renderRoleNavigation() {
    const nav = document.getElementById('role-nav');
    let tabs = [];

    if (state.currentRole === 'student') {
        tabs = [
            { id: 'home', label: 'Home Dashboard', icon: 'layout-dashboard' },
            { id: 'assignments', label: 'Assignments', icon: 'file-text' },
            { id: 'attendance', label: 'Attendance', icon: 'calendar-check' },
            { id: 'credits', label: 'Credits & Transfer', icon: 'award' },
            { id: 'activity', label: 'Activity Record', icon: 'activity' },
            { id: 'progress', label: 'Academic Progress', icon: 'line-chart' },
            { id: 'profile', label: 'Student Profile', icon: 'user' }
        ];
    } else if (state.currentRole === 'faculty') {
        tabs = [
            { id: 'dashboard', label: 'Faculty Dashboard', icon: 'layout-dashboard' },
            { id: 'assignments', label: 'Assignment Management', icon: 'file-edit' },
            { id: 'attendance', label: 'Mark Attendance', icon: 'check-square' },
            { id: 'students', label: 'Student Directory', icon: 'users' },
            { id: 'profile', label: 'Faculty Profile', icon: 'user-check' }
        ];
    } else if (state.currentRole === 'admin') {
        tabs = [
            { id: 'dashboard', label: 'Admin Overview', icon: 'layout-dashboard' },
            { id: 'students', label: 'Student Roster', icon: 'users' },
            { id: 'transfers', label: 'Credit Transfer Requests', icon: 'arrow-right-left' },
            { id: 'academics', label: 'Courses & Departments', icon: 'book-open' },
            { id: 'reports', label: 'System Analytics', icon: 'bar-chart-3' }
        ];
    }

    nav.innerHTML = tabs.map(tab => `
        <button onclick="switchTab('${tab.id}')" class="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${state.activeTab === tab.id ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}">
            <i data-lucide="${tab.icon}" class="w-4 h-4"></i>
            <span>${tab.label}</span>
        </button>
    `).join('');

    lucide.createIcons();
}

function switchTab(tabId) {
    state.activeTab = tabId;
    renderRoleNavigation();
    renderView();
}

function renderView() {
    const container = document.getElementById('view-container');
    
    if (state.currentRole === 'student') {
        switch(state.activeTab) {
            case 'home': container.innerHTML = renderStudentDashboard(); break;
            case 'assignments': container.innerHTML = renderStudentAssignments(); break;
            case 'attendance': container.innerHTML = renderStudentAttendance(); break;
            case 'credits': container.innerHTML = renderStudentCredits(); break;
            case 'activity': container.innerHTML = renderStudentActivities(); break;
            case 'progress': container.innerHTML = renderStudentProgress(); break;
            case 'profile': container.innerHTML = renderStudentProfile(); break;
            default: container.innerHTML = renderStudentDashboard();
        }
    } else if (state.currentRole === 'faculty') {
        switch(state.activeTab) {
            case 'dashboard': container.innerHTML = renderFacultyDashboard(); break;
            case 'assignments': container.innerHTML = renderFacultyAssignments(); break;
            case 'attendance': container.innerHTML = renderFacultyAttendance(); break;
            case 'students': container.innerHTML = renderStudentDirectory(); break;
            case 'profile': container.innerHTML = renderFacultyProfile(); break;
            default: container.innerHTML = renderFacultyDashboard();
        }
    } else if (state.currentRole === 'admin') {
        switch(state.activeTab) {
            case 'dashboard': container.innerHTML = renderAdminDashboard(); break;
            case 'students': container.innerHTML = renderStudentDirectory(); break;
            case 'transfers': container.innerHTML = renderAdminTransfers(); break;
            case 'academics': container.innerHTML = renderAdminAcademics(); break;
            case 'reports': container.innerHTML = renderAdminReports(); break;
            default: container.innerHTML = renderAdminDashboard();
        }
    }
    lucide.createIcons();
}

// =========================================================================
// ACTION HANDLERS (API INTEGRATED)
// =========================================================================
async function submitAssignment(e, id) {
    e.preventDefault();
    try {
        await apiRequest(`/api/assignments/${id}/submit`, 'POST', {
            comments: e.target.querySelector('textarea')?.value || ''
        });
        const asn = state.assignments.find(a => a.id === id);
        if (asn) asn.status = 'Submitted';
        closeModal();
        renderView();
        alert('Assignment successfully submitted!');
    } catch (err) {
        console.warn("Falling back to local state update.");
        const asn = state.assignments.find(a => a.id === id);
        if (asn) asn.status = 'Submitted';
        closeModal();
        renderView();
    }
}

async function submitCreditTransfer(e) {
    e.preventDefault();
    const payload = {
        sourceInst: document.getElementById('trf-source').value,
        destInst: 'EduPulse Univ',
        course: document.getElementById('trf-course').value,
        credits: parseInt(document.getElementById('trf-credits').value),
        grade: document.getElementById('trf-grade').value,
        status: 'Pending',
        requestDate: new Date().toISOString().split('T')[0]
    };

    try {
        const newTrf = await apiRequest('/api/credit-transfers', 'POST', payload);
        state.creditTransfers.push(newTrf);
    } catch {
        state.creditTransfers.push({ id: 'TRF-' + Date.now(), studentId: state.currentUser.id, ...payload });
    }
    closeModal();
    renderView();
    alert('Transfer request submitted successfully!');
}

async function saveActivity(e) {
    e.preventDefault();
    const payload = {
        title: document.getElementById('act-title').value,
        category: document.getElementById('act-cat').value,
        date: document.getElementById('act-date').value,
        organization: document.getElementById('act-org').value,
        description: document.getElementById('act-desc').value,
        certificateStatus: 'Pending Verification'
    };

    try {
        const newAct = await apiRequest('/api/activities', 'POST', payload);
        state.activities.unshift(newAct);
    } catch {
        state.activities.unshift({ id: 'ACT-' + Date.now(), ...payload });
    }
    closeModal();
    renderView();
}

async function saveNewAssignment(e) {
    e.preventDefault();
    const payload = {
        title: document.getElementById('asn-new-title').value,
        subject: document.getElementById('asn-new-subject').value,
        faculty: state.currentUser.name,
        dueDate: document.getElementById('asn-new-date').value,
        description: document.getElementById('asn-new-desc').value,
        status: 'Pending',
        marks: 'N/A',
        feedback: ''
    };

    try {
        const created = await apiRequest('/api/assignments', 'POST', payload);
        state.assignments.unshift(created);
    } catch {
        state.assignments.unshift({ id: 'ASN-' + Date.now(), ...payload });
    }
    closeModal();
    renderView();
}

async function saveGrade(e, id) {
    e.preventDefault();
    const marks = document.getElementById('grade-val').value;
    const feedback = document.getElementById('grade-feedback').value;

    try {
        await apiRequest(`/api/assignments/${id}/grade`, 'PUT', { marks, feedback });
    } catch {
        // Local state fallback
    }
    
    const asn = state.assignments.find(a => a.id === id);
    if (asn) {
        asn.marks = marks;
        asn.feedback = feedback;
        asn.status = 'Graded';
    }
    closeModal();
    renderView();
}

async function updateTransferStatus(id, status) {
    try {
        await apiRequest(`/api/credit-transfers/${id}/status`, 'PATCH', { status });
    } catch {
        // Fallback local update
    }
    
    const t = state.creditTransfers.find(item => item.id === id);
    if (t) {
        t.status = status;
        if (status === 'Approved') {
            const s = state.students.find(st => st.id === t.studentId);
            if (s) s.totalCredits += t.credits;
        }
    }
    renderView();
}

// =========================================================================
// UI TEMPLATE RENDERERS (STUDENT / FACULTY / ADMIN)
// =========================================================================
function renderStudentDashboard() {
    const s = state.currentUser || {};
    const pendingAsn = state.assignments.filter(a => a.status === 'Pending').length;
    
    return `
        <div class="space-y-6">
            <div class="bg-gradient-to-r from-blue-700 to-indigo-800 text-white rounded-2xl p-6 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div class="flex items-center gap-4">
                    <div class="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center text-2xl font-bold">
                        ${s.avatar || 'AM'}
                    </div>
                    <div>
                        <h1 class="text-2xl font-bold">Welcome back, ${s.name || 'Alex Morgan'}!</h1>
                        <p class="text-blue-200 text-sm mt-0.5">${s.program || 'B.S. Software Engineering'} • Semester ${s.semester || 6} (${s.id || 'STU202601'})</p>
                    </div>
                </div>
                <div class="flex gap-2">
                    <button onclick="switchTab('assignments')" class="bg-white/10 hover:bg-white/20 text-white border border-white/20 px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2">
                        <i data-lucide="file-text" class="w-4 h-4"></i> View Assignments
                    </button>
                    <button onclick="switchTab('profile')" class="bg-white text-blue-900 hover:bg-blue-50 px-4 py-2 rounded-xl text-sm font-semibold transition-all">
                        Edit Profile
                    </button>
                </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div onclick="switchTab('attendance')" class="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-all cursor-pointer">
                    <div class="flex justify-between items-center text-slate-500 mb-2">
                        <span class="text-xs font-semibold uppercase tracking-wider">Attendance</span>
                        <i data-lucide="calendar-check" class="w-5 h-5 text-emerald-600"></i>
                    </div>
                    <div class="text-2xl font-bold text-slate-800">${s.attendancePct || 88.5}%</div>
                    <div class="mt-2 w-full bg-slate-100 rounded-full h-2">
                        <div class="bg-emerald-500 h-2 rounded-full" style="width: ${s.attendancePct || 88.5}%"></div>
                    </div>
                </div>

                <div onclick="switchTab('progress')" class="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-all cursor-pointer">
                    <div class="flex justify-between items-center text-slate-500 mb-2">
                        <span class="text-xs font-semibold uppercase tracking-wider">Academic CGPA</span>
                        <i data-lucide="award" class="w-5 h-5 text-blue-600"></i>
                    </div>
                    <div class="text-2xl font-bold text-slate-800">${s.cgpa || 3.82} / 4.00</div>
                    <p class="text-xs text-blue-600 font-medium mt-3">Class Rank: Top 5%</p>
                </div>

                <div onclick="switchTab('assignments')" class="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-all cursor-pointer">
                    <div class="flex justify-between items-center text-slate-500 mb-2">
                        <span class="text-xs font-semibold uppercase tracking-wider">Pending Tasks</span>
                        <i data-lucide="clock" class="w-5 h-5 text-amber-500"></i>
                    </div>
                    <div class="text-2xl font-bold text-slate-800">${pendingAsn} Items</div>
                </div>

                <div onclick="switchTab('credits')" class="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-all cursor-pointer">
                    <div class="flex justify-between items-center text-slate-500 mb-2">
                        <span class="text-xs font-semibold uppercase tracking-wider">Credits</span>
                        <i data-lucide="book-open" class="w-5 h-5 text-indigo-600"></i>
                    </div>
                    <div class="text-2xl font-bold text-slate-800">${s.totalCredits || 88} / 120</div>
                </div>
            </div>
        </div>
    `;
}

function renderStudentAssignments() {
    return `
        <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 class="text-xl font-bold text-slate-800">Assignment Tracker</h2>
                    <p class="text-slate-500 text-sm">View, submit, and track feedback for all active coursework.</p>
                </div>
            </div>
            <div id="student-assignments-list" class="grid grid-cols-1 md:grid-cols-2 gap-4">
                ${renderAssignmentCards(state.assignments)}
            </div>
        </div>
    `;
}

function renderAssignmentCards(list) {
    return list.map(a => `
        <div class="p-5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:shadow-md transition-all flex flex-col justify-between gap-4">
            <div>
                <div class="flex justify-between items-start gap-2 mb-2">
                    <span class="px-2.5 py-1 text-xs font-bold rounded-full ${a.status === 'Pending' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}">${a.status}</span>
                    <span class="text-xs font-medium text-slate-500">Due: ${a.dueDate}</span>
                </div>
                <h3 class="font-bold text-slate-800 text-base mb-1">${a.title}</h3>
                <p class="text-xs font-semibold text-blue-600 mb-2">${a.subject}</p>
                <p class="text-xs text-slate-600">${a.description}</p>
            </div>
            <button onclick="openSubmitModal('${a.id}')" class="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors">
                ${a.status === 'Pending' ? 'Submit Work' : 'View Submission Details'}
            </button>
        </div>
    `).join('');
}

function renderStudentAttendance() { return `<div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200"><h2 class="text-xl font-bold">Attendance Records</h2></div>`; }
function renderStudentCredits() { return `<div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200"><h2 class="text-xl font-bold">Credits & Transfer</h2></div>`; }
function renderStudentActivities() { return `<div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200"><h2 class="text-xl font-bold">Activities Timeline</h2></div>`; }
function renderStudentProgress() { return `<div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200"><h2 class="text-xl font-bold">Academic Progress</h2></div>`; }
function renderStudentProfile() { return `<div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200"><h2 class="text-xl font-bold">Student Profile</h2></div>`; }
function renderFacultyDashboard() { return `<div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200"><h2 class="text-xl font-bold">Faculty Portal</h2></div>`; }
function renderFacultyAssignments() { return `<div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200"><h2 class="text-xl font-bold">Assignments Management</h2></div>`; }
function renderFacultyAttendance() { return `<div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200"><h2 class="text-xl font-bold">Mark Attendance</h2></div>`; }
function renderStudentDirectory() { return `<div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200"><h2 class="text-xl font-bold">Student Roster</h2></div>`; }
function renderFacultyProfile() { return `<div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200"><h2 class="text-xl font-bold">Faculty Profile</h2></div>`; }
function renderAdminDashboard() { return `<div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200"><h2 class="text-xl font-bold">Admin Dashboard</h2></div>`; }
function renderAdminTransfers() { return `<div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200"><h2 class="text-xl font-bold">HEI Credit Requests</h2></div>`; }
function renderAdminAcademics() { return `<div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200"><h2 class="text-xl font-bold">Academic Setup</h2></div>`; }
function renderAdminReports() { return `<div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200"><h2 class="text-xl font-bold">Analytics & Reports</h2></div>`; }

// =========================================================================
// UTILITIES
// =========================================================================
function openModal(contentHtml) {
    const modal = document.getElementById('modal-backdrop');
    const body = document.getElementById('modal-content');
    if (modal && body) {
        body.innerHTML = contentHtml;
        modal.classList.remove('hidden');
        lucide.createIcons();
    }
}

function closeModal() {
    const modal = document.getElementById('modal-backdrop');
    if (modal) modal.classList.add('hidden');
}
