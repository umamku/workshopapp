import React, { useState, useEffect, useRef } from 'react';
import { BookOpen, CheckCircle, Lock, Unlock, Code, Send, Play, Award, ChevronRight, Menu, X, Rocket, Users, RefreshCw, Loader, LogOut, User, Monitor, ArrowLeft, ArrowRight, HelpCircle, Edit3, Save, WifiOff, Copy, FileJson, Eye, EyeOff, Settings, ShieldCheck, BarChart, UserPlus, Home, LayoutGrid, Wrench, Database, Key, Trash2, AlertTriangle, UserCog, AlertCircle, FileText, Maximize, Minimize, Clock, Plus } from 'lucide-react';

// --- KONFIGURASI UTAMA ---
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwiQJfU_v_hiLwDb47qpWa-M2Tla7EZ2s_vtUOIpcvp-LX_JK3pl4By3UDUEsOorkuo/exec"; 
const DEFAULT_SLIDE_ID = "1q1MUsZ68LoyRWubLgX9WIkcjBFLq9_8Zze25fv4etcU";

// --- SECURITY UTILS ---
const secureEncode = (str) => {
    try {
        return btoa(str);
    } catch (e) {
        return str;
    }
};

// --- BACKEND CODE ---
const BACKEND_CODE_DISPLAY = `
// --- COPY KODE INI KE GOOGLE APPS SCRIPT ---

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
      instructorSheet.appendRow(["admin", "QWRtaW53b3Jrc2hvcDEyMyE=", "ADMIN", "Super Admin"]);
    }
    
    // --- AUTHENTICATION ---
    if (action === "auth_instructor") {
      const username = params.username.trim().toLowerCase();
      const encodedPass = params.password; 

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
    
    // --- FITUR REVISI BARU ---
    if (action === "submitTask") {
      const userId = params.userId;
      const data = sheet.getDataRange().getValues();
      for (let i = data.length - 1; i >= 0; i--) { 
        if (data[i][1] == userId) { 
          // Jika sebelumnya NEED_REVISION, hapus feedback instruktur
          let currentAnswer = data[i][6] || "";
          if (currentAnswer.includes("--- FEEDBACK INSTRUKTUR ---")) {
            currentAnswer = currentAnswer.split("\n\n--- FEEDBACK INSTRUKTUR ---")[0];
          }
          const newAnswer = currentAnswer ? currentAnswer + "\n\n--- REVISI ---\n" + params.answer : params.answer;
          sheet.getRange(i + 1, 6).setValue("WAITING_APPROVAL");
          sheet.getRange(i + 1, 7).setValue(newAnswer);
          return jsonResponse({ result: "success" }); 
        } 
      }
    }
    
    if (action === "request_revision") {
       const userId = params.userId;
       const feedback = params.feedback || "Perlu revisi.";
       const data = sheet.getDataRange().getValues();
       for (let i = data.length - 1; i >= 0; i--) { 
          if (data[i][1] == userId) { 
             sheet.getRange(i + 1, 6).setValue("NEED_REVISION");
             // Simpan feedback dengan format khusus
             const currentAnswer = data[i][6] || "";
             const answerWithFeedback = currentAnswer + "\n\n--- FEEDBACK INSTRUKTUR ---\n" + feedback;
             sheet.getRange(i + 1, 7).setValue(answerWithFeedback);
             return jsonResponse({ result: "success" }); 
          } 
       }
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
  'Award': Award,
  'Plus': Plus
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

// --- COMPONENT SKELETON FOR SLIDE LOADING ---
const SlideSkeleton = () => (
  <div className="bg-gray-900 w-full h-full flex items-center justify-center">
    <div className="text-center">
      <div className="w-16 h-16 bg-gray-800 rounded-full mx-auto mb-4 flex items-center justify-center">
        <Rocket size={32} className="text-gray-700" />
      </div>
      <div className="text-gray-400 text-sm">Loading presentation...</div>
      <div className="flex items-center justify-center gap-2 mt-4">
        <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce"></div>
        <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
        <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
      </div>
    </div>
  </div>
);

// Styles Injection
const styleSheet = document.createElement("style");
styleSheet.innerText = `
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-10px); }
  }
  .animate-fade-in { animation: fadeIn 0.5s ease-out; }
  .animate-fade-in-up { animation: fadeInUp 0.5s ease-out; }
  .animate-bounce { animation: bounce 1s infinite; }
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
  ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
  .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
  .scrollbar-hide::-webkit-scrollbar { display: none; }
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

  const [userData, setUserData] = useState({ name: '', username: '', userId: '', step: 1, status: 'PENDING', answer: '' });
  const [studentInput, setStudentInput] = useState("");
   
  const [instructorData, setInstructorData] = useState([]);

  // State untuk slide - menggunakan cache key untuk mencegah flicker
  const [currentSlideId, setCurrentSlideId] = useState(null);
  const [newSlideIdInput, setNewSlideIdInput] = useState("");
  const [slideCacheKey, setSlideCacheKey] = useState(Date.now().toString().slice(-6));

  const [targetSheetId, setTargetSheetId] = useState("");
  const [newTargetSheetId, setNewTargetSheetId] = useState("");

  // State baru untuk fitur revisi
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [selectedStudentForRevision, setSelectedStudentForRevision] = useState(null);
  const [revisionFeedback, setRevisionFeedback] = useState("");
  const [showAnswerHistory, setShowAnswerHistory] = useState(false);
  const [selectedStudentHistory, setSelectedStudentHistory] = useState(null);

  // State untuk mengatasi slide flicker
  const [slideLoading, setSlideLoading] = useState(true);
  const [slideReady, setSlideReady] = useState(false);
  const [slideError, setSlideError] = useState(false);

  const studentSlideRef = useRef(null);
  const instructorSlideRef = useRef(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // --- ANTI THEFT & SECURITY ---
  useEffect(() => {
    const handleContextMenu = (e) => { e.preventDefault(); return false; };
    const handleKeyDown = (e) => {
        if (e.keyCode === 123) { e.preventDefault(); return false; }
        if (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74 || e.keyCode === 67)) { e.preventDefault(); return false; }
        if (e.ctrlKey && e.keyCode === 85) { e.preventDefault(); return false; }
        if (e.key === 'Escape' && isExpanded) { setIsExpanded(false); }
    };
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

  // PERBAIKAN: Fungsi getEmbedUrl - tanpa cache buster otomatis
  const getEmbedUrl = (docId, forceRefresh = false) => {
      if (!docId) return null;
      
      const safeId = docId;
      const baseUrlPrefix = safeId.startsWith('2PACX') ? '/d/e/' : '/d/';
      
      // Parameter minimal - TANPA cache buster otomatis
      const params = new URLSearchParams({
        start: 'false',
        loop: 'false',
        delayms: '60000'
      });
      
      // HANYA tambahkan cache buster jika diminta secara eksplisit
      if (forceRefresh) {
        params.append('nocache', slideCacheKey);
      }
      
      return `https://docs.google.com/presentation${baseUrlPrefix}${safeId}/embed?${params.toString()}`;
  };

  // Fungsi untuk refresh slide secara manual (misal: saat login atau ganti slide)
  const refreshSlide = () => {
    const newCacheKey = Date.now().toString().slice(-6);
    setSlideCacheKey(newCacheKey);
    showNotif("Presentation refreshed!");
  };

  const toggleFullScreen = async (ref) => {
      if (isExpanded) { setIsExpanded(false); return; }
      if (!ref.current) return;
      try {
          if (!document.fullscreenElement) { await ref.current.requestFullscreen(); } 
          else { if (document.exitFullscreen) await document.exitFullscreen(); }
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
              { username: 'admin', password: 'Adminworkshop123!', role: 'ADMIN', name: 'Super Admin' },
              { username: 'demo', password: 'Instruktur123!', role: 'INSTRUCTOR', name: 'Demo Instruktur' }
          ];
      };
      const saveMockDB = (data) => localStorage.setItem('mock_db_instructors', JSON.stringify(data));
      const instructors = getMockDB();

      if (params.action === 'saveMaterials') { localStorage.setItem('mock_materials', params.data); return { result: 'success' }; }
      if (params.action === 'getMaterials') { const stored = localStorage.getItem('mock_materials'); return { result: 'success', data: stored ? JSON.parse(stored) : null }; }

      if (params.action === 'auth_instructor') {
          const encodedPass = params.password; 
          const user = instructors.find(u => u.username === params.username.toLowerCase());
          if (user) {
              if (secureEncode(user.password) === encodedPass) {
                  return { result: 'success', role: user.role, username: user.username, name: user.name };
              }
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
          return { result: "success", users: [{userId: 'd1', name: 'Demo User', username: 'demo', step: 1, status: 'PENDING', answer: 'Jawaban demo'}], slideId: DEFAULT_SLIDE_ID, step: 1, status: 'PENDING' };
      }
      if (params.action === 'login') return { result: "success", userId: "DEMO_USER", username: "demo", name: "Siswa Demo", step: 1, status: "PENDING", slideId: DEFAULT_SLIDE_ID, answer: '' };
      if (params.action === 'request_revision') return { result: "success" };
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
      const response = await Promise.race([ fetch(GOOGLE_SCRIPT_URL, { method: "POST", body: formData, credentials: 'omit', }), timeout ]);
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
    } finally { setLoading(false); }
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
      if (res && res.result === 'success' && res.data) { setMaterials(res.data); } 
      else { setMaterials(DEFAULT_WORKSHOP_STEPS); }
  };

  const saveMaterials = async () => {
      const res = await callAPI({ action: 'saveMaterials', data: JSON.stringify(materials) });
      if (res && res.result === 'success') { showNotif("Materi berhasil disimpan!"); setShowMaterialEditor(false); } 
      else { showNotif("Gagal menyimpan materi."); }
  };

  // PERBAIKAN: useEffect awal
  useEffect(() => {
    const savedUser = localStorage.getItem('workshop_user');
    const savedSlideId = localStorage.getItem('workshop_slide_id');
    
    // Set slide loading true di awal
    setSlideLoading(true);
    
    if (savedUser) { 
      try { 
        const parsed = JSON.parse(savedUser);
        setUserData(parsed); 
        
        // Jika ada slide ID yang disimpan, gunakan itu
        if (savedSlideId) {
          setCurrentSlideId(savedSlideId);
          // Refresh slide saat login pertama kali
          refreshSlide();
          setTimeout(() => {
            setSlideReady(true);
            setSlideLoading(false);
          }, 100);
        } else {
          setTimeout(() => {
            setSlideReady(true);
            setSlideLoading(false);
          }, 300);
        }
        
        setView('student'); 
        fetchMaterials(); 
      } catch(e){
        console.error("Error loading saved user:", e);
        setSlideLoading(false);
      }
    }
    
    const savedInstructor = sessionStorage.getItem('workshop_instructor_session');
    if (savedInstructor) { 
      try { 
        setActiveInstructorSession(JSON.parse(savedInstructor)); 
        
        // Untuk instruktur, fetch slide ID dari server
        const fetchInstructorSlide = async () => {
          const res = await callAPI({ action: 'getAllUsers' });
          if (res && res.result === 'success' && res.slideId) {
            setCurrentSlideId(res.slideId);
            localStorage.setItem('workshop_slide_id', res.slideId);
            // Refresh slide untuk instruktur juga
            refreshSlide();
          }
          setSlideReady(true);
          setSlideLoading(false);
        };
        
        fetchInstructorSlide();
        setView('instructor_dashboard'); 
      } catch(e){
        console.error("Error loading instructor session:", e);
        setSlideLoading(false);
      } 
    }
    
    const savedLockout = localStorage.getItem('login_lockout_until');
    if (savedLockout && new Date().getTime() < parseInt(savedLockout)) setLockoutTime(parseInt(savedLockout));
    const savedSheetId = localStorage.getItem('workshop_target_sheet_id');
    if (savedSheetId) { setTargetSheetId(savedSheetId); setNewTargetSheetId(savedSheetId); }
  }, []);

  const handleInstructorLogin = async (e) => {
      e.preventDefault();
      setLoginError(""); 
      if (!instructorUsername || !instructorPass) { setLoginError("Username dan Password harus diisi."); return; }
      if (lockoutTime) { 
          if (new Date().getTime() < lockoutTime) { setLoginError(`Akun terkunci karena terlalu banyak percobaan. Tunggu 5 menit.`); return; } 
          else { setLockoutTime(null); localStorage.removeItem('login_lockout_until'); setLoginAttempts(0); }
      }
      const encodedPassword = secureEncode(instructorPass);
      const res = await callAPI({ action: 'auth_instructor', username: instructorUsername, password: encodedPassword });
      if (res && res.result === 'success') {
          const session = { username: res.username, role: res.role, name: res.name };
          setActiveInstructorSession(session);
          sessionStorage.setItem('workshop_instructor_session', JSON.stringify(session));
          setInstructorUsername(""); setInstructorPass(""); setLoginAttempts(0);
          fetchMaterials();
          
          // Ambil slide ID untuk instruktur
          setSlideLoading(true);
          const slideRes = await callAPI({ action: 'getAllUsers' });
          if (slideRes && slideRes.result === 'success' && slideRes.slideId) {
            setCurrentSlideId(slideRes.slideId);
            localStorage.setItem('workshop_slide_id', slideRes.slideId);
            // Refresh slide setelah login
            refreshSlide();
          }
          
          setTimeout(() => {
            setSlideReady(true);
            setSlideLoading(false);
            if (loginTarget === 'dashboard') { setView('instructor_dashboard'); showNotif(`Selamat datang, ${res.name}`); }
            else if (loginTarget === 'settings') { setView('admin_settings'); showNotif('Masuk ke Pengaturan Admin'); }
          }, 300);
      } else {
          const newAttempts = loginAttempts + 1; setLoginAttempts(newAttempts);
          if (newAttempts >= 5) { 
              const lockout = new Date().getTime() + (5 * 60 * 1000); setLockoutTime(lockout); localStorage.setItem('login_lockout_until', lockout); 
              setLoginError('Terlalu banyak percobaan. Akun dikunci 5 menit.'); 
          } else { setLoginError(String(res?.message || "Username atau Password salah.")); }
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
    
    setSlideLoading(true); // Set loading true sebelum request
    setSlideError(false);
    setSlideReady(false);
    
    const action = authMode === 'register' ? 'register' : 'login';
    const payload = authMode === 'register' ? { action, username: authInput.username, name: authInput.name } : { action, username: authInput.username };
    
    const res = await callAPI(payload);
    
    if (res && res.result === 'success') {
        const userObj = { 
          userId: res.userId, 
          username: res.username, 
          name: res.name, 
          step: res.step, 
          status: res.status,
          answer: res.answer || ''
        };
        setUserData(userObj);
        
        // SIMPAN SLIDE ID KE CACHE
        if (res.slideId) {
            setCurrentSlideId(res.slideId);
            localStorage.setItem('workshop_slide_id', res.slideId);
            // Refresh slide saat login pertama kali
            refreshSlide();
        }
        
        fetchMaterials(); 
        localStorage.setItem('workshop_user', JSON.stringify(userObj)); 
        
        // Tunggu state terupdate sebelum render slide
        setTimeout(() => {
          setSlideReady(true);
          setSlideLoading(false);
          setView('student');
        }, 300);
        
    } else { 
        showNotif(String(res?.message || "Gagal login.")); 
        setSlideLoading(false);
        setSlideReady(false);
    }
  };

  const requestLogout = () => setShowLogoutConfirm(true);
  const confirmLogout = () => {
      localStorage.removeItem('workshop_user'); 
      localStorage.removeItem('workshop_slide_id');
      sessionStorage.removeItem('workshop_instructor_session');
      setActiveInstructorSession(null); 
      setUserData({ name: '', username: '', userId: '', step: 1, status: 'PENDING', answer: '' });
      setAuthInput({ username: '', name: '' }); 
      setCurrentSlideId(null);
      setSlideReady(false);
      setSlideLoading(true);
      setSlideCacheKey(Date.now().toString().slice(-6)); // Reset cache key
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

  // --- SYNC LOGIC OPTIMIZED untuk mencegah slide flicker ---
  useEffect(() => {
    let interval;
    if (view === 'student') {
      const poll = async () => {
          if (!userData.userId) return;
          
          const res = await callAPI({ action: 'getStatus', userId: userData.userId });
          if (res && res.result === 'success') {
              // Hanya update state jika ada perubahan nyata
              const stepChanged = res.step !== userData.step;
              const statusChanged = res.status !== userData.status;
              
              if (stepChanged || statusChanged) {
                  setUserData(prev => ({ 
                      ...prev, 
                      step: res.step, 
                      status: res.status 
                  }));
                  
                  if (statusChanged) {
                      if (res.status === 'APPROVED' && res.step > userData.step) showNotif("Anda telah di-approve!");
                      if (res.status === 'NEED_REVISION' && userData.status !== 'NEED_REVISION') showNotif("Instruktur meminta revisi jawaban Anda!");
                  }
              }
              
              // HANYA update slideId jika benar-benar berbeda
              if (res.slideId && res.slideId !== currentSlideId) {
                  setCurrentSlideId(res.slideId);
                  localStorage.setItem('workshop_slide_id', res.slideId);
                  // Refresh slide saat slide ID berubah
                  refreshSlide();
                  showNotif("Presentation updated!");
              }
          }
      };
      poll(); 
      interval = setInterval(poll, 5000);
    }
    
    if (view === 'instructor_dashboard') {
      const fetchInstr = async () => {
        const res = await callAPI({ action: 'getAllUsers' });
        if (res && res.result === 'success') {
          // Simpan data lama untuk perbandingan
          const oldData = instructorData;
          
          if (Array.isArray(res.users)) { 
            const newData = Array.from(new Map(res.users.map(item => [item.userId, item])).values());
            
            // Hanya update jika ada perubahan
            const dataChanged = JSON.stringify(oldData) !== JSON.stringify(newData);
            if (dataChanged) {
              setInstructorData(newData);
            }
          }
          
          // HANYA update slideId jika benar-benar berbeda
          if (res.slideId && res.slideId !== currentSlideId) {
            setCurrentSlideId(res.slideId);
            localStorage.setItem('workshop_slide_id', res.slideId);
            // Refresh slide saat slide ID berubah
            refreshSlide();
          }
        }
      };
      fetchInstr(); 
      interval = setInterval(fetchInstr, 8000);
    }
    return () => clearInterval(interval);
  }, [view, userData.userId, userData.step, userData.status, currentSlideId, instructorData]);

  const updateSlideIdConfig = async () => {
      if (!newSlideIdInput) return showNotif("Masukkan ID Slide");
      let cleanId = newSlideIdInput;
      const match = newSlideIdInput.match(/\/d\/(?:e\/)?([a-zA-Z0-9-_]+)/);
      if (match && match[1]) cleanId = match[1];
      
      setSlideLoading(true);
      await callAPI({ action: 'setSlideId', slideId: cleanId });
      setCurrentSlideId(cleanId);
      localStorage.setItem('workshop_slide_id', cleanId);
      // Refresh slide saat ID slide diganti
      refreshSlide();
      setShowSlideConfigModal(false);
      
      setTimeout(() => {
        setSlideLoading(false);
      }, 300);
      
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

  const approveStudent = async (targetId) => { 
    await callAPI({ action: 'approve', userId: targetId }); 
    showNotif("Siswa Approved."); 
    fetchStudents(); 
  };

  // Fungsi baru untuk request revisi
  const requestRevision = async (studentId, feedback) => {
    const res = await callAPI({ 
        action: 'request_revision', 
        userId: studentId, 
        feedback,
        answer: "REVISION_REQUESTED"
    });
    if (res && res.result === 'success') {
        showNotif("Permintaan revisi dikirim ke siswa.");
        setShowRevisionModal(false);
        setRevisionFeedback("");
        fetchStudents();
    } else {
        showNotif(res?.message || "Gagal mengirim permintaan revisi.");
    }
  };

  const handleStudentSubmit = async (answer) => { 
    await callAPI({ action: 'submitTask', userId: userData.userId, answer }); 
    setUserData(prev => ({ ...prev, status: 'WAITING_APPROVAL' })); 
    showNotif("Jawaban terkirim."); 
  };

  const handleNextLevel = async () => { 
    const nextStep = userData.step + 1; 
    await callAPI({ action: 'updateStep', userId: userData.userId, step: nextStep }); 
    setUserData(prev => ({ ...prev, step: nextStep, status: 'PENDING' })); 
    setStudentInput(""); 
  };

  const handleUpdateMaterial = (field, value) => { 
    setEditingMaterial(prev => ({ ...prev, [field]: value })); 
  };

  const saveEditingMaterial = () => { 
    const updatedMaterials = materials.map(m => m.id === editingMaterial.id ? editingMaterial : m); 
    setMaterials(updatedMaterials); 
    setEditingMaterial(null); 
  };

  // --- FITUR TAMBAH STEP/MATERI BARU ---
  const handleAddNewStep = () => {
    const newId = materials.length > 0 ? Math.max(...materials.map(m => m.id)) + 1 : 1;
    const newStep = {
      id: newId,
      title: "Step Baru",
      duration: "15 Menit",
      icon: "BookOpen",
      description: "Deskripsi step baru",
      content: "Konten atau tugas untuk step baru ini"
    };
    
    setMaterials([...materials, newStep]);
    setEditingMaterial(newStep);
    showNotif("Step baru telah ditambahkan. Silakan edit kontennya.");
  };

  const handleDeleteStep = (stepId) => {
    if (materials.length <= 1) {
      showNotif("Tidak dapat menghapus satu-satunya step yang ada!");
      return;
    }
    
    if (!window.confirm(`Apakah Anda yakin ingin menghapus step ini?`)) return;
    
    // Jangan izinkan menghapus step yang sedang digunakan siswa
    const isStepInUse = instructorData.some(student => student.step === stepId);
    if (isStepInUse) {
      showNotif("Tidak dapat menghapus step yang sedang digunakan siswa!");
      return;
    }
    
    const updatedMaterials = materials.filter(m => m.id !== stepId);
    // Reorder IDs untuk menjaga konsistensi
    const reorderedMaterials = updatedMaterials.map((m, index) => ({
      ...m,
      id: index + 1
    }));
    
    setMaterials(reorderedMaterials);
    if (editingMaterial && editingMaterial.id === stepId) {
      setEditingMaterial(null);
    }
    showNotif("Step berhasil dihapus!");
  };

  const handleReorderStep = (stepId, direction) => {
    const currentIndex = materials.findIndex(m => m.id === stepId);
    if (currentIndex === -1) return;
    
    let newIndex;
    if (direction === 'up' && currentIndex > 0) {
      newIndex = currentIndex - 1;
    } else if (direction === 'down' && currentIndex < materials.length - 1) {
      newIndex = currentIndex + 1;
    } else {
      return;
    }
    
    const updatedMaterials = [...materials];
    const [movedItem] = updatedMaterials.splice(currentIndex, 1);
    updatedMaterials.splice(newIndex, 0, movedItem);
    
    // Update IDs untuk menjaga urutan
    const reorderedMaterials = updatedMaterials.map((m, index) => ({
      ...m,
      id: index + 1
    }));
    
    setMaterials(reorderedMaterials);
    if (editingMaterial && editingMaterial.id === stepId) {
      setEditingMaterial(reorderedMaterials[newIndex]);
    }
    showNotif("Urutan step telah diubah!");
  };

  // --- RENDER AUTH VIEW ---
  if (view === 'recover') {
      return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50 flex items-center justify-center p-4 font-sans" onContextMenu={(e) => e.preventDefault()}>
            <div className="bg-white/80 backdrop-blur-md p-8 rounded-3xl shadow-2xl w-full max-w-md border border-white/50">
                <button onClick={() => { setView('auth'); setRecoveredUser(null); }} className="text-gray-500 mb-4 flex items-center gap-2 hover:text-indigo-600 transition"><ArrowLeft size={16}/> Kembali</button>
                <h2 className="text-2xl font-bold mb-2 text-gray-800">Lupa Username?</h2>
                {!recoveredUser ? (
                    <form onSubmit={() => { setRecoveredUser({foundUsername: 'demo', foundName: 'Siswa Demo'}); }} className="space-y-4">
                        <input type="text" className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white/50 transition" placeholder="Nama Lengkap" value={recoverName} onChange={e => setRecoverName(e.target.value)}/>
                        <button type="button" onClick={async () => {
                             setLoading(true);
                             const res = await callAPI({action: 'recover', name: recoverName});
                             setLoading(false);
                             if(res.result === 'success') setRecoveredUser(res);
                             else showNotif(res.message);
                        }} disabled={loading} className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white py-3 rounded-xl font-bold shadow-lg shadow-indigo-200 transition transform active:scale-95">{loading ? "Mencari..." : "Cari Akun Saya"}</button>
                    </form>
                ) : (
                    <div className="bg-green-50 p-6 rounded-2xl border border-green-200 text-center animate-fade-in">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"><CheckCircle size={32} className="text-green-600"/></div>
                        <p className="text-green-800 font-medium">Akun Ditemukan!</p>
                        <div className="my-6"><p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Username Anda</p><p className="text-3xl font-bold text-gray-900 tracking-wider font-mono bg-white py-3 rounded-xl border border-green-100 shadow-sm select-all">{recoveredUser.foundUsername}</p></div>
                        <button onClick={() => { setView('auth'); setAuthInput({...authInput, username: recoveredUser.foundUsername}); }} className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-bold shadow-lg shadow-green-100 transition">Login Sekarang</button>
                    </div>
                )}
            </div>
        </div>
      );
  }

  if (view === 'auth') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50 flex flex-col items-center justify-center p-4 font-sans" onContextMenu={(e) => e.preventDefault()}>
        {notification && <div className="fixed top-4 bg-gray-900/90 backdrop-blur text-white px-6 py-3 rounded-full shadow-2xl z-50 animate-fade-in-up border border-gray-700">{notification}</div>}
        <div className="bg-white/80 backdrop-blur-xl p-8 rounded-3xl shadow-2xl w-full max-w-md relative border border-white/50">
          {isOfflineMode && <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-yellow-100 text-yellow-800 px-4 py-1 rounded-full text-xs font-bold shadow-sm flex items-center gap-1 border border-yellow-200"><WifiOff size={12}/> Mode Demo (Offline)</div>}
          <div className="text-center mb-8">
              <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl mx-auto flex items-center justify-center mb-4 shadow-lg shadow-indigo-200 transform rotate-3 hover:rotate-6 transition duration-300">
                  <Rocket size={40} className="text-white" />
              </div>
              <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">App in 90 Mins</h1>
              <p className="text-gray-500 font-medium">Workshop Interactive Guide</p>
          </div>
          <div className="flex bg-gray-100/80 p-1.5 rounded-2xl mb-6">
              <button onClick={() => setAuthMode('login')} className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all duration-300 ${authMode === 'login' ? 'bg-white shadow-md text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}>Masuk</button>
              <button onClick={() => setAuthMode('register')} className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all duration-300 ${authMode === 'register' ? 'bg-white shadow-md text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}>Daftar</button>
          </div>
          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-1">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide ml-1">Username Peserta</label>
                <input type="text" className="w-full p-4 bg-white border border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition font-medium text-gray-700" placeholder="Contoh: budi99" value={authInput.username} onChange={e => setAuthInput({...authInput, username: e.target.value.replace(/\s/g, '')})}/>
            </div>
            {authMode === 'register' && (
                <div className="animate-fade-in space-y-1">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide ml-1">Nama Lengkap</label>
                    <input type="text" className="w-full p-4 bg-white border border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition font-medium text-gray-700" placeholder="Contoh: Budi Santoso" value={authInput.name} onChange={e => setAuthInput({...authInput, name: e.target.value})}/>
                </div>
            )}
            <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white py-4 rounded-xl font-bold shadow-xl shadow-indigo-200 hover:shadow-indigo-300 transition transform active:scale-[0.98] flex justify-center items-center gap-2 mt-4">
                {loading ? <Loader className="animate-spin" size={20}/> : (authMode === 'register' ? "Mulai Workshop Sekarang" : "Masuk ke Kelas")}
            </button>
          </form>
          {authMode === 'login' && (<button onClick={() => setView('recover')} className="block w-full text-center text-xs font-semibold text-indigo-500 mt-4 hover:text-indigo-700 transition">Lupa Username?</button>)}
          <div className="mt-8 pt-6 border-t border-gray-100 grid grid-cols-2 gap-3">
             <button onClick={() => { setLoginTarget('dashboard'); setView('instructor_login'); setLoginError(""); }} className="flex items-center justify-center gap-2 text-xs font-bold text-gray-500 hover:text-indigo-600 py-3 rounded-xl hover:bg-indigo-50 transition group"><Monitor size={14} className="group-hover:scale-110 transition"/> Login Instruktur</button>
             <button onClick={() => { setLoginTarget('settings'); setView('instructor_login'); setLoginError(""); }} className="flex items-center justify-center gap-2 text-xs font-bold text-gray-500 hover:text-indigo-600 py-3 rounded-xl hover:bg-indigo-50 transition group"><Settings size={14} className="group-hover:scale-110 transition"/> Admin / Pengaturan</button>
          </div>
        </div>
      </div>
    );
  }

  // INSTRUCTOR / ADMIN LOGIN
  if (view === 'instructor_login') {
      return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 font-sans" onContextMenu={(e) => e.preventDefault()}>
          <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md text-center border border-gray-100">
            {lockoutTime && <div className="mb-4 bg-red-50 border border-red-100 text-red-600 p-3 rounded-xl text-xs font-medium flex items-center justify-center gap-2 animate-bounce"><AlertTriangle size={14}/> Akun terkunci sementara. Tunggu 5 menit.</div>}
            
            <div className="mb-6 inline-block p-4 bg-indigo-50 rounded-full"><Lock size={32} className="text-indigo-600"/></div>
            <h2 className="text-2xl font-bold mb-2 text-gray-900">{loginTarget === 'dashboard' ? 'Login Instruktur' : 'Login Admin'}</h2>
            <p className="text-sm text-gray-500 mb-8">Silakan masukkan kredensial Anda untuk melanjutkan.</p>
            
            <form onSubmit={handleInstructorLogin} className="text-left space-y-4">
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide ml-1 mb-1">Username</label>
                    <input required type="text" className="w-full p-4 border border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition" placeholder="Username (e.g. admin)" value={instructorUsername} onChange={e => setInstructorUsername(e.target.value)} disabled={!!lockoutTime}/>
                </div>
                
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide ml-1 mb-1">Password</label>
                    <div className="relative">
                        <input 
                            required 
                            type={showPassword ? "text" : "password"} 
                            className="w-full p-4 border border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition pr-12" 
                            placeholder="••••••••" 
                            value={instructorPass} 
                            onChange={e => setInstructorPass(e.target.value)}
                            disabled={!!lockoutTime}
                        />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 transition" disabled={!!lockoutTime}>
                            {showPassword ? <EyeOff size={20}/> : <Eye size={20}/>}
                        </button>
                    </div>
                </div>
                
                {loginError && (
                    <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl flex items-start gap-2 text-left animate-fade-in border border-red-100">
                        <AlertCircle size={16} className="mt-0.5 shrink-0"/>
                        <div className="font-medium">{loginError}</div>
                    </div>
                )}

                <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setView('auth')} className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold transition">Batal</button>
                    <button type="submit" disabled={!!lockoutTime || loading} className="flex-1 py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-bold disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition shadow-lg">
                        {loading ? <Loader className="animate-spin" size={18}/> : "Masuk"}
                    </button>
                </div>
            </form>
          </div>
        </div>
      )
  }

  // ADMIN SETTINGS
  if (view === 'admin_settings') {
      const isAdmin = activeInstructorSession?.role === 'ADMIN';
      return (
        <div className="min-h-screen bg-gray-50 font-sans flex flex-col" onContextMenu={(e) => e.preventDefault()}>
            {showLogoutConfirm && (<div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in"><div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl"><h3 className="text-xl font-bold text-gray-900 mb-2">Keluar Aplikasi?</h3><div className="flex gap-3 mt-4"><button onClick={() => setShowLogoutConfirm(false)} className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold">Batal</button><button onClick={confirmLogout} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold">Ya, Keluar</button></div></div></div>)}
            {notification && <div className="fixed top-4 right-4 bg-gray-900 text-white px-6 py-3 rounded-lg shadow-xl z-50 animate-bounce">{notification}</div>}

            <header className="bg-white border-b p-4 flex items-center justify-between shadow-sm sticky top-0 z-20">
                <div className="flex items-center gap-3"><div className="bg-indigo-100 p-2 rounded-xl"><Settings size={20} className="text-indigo-600"/></div><div><h1 className="text-xl font-bold text-gray-900">Pengaturan Admin</h1><p className="text-xs text-gray-500">Halo, {activeInstructorSession?.name}</p></div></div>
                <button onClick={requestLogout} className="text-sm font-bold text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg transition">Keluar</button>
            </header>
            <main className="flex-1 p-6 max-w-5xl mx-auto w-full overflow-y-auto">
                <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
                    <button onClick={() => setActiveSettingsTab('db')} className={`px-5 py-2.5 rounded-xl font-bold whitespace-nowrap transition-all ${activeSettingsTab === 'db' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'}`}><Database size={16} className="inline mr-2"/> Database (DB)</button>
                    <button onClick={() => setActiveSettingsTab('code')} className={`px-5 py-2.5 rounded-xl font-bold whitespace-nowrap transition-all ${activeSettingsTab === 'code' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'}`}><Code size={16} className="inline mr-2"/> Backend (GAS)</button>
                    <button onClick={() => { setActiveSettingsTab('users'); fetchInstructorList(); }} className={`px-5 py-2.5 rounded-xl font-bold whitespace-nowrap transition-all ${activeSettingsTab === 'users' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'}`}><Users size={16} className="inline mr-2"/> Manajemen Instruktur</button>
                </div>
                <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-8 min-h-[400px]">
                    {activeSettingsTab === 'db' && (
                        <div className="space-y-8 animate-fade-in">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 mb-2">Konfigurasi Database</h3>
                                <div className="bg-blue-50 p-4 rounded-xl text-sm text-blue-800 mb-4 border border-blue-100 flex items-start gap-3"><Database size={20} className="shrink-0 mt-0.5"/><div><strong>Multi-Tenancy Mode:</strong> Pisahkan data workshop dengan memasukkan ID Spreadsheet berbeda. Kosongkan untuk menggunakan database default.</div></div>
                                <div className="flex gap-3">
                                    <input type="text" value={newTargetSheetId} onChange={e => setNewTargetSheetId(e.target.value)} placeholder="Target Spreadsheet ID (Optional)..." className="flex-1 p-4 border border-gray-200 rounded-xl font-mono text-sm focus:ring-4 focus:ring-indigo-100 outline-none transition"/>
                                    <button onClick={saveTargetSheetId} className="bg-green-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-green-700 shadow-lg shadow-green-100 transition">Simpan</button>
                                </div>
                            </div>
                            <div className="p-6 bg-gray-50 rounded-2xl border border-gray-200">
                                <h4 className="font-bold text-gray-500 text-xs uppercase tracking-wider mb-2">Database Aktif Saat Ini</h4>
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white rounded-lg border border-gray-200"><Database size={20} className={targetSheetId ? "text-green-600" : "text-gray-400"}/></div>
                                    <code className="text-gray-900 font-mono text-sm break-all bg-white px-3 py-1 rounded border border-gray-200">{targetSheetId ? targetSheetId : "MASTER DATABASE (Default)"}</code>
                                </div>
                            </div>
                        </div>
                    )}
                    {activeSettingsTab === 'code' && (
                        <div className="h-full flex flex-col animate-fade-in">
                            <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 mb-4 text-sm text-amber-800 flex items-start gap-3"><ShieldCheck size={20} className="mt-0.5 shrink-0 text-amber-600"/><div><p className="font-bold">Penting:</p><p>Update kode di Apps Script jika ingin mengaktifkan fitur login baru.</p></div></div>
                            <div className="relative group flex-1"><textarea readOnly className="w-full h-96 p-6 font-mono text-xs text-gray-300 bg-gray-900 rounded-2xl resize-none focus:outline-none" value={BACKEND_CODE_DISPLAY}/><button onClick={copyScriptToClipboard} className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 backdrop-blur-md transition border border-white/10"><Copy size={14}/> Salin Kode</button></div>
                        </div>
                    )}
                    {activeSettingsTab === 'users' && (
                        <div className="animate-fade-in">
                            <div className="flex justify-between items-center mb-6"><h3 className="text-lg font-bold text-gray-900">Daftar Instruktur</h3>{isAdmin && <button onClick={() => setShowAddInstructor(true)} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-indigo-700 transition shadow-lg shadow-indigo-100"><UserPlus size={18}/> Tambah Instruktur</button>}</div>
                            {showAddInstructor && (
                                <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200 mb-8 animate-fade-in-up shadow-inner"><h4 className="font-bold text-sm mb-4 text-gray-800">Tambah Instruktur Baru</h4><div className="flex gap-3 mb-3"><input type="text" placeholder="Username (tanpa spasi)" className="flex-1 p-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none" value={newInstructor.username} onChange={e => setNewInstructor({...newInstructor, username: e.target.value.replace(/\s/g,'')})}/><input type="text" placeholder="Nama Lengkap" className="flex-1 p-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none" value={newInstructor.name} onChange={e => setNewInstructor({...newInstructor, name: e.target.value})}/></div><div className="text-xs text-gray-500 mb-4 bg-white px-3 py-2 rounded border border-gray-200 inline-block">Password default: <strong className="font-mono text-indigo-600">Instruktur123!</strong></div><div className="flex gap-3"><button onClick={handleAddInstructor} className="bg-green-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-green-700 transition shadow-md">Simpan</button><button onClick={() => setShowAddInstructor(false)} className="bg-white text-gray-700 border border-gray-300 px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-gray-50 transition">Batal</button></div></div>
                            )}
                            <div className="overflow-hidden rounded-2xl border border-gray-200"><table className="w-full text-left text-sm"><thead className="bg-gray-50 text-gray-500 font-bold border-b border-gray-200"><tr><th className="p-4">Nama</th><th className="p-4">Username</th><th className="p-4">Role</th><th className="p-4 text-right">Aksi</th></tr></thead><tbody className="divide-y divide-gray-100 bg-white">{instructorList?.map((user) => (<tr key={user.username} className="hover:bg-gray-50 transition"><td className="p-4 font-bold text-gray-800">{user.name}</td><td className="p-4 font-mono text-xs text-gray-500 bg-gray-50 w-min rounded px-2 py-1">{user.username}</td><td className="p-4"><span className={`px-2.5 py-1 rounded-full text-xs font-bold ${user.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>{user.role}</span></td><td className="p-4 text-right flex justify-end gap-2">{(isAdmin || activeInstructorSession?.username === user.username) && (<button onClick={() => { setNewPasswordInput(""); setShowPasswordChange(user.username); }} className="text-indigo-600 hover:bg-indigo-100 p-2 rounded-lg transition" title="Ganti Password"><Key size={18}/></button>)}{isAdmin && user.role !== 'ADMIN' && (<button onClick={() => handleDeleteInstructor(user.username)} className="text-red-600 hover:bg-red-100 p-2 rounded-lg transition" title="Hapus User"><Trash2 size={18}/></button>)}</td></tr>))}</tbody></table></div>
                            {showPasswordChange && (
                                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm"><div className="bg-white p-8 rounded-3xl w-full max-w-sm shadow-2xl animate-fade-in-up"><h3 className="font-bold text-xl mb-1">Ganti Password</h3><p className="text-sm text-gray-500 mb-6">User: {showPasswordChange}</p><input type="password" placeholder="Password Baru" className="w-full p-4 border border-gray-200 rounded-xl mb-6 focus:ring-4 focus:ring-indigo-100 outline-none" value={newPasswordInput} onChange={e => setNewPasswordInput(e.target.value)}/><div className="flex gap-3"><button onClick={() => handleResetPassword(showPasswordChange)} className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition shadow-lg shadow-indigo-100">Simpan</button><button onClick={() => setShowPasswordChange(false)} className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-200 transition">Batal</button></div></div></div>
                            )}
                        </div>
                    )}
                </div>
            </main>
        </div>
      );
  }

  // INSTRUCTOR DASHBOARD VIEW dengan fitur revisi
  if (view === 'instructor_dashboard') {
    return (
      <div className="min-h-screen bg-gray-50 font-sans pb-20" onContextMenu={(e) => e.preventDefault()}>
        {showSlideConfigModal && (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in"><div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl"><h3 className="text-xl font-bold text-gray-900 mb-2">Ganti Slide Presentasi</h3><input type="text" value={newSlideIdInput} onChange={e => setNewSlideIdInput(e.target.value)} placeholder="Contoh: https://docs.google.com/presentation/d/..." className="w-full p-3 border border-gray-300 rounded-lg mb-4 font-mono text-xs"/><div className="flex gap-3"><button onClick={() => setShowSlideConfigModal(false)} className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg font-bold">Batal</button><button onClick={updateSlideIdConfig} className="flex-1 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700">Simpan</button></div></div></div>
        )}
        
        {/* MODAL REQUEST REVISION */}
        {showRevisionModal && (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Minta Revisi Jawaban</h3>
                    <p className="text-sm text-gray-500 mb-4">
                        Untuk: <span className="font-bold">{selectedStudentForRevision?.name}</span>
                    </p>
                    
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Feedback untuk siswa:
                        </label>
                        <textarea 
                            value={revisionFeedback}
                            onChange={(e) => setRevisionFeedback(e.target.value)}
                            className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 outline-none resize-none"
                            placeholder="Berikan penjelasan apa yang perlu diperbaiki siswa..."
                            autoFocus
                        />
                    </div>
                    
                    <div className="flex gap-3">
                        <button 
                            onClick={() => {
                                setShowRevisionModal(false);
                                setRevisionFeedback("");
                            }}
                            className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg font-bold hover:bg-gray-200 transition"
                        >
                            Batal
                        </button>
                        <button 
                            onClick={() => requestRevision(selectedStudentForRevision.userId, revisionFeedback)}
                            className="flex-1 py-2 bg-yellow-500 text-white rounded-lg font-bold hover:bg-yellow-600 transition flex items-center justify-center gap-2"
                        >
                            <Send size={16}/> Kirim Permintaan
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* MODAL HISTORY JAWABAN */}
        {showAnswerHistory && selectedStudentHistory && (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                <div className="bg-white rounded-2xl p-6 max-w-2xl w-full shadow-2xl max-h-[80vh] flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <h3 className="text-xl font-bold text-gray-900">History Jawaban</h3>
                            <p className="text-sm text-gray-500">
                                {selectedStudentHistory.name} (@{selectedStudentHistory.username})
                            </p>
                        </div>
                        <button 
                            onClick={() => {
                                setShowAnswerHistory(false);
                                setSelectedStudentHistory(null);
                            }}
                            className="p-2 hover:bg-gray-100 rounded-full transition"
                        >
                            <X size={24} className="text-gray-500"/>
                        </button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                        {(() => {
                            const answer = selectedStudentHistory.answer;
                            if (!answer || answer === '-') {
                                return <div className="text-center text-gray-400 py-8">Belum ada jawaban</div>;
                            }
                            
                            const parts = answer.split('\n\n--- ');
                            return parts.map((part, index) => {
                                if (part.startsWith('FEEDBACK INSTRUKTUR ---\n')) {
                                    return (
                                        <div key={index} className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Users size={16} className="text-yellow-600"/>
                                                <span className="text-sm font-bold text-yellow-700">FEEDBACK INSTRUKTUR</span>
                                            </div>
                                            <p className="text-gray-700 whitespace-pre-wrap">
                                                {part.replace('FEEDBACK INSTRUKTUR ---\n', '')}
                                            </p>
                                        </div>
                                    );
                                } else if (part.startsWith('REVISI ---\n')) {
                                    return (
                                        <div key={index} className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                                            <div className="flex items-center gap-2 mb-2">
                                                <RefreshCw size={16} className="text-blue-600"/>
                                                <span className="text-sm font-bold text-blue-700">REVISI SISWA</span>
                                            </div>
                                            <p className="text-gray-700 whitespace-pre-wrap italic">
                                                {part.replace('REVISI ---\n', '')}
                                            </p>
                                        </div>
                                    );
                                } else {
                                    return (
                                        <div key={index} className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Send size={16} className="text-gray-600"/>
                                                <span className="text-sm font-bold text-gray-700">
                                                    {index === 0 ? 'JAWABAN AWAL' : 'JAWABAN'}
                                                </span>
                                            </div>
                                            <p className="text-gray-700 whitespace-pre-wrap italic">
                                                {part}
                                            </p>
                                        </div>
                                    );
                                }
                            });
                        })()}
                    </div>
                </div>
            </div>
        )}

        {/* MODAL EDIT MATERIALS dengan fitur tambah step */}
        {showMaterialEditor && (
             <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                <div className="bg-white rounded-3xl p-8 max-w-5xl w-full h-[85vh] flex flex-col shadow-2xl overflow-hidden">
                    <div className="flex justify-between items-center mb-6 shrink-0">
                        <div>
                            <h3 className="text-2xl font-bold text-gray-900">Edit Materi Workshop</h3>
                            <p className="text-sm text-gray-500">Sesuaikan konten kurikulum untuk kelas ini.</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <button 
                            onClick={handleAddNewStep}
                            className="bg-green-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-green-700 transition shadow-lg shadow-green-100"
                          >
                            <Plus size={16}/> Tambah Step
                          </button>
                          <button onClick={() => { setShowMaterialEditor(false); setEditingMaterial(null); }} className="p-2 hover:bg-gray-100 rounded-full transition"><X size={24} className="text-gray-500"/></button>
                        </div>
                    </div>
                    
                    <div className="flex-1 overflow-hidden flex gap-6">
                        <div className="w-1/3 border-r border-gray-100 pr-6 overflow-y-auto space-y-3">
                             {materials.map((m, index) => (
                                 <div 
                                    key={m.id} 
                                    onClick={() => setEditingMaterial(m)}
                                    className={`p-4 rounded-xl cursor-pointer border transition-all duration-200 group ${editingMaterial?.id === m.id ? 'bg-indigo-50 border-indigo-200 ring-2 ring-indigo-100 shadow-md' : 'bg-white border-gray-100 hover:bg-gray-50 hover:border-gray-200'}`}
                                 >
                                     <div className="flex items-center justify-between mb-2">
                                         <span className={`text-xs font-bold px-2 py-1 rounded-lg ${editingMaterial?.id === m.id ? 'bg-indigo-200 text-indigo-800' : 'bg-gray-100 text-gray-600'}`}>Step {m.id}</span>
                                         <div className="flex items-center gap-1">
                                           <span className="text-xs text-gray-400 font-medium">{m.duration}</span>
                                           
                                           {/* Tombol kontrol untuk reorder dan hapus */}
                                           <div className="flex items-center gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                             <button 
                                               onClick={(e) => {
                                                 e.stopPropagation();
                                                 handleReorderStep(m.id, 'up');
                                               }}
                                               disabled={index === 0}
                                               className={`p-1 rounded ${index === 0 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:text-indigo-600 hover:bg-indigo-50'}`}
                                               title="Pindah ke atas"
                                             >
                                               <ChevronRight size={12} className="transform -rotate-90"/>
                                             </button>
                                             <button 
                                               onClick={(e) => {
                                                 e.stopPropagation();
                                                 handleReorderStep(m.id, 'down');
                                               }}
                                               disabled={index === materials.length - 1}
                                               className={`p-1 rounded ${index === materials.length - 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:text-indigo-600 hover:bg-indigo-50'}`}
                                               title="Pindah ke bawah"
                                             >
                                               <ChevronRight size={12} className="transform rotate-90"/>
                                             </button>
                                             <button 
                                               onClick={(e) => {
                                                 e.stopPropagation();
                                                 handleDeleteStep(m.id);
                                               }}
                                               className="p-1 rounded text-gray-500 hover:text-red-600 hover:bg-red-50"
                                               title="Hapus step"
                                             >
                                               <Trash2 size={12}/>
                                             </button>
                                           </div>
                                         </div>
                                     </div>
                                     <h4 className={`font-bold text-sm line-clamp-1 ${editingMaterial?.id === m.id ? 'text-indigo-900' : 'text-gray-700'}`}>{m.title}</h4>
                                 </div>
                             ))}
                        </div>

                        <div className="w-2/3 pl-2 overflow-y-auto">
                            {editingMaterial ? (
                                <div className="space-y-5 animate-fade-in pb-4">
                                    <div className="grid grid-cols-3 gap-5">
                                        <div className="col-span-2">
                                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Judul Tahapan</label>
                                            <input type="text" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none transition" value={editingMaterial.title} onChange={e => handleUpdateMaterial('title', e.target.value)} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Durasi</label>
                                            <input type="text" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition" value={editingMaterial.duration} onChange={e => handleUpdateMaterial('duration', e.target.value)} />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Deskripsi Singkat</label>
                                        <input type="text" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 focus:ring-2 focus:ring-indigo-500 outline-none transition" value={editingMaterial.description} onChange={e => handleUpdateMaterial('description', e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Konten / Tugas Lengkap</label>
                                        <textarea className="w-full h-64 p-4 bg-gray-50 border border-gray-200 rounded-xl text-sm leading-relaxed text-gray-700 focus:ring-2 focus:ring-indigo-500 outline-none transition resize-none" value={editingMaterial.content} onChange={e => handleUpdateMaterial('content', e.target.value)} />
                                    </div>
                                    <div className="flex justify-between items-center pt-2 border-t border-gray-100 mt-4">
                                        <div className="text-xs text-orange-500 bg-orange-50 px-3 py-1 rounded-full font-medium">Perubahan belum disimpan ke database</div>
                                        <button onClick={saveEditingMaterial} className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-blue-700 transition shadow-lg shadow-blue-100">
                                            <CheckCircle size={16}/> Update Draft
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-gray-400 bg-gray-50/50 rounded-2xl border-2 border-dashed border-gray-200">
                                    <div className="p-4 bg-white rounded-full shadow-sm mb-4"><Edit3 size={32} className="text-indigo-300"/></div>
                                    <p className="text-sm font-medium">Pilih materi di sebelah kiri untuk mulai mengedit</p>
                                    <p className="text-xs text-gray-400 mt-2">Atau klik "Tambah Step" untuk membuat step baru</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="mt-6 pt-6 border-t border-gray-100 flex justify-between items-center shrink-0">
                         <div className="text-sm text-gray-500">
                           <span className="font-bold">{materials.length}</span> step tersedia • 
                           <span className="ml-2">Gunakan tombol <span className="font-bold text-indigo-600">↑↓</span> untuk mengubah urutan</span>
                         </div>
                         <div className="flex gap-3">
                           <button onClick={() => setShowMaterialEditor(false)} className="px-6 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition">Tutup</button>
                           <button onClick={saveMaterials} className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-xl shadow-indigo-200 flex items-center gap-2 transition transform active:scale-95">
                              <Save size={18}/> Simpan Permanen ke Database
                           </button>
                         </div>
                    </div>
                </div>
             </div>
        )}

        {showLogoutConfirm && (<div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in"><div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl"><h3 className="text-xl font-bold text-gray-900 mb-2">Keluar Aplikasi?</h3><div className="flex gap-3 mt-4"><button onClick={() => setShowLogoutConfirm(false)} className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold">Batal</button><button onClick={confirmLogout} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold">Ya, Keluar</button></div></div></div>)}
        {notification && <div className="fixed top-4 right-4 bg-gray-900 text-white px-6 py-3 rounded-lg shadow-xl z-50 animate-bounce">{notification}</div>}

        <header className="bg-white/90 backdrop-blur-md border-b border-indigo-100 p-4 sticky top-0 z-30 shadow-sm flex flex-wrap gap-4 justify-between items-center">
          <div className="flex items-center gap-4">
              <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-200"><Users size={24} /></div>
              <div><h1 className="font-extrabold text-lg text-gray-900 leading-tight">Dashboard Mengajar</h1><p className="text-xs text-indigo-600 font-medium bg-indigo-50 inline-block px-2 py-0.5 rounded mt-0.5">{activeInstructorSession?.name}</p></div>
          </div>
          <div className="flex items-center gap-3 bg-gray-50 px-2 py-1.5 rounded-xl border border-gray-200 shadow-inner">
              <Monitor size={18} className="text-gray-400 ml-2"/>
              <div className="h-6 w-px bg-gray-300 mx-1"></div>
              <button onClick={() => { setNewSlideIdInput(currentSlideId); setShowSlideConfigModal(true); }} className="hover:bg-white p-2 rounded-lg text-gray-600 hover:text-indigo-600 transition shadow-sm" title="Ganti URL Slide"><Edit3 size={16}/></button>
              <button onClick={refreshSlide} className="hover:bg-white p-2 rounded-lg text-gray-600 hover:text-indigo-600 transition shadow-sm" title="Refresh Slide"><RefreshCw size={16}/></button>
          </div>
          
          <div className="flex items-center gap-3">
             <button onClick={() => setShowMaterialEditor(true)} className="bg-white border border-gray-200 hover:border-indigo-300 text-gray-700 hover:text-indigo-700 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition shadow-sm group">
                 <div className="p-1 bg-indigo-50 rounded group-hover:bg-indigo-100 transition"><FileText size={14} className="text-indigo-600"/></div> Edit Materi
             </button>
             <div className="w-px h-8 bg-gray-200 mx-1"></div>
             <button onClick={fetchStudents} className="p-2.5 hover:bg-gray-100 text-gray-500 rounded-xl transition" title="Refresh Data"><RefreshCw size={20} className={loading ? "animate-spin" : ""} /></button>
             <button onClick={requestLogout} className="bg-red-50 hover:bg-red-100 text-red-600 px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2"><LogOut size={14}/> Keluar</button>
          </div>
        </header>
        <main className="p-6 max-w-7xl mx-auto space-y-8">
          <div className="bg-white p-1 rounded-2xl shadow-xl border border-gray-100 overflow-hidden relative">
            <div className="absolute top-4 left-4 z-10 flex items-center gap-3 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 text-white">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                <span className="text-xs font-bold tracking-wide">LIVE PREVIEW</span>
            </div>
            <button onClick={() => toggleFullScreen(instructorSlideRef)} className="absolute bottom-4 right-4 z-10 bg-white/90 text-gray-800 p-2.5 rounded-xl hover:bg-indigo-600 hover:text-white backdrop-blur-md transition shadow-lg flex items-center gap-2 group" title="Layar Penuh">
                {isExpanded ? <Minimize size={18}/> : <Maximize size={18}/>}
                <span className="text-xs font-bold pr-1 hidden group-hover:inline-block transition-all">{isExpanded ? 'Keluar' : 'Fullscreen'}</span>
            </button>
            <div ref={instructorSlideRef} className={`bg-gray-900 rounded-xl overflow-hidden relative group transition-all duration-300 ${isExpanded ? 'fixed inset-0 z-[100] w-screen h-screen rounded-none border-0' : 'aspect-video w-full'}`}>
                {slideLoading || !slideReady || !currentSlideId ? (
                    <SlideSkeleton />
                ) : (
                    <iframe 
                        key={`instructor_slide_${currentSlideId}_${slideCacheKey}`}
                        src={getEmbedUrl(currentSlideId, false)}
                        className="w-full h-full" 
                        allowFullScreen={true} 
                        title="Slide Preview"
                        onLoad={() => setSlideLoading(false)}
                        onError={() => {
                            setSlideError(true);
                            setSlideLoading(false);
                        }}
                    />
                )}
            </div>
          </div>
          
          <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                  <h3 className="font-bold text-gray-800 flex items-center gap-2"><Users size={18} className="text-gray-400"/> Daftar Peserta Aktif</h3>
                  <span className="text-xs font-medium text-gray-500 bg-white px-3 py-1 rounded-full border border-gray-200">{instructorData.length} Siswa</span>
              </div>
              <div className="overflow-x-auto">
                  <table className="w-full text-left">
                      <thead className="bg-gray-50 border-b border-gray-100">
                          <tr>
                              <th className="p-5 text-xs font-bold text-gray-500 uppercase tracking-wider">Peserta</th>
                              <th className="p-5 text-xs font-bold text-gray-500 uppercase tracking-wider">Progress</th>
                              <th className="p-5 text-xs font-bold text-gray-500 uppercase tracking-wider">Jawaban Terkini</th>
                              <th className="p-5 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Aksi</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                          {instructorData?.map((student) => {
                            const hasFeedback = student.answer && student.answer.includes("--- FEEDBACK INSTRUKTUR ---");
                            const originalAnswer = hasFeedback ? 
                                student.answer.split("\n\n--- FEEDBACK INSTRUKTUR ---")[0] : 
                                student.answer;
                            const feedbackText = hasFeedback ? 
                                student.answer.split("\n\n--- FEEDBACK INSTRUKTUR ---")[1] : 
                                null;
                            
                            return (
                                <tr key={student.userId} className="hover:bg-indigo-50/30 transition group">
                                    <td className="p-5 align-top">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold text-sm shadow-sm">
                                                {student.name.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="font-bold text-gray-900">{student.name}</div>
                                                <div className="text-xs text-gray-500 font-mono">@{student.username}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-5 align-top pt-7">
                                        <div className="relative pt-1">
                                            <div className="flex mb-2 items-center justify-between">
                                                <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-indigo-600 bg-indigo-100">
                                                    Step {student.step}
                                                </span>
                                            </div>
                                            <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-indigo-100">
                                                <div style={{ width: `${(student.step / materials.length) * 100}%` }} 
                                                     className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-indigo-500 transition-all duration-500">
                                                </div>
                                            </div>
                                            <div className={`text-xs font-bold px-2 py-1 rounded ${student.status === 'NEED_REVISION' ? 'bg-yellow-100 text-yellow-800' : 
                                                                        student.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                                                                        student.status === 'WAITING_APPROVAL' ? 'bg-blue-100 text-blue-800' :
                                                                        'bg-gray-100 text-gray-800'}`}>
                                                {student.status}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-5 align-top pt-6 max-w-xs">
                                        {student.answer !== '-' ? 
                                            <div className="space-y-3">
                                                <div className="text-sm text-gray-600 bg-white border border-gray-200 p-3 rounded-xl shadow-sm relative">
                                                    <div className="absolute -top-2 left-4 w-3 h-3 bg-white border-t border-l border-gray-200 transform rotate-45"></div>
                                                    <div className="max-h-24 overflow-y-auto">
                                                        {hasFeedback ? (
                                                            <div>
                                                                <div className="text-gray-500 text-xs font-bold mb-1 flex items-center gap-1">
                                                                    <AlertCircle size={10}/> PERLU REVISI
                                                                </div>
                                                                <div className="text-gray-700 italic">
                                                                    "{originalAnswer?.substring(0, 100) || ''}..."
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="italic">
                                                                "{student.answer?.substring(0, 120) || ''}..."
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                
                                                <button 
                                                    onClick={() => {
                                                        setSelectedStudentHistory(student);
                                                        setShowAnswerHistory(true);
                                                    }}
                                                    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 hover:bg-indigo-50 px-2 py-1 rounded transition"
                                                >
                                                    <FileText size={12}/> Lihat History Jawaban
                                                </button>
                                            </div> : 
                                            <span className="text-gray-300 text-sm flex items-center gap-1">
                                                <Loader size={12} className="animate-spin"/> Menunggu...
                                            </span>
                                        }
                                    </td>
                                    <td className="p-5 text-right align-top pt-6 space-y-2">
                                        {student.status === 'WAITING_APPROVAL' ? 
                                            <div className="flex flex-col gap-2">
                                                <button 
                                                    onClick={() => approveStudent(student.userId)} 
                                                    className="bg-green-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-green-700 shadow-lg shadow-green-100 hover:shadow-green-200 transition transform active:scale-95 flex items-center justify-center gap-2"
                                                >
                                                    <CheckCircle size={14}/> Approve
                                                </button>
                                                <button 
                                                    onClick={() => {
                                                        setSelectedStudentForRevision(student);
                                                        setRevisionFeedback("");
                                                        setShowRevisionModal(true);
                                                    }}
                                                    className="bg-yellow-500 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-yellow-600 shadow-lg shadow-yellow-100 hover:shadow-yellow-200 transition transform active:scale-95 flex items-center justify-center gap-2"
                                                >
                                                    <Edit3 size={14}/> Minta Revisi
                                                </button>
                                            </div> : 
                                        student.status === 'NEED_REVISION' ? 
                                            <div className="space-y-2">
                                                <div className="text-xs font-bold text-yellow-700 bg-yellow-100 px-3 py-1.5 rounded-lg border border-yellow-200">
                                                    Menunggu Revisi Siswa
                                                </div>
                                                <button 
                                                    onClick={() => {
                                                        setSelectedStudentForRevision(student);
                                                        setRevisionFeedback(feedbackText || "Perlu perbaikan lebih lanjut.");
                                                        setShowRevisionModal(true);
                                                    }}
                                                    className="text-xs text-yellow-700 hover:text-yellow-900 font-medium flex items-center gap-1 hover:bg-yellow-50 px-2 py-1 rounded transition"
                                                >
                                                    <Edit3 size={12}/> Edit Feedback
                                                </button>
                                            </div> :
                                        student.status === 'APPROVED' ? 
                                            <span className="text-xs font-bold text-green-700 bg-green-100 px-3 py-1.5 rounded-lg border border-green-200 flex items-center gap-1">
                                                <CheckCircle size={12}/> Approved
                                            </span> :
                                            <span className="text-xs font-bold text-gray-500 bg-gray-100 px-3 py-1.5 rounded-lg">
                                                {student.status}
                                            </span>
                                        }
                                    </td>
                                </tr>
                            )
                          })}
                      </tbody>
                  </table>
              </div>
          </div>
        </main>
      </div>
    );
  }

  // STUDENT VIEW dengan fitur revisi
  const currentStepData = materials.find(s => s.id === userData.step) || materials[materials.length - 1];
  const isFinished = userData.step > materials.length;
  const isApproved = userData.status === 'APPROVED';
  const isWaiting = userData.status === 'WAITING_APPROVAL';
  const needsRevision = userData.status === 'NEED_REVISION';
  
  // Parse feedback jika ada
  const hasFeedback = userData.answer && userData.answer.includes("--- FEEDBACK INSTRUKTUR ---");
  const feedbackText = hasFeedback ? 
      userData.answer.split("\n\n--- FEEDBACK INSTRUKTUR ---")[1] : 
      null;

  return (
    <div className="flex h-screen bg-gray-50 font-sans overflow-hidden">
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in"><div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center"><div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4"><LogOut size={32} className="text-red-500"/></div><h3 className="text-xl font-bold text-gray-900 mb-2">Keluar Aplikasi?</h3><p className="text-sm text-gray-500 mb-6">Progres Anda akan disimpan secara otomatis.</p><div className="flex gap-3"><button onClick={() => setShowLogoutConfirm(false)} className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition">Batal</button><button onClick={confirmLogout} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 shadow-lg shadow-red-100 transition">Ya, Keluar</button></div></div></div>
      )}
      {notification && <div className="fixed top-4 right-4 bg-gray-900/90 text-white px-6 py-3 rounded-full shadow-2xl z-50 animate-bounce backdrop-blur border border-gray-700 text-sm font-medium">{notification}</div>}

      {/* MOBILE NAV OVERLAY */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 md:hidden backdrop-blur-sm transition-opacity" 
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* SIDEBAR NAVIGATION */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-80 bg-white border-r border-gray-200 flex flex-col transition-transform duration-300 ease-in-out shadow-2xl md:shadow-none
        md:relative md:translate-x-0
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <div className="flex items-center gap-4">
                <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-2.5 rounded-xl shadow-lg shadow-indigo-200"><User size={20} className="text-white"/></div>
                <div className="overflow-hidden">
                    <h2 className="font-bold text-gray-900 text-sm truncate w-32">{userData.name}</h2>
                    <p className="text-xs text-gray-500 font-mono">@{userData.username}</p>
                </div>
            </div>
            <button onClick={() => setMobileMenuOpen(false)} className="md:hidden text-gray-400 hover:text-gray-700 transition bg-white p-2 rounded-lg border border-gray-100 shadow-sm">
                <X size={20} />
            </button>
        </div>
        
        <div className="px-6 py-4">
            <button onClick={requestLogout} className="text-xs font-bold text-red-500 bg-red-50 hover:bg-red-100 hover:text-red-700 flex items-center justify-center gap-2 py-3 rounded-xl w-full transition border border-red-100">
                <LogOut size={14}/> Logout
            </button>
        </div>

        <div className="px-4 pb-4 space-y-2 flex-1 overflow-y-auto">
            <h3 className="px-2 text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 mt-2">Kurikulum</h3>
            {materials.map((step) => { 
                const isCurrent = userData?.step === step.id; 
                const isPast = userData?.step > step.id; 
                return (
                    <div key={step.id} className={`p-3 rounded-2xl flex items-center gap-4 transition-all duration-300 ${isCurrent ? 'bg-white shadow-lg shadow-indigo-100 border border-indigo-100 scale-[1.02]' : 'hover:bg-gray-50 border border-transparent'}`}>
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors ${isPast ? 'bg-green-100 text-green-600' : isCurrent ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'bg-gray-100 text-gray-400'}`}>
                            {isPast ? <CheckCircle size={18}/> : renderStepIcon(step.icon, 18)}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className={`text-sm font-bold truncate ${isCurrent ? 'text-indigo-900' : 'text-gray-600'}`}>{step.title}</p>
                            <p className="text-[10px] text-gray-400 mt-0.5">{step.duration}</p>
                        </div>
                        {isCurrent && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></div>}
                    </div>
                )
            })}
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden md:static relative bg-gray-50">
        <div className="md:hidden h-16 bg-white/80 backdrop-blur-md border-b flex items-center justify-between px-4 shrink-0 z-30 shadow-sm sticky top-0">
            <div className="flex items-center gap-2 font-bold text-gray-800">
                <div className="bg-indigo-600 p-1.5 rounded-lg text-white"><Rocket size={16}/></div>
                <span>Workshop</span>
            </div>
            <button onClick={() => setMobileMenuOpen(true)} className="p-2 text-gray-600 bg-gray-100 rounded-xl active:bg-gray-200 transition">
                <Menu size={24}/>
            </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div ref={studentSlideRef} className={`bg-gray-900 shadow-2xl relative shrink-0 group transition-all duration-300 ${isExpanded ? 'fixed inset-0 z-[100] w-screen h-screen' : 'aspect-video w-full md:max-h-64 lg:max-h-80'}`}>
            {slideLoading || !slideReady || !currentSlideId ? (
              <SlideSkeleton />
            ) : slideError ? (
              <div className="w-full h-full bg-gray-900 flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <AlertTriangle size={48} className="mx-auto mb-4 text-yellow-500" />
                  <p>Unable to load presentation</p>
                  <button 
                    onClick={() => {
                      setSlideError(false);
                      setSlideLoading(true);
                      setTimeout(() => {
                        setSlideLoading(false);
                        setSlideReady(true);
                      }, 500);
                    }}
                    className="mt-4 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition"
                  >
                    Retry
                  </button>
                </div>
              </div>
            ) : (
              <iframe 
                key={`student_slide_${currentSlideId}_${slideCacheKey}`}
                src={getEmbedUrl(currentSlideId, false)}
                className="w-full h-full" 
                allowFullScreen={true} 
                title="Live Presentation"
                onLoad={() => {
                  setSlideLoading(false);
                  setSlideError(false);
                }}
                onError={() => {
                  setSlideError(true);
                  setSlideLoading(false);
                }}
              />
            )}
            
            <button onClick={() => toggleFullScreen(studentSlideRef)} className="absolute bottom-4 right-4 bg-white/10 text-white p-2.5 rounded-xl hover:bg-indigo-600 backdrop-blur-md border border-white/20 transition opacity-0 group-hover:opacity-100 flex items-center gap-2" title="Layar Penuh">
                {isExpanded ? <Minimize size={20}/> : <Maximize size={20}/>}
                {isExpanded && <span className="text-xs font-bold pr-1">Keluar</span>}
            </button>
          </div>

          <div className="p-6 md:p-8 max-w-5xl mx-auto pb-24">
            {!isFinished ? (
                <div className="animate-fade-in-up">
                    <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <span className="bg-indigo-100 text-indigo-700 px-4 py-1.5 rounded-full text-xs font-extrabold tracking-wider border border-indigo-200 shadow-sm">TAHAP {userData?.step}</span>
                            <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mt-3 leading-tight">{currentStepData?.title}</h1>
                        </div>
                        <div className="text-gray-500 text-sm font-medium flex items-center gap-2 bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100">
                            <Clock size={16} className="text-gray-400"/>
                            <span>{currentStepData?.duration}</span>
                        </div>
                    </div>
                    
                    <div className="bg-white border border-gray-100 rounded-3xl p-8 shadow-xl shadow-gray-200/50 mb-8 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-2 h-full bg-indigo-500"></div>
                        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2"><BookOpen size={20} className="text-indigo-500"/> Instruksi</h3>
                        <p className="text-gray-600 mb-8 leading-relaxed text-lg">{currentStepData?.content}</p>
                        
                        <div className={`p-6 rounded-2xl border transition-all duration-300 ${isApproved ? 'bg-green-50 border-green-100' : 
                                                                                         needsRevision ? 'bg-yellow-50 border-yellow-100' : 
                                                                                         isWaiting ? 'bg-blue-50 border-blue-100' : 
                                                                                         'bg-gray-50 border-gray-200'}`}>
                            <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center gap-2 uppercase tracking-wide">
                                <Send size={16} className={isApproved ? "text-green-600" : 
                                                              needsRevision ? "text-yellow-600" : 
                                                              "text-indigo-600"}/> 
                                {isApproved ? "Jawaban Anda (Disetujui)" : 
                                 needsRevision ? "Revisi Diperlukan" : 
                                 "Kirim Jawaban / Link"}
                            </label>
                            
                            {/* Tampilkan feedback instruktur jika perlu revisi */}
                            {needsRevision && feedbackText && (
                                <div className="mb-4 bg-yellow-100 border-l-4 border-yellow-500 p-4 rounded-r-lg">
                                    <div className="flex items-center gap-2 mb-2">
                                        <AlertTriangle size={16} className="text-yellow-600"/>
                                        <span className="font-bold text-yellow-800">Feedback Instruktur:</span>
                                    </div>
                                    <p className="text-yellow-700 whitespace-pre-wrap">
                                        {feedbackText}
                                    </p>
                                </div>
                            )}
                            
                            <textarea 
                                value={studentInput} 
                                onChange={(e) => setStudentInput(e.target.value)} 
                                disabled={isApproved} 
                                className={`w-full h-32 p-4 border rounded-xl focus:ring-4 outline-none transition text-gray-700 font-medium resize-none ${isApproved ? 'bg-white border-green-200 focus:ring-green-100' : 
                                                                                                                                         needsRevision ? 'bg-white border-yellow-200 focus:ring-yellow-100 focus:border-yellow-500' : 
                                                                                                                                         'bg-white border-gray-200 focus:ring-indigo-100 focus:border-indigo-500'}`} 
                                placeholder={isApproved ? "Jawaban Anda telah dikunci." : 
                                         needsRevision ? "Silakan perbaiki jawaban berdasarkan feedback di atas..." : 
                                         "Ketikan jawaban atau paste link hasil kerja di sini..."}
                            />
                            
                            <div className="flex flex-col md:flex-row justify-between items-center mt-4 gap-4">
                                <div className={`px-4 py-2 rounded-lg flex items-center gap-2 border ${isApproved ? 'bg-white text-green-700 border-green-200 shadow-sm' : 
                                                                                           needsRevision ? 'bg-white text-yellow-700 border-yellow-200 shadow-sm' : 
                                                                                           isWaiting ? 'bg-white text-blue-700 border-blue-200 shadow-sm' : 
                                                                                           'bg-gray-200 text-gray-500 border-transparent'}`}>
                                    {isApproved ? <CheckCircle size={16}/> : 
                                     needsRevision ? <AlertTriangle size={16} className="text-yellow-500"/> : 
                                     isWaiting ? <Loader size={16} className="animate-spin"/> : <HelpCircle size={16}/>}
                                    <span className="text-xs font-extrabold tracking-wide">
                                        {isApproved ? 'STATUS: DISETUJUI' : 
                                         needsRevision ? 'STATUS: PERLU REVISI' : 
                                         isWaiting ? 'STATUS: MENUNGGU REVIEW' : 'STATUS: BELUM DIKIRIM'}
                                    </span>
                                </div>
                                
                                {isApproved ? (
                                    <button onClick={handleNextLevel} className="w-full md:w-auto bg-green-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-green-700 flex items-center justify-center gap-2 shadow-lg shadow-green-200 transform hover:-translate-y-1 transition text-sm">
                                        Lanjut Materi Berikutnya <ChevronRight size={18}/>
                                    </button>
                                ) : needsRevision ? (
                                    <button onClick={() => handleStudentSubmit(studentInput)} disabled={!studentInput} className="w-full md:w-auto bg-yellow-500 text-white px-8 py-3 rounded-xl font-bold hover:bg-yellow-600 flex items-center justify-center gap-2 shadow-lg shadow-yellow-200 transform active:scale-95 text-sm">
                                        <RefreshCw size={16}/> Kirim Revisi
                                    </button>
                                ) : (
                                    <button onClick={() => handleStudentSubmit(studentInput)} disabled={!studentInput || isWaiting} className="w-full md:w-auto bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed transition shadow-lg shadow-indigo-200 transform active:scale-95 text-sm flex items-center justify-center gap-2">
                                        {isWaiting ? "Sedang Dikirim..." : <><Send size={16}/> Kirim Jawaban</>}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="text-center py-16 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl shadow-2xl shadow-indigo-200 text-white animate-fade-in-up relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                    <div className="relative z-10">
                        <div className="w-24 h-24 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl border border-white/30">
                            <Award size={48} className="text-yellow-300 drop-shadow-md" />
                        </div>
                        <h1 className="text-4xl md:text-5xl font-extrabold mb-4 tracking-tight">Selamat!</h1>
                        <p className="text-lg md:text-xl text-indigo-100 mb-8 max-w-lg mx-auto">Anda telah menyelesaikan seluruh tahapan workshop ini dengan sangat baik.</p>
                        <button onClick={requestLogout} className="bg-white text-indigo-600 px-8 py-3 rounded-xl font-bold hover:bg-gray-50 transition shadow-lg transform hover:-translate-y-1">Logout & Selesai</button>
                    </div>
                </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}