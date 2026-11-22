// ======================================
// GIST - Supabase Configuration
// ======================================

const SUPABASE_URL = "https://fnioecvkmnwwugqtykdk.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_jtUI6zIeKlH4y0Key2b4QQ_xWP7aDds";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

// ======================================
// DOM Elements
// ======================================

const menuToggle = document.getElementById("menuToggle");
const mainNav = document.getElementById("mainNav");

const departmentSelect = document.getElementById("departmentSelect");
const semesterSelect = document.getElementById("semesterSelect");
const resourceTitle = document.getElementById("resourceTitle");

const toast = document.getElementById("toast");
const authModal = document.getElementById("authModal");
const authMessage = document.getElementById("authMessage");

const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");

const loginButton = document.getElementById("loginButton");
const registerButton = document.getElementById("registerButton");
const authClose = document.getElementById("authClose");

const showLogin = document.getElementById("showLogin");
const showRegister = document.getElementById("showRegister");

// ======================================
// Mobile Navigation
// ======================================

menuToggle?.addEventListener("click", () => {
  const isOpen = mainNav.classList.toggle("open");

  menuToggle.setAttribute("aria-expanded", String(isOpen));
  menuToggle.textContent = isOpen ? "✕" : "☰";
});

mainNav?.querySelectorAll("a").forEach(link => {
  link.addEventListener("click", () => {
    mainNav.classList.remove("open");
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.textContent = "☰";
  });
});

// ======================================
// Learning Section Demo
// ======================================

function updateLearningTitle() {
  if (!departmentSelect || !semesterSelect || !resourceTitle) return;

  const department = departmentSelect.value;
  const semester = semesterSelect.value;

  const names = {
    Civil: "Civil Technology",
    Electrical: "Electrical Technology",
    Computer: "Computer Technology"
  };

  resourceTitle.textContent =
    `${names[department]} — ${semester} সেমিস্টার`;
}

if (semesterSelect) {
  for (let i = 1; i <= 8; i++) {
    const option = document.createElement("option");

    option.value = `${i}ম`;
    option.textContent = `${i}ম সেমিস্টার`;

    semesterSelect.appendChild(option);
  }
}

departmentSelect?.addEventListener("change", updateLearningTitle);
semesterSelect?.addEventListener("change", updateLearningTitle);

updateLearningTitle();

document.querySelectorAll("[data-dept]").forEach(link => {
  link.addEventListener("click", () => {
    if (departmentSelect) {
      departmentSelect.value = link.dataset.dept;
      updateLearningTitle();
    }
  });
});

// ======================================
// Toast Message
// ======================================

let toastTimer;

function showToast(message) {
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2600);
}

// ======================================
// Login / Registration Modal & Tabs
// ======================================

function switchToLoginTab() {
  if (loginForm) loginForm.hidden = false;
  if (registerForm) registerForm.hidden = true;

  showLogin?.classList.add("active");
  showRegister?.classList.remove("active");

  if (authMessage) authMessage.textContent = "";
}

function switchToRegisterTab() {
  if (loginForm) loginForm.hidden = true;
  if (registerForm) registerForm.hidden = false;

  showRegister?.classList.add("active");
  showLogin?.classList.remove("active");

  if (authMessage) authMessage.textContent = "";
}

function openAuthModal(tab = "login") {
  if (!authModal) return;

  authModal.classList.add("active");
  authModal.setAttribute("aria-hidden", "false");

  // মোবাইল মেনু খোলা থাকলে বন্ধ করে দেবে
  mainNav?.classList.remove("open");
  menuToggle?.setAttribute("aria-expanded", "false");
  if (menuToggle) menuToggle.textContent = "☰";

  if (tab === "register") {
    switchToRegisterTab();
  } else {
    switchToLoginTab();
  }
}

function closeAuthModal() {
  if (!authModal) return;

  authModal.classList.remove("active");
  authModal.setAttribute("aria-hidden", "true");
}

loginButton?.addEventListener("click", () => openAuthModal("login"));
registerButton?.addEventListener("click", () => openAuthModal("register"));
authClose?.addEventListener("click", closeAuthModal);

authModal?.addEventListener("click", event => {
  if (event.target === authModal) {
    closeAuthModal();
  }
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape" && authModal?.classList.contains("active")) {
    closeAuthModal();
  }
});

showLogin?.addEventListener("click", switchToLoginTab);
showRegister?.addEventListener("click", switchToRegisterTab);

// ======================================
// Load Departments from Supabase
// ======================================

async function loadDepartments() {
  const select = document.getElementById("regDepartment");
  if (!select) return;

  const { data, error } = await supabaseClient
    .from("departments")
    .select("id, name")
    .order("id");

  if (error) {
    console.error("Department Error:", error.message);
    if (authMessage) {
      authMessage.textContent =
        "Department লোড করা যায়নি। পরে আবার চেষ্টা করো।";
    }
    return;
  }

  select.innerHTML = '<option value="">Select Department</option>';

  data.forEach(dept => {
    const option = document.createElement("option");

    option.value = dept.id;
    option.textContent = dept.name;

    select.appendChild(option);
  });
}

// ======================================
// Footer Year
// ======================================

const yearEl = document.getElementById("year");
if (yearEl) {
  yearEl.textContent = new Date().getFullYear();
}

// ======================================
// Registration
// ======================================

registerForm?.addEventListener("submit", async event => {
  event.preventDefault();

  const submitButton =
    registerForm.querySelector('button[type="submit"]');

  const fullName =
    document.getElementById("regName").value.trim();

  const studentId =
    document.getElementById("regStudentId").value.trim();

  const email =
    document.getElementById("regEmail").value.trim();

  const password =
    document.getElementById("regPassword").value;

  const departmentId =
    document.getElementById("regDepartment").value;

  const semester =
    document.getElementById("regSemester").value;

  if (!departmentId || !semester) {
    if (authMessage) {
      authMessage.textContent = "Department ও Semester নির্বাচন করো।";
    }
    return;
  }

  if (submitButton) submitButton.disabled = true;
  if (authMessage) authMessage.textContent = "Account তৈরি হচ্ছে...";

  try {
    const { data, error } =
      await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            student_id: studentId,
            department_id: departmentId,
            semester_number: semester
          }
        }
      });

    if (error) throw error;

    if (authMessage) {
      if (data.session) {
        authMessage.textContent =
          "Registration সফল! Admin Approval-এর জন্য অপেক্ষা করো।";
      } else {
        authMessage.textContent =
          "Registration সফল! Email Confirmation প্রয়োজন হলে Email চেক করো।";
      }
    }

    registerForm.reset();

  } catch (error) {
    console.error("Registration Error:", error);
    if (authMessage) {
      authMessage.textContent = "Registration Error: " + error.message;
    }

  } finally {
    if (submitButton) submitButton.disabled = false;
  }
});

// ======================================
// Student Login
// ======================================

loginForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const message = document.getElementById("authMessage");
  const submitButton = loginForm.querySelector(
    'button[type="submit"]'
  );

  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;

  if (submitButton) submitButton.disabled = true;
  if (message) message.textContent = "Login হচ্ছে...";

  try {
    // Step 1: Authenticate student
    const { data, error } =
      await supabaseClient.auth.signInWithPassword({
        email,
        password
      });

    if (error) throw error;

    console.log("Authentication successful:", data.user.id);

    // Step 2: Load student profile
    const { data: profile, error: profileError } =
      await supabaseClient
        .from("profiles")
        .select("full_name, role, account_status")
        .eq("id", data.user.id)
        .maybeSingle();

    if (profileError) throw profileError;

    if (!profile) {
      throw new Error("Student profile পাওয়া যায়নি।");
    }

    // Step 3: Check approval
    if (profile.account_status !== "approved") {
      await supabaseClient.auth.signOut();

      if (message) {
        message.textContent =
          "তোমার Account এখনো Admin দ্বারা Approved হয়নি।";
      }

      return;
    }

    // Step 4: Redirect
    if (message) {
      message.textContent = "Login সফল! Dashboard-এ যাচ্ছি...";
    }

    window.location.href = "dashboard.html";

  } catch (error) {
    console.error("Login Error:", error);
    if (message) {
      message.textContent = "Login Error: " + error.message;
    }

  } finally {
    if (submitButton) submitButton.disabled = false;
  }
});

// ======================================
// Initialize
// ======================================

loadDepartments();