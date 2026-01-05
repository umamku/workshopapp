import React, { useState, useEffect, useRef } from 'react';
import { BookOpen, CheckCircle, Lock, Unlock, Code, Send, Play, Award, ChevronRight, Menu, X, Rocket, Users, RefreshCw, Loader, LogOut, User, Monitor, ArrowLeft, ArrowRight, HelpCircle, Edit3, Save, WifiOff, Copy, FileJson, Eye, EyeOff, Settings, ShieldCheck, BarChart, UserPlus, Home, LayoutGrid, Wrench, Database, Key, Trash2, AlertTriangle, UserCog, AlertCircle, FileText, Maximize, Minimize } from 'lucide-react';

// --- KONFIGURASI UTAMA ---
// URL Backend Google Apps Script Terbaru
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwiQJfU_v_hiLwDb47qpWa-M2Tla7EZ2s_vtUOIpcvp-LX_JK3pl4By3UDUEsOorkuo/exec"; 
const DEFAULT_SLIDE_ID = "1q1MUsZ68LoyRWubLgX9WIkcjBFLq9_8Zze25fv4etcU";

// --- SECURITY UTILS (ENCODING BASE64) ---
// Kita gunakan Base64 standar untuk "mengemas" password agar karakter spesial (!) aman saat dikirim
const secureEncode = (str) => {
    try {
        return btoa(str);
    } catch (e) {
        return str;
    }
};

// --- KODE BACKEND (GAS) ---
const BACKEND_CODE_DISPLAY = `
// --- COPY KODE INI KE GOOGLE APPS SCRIPT ---
// PENTING: SETELAH SAVE, KLIK "DEPLOY" -> "MANAGE DEPLOYMENTS" -> "EDIT" -> "VERSION: NEW VERSION"

const SHEET_NAME = "Sheet1";
const INSTRUCTORS_SHEET = "Instructors";

function doGet(e) { return handleRequest(e); }
function doPost(e) { return handleRequest(e); }

function handleRequest(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    let params = e.parameter;
    const action = params.action;
    
    let doc = SpreadsheetApp.getActiveSpreadsheet();
    if (params.targetId && params.targetId !== "") {
      try { doc = SpreadsheetApp.openById(params.targetId); } catch(err) { doc = SpreadsheetApp.getActiveSpreadsheet(); }
    }

    let instructorSheet = doc.getSheetByName(INSTRUCTORS_SHEET);
    if (!instructorSheet) {
      instructorSheet = doc.insertSheet(INSTRUCTORS_SHEET);
      instructorSheet.appendRow(["Username", "PasswordEncoded", "Role", "Name"]);
      // ADMIN DEFAULT: Password 'Adminworkshop123!' di-encode Base64 menjadi 'QWRtaW53b3Jrc2hvcDEyMyE='
      instructorSheet.appendRow(["admin", "QWRtaW53b3Jrc2hvcDEyMyE=", "ADMIN", "Super Admin"]);
    }
    
    // --- AUTHENTICATION ---
    if (action === "auth_instructor") {
      const username = params.username.trim().toLowerCase();
      const encodedPass = params.password; // Client mengirim Base64

      // Failsafe Check (Hardcoded)
      if (username === 'admin' && encodedPass === 'QWRtaW53b3Jrc2hvcDEyMyE=') {
         return jsonResponse({ result: "success", role: "ADMIN", name: "Super Admin", username: "admin" });
      }

      const data = instructorSheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        const dbUser = String(data[i][0]).toLowerCase();
        const dbPass = String(data[i][1]); 

        if (dbUser === username) {
             if (dbPass === encodedPass) {
                 return jsonResponse({ result: "success", role: data[i][2], name: data[i][3], username: data[i][0] });
             }
             try {
                var encodedDbPass = Utilities.base64Encode(dbPass);
                if (encodedDbPass === encodedPass) {
                    return jsonResponse({ result: "success", role: data[i][2], name: data[i][3], username: data[i][0] });
                }
             } catch(err) {}
        }
      }
      return jsonResponse({ result: "error", message: "Username atau Password salah." });
    }

    // --- OTHER ACTIONS ---
    if (action === "list_instructors") {
      const data = instructorSheet.getDataRange().getValues();
      const list = [];
      for (let i = 1; i < data.length; i++) list.push({ username: data[i][0], role: data[i][2], name: data[i][3] });
      return jsonResponse({ result: "success", instructors: list });
    }
    if (action === "add_instructor") {
      const data = instructorSheet.getDataRange().getValues();
      const newCtx = params.username.trim().toLowerCase();
      for (let i = 1; i < data.length; i++) if (String(data[i][0]).toLowerCase() === newCtx) return jsonResponse({ result: "error", message: "Username sudah ada." });
      instructorSheet.appendRow([newCtx, params.password, "INSTRUCTOR", params.name]);
      return jsonResponse({ result: "success" });
    }
    if (action === "delete_instructor") {
      const targetUser = params.targetUser.toLowerCase();
      if (targetUser === 'admin') return jsonResponse({ result: "error", message: "Cannot delete Super Admin" });
      const data = instructorSheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        if (String(data[i][0]).toLowerCase() === targetUser) { instructorSheet.deleteRow(i + 1); return jsonResponse({ result: "success" }); }
      }
      return jsonResponse({ result: "error", message: "User not found" });
    }
    if (action === "reset_password") {
      const targetUser = params.targetUser.toLowerCase();
      const data = instructorSheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        if (String(data[i][0]).toLowerCase() === targetUser) { instructorSheet.getRange(i + 1, 2).setValue(params.newPassword); return jsonResponse({ result: "success" }); }
      }
      return jsonResponse({ result: "error", message: "User not found" });
    }
    
    // --- MATERIALS & STUDENTS ---
    const scriptProps = PropertiesService.getScriptProperties();
    let sheet = doc.getSheetByName(SHEET_NAME);
    if (!sheet) { sheet = doc.insertSheet(SHEET_NAME); sheet.appendRow(["Timestamp", "UserID", "Username", "Name", "Step", "Status", "Answer"]); }
    
    if (action === "saveMaterials") { scriptProps.setProperty("WORKSHOP_MATERIALS", params.data); return jsonResponse({ result: "success" }); }
    if (action === "getMaterials") { const stored = scriptProps.getProperty("WORKSHOP_MATERIALS"); return jsonResponse({ result: "success", data: stored ? JSON.parse(stored) : null }); }
    if (action === "setSlideId") { scriptProps.setProperty("SLIDE_ID", params.slideId); return jsonResponse({ result: "success" }); }
    
    if (action === "getAllUsers") {
      const data = sheet.getDataRange().getValues();
      const users = [];
      let currentSlideId = scriptProps.getProperty("SLIDE_ID") || "";
      for (let i = 1; i < data.length; i++) if (data[i][1]) users.push({ userId: data[i][1], username: data[i][2], name: data[i][3], step: data[i][4], status: data[i][5], answer: data[i][6] || "-" });
      return jsonResponse({ result: "success", users: users, slideId: currentSlideId });
    }
    
    // ... (Student logic same as before) ...
    if (action === "register") {
        const username = params.username.trim().toLowerCase();
        const data = sheet.getDataRange().getValues();
        for (let i = 1; i < data.length; i++) if (String(data[i][2]).toLowerCase() == username) return jsonResponse({ result: "error", message: "Username sudah dipakai!" });
        const userId = "USER_" + new Date().getTime();
        sheet.appendRow([new Date(), userId, username, params.name, 1, "PENDING", ""]);
        let currentSlideId = scriptProps.getProperty("SLIDE_ID") || "";
        return jsonResponse({ result: "success", userId: userId, username: username, name: params.name, step: 1, status: "PENDING", slideId: currentSlideId });
    }
    if (action === "login") {
        const username = params.username.trim().toLowerCase();
        const data = sheet.getDataRange().getValues();
        let currentSlideId = scriptProps.getProperty("SLIDE_ID") || "";
        for (let i = 1; i < data.length; i++) if (String(data[i][2]).toLowerCase() == username) return jsonResponse({ result: "success", userId: data[i][1], username: data[i][2], name: data[i][3], step: parseInt(data[i][4]), status: data[i][5], slideId: currentSlideId });
        return jsonResponse({ result: "error", message: "Username tidak ditemukan." });
    }
    if (action === "recover") {
      const nameSearch = params.name.trim().toLowerCase();
      const data = sheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) if (String(data[i][3]).toLowerCase() === nameSearch) return jsonResponse({ result: "success", foundUsername: data[i][2], foundName: data[i][3] });
      return jsonResponse({ result: "error", message: "Nama tidak ditemukan." });
    }
    if (action === "getStatus") {
      const userId = params.userId;
      const data = sheet.getDataRange().getValues();
      let currentSlideId = scriptProps.getProperty("SLIDE_ID") || "";
      for (let i = data.length - 1; i >= 0; i--) if (data[i][1] == userId) return jsonResponse({ result: "success", step: parseInt(data[i][4]), status: data[i][5], slideId: currentSlideId });
      return jsonResponse({ result: "error", message: "User not found" });
    }
    if (action === "submitTask") {
      const userId = params.userId;
      const data = sheet.getDataRange().getValues();
      for (let i = data.length - 1; i >= 0; i--) { if (data[i][1] == userId) { sheet.getRange(i + 1, 6).setValue("WAITING_APPROVAL"); sheet.getRange(i + 1, 7).setValue(params.answer); return jsonResponse({ result: "success" }); } }
    }
    if (action === "updateStep") {
       const userId = params.userId;
       const data = sheet.getDataRange().getValues();
       for (let i = data.length - 1; i >= 0; i--) { if (data[i][1] == userId) { sheet.getRange(i + 1, 5).setValue(params.step); sheet.getRange(i + 1, 6).setValue("PENDING"); return jsonResponse({ result: "success" }); } }
    }
    if (action === "approve") {
       const userId = params.userId;
       const data = sheet.getDataRange().getValues();
       for (let i = data.length - 1; i >= 0; i--) { if (data[i][1] == userId) { sheet.getRange(i + 1, 6).setValue("APPROVED"); return jsonResponse({ result: "success" }); } }
    }

  } catch (e) { return jsonResponse({ result: "error", error: e.toString() }); } 
  finally { lock.releaseLock(); }
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
`;

// --- ICON MAPPING ---
const ICON_MAP = {
  'BookOpen': BookOpen,
  'Code': Code,
  'Send': Send,
  'Play': Play,
  'Award': Award
};

const renderStepIcon = (iconName, size = 20) => {
  const IconComponent = ICON_MAP[iconName] || BookOpen;
  return <IconComponent size={size} />;
};

const DEFAULT_WORKSHOP_STEPS = [
  { id: 1, title: "Pengenalan & Ideasi", duration: "15 Menit", icon: "BookOpen", description: "Tentukan masalah dan ide aplikasi.", content: "Tugas: Tentukan nama aplikasi dan target pengguna." },
  { id: 2, title: "Prompt Engineering", duration: "20 Menit", icon: "Code", description: "Buat struktur prompt yang tepat.", content: "Tugas: Tulis prompt lengkap menggunakan teknik role-playing." },
  { id: 3, title: "Prototyping", duration: "30 Menit", icon: "Send", description: "Generate aplikasi dengan AI.", content: "Tugas: Generate kode dan pastikan tidak ada error dasar." },
  { id: 4, title: "Finalisasi", duration: "15 Menit", icon: "Play", description: "Styling dan UX polishing.", content: "Tugas: Perbaiki warna dan layout agar menarik." },
  { id: 5, title: "Selesai", duration: "10 Menit", icon: "Award", description: "Showcase hasil karya.", content: "Selamat! Anda telah menyelesaikan workshop." }
];

const styleSheet = document.createElement("style");
styleSheet.innerText = `
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
  .animate-fade-in { animation: fadeIn 0.5s ease-out; }
  .animate-fade-in-up { animation: fadeInUp 0.5s ease-out; }
`;
document.head.appendChild(styleSheet);

export default function App() {
  const [view, setView] = useState('auth'); 
  const [authMode, setAuthMode] = useState('login'); 
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
   
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [lockoutTime, setLockoutTime] = useState(null);
  const [loginError, setLoginError] = useState("");
  const [showPassword, setShowPassword] = useState(false); 

  const [loginTarget, setLoginTarget] = useState(null); 
  const [activeSettingsTab, setActiveSettingsTab] = useState('db'); 
  const [activeInstructorSession, setActiveInstructorSession] = useState(null); 

  const [instructorList, setInstructorList] = useState([]);
  const [newInstructor, setNewInstructor] = useState({ name: '', username: '' });
  const [showAddInstructor, setShowAddInstructor] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [newPasswordInput, setNewPasswordInput] = useState("");

  const [showSlideConfigModal, setShowSlideConfigModal] = useState(false); 

  const [materials, setMaterials] = useState(DEFAULT_WORKSHOP_STEPS);
  const [showMaterialEditor, setShowMaterialEditor] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState(null); 

  const [authInput, setAuthInput] = useState({ username: '', name: '' });
  const [recoverName, setRecoverName] = useState('');
  const [recoveredUser, setRecoveredUser] = useState(null);

  const [instructorUsername, setInstructorUsername] = useState("");
  const [instructorPass, setInstructorPass] = useState("");

  const [userData, setUserData] = useState({ name: '', username: '', userId: '', step: 1, status: 'PENDING' });
  const [studentInput, setStudentInput] = useState("");
   
  const [instructorData, setInstructorData] = useState([]);

  const [currentSlideId, setCurrentSlideId] = useState(DEFAULT_SLIDE_ID);
  const [newSlideIdInput, setNewSlideIdInput] = useState("");

  const [targetSheetId, setTargetSheetId] = useState("");
  const [newTargetSheetId, setNewTargetSheetId] = useState("");

  const studentSlideRef = useRef(null);
  const instructorSlideRef = useRef(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // --- ANTI THEFT & SECURITY ENFORCED ---
  useEffect(() => {
    // 1. Prevent Right Click
    const handleContextMenu = (e) => {
      e.preventDefault();
      return false;
    };

    // 2. Prevent Keyboard Shortcuts (F12, Ctrl+Shift+I, etc)
    const handleKeyDown = (e) => {
        // F12
        if (e.keyCode === 123) { e.preventDefault(); return false; }
        
        // Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C (Inspect Element)
        if (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74 || e.keyCode === 67)) {
            e.preventDefault(); return false;
        }
        
        // Ctrl+U (View Source)
        if (e.ctrlKey && e.keyCode === 85) { e.preventDefault(); return false; }

        // Esc for fullscreen logic (allowed)
        if (e.key === 'Escape' && isExpanded) {
            setIsExpanded(false);
        }
    };

    // Attach to document and window to be sure
    document.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
        document.removeEventListener('contextmenu', handleContextMenu);
        window.removeEventListener('contextmenu', handleContextMenu);
        document.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isExpanded]);

  const showNotif = (msg) => {
    const safeMsg = typeof msg === 'string' ? msg : String(msg);
    setNotification(safeMsg);
    setTimeout(() => setNotification(null), 3000);
  };

  const getEmbedUrl = (docId) => {
      const safeId = docId || DEFAULT_SLIDE_ID;
      const baseUrlPrefix = safeId.startsWith('2PACX') ? '/d/e/' : '/d/';
      return `https://docs.google.com/presentation${baseUrlPrefix}${safeId}/embed?start=false&loop=false&delayms=60000`;
  };

  const toggleFullScreen = async (ref) => {
      if (isExpanded) {
          setIsExpanded(false);
          return;
      }
      if (!ref.current) return;
      try {
          if (!document.fullscreenElement) {
              await ref.current.requestFullscreen();
          } else {
              if (document.exitFullscreen) await document.exitFullscreen();
          }
      } catch (err) {
          console.warn("Native fullscreen denied, switching to CSS fallback.");
          setIsExpanded(true);
      }
  };

  const mockAPICall = async (params) => {
      await new Promise(r => setTimeout(r, 500));
      const getMockDB = () => {
          const stored = localStorage.getItem('mock_db_instructors');
          if (stored) return JSON.parse(stored);
          return [
              // MOCK DATA DISIMPAN SEBAGAI PLAINTEXT
              // Login akan otomatis encode input sebelum bandingkan
              { username: 'admin', password: 'Adminworkshop123!', role: 'ADMIN', name: 'Super Admin' },
              { username: 'demo', password: 'Instruktur123!', role: 'INSTRUCTOR', name: 'Demo Instruktur' }
          ];
      };
      const saveMockDB = (data) => localStorage.setItem('mock_db_instructors', JSON.stringify(data));
      const instructors = getMockDB();

      if (params.action === 'saveMaterials') {
        localStorage.setItem('mock_materials', params.data);
        return { result: 'success' };
      }
      if (params.action === 'getMaterials') {
        const stored = localStorage.getItem('mock_materials');
        return { result: 'success', data: stored ? JSON.parse(stored) : null };
      }

      if (params.action === 'auth_instructor') {
          const encodedPass = params.password; // Client sends Base64
          const user = instructors.find(u => u.username === params.username.toLowerCase());
          
          if (user) {
              // Cek 1: Jika DB Plaintext, kita encode dulu DB-nya
              if (secureEncode(user.password) === encodedPass) {
                  return { result: 'success', role: user.role, username: user.username, name: user.name };
              }
              // Cek 2: Jika DB sudah Base64 (dari save sebelumnya)
              if (user.password === encodedPass) {
                  return { result: 'success', role: user.role, username: user.username, name: user.name };
              }
          }
          return { result: 'error', message: 'Username atau Password salah (Mock).' };
      }
      if (params.action === 'list_instructors') return { result: 'success', instructors: instructors.map(u => ({username: u.username, name: u.name, role: u.role})) };
      if (params.action === 'add_instructor') {
          if (instructors.find(u => u.username === params.username.toLowerCase())) return { result: 'error', message: 'Username sudah ada' };
          instructors.push({ username: params.username.toLowerCase(), password: params.password, role: 'INSTRUCTOR', name: params.name });
          saveMockDB(instructors);
          return { result: 'success' };
      }
      if (params.action === 'delete_instructor') {
          if (params.targetUser === 'admin') return { result: 'error', message: 'Tidak bisa hapus admin' };
          const newList = instructors.filter(u => u.username !== params.targetUser);
          saveMockDB(newList);
          return { result: 'success' };
      }
      if (params.action === 'reset_password') {
          const idx = instructors.findIndex(u => u.username === params.targetUser);
          if (idx === -1) return { result: 'error', message: 'User not found' };
          instructors[idx].password = params.newPassword; 
          saveMockDB(instructors);
          return { result: 'success' };
      }
      if (params.action === 'setSlideId') { localStorage.setItem('demo_slide_id', params.slideId); return { result: "success", slideId: params.slideId }; }
      if (params.action === 'getStatus' || params.action === 'getAllUsers') {
          return { result: "success", users: [{userId: 'd1', name: 'Demo User', username: 'demo', step: 1, status: 'PENDING'}], slideId: DEFAULT_SLIDE_ID, step: 1, status: 'PENDING' };
      }
      if (params.action === 'login') return { result: "success", userId: "DEMO_USER", username: "demo", name: "Siswa Demo", step: 1, status: "PENDING", slideId: DEFAULT_SLIDE_ID };
      return { result: "success" };
  };

  const callAPI = async (params) => {
    if (isOfflineMode) return mockAPICall(params);

    setLoading(true);
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 15000));

    try {
      if (!GOOGLE_SCRIPT_URL) { setIsOfflineMode(true); return mockAPICall(params); } 
      
      const formData = new FormData();
      Object.keys(params).forEach(key => formData.append(key, params[key]));
      if (targetSheetId) formData.append('targetId', targetSheetId);

      const response = await Promise.race([
          fetch(GOOGLE_SCRIPT_URL, { 
              method: "POST", 
              body: formData, 
              credentials: 'omit', 
          }), 
          timeout
      ]);

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const text = await response.text();
      if (!text) throw new Error("Empty response");
      return JSON.parse(text);
      
    } catch (error) {
      console.warn("API Error (Fallback to Offline):", error.message);
      if (!isOfflineMode) { 
          showNotif("Koneksi server terkendala. Beralih ke Mode Demo.");
          setIsOfflineMode(true); 
          return mockAPICall(params);
      }
      return { result: "error", message: "Koneksi Bermasalah." };
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => { 
      const res = await callAPI({ action: 'getAllUsers' }); 
      if (res && res.result === 'success' && Array.isArray(res.users)) {
          setInstructorData(Array.from(new Map(res.users.map(item => [item.userId, item])).values())); 
      } else { setInstructorData([]); }
  };

  const fetchInstructorList = async () => {
      const res = await callAPI({ action: 'list_instructors' });
      if (res && res.result === 'success' && Array.isArray(res.instructors)) setInstructorList(res.instructors);
      else setInstructorList([]);
  };

  const fetchMaterials = async () => {
      const res = await callAPI({ action: 'getMaterials' });
      if (res && res.result === 'success' && res.data) {
        setMaterials(res.data);
      } else {
        setMaterials(DEFAULT_WORKSHOP_STEPS);
      }
  };

  const saveMaterials = async () => {
      const res = await callAPI({ action: 'saveMaterials', data: JSON.stringify(materials) });
      if (res && res.result === 'success') {
        showNotif("Materi berhasil disimpan!");
        setShowMaterialEditor(false);
      } else {
        showNotif("Gagal menyimpan materi.");
      }
  };

  // --- AUTO LOGIN & INIT ---
  useEffect(() => {
    const savedUser = localStorage.getItem('workshop_user');
    if (savedUser) { 
      try { setUserData(JSON.parse(savedUser)); setView('student'); } catch(e){} 
      fetchMaterials();
    }
    const savedInstructor = sessionStorage.getItem('workshop_instructor_session');
    if (savedInstructor) { try { setActiveInstructorSession(JSON.parse(savedInstructor)); } catch(e){} }
    const savedLockout = localStorage.getItem('login_lockout_until');
    if (savedLockout && new Date().getTime() < parseInt(savedLockout)) setLockoutTime(parseInt(savedLockout));
    const savedSheetId = localStorage.getItem('workshop_target_sheet_id');
    if (savedSheetId) { setTargetSheetId(savedSheetId); setNewTargetSheetId(savedSheetId); }
  }, []);

  // --- HANDLERS ---
  const handleInstructorLogin = async (e) => {
      e.preventDefault();
      setLoginError(""); 
      
      if (!instructorUsername || !instructorPass) { 
          setLoginError("Username dan Password harus diisi."); 
          return; 
      }

      if (lockoutTime) { 
          if (new Date().getTime() < lockoutTime) { 
              setLoginError(`Akun terkunci karena terlalu banyak percobaan. Tunggu 5 menit.`); 
              return; 
          } else { 
              setLockoutTime(null); 
              localStorage.removeItem('login_lockout_until'); 
              setLoginAttempts(0); 
          }
      }

      // ENCODE PASSWORD CLIENT SIDE (BASE64)
      const encodedPassword = secureEncode(instructorPass);
      
      const res = await callAPI({ 
          action: 'auth_instructor', 
          username: instructorUsername, 
          password: encodedPassword 
      });

      if (res && res.result === 'success') {
          const session = { username: res.username, role: res.role, name: res.name };
          setActiveInstructorSession(session);
          sessionStorage.setItem('workshop_instructor_session', JSON.stringify(session));
          
          setInstructorUsername(""); 
          setInstructorPass("");     
          setLoginAttempts(0);
          
          fetchMaterials();
          if (loginTarget === 'dashboard') { setView('instructor_dashboard'); showNotif(`Selamat datang, ${res.name}`); }
          else if (loginTarget === 'settings') { setView('admin_settings'); showNotif('Masuk ke Pengaturan Admin'); }
      } else {
          const newAttempts = loginAttempts + 1; 
          setLoginAttempts(newAttempts);
          
          if (newAttempts >= 5) { 
              const lockout = new Date().getTime() + (5 * 60 * 1000); 
              setLockoutTime(lockout); 
              localStorage.setItem('login_lockout_until', lockout); 
              setLoginError('Terlalu banyak percobaan. Akun dikunci 5 menit.'); 
          } else { 
              setLoginError(String(res?.message || "Username atau Password salah.")); 
          }
      }
  };

  const handleAddInstructor = async () => {
      if (!newInstructor.username || !newInstructor.name) return showNotif("Data tidak lengkap");
      const defaultPassEncoded = secureEncode("Instruktur123!");
      const res = await callAPI({ action: 'add_instructor', username: newInstructor.username, name: newInstructor.name, password: defaultPassEncoded });
      if (res && res.result === 'success') { showNotif("Instruktur ditambahkan."); setShowAddInstructor(false); setNewInstructor({name: '', username: ''}); fetchInstructorList(); }
      else { showNotif(String(res?.message || "Gagal menambahkan.")); }
  };

  const handleDeleteInstructor = async (targetUser) => {
      if (!window.confirm(`Hapus instruktur ${targetUser}?`)) return;
      const res = await callAPI({ action: 'delete_instructor', targetUser });
      if (res && res.result === 'success') { showNotif("Instruktur dihapus."); fetchInstructorList(); } else { showNotif(String(res?.message || "Gagal menghapus")); }
  };

  const handleResetPassword = async (targetUser) => {
      if (!newPasswordInput) return showNotif("Password kosong");
      const newPassEncoded = secureEncode(newPasswordInput);
      const res = await callAPI({ action: 'reset_password', targetUser, newPassword: newPassEncoded });
      if (res && res.result === 'success') { showNotif("Password berhasil diubah!"); setNewPasswordInput(""); setShowPasswordChange(false); } else { showNotif(String(res?.message || "Gagal ubah password")); }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    if (!authInput.username) { showNotif("Username wajib diisi!"); return; }
    const action = authMode === 'register' ? 'register' : 'login';
    const payload = authMode === 'register' ? { action, username: authInput.username, name: authInput.name } : { action, username: authInput.username };
    const res = await callAPI(payload);
    if (res && res.result === 'success') {
        const userObj = { userId: res.userId, username: res.username, name: res.name, step: res.step, status: res.status };
        setUserData(userObj);
        if (res.slideId) setCurrentSlideId(res.slideId);
        fetchMaterials(); 
        localStorage.setItem('workshop_user', JSON.stringify(userObj));
        setView('student');
    } else { showNotif(String(res?.message || "Gagal login.")); }
  };

  const requestLogout = () => setShowLogoutConfirm(true);
  const confirmLogout = () => {
      localStorage.removeItem('workshop_user');
      sessionStorage.removeItem('workshop_instructor_session');
      setActiveInstructorSession(null);
      setUserData({ name: '', username: '', userId: '', step: 1, status: 'PENDING' });
      setAuthInput({ username: '', name: '' });
      setView('auth');
      setShowLogoutConfirm(false);
      setIsOfflineMode(false);
  };

  const copyScriptToClipboard = () => {
      const textArea = document.createElement("textarea");
      textArea.value = BACKEND_CODE_DISPLAY;
      textArea.style.position = "fixed"; textArea.style.left = "-9999px"; textArea.style.top = "0";
      document.body.appendChild(textArea); textArea.focus(); textArea.select();
      try { document.execCommand('copy'); showNotif("Kode berhasil disalin!"); } catch (err) { showNotif("Gagal menyalin kode."); }
      document.body.removeChild(textArea);
  };

  // --- SYNC LOGIC ---
  useEffect(() => {
    let interval;
    if (view === 'student') {
      const poll = async () => {
          if (!userData.userId) return;
          const res = await callAPI({ action: 'getStatus', userId: userData.userId });
          if (res && res.result === 'success') {
              setUserData(prev => ({ ...prev, step: res.step, status: res.status }));
              if (res.slideId && res.slideId !== currentSlideId) setCurrentSlideId(res.slideId);
              if (res.status === 'APPROVED' && res.step > userData.step) showNotif("Anda telah di-approve!");
          }
      };
      poll(); interval = setInterval(poll, 5000);
    }
    if (view === 'instructor_dashboard') {
      const fetchInstr = async () => {
        const res = await callAPI({ action: 'getAllUsers' });
        if (res && res.result === 'success') {
          if (Array.isArray(res.users)) {
              setInstructorData(Array.from(new Map(res.users.map(item => [item.userId, item])).values()));
          } else { setInstructorData([]); }
          if (res.slideId) setCurrentSlideId(res.slideId);
        }
      };
      fetchInstr(); interval = setInterval(fetchInstr, 8000);
    }
    return () => clearInterval(interval);
  }, [view, userData.userId, userData.step, currentSlideId, isOfflineMode]);

  const updateSlideIdConfig = async () => {
      if (!newSlideIdInput) return showNotif("Masukkan ID Slide");
      let cleanId = newSlideIdInput;
      const match = newSlideIdInput.match(/\/d\/(?:e\/)?([a-zA-Z0-9-_]+)/);
      if (match && match[1]) cleanId = match[1];
      await callAPI({ action: 'setSlideId', slideId: cleanId });
      setCurrentSlideId(cleanId);
      setShowSlideConfigModal(false);
      showNotif("Slide Presentation Berhasil Diganti!");
  };
  const saveTargetSheetId = () => {
      let cleanId = newTargetSheetId;
      const match = newTargetSheetId.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (match && match[1]) cleanId = match[1];
      setTargetSheetId(cleanId);
      localStorage.setItem('workshop_target_sheet_id', cleanId);
      showNotif(cleanId ? "Database dialihkan ke Sheet baru!" : "Menggunakan Database Master (Default).");
  };
  const approveStudent = async (targetId) => { await callAPI({ action: 'approve', userId: targetId }); showNotif("Siswa Approved."); fetchStudents(); };
  const handleStudentSubmit = async (answer) => { await callAPI({ action: 'submitTask', userId: userData.userId, answer }); setUserData(prev => ({ ...prev, status: 'WAITING_APPROVAL' })); showNotif("Jawaban terkirim."); };
  const handleNextLevel = async () => { const nextStep = userData.step + 1; await callAPI({ action: 'updateStep', userId: userData.userId, step: nextStep }); setUserData(prev => ({ ...prev, step: nextStep, status: 'PENDING' })); setStudentInput(""); };

  const handleUpdateMaterial = (field, value) => {
    setEditingMaterial(prev => ({ ...prev, [field]: value }));
  };

  const saveEditingMaterial = () => {
    const updatedMaterials = materials.map(m => m.id === editingMaterial.id ? editingMaterial : m);
    setMaterials(updatedMaterials);
    setEditingMaterial(null);
  };

  // --- RENDERERS ---

  if (view === 'recover') {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans" onContextMenu={(e) => e.preventDefault()}>
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
                <button onClick={() => { setView('auth'); setRecoveredUser(null); }} className="text-gray-500 mb-4 flex items-center gap-2"><ArrowLeft size={16}/> Kembali</button>
                <h2 className="text-2xl font-bold mb-2 text-gray-800">Lupa Username?</h2>
                {!recoveredUser ? (
                    <form onSubmit={() => { /* Mock recover implementation for demo */ setRecoveredUser({foundUsername: 'demo', foundName: 'Siswa Demo'}); }} className="space-y-4">
                        <input type="text" className="w-full p-3 border border-gray-300 rounded-lg" placeholder="Nama Lengkap" value={recoverName} onChange={e => setRecoverName(e.target.value)}/>
                        <button type="button" onClick={async () => {
                             setLoading(true);
                             const res = await callAPI({action: 'recover', name: recoverName});
                             setLoading(false);
                             if(res.result === 'success') setRecoveredUser(res);
                             else showNotif(res.message);
                        }} disabled={loading} className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold">{loading ? "Mencari..." : "Cari Akun Saya"}</button>
                    </form>
                ) : (
                    <div className="bg-green-50 p-6 rounded-xl border border-green-200 text-center animate-fade-in">
                        <CheckCircle size={40} className="mx-auto text-green-600 mb-2"/>
                        <p className="text-green-800 font-medium">Akun Ditemukan!</p>
                        <div className="my-4"><p className="text-xs text-gray-500 uppercase">Username Anda:</p><p className="text-2xl font-bold text-gray-900 tracking-wider font-mono bg-white py-2 rounded border border-green-100">{recoveredUser.foundUsername}</p></div>
                        <button onClick={() => { setView('auth'); setAuthInput({...authInput, username: recoveredUser.foundUsername}); }} className="w-full bg-green-600 text-white py-2 rounded-lg font-bold">Login Sekarang</button>
                    </div>
                )}
            </div>
        </div>
      );
  }

  if (view === 'auth') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 font-sans" onContextMenu={(e) => e.preventDefault()}>
        {notification && <div className="fixed top-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-xl z-50">{notification}</div>}
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md relative">
          {isOfflineMode && <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-yellow-100 text-yellow-800 px-4 py-1 rounded-full text-xs font-bold shadow-sm flex items-center gap-1"><WifiOff size={12}/> Mode Demo (Offline)</div>}
          <div className="text-center mb-6"><Rocket size={48} className="mx-auto text-indigo-600 mb-2" /><h1 className="text-2xl font-bold text-gray-900">App in 90 Mins</h1><p className="text-gray-500">Workshop Interactive Guide</p></div>
          <div className="flex bg-gray-100 p-1 rounded-lg mb-6">
              <button onClick={() => setAuthMode('login')} className={`flex-1 py-2 text-sm font-bold rounded-md transition ${authMode === 'login' ? 'bg-white shadow text-indigo-700' : 'text-gray-500'}`}>Masuk</button>
              <button onClick={() => setAuthMode('register')} className={`flex-1 py-2 text-sm font-bold rounded-md transition ${authMode === 'register' ? 'bg-white shadow text-indigo-700' : 'text-gray-500'}`}>Daftar</button>
          </div>
          <form onSubmit={handleAuth} className="space-y-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Username Peserta</label><input type="text" className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-gray-50" placeholder="budi99" value={authInput.username} onChange={e => setAuthInput({...authInput, username: e.target.value.replace(/\s/g, '')})}/></div>
            {authMode === 'register' && (<div className="animate-fade-in"><label className="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap</label><input type="text" className="w-full p-3 border border-gray-300 rounded-lg" placeholder="Budi Santoso" value={authInput.name} onChange={e => setAuthInput({...authInput, name: e.target.value})}/></div>)}
            <button type="submit" disabled={loading} className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold hover:bg-indigo-700 transition flex justify-center items-center gap-2">{loading ? <Loader className="animate-spin" size={20}/> : (authMode === 'register' ? "Mulai Workshop" : "Masuk")}</button>
          </form>
          {authMode === 'login' && (<button onClick={() => setView('recover')} className="block w-full text-center text-xs text-indigo-500 mt-3 hover:underline">Lupa Username?</button>)}
          <div className="mt-8 pt-6 border-t border-gray-100 grid grid-cols-2 gap-3">
             <button onClick={() => { setLoginTarget('dashboard'); setView('instructor_login'); setLoginError(""); }} className="flex items-center justify-center gap-2 text-xs font-bold text-gray-500 hover:text-indigo-600 py-2 rounded hover:bg-gray-50 transition"><Monitor size={14}/> Login Instruktur</button>
             <button onClick={() => { setLoginTarget('settings'); setView('instructor_login'); setLoginError(""); }} className="flex items-center justify-center gap-2 text-xs font-bold text-gray-500 hover:text-indigo-600 py-2 rounded hover:bg-gray-50 transition"><Settings size={14}/> Admin / Pengaturan</button>
          </div>
        </div>
      </div>
    );
  }

  // 3. INSTRUCTOR / ADMIN LOGIN
  if (view === 'instructor_login') {
      return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 font-sans" onContextMenu={(e) => e.preventDefault()}>
          <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md text-center">
            {lockoutTime && <div className="mb-4 bg-red-100 text-red-700 p-2 rounded text-xs flex items-center justify-center gap-2"><AlertTriangle size={14}/> Akun terkunci. Tunggu 5 menit.</div>}
            
            <h2 className="text-xl font-bold mb-1">{loginTarget === 'dashboard' ? 'Login Instruktur' : 'Login Admin'}</h2>
            <p className="text-xs text-gray-500 mb-6">Masukkan kredensial Anda</p>
            
            <form onSubmit={handleInstructorLogin}>
                <input required type="text" className="w-full p-3 border border-gray-300 rounded-lg mb-4" placeholder="Username (e.g. admin)" value={instructorUsername} onChange={e => setInstructorUsername(e.target.value)} disabled={!!lockoutTime}/>
                
                <div className="relative mb-4">
                    <input 
                        required 
                        type={showPassword ? "text" : "password"} 
                        className="w-full p-3 border border-gray-300 rounded-lg pr-10" 
                        placeholder="Password" 
                        value={instructorPass} 
                        onChange={e => setInstructorPass(e.target.value)}
                        disabled={!!lockoutTime}
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600" disabled={!!lockoutTime}>
                        {showPassword ? <EyeOff size={20}/> : <Eye size={20}/>}
                    </button>
                </div>
                
                {/* INLINE ERROR DISPLAY */}
                {loginError && (
                    <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-start gap-2 text-left animate-fade-in">
                        <AlertCircle size={16} className="mt-0.5 shrink-0"/>
                        <div>{loginError}</div>
                    </div>
                )}

                <div className="flex gap-2 mb-4">
                    <button type="button" onClick={() => setView('auth')} className="flex-1 py-3 bg-gray-200 rounded-lg font-bold text-gray-600">Batal</button>
                    <button type="submit" disabled={!!lockoutTime || loading} className="flex-1 py-3 bg-indigo-900 text-white rounded-lg font-bold disabled:bg-gray-400 flex items-center justify-center gap-2">
                        {loading ? <Loader className="animate-spin" size={18}/> : "Masuk"}
                    </button>
                </div>
            </form>
          </div>
        </div>
      )
  }

  // 3.6. ADMIN SETTINGS
  if (view === 'admin_settings') {
      const isAdmin = activeInstructorSession?.role === 'ADMIN';
      return (
        <div className="min-h-screen bg-gray-50 font-sans flex flex-col" onContextMenu={(e) => e.preventDefault()}>
            {showLogoutConfirm && (<div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in"><div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl"><h3 className="text-xl font-bold text-gray-900 mb-2">Keluar Aplikasi?</h3><div className="flex gap-3 mt-4"><button onClick={() => setShowLogoutConfirm(false)} className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold">Batal</button><button onClick={confirmLogout} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold">Ya, Keluar</button></div></div></div>)}
            {notification && <div className="fixed top-4 right-4 bg-gray-900 text-white px-6 py-3 rounded-lg shadow-xl z-50 animate-bounce">{notification}</div>}

            <header className="bg-white border-b p-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3"><div className="bg-indigo-100 p-2 rounded-lg"><Settings size={20} className="text-indigo-600"/></div><div><h1 className="text-xl font-bold text-gray-900">Pengaturan Admin</h1><p className="text-xs text-gray-500">Halo, {activeInstructorSession?.name}</p></div></div>
                <button onClick={requestLogout} className="text-sm font-bold text-red-600 hover:text-red-700">Keluar</button>
            </header>
            <main className="flex-1 p-6 max-w-4xl mx-auto w-full overflow-y-auto">
                <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                    <button onClick={() => setActiveSettingsTab('db')} className={`px-4 py-2 rounded-lg font-bold whitespace-nowrap ${activeSettingsTab === 'db' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 shadow-sm'}`}><Database size={16} className="inline mr-2"/> Database (DB)</button>
                    <button onClick={() => setActiveSettingsTab('code')} className={`px-4 py-2 rounded-lg font-bold whitespace-nowrap ${activeSettingsTab === 'code' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 shadow-sm'}`}><Code size={16} className="inline mr-2"/> Backend (GAS)</button>
                    <button onClick={() => { setActiveSettingsTab('users'); fetchInstructorList(); }} className={`px-4 py-2 rounded-lg font-bold whitespace-nowrap ${activeSettingsTab === 'users' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 shadow-sm'}`}><Users size={16} className="inline mr-2"/> Manajemen Instruktur</button>
                </div>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 min-h-[400px]">
                    {activeSettingsTab === 'db' && (
                        <div className="space-y-6">
                            <div><h3 className="text-lg font-bold text-gray-900 mb-2">Konfigurasi Database</h3><div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-800 mb-4"><strong>Multi-Tenancy Mode:</strong> Pisahkan data workshop dengan memasukkan ID Spreadsheet berbeda.</div><div className="flex gap-2"><input type="text" value={newTargetSheetId} onChange={e => setNewTargetSheetId(e.target.value)} placeholder="Target Spreadsheet ID..." className="flex-1 p-3 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-indigo-500"/><button onClick={saveTargetSheetId} className="bg-green-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-green-700">Set Database</button></div></div>
                            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200"><h4 className="font-bold text-gray-700 text-xs uppercase mb-2">Database Aktif:</h4><div className="flex items-center gap-2"><Database size={16} className={targetSheetId ? "text-green-600" : "text-gray-400"}/><code className="text-gray-800 font-mono text-sm break-all">{targetSheetId ? targetSheetId : "MASTER DATABASE (Default)"}</code></div></div>
                        </div>
                    )}
                    {activeSettingsTab === 'code' && (
                        <div className="h-full flex flex-col">
                            <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100 mb-4 text-sm text-yellow-800 flex items-start gap-3"><ShieldCheck size={20} className="mt-0.5 shrink-0 text-yellow-600"/><div><p className="font-bold">Penting:</p><p>Update kode di Apps Script jika ingin mengaktifkan fitur login baru.</p></div></div>
                            <div className="relative group"><textarea readOnly className="w-full h-96 p-4 font-mono text-xs text-gray-300 bg-gray-900 rounded-lg resize-none focus:outline-none" value={BACKEND_CODE_DISPLAY}/><button onClick={copyScriptToClipboard} className="absolute top-4 right-4 bg-white text-gray-800 px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-gray-100 transition shadow-lg"><Copy size={14}/> Salin</button></div>
                        </div>
                    )}
                    {activeSettingsTab === 'users' && (
                        <div>
                            <div className="flex justify-between items-center mb-6"><h3 className="text-lg font-bold text-gray-900">Daftar Instruktur</h3>{isAdmin && <button onClick={() => setShowAddInstructor(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2"><UserPlus size={16}/> Tambah Instruktur</button>}</div>
                            {showAddInstructor && (
                                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6 animate-fade-in"><h4 className="font-bold text-sm mb-3">Tambah Instruktur Baru</h4><div className="flex gap-2 mb-2"><input type="text" placeholder="Username (tanpa spasi)" className="flex-1 p-2 border rounded text-sm" value={newInstructor.username} onChange={e => setNewInstructor({...newInstructor, username: e.target.value.replace(/\s/g,'')})}/><input type="text" placeholder="Nama Lengkap" className="flex-1 p-2 border rounded text-sm" value={newInstructor.name} onChange={e => setNewInstructor({...newInstructor, name: e.target.value})}/></div><div className="text-xs text-gray-500 mb-3">Password default: <strong>Instruktur123!</strong></div><div className="flex gap-2"><button onClick={handleAddInstructor} className="bg-green-600 text-white px-4 py-2 rounded text-sm font-bold">Simpan</button><button onClick={() => setShowAddInstructor(false)} className="bg-gray-300 text-gray-700 px-4 py-2 rounded text-sm font-bold">Batal</button></div></div>
                            )}
                            <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-gray-100 text-gray-600 border-b"><tr><th className="p-3">Nama</th><th className="p-3">Username</th><th className="p-3">Role</th><th className="p-3 text-right">Aksi</th></tr></thead><tbody className="divide-y">{instructorList?.map((user) => (<tr key={user.username}><td className="p-3 font-medium">{user.name}</td><td className="p-3 font-mono text-xs">{user.username}</td><td className="p-3"><span className={`px-2 py-1 rounded text-xs font-bold ${user.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>{user.role}</span></td><td className="p-3 text-right flex justify-end gap-2">{(isAdmin || activeInstructorSession?.username === user.username) && (<button onClick={() => { setNewPasswordInput(""); setShowPasswordChange(user.username); }} className="text-indigo-600 hover:bg-indigo-50 p-2 rounded" title="Ganti Password"><Key size={16}/></button>)}{isAdmin && user.role !== 'ADMIN' && (<button onClick={() => handleDeleteInstructor(user.username)} className="text-red-600 hover:bg-red-50 p-2 rounded" title="Hapus User"><Trash2 size={16}/></button>)}</td></tr>))}</tbody></table></div>
                            {showPasswordChange && (
                                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"><div className="bg-white p-6 rounded-xl w-full max-w-sm"><h3 className="font-bold text-lg mb-4">Ganti Password: {showPasswordChange}</h3><input type="password" placeholder="Password Baru" className="w-full p-3 border rounded-lg mb-4" value={newPasswordInput} onChange={e => setNewPasswordInput(e.target.value)}/><div className="flex gap-2"><button onClick={() => handleResetPassword(showPasswordChange)} className="flex-1 bg-indigo-600 text-white py-2 rounded-lg font-bold">Simpan</button><button onClick={() => setShowPasswordChange(false)} className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg font-bold">Batal</button></div></div></div>
                            )}
                        </div>
                    )}
                    {activeSettingsTab === 'monev' && (<div className="flex flex-col items-center justify-center h-64 text-gray-400 text-center"><div className="bg-gray-100 p-4 rounded-full mb-4"><BarChart size={32}/></div><h3 className="font-bold text-gray-600">Monitoring & Evaluasi</h3><p className="text-sm mt-2 max-w-md">Dashboard analitik untuk melihat perkembangan siswa secara keseluruhan dan performa kelas.</p><span className="mt-4 px-3 py-1 bg-indigo-100 text-indigo-600 rounded-full text-xs font-bold">Segera Hadir</span></div>)}
                </div>
            </main>
        </div>
      );
  }

  // 4. INSTRUCTOR DASHBOARD VIEW
  if (view === 'instructor_dashboard') {
    return (
      <div className="min-h-screen bg-gray-100 font-sans pb-20" onContextMenu={(e) => e.preventDefault()}>
        {showSlideConfigModal && (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in"><div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl"><h3 className="text-xl font-bold text-gray-900 mb-2">Ganti Slide Presentasi</h3><input type="text" value={newSlideIdInput} onChange={e => setNewSlideIdInput(e.target.value)} placeholder="Contoh: https://docs.google.com/presentation/d/..." className="w-full p-3 border border-gray-300 rounded-lg mb-4 font-mono text-xs"/><div className="flex gap-3"><button onClick={() => setShowSlideConfigModal(false)} className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg font-bold">Batal</button><button onClick={updateSlideIdConfig} className="flex-1 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700">Simpan</button></div></div></div>
        )}
        
        {/* MODAL EDIT MATERIALS */}
        {showMaterialEditor && (
             <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                <div className="bg-white rounded-2xl p-6 max-w-4xl w-full h-[80vh] flex flex-col shadow-2xl">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-bold text-gray-900">Edit Materi Workshop</h3>
                        <button onClick={() => { setShowMaterialEditor(false); setEditingMaterial(null); }} className="p-2 hover:bg-gray-100 rounded-full"><X size={20} className="text-gray-500"/></button>
                    </div>
                    
                    <div className="flex-1 overflow-hidden flex gap-4">
                        {/* List Steps */}
                        <div className="w-1/3 border-r border-gray-200 pr-4 overflow-y-auto space-y-2">
                             {materials.map((m) => (
                                 <div 
                                    key={m.id} 
                                    onClick={() => setEditingMaterial(m)}
                                    className={`p-3 rounded-lg cursor-pointer border transition ${editingMaterial?.id === m.id ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-300' : 'bg-gray-50 border-gray-100 hover:bg-gray-100'}`}
                                 >
                                     <div className="flex items-center gap-2 mb-1">
                                         <span className="text-xs font-bold bg-indigo-200 text-indigo-800 px-1.5 py-0.5 rounded">Step {m.id}</span>
                                         <span className="text-xs text-gray-500">{m.duration}</span>
                                     </div>
                                     <h4 className="font-bold text-sm text-gray-800 line-clamp-1">{m.title}</h4>
                                 </div>
                             ))}
                        </div>

                        {/* Editor Form */}
                        <div className="w-2/3 pl-2 overflow-y-auto">
                            {editingMaterial ? (
                                <div className="space-y-4 animate-fade-in">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 mb-1">Judul Tahapan</label>
                                            <input type="text" className="w-full p-2 border rounded text-sm font-bold" value={editingMaterial.title} onChange={e => handleUpdateMaterial('title', e.target.value)} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 mb-1">Durasi</label>
                                            <input type="text" className="w-full p-2 border rounded text-sm" value={editingMaterial.duration} onChange={e => handleUpdateMaterial('duration', e.target.value)} />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-1">Deskripsi Singkat</label>
                                        <input type="text" className="w-full p-2 border rounded text-sm" value={editingMaterial.description} onChange={e => handleUpdateMaterial('description', e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-1">Konten / Tugas Lengkap</label>
                                        <textarea className="w-full h-40 p-3 border rounded text-sm leading-relaxed" value={editingMaterial.content} onChange={e => handleUpdateMaterial('content', e.target.value)} />
                                    </div>
                                    <div className="pt-2 flex justify-end">
                                        <button onClick={saveEditingMaterial} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-blue-700">
                                            <CheckCircle size={16}/> Simpan Perubahan (Sementara)
                                        </button>
                                    </div>
                                    <div className="bg-yellow-50 p-3 rounded text-xs text-yellow-800">
                                        Klik "Simpan Perubahan" untuk update state lokal. Jangan lupa klik "Simpan ke Database" di bawah untuk menyimpan permanen.
                                    </div>
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                                    <Edit3 size={48} className="mb-2 opacity-20"/>
                                    <p className="text-sm">Pilih materi di sebelah kiri untuk diedit</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-200 flex justify-end gap-3">
                         <button onClick={() => setShowMaterialEditor(false)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-bold">Tutup</button>
                         <button onClick={saveMaterials} className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 shadow-lg flex items-center gap-2">
                            <Save size={18}/> Simpan Permanen ke Database
                         </button>
                    </div>
                </div>
             </div>
        )}

        {showLogoutConfirm && (<div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in"><div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl"><h3 className="text-xl font-bold text-gray-900 mb-2">Keluar Aplikasi?</h3><div className="flex gap-3 mt-4"><button onClick={() => setShowLogoutConfirm(false)} className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold">Batal</button><button onClick={confirmLogout} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold">Ya, Keluar</button></div></div></div>)}
        {notification && <div className="fixed top-4 right-4 bg-gray-900 text-white px-6 py-3 rounded-lg shadow-xl z-50 animate-bounce">{notification}</div>}

        <header className="bg-indigo-900 text-white p-4 sticky top-0 z-20 shadow-md flex flex-wrap gap-4 justify-between items-center">
          <div className="flex items-center gap-3"><Users size={24} /><div><h1 className="font-bold text-lg hidden md:block">Dashboard Mengajar</h1><p className="text-xs opacity-70 block md:hidden">{activeInstructorSession?.name}</p></div></div>
          <div className="flex items-center gap-2 bg-indigo-800 px-3 py-1 rounded-full border border-indigo-700 shadow-inner">
              <Monitor size={16} className="text-indigo-300"/>
              <button onClick={() => { setNewSlideIdInput(currentSlideId); setShowSlideConfigModal(true); }} className="hover:bg-indigo-700 p-1.5 rounded text-yellow-300 ml-1" title="Ganti URL Slide"><Edit3 size={14}/></button>
          </div>
          
          <div className="flex items-center gap-2">
             <button onClick={() => setShowMaterialEditor(true)} className="bg-indigo-700 hover:bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 border border-indigo-500 shadow-sm">
                 <FileText size={14}/> Edit Materi
             </button>
             <div className="w-px h-6 bg-indigo-800 mx-1"></div>
             <button onClick={fetchStudents} className="p-2 hover:bg-indigo-800 rounded-full" title="Refresh Data"><RefreshCw size={20} className={loading ? "animate-spin" : ""} /></button>
             <button onClick={requestLogout} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-full text-xs font-bold transition">Keluar</button>
          </div>
        </header>
        <main className="p-4 max-w-6xl mx-auto space-y-6">
          <div className="bg-white p-4 rounded-xl shadow relative">
            <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-bold text-gray-500 uppercase flex items-center gap-2">Live Preview <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Instruktur</span></h3>
                <button onClick={() => toggleFullScreen(instructorSlideRef)} className="text-gray-500 hover:text-indigo-600 flex items-center gap-1 text-xs font-bold" title="Layar Penuh">
                    {isExpanded ? <Minimize size={16}/> : <Maximize size={16}/>} {isExpanded ? 'Keluar Fullscreen' : 'Fullscreen'}
                </button>
            </div>
            <div ref={instructorSlideRef} className={`bg-black rounded-lg overflow-hidden border border-gray-300 relative group transition-all duration-300 ${isExpanded ? 'fixed inset-0 z-[100] w-screen h-screen rounded-none border-0' : 'aspect-video w-full'}`}>
                <iframe key={currentSlideId} src={getEmbedUrl(currentSlideId)} className="w-full h-full" allowFullScreen={true} title="Slide Preview"/>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-left"><thead className="bg-gray-50 border-b"><tr><th className="p-4 text-sm font-semibold text-gray-600">Peserta</th><th className="p-4 text-sm font-semibold text-gray-600">Step</th><th className="p-4 text-sm font-semibold text-gray-600">Jawaban</th><th className="p-4 text-right">Aksi</th></tr></thead><tbody className="divide-y divide-gray-100">{instructorData?.map((student) => (<tr key={student.userId} className="hover:bg-gray-50"><td className="p-4 align-top"><div className="font-bold">{student.name}</div><div className="text-xs text-gray-500">@{student.username}</div></td><td className="p-4 align-top"><span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs font-bold">Step {student.step}</span></td><td className="p-4 align-top max-w-xs">{student.answer !== '-' ? <div className="text-sm italic bg-gray-50 p-2 rounded">"{student.answer}"</div> : <span className="text-gray-300">-</span>}</td><td className="p-4 text-right align-top">{student.status === 'WAITING_APPROVAL' ? <button onClick={() => approveStudent(student.userId)} className="bg-indigo-600 text-white px-3 py-1.5 rounded text-sm hover:bg-indigo-700 shadow-sm">Approve</button> : <span className="text-xs font-bold px-2 py-1 rounded bg-green-100 text-green-700">{student.status}</span>}</td></tr>))}</tbody></table></div></div>
        </main>
      </div>
    );
  }

  // 5. STUDENT VIEW
  const currentStepData = materials.find(s => s.id === userData.step) || materials[materials.length - 1];
  const isFinished = userData.step > materials.length;
  const isApproved = userData.status === 'APPROVED';
  const isWaiting = userData.status === 'WAITING_APPROVAL';

  return (
    <div className="flex h-screen bg-white font-sans overflow-hidden">
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in"><div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl"><h3 className="text-xl font-bold text-gray-900 mb-2">Keluar Aplikasi?</h3><div className="flex gap-3 mt-4"><button onClick={() => setShowLogoutConfirm(false)} className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold">Batal</button><button onClick={confirmLogout} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold">Ya, Keluar</button></div></div></div>
      )}
      {notification && <div className="fixed top-4 right-4 bg-gray-900 text-white px-6 py-3 rounded-lg shadow-xl z-50 animate-bounce">{notification}</div>}

      {/* MOBILE NAV OVERLAY */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 md:hidden backdrop-blur-sm transition-opacity" 
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* SIDEBAR NAVIGATION (DRAWER ON MOBILE) */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-gray-50 border-r border-gray-200 flex flex-col transition-transform duration-300 ease-in-out shadow-2xl md:shadow-none
        md:relative md:translate-x-0
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
            <div className="flex items-center gap-3">
                <div className="bg-indigo-100 p-2 rounded-full"><User size={20} className="text-indigo-600"/></div>
                <div className="overflow-hidden">
                    <h2 className="font-bold text-gray-900 text-sm truncate w-32">{userData.name}</h2>
                    <p className="text-xs text-gray-500">@{userData.username}</p>
                </div>
            </div>
            {/* Close Button for Mobile */}
            <button onClick={() => setMobileMenuOpen(false)} className="md:hidden text-gray-500 hover:text-gray-700">
                <X size={20} />
            </button>
        </div>
        
        {/* Logout Button inside Sidebar */}
        <div className="px-6 pb-2 pt-2">
            <button onClick={requestLogout} className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 font-semibold cursor-pointer w-full text-left mt-2 px-1">
                <LogOut size={12}/> Logout
            </button>
        </div>

        <div className="p-4 space-y-2 flex-1 overflow-y-auto">
            {materials.map((step) => { 
                const isCurrent = userData?.step === step.id; 
                const isPast = userData?.step > step.id; 
                return (
                    <div key={step.id} className={`p-3 rounded-lg flex items-center gap-3 ${isCurrent ? 'bg-white shadow-sm border border-indigo-100' : 'opacity-60'}`}>
                        <div className={`p-2 rounded-full ${isPast ? 'bg-green-100 text-green-600' : isCurrent ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-200'}`}>
                            {isPast ? <CheckCircle size={14}/> : renderStepIcon(step.icon, 20)}
                        </div>
                        <div className="flex-1"><p className="text-sm font-semibold">{step.title}</p></div>
                    </div>
                )
            })}
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden md:static relative">
        {/* MOBILE HEADER (Only visible on small screens) */}
        <div className="md:hidden h-16 bg-white border-b flex items-center justify-between px-4 shrink-0 z-30 shadow-sm">
            <div className="flex items-center gap-2 font-bold text-gray-800">
                <Rocket size={20} className="text-indigo-600"/> 
                <span>App in 90 Mins</span>
            </div>
            <button onClick={() => setMobileMenuOpen(true)} className="p-2 text-gray-600 bg-gray-100 rounded-lg active:bg-gray-200">
                <Menu size={24}/>
            </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div ref={studentSlideRef} className={`bg-gray-900 shadow-lg relative shrink-0 group transition-all duration-300 ${isExpanded ? 'fixed inset-0 z-[100] w-screen h-screen' : 'aspect-video w-full md:max-h-64 lg:max-h-80'}`}>
             <iframe key={currentSlideId} src={getEmbedUrl(currentSlideId)} className="w-full h-full" allowFullScreen={true} title="Live Presentation"/>
             <button onClick={() => toggleFullScreen(studentSlideRef)} className="absolute bottom-4 right-4 bg-black/50 text-white p-2 rounded-lg hover:bg-indigo-600 backdrop-blur-sm transition opacity-0 group-hover:opacity-100 flex items-center gap-2" title="Layar Penuh">
                {isExpanded ? <Minimize size={20}/> : <Maximize size={20}/>}
                {isExpanded && <span className="text-xs font-bold pr-1">Keluar</span>}
             </button>
          </div>

          <div className="p-6 md:p-10 max-w-4xl mx-auto pb-20">
            {!isFinished ? (
                <div className="animate-fade-in-up">
                    <div className="mb-6"><span className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-xs font-bold tracking-wide">AKTIVITAS TAHAP {userData?.step}</span><h1 className="text-3xl font-extrabold text-gray-900 mt-2">{currentStepData?.title}</h1></div>
                    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm mb-8">
                        <p className="text-gray-700 mb-6 leading-relaxed text-lg">{currentStepData?.content}</p>
                        <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
                            <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2"><Send size={16}/> Jawaban / Link Hasil Kerja:</label>
                            <textarea value={studentInput} onChange={(e) => setStudentInput(e.target.value)} disabled={isApproved || isWaiting} className="w-full h-24 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 mb-4 bg-white" placeholder="Ketikan jawaban di sini..."/>
                            <div className="flex justify-between items-center mt-2 flex-wrap gap-2">
                                <span className={`text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-2 ${isApproved ? 'bg-green-100 text-green-700' : isWaiting ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}`}>{isApproved ? <CheckCircle size={14}/> : isWaiting ? <Loader size={14} className="animate-spin"/> : <HelpCircle size={14}/>}{isApproved ? 'DISETUJUI' : isWaiting ? 'MENUNGGU REVIEW' : 'BELUM DIKIRIM'}</span>
                                {isApproved ? <button onClick={handleNextLevel} className="bg-green-600 text-white px-6 py-2.5 rounded-lg font-bold hover:bg-green-700 flex items-center gap-2 shadow-lg transform hover:-translate-y-1 transition w-full md:w-auto justify-center">Lanjut Materi <ChevronRight size={18}/></button> : <button onClick={() => handleStudentSubmit(studentInput)} disabled={!studentInput || isWaiting} className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg font-bold hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition shadow-md w-full md:w-auto justify-center">{isWaiting ? "Terkirim" : "Kirim Jawaban"}</button>}
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="text-center py-10 bg-gradient-to-br from-indigo-50 to-white rounded-3xl border border-indigo-100"><Award size={80} className="mx-auto text-yellow-500 mb-6 drop-shadow-lg" /><h1 className="text-4xl font-bold text-gray-900 mb-4">Workshop Selesai!</h1><button onClick={requestLogout} className="text-indigo-600 font-bold hover:underline">Logout</button></div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}