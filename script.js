
// ======================================
// GIST - Supabase Configuration
// ======================================

const SUPABASE_URL = "https://fnioecvkmnwwugqtykdk.supabase.co";
const SUPABASE_ANON_KEY ="sb_publishable_jtUI6zIeKlH4y0Key2b4QQ_xWP7aDds";

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
const authClose = document.getElementById("authClose");

const showLogin = document.getElementById("showLogin");
const showRegister = document.getElementById("showRegister");

// ======================================
// Mobile Navigation
// ======================================

menuToggle.addEventListener("click", () => {
  const isOpen = mainNav.classList.toggle("open");

  menuToggle.setAttribute("aria-expanded", String(isOpen));
  menuToggle.textContent = isOpen ? "✕" : "☰";
});

mainNav.querySelectorAll("a").forEach(link => {
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

for (let i = 1; i <= 8; i++) {
  const option = document.createElement("option");

  option.value = `${i}ম`;
  option.textContent = `${i}ম সেমিস্টার`;

  semesterSelect.appendChild(option);
}

departmentSelect.addEventListener("change", updateLearningTitle);
semesterSelect.addEventListener("change", updateLearningTitle);

updateLearningTitle();

document.querySelectorAll("[data-dept]").forEach(link => {
  link.addEventListener("click", () => {
    departmentSelect.value = link.dataset.dept;
    updateLearningTitle();
  });
});

// ======================================
// Toast Message
// ======================================

let toastTimer;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2600);
}

// ======================================
// Login Modal
// ======================================

function openAuthModal() {
  authModal.classList.add("active");
  authModal.setAttribute("aria-hidden", "false");
  authMessage.textContent = "";
}

function closeAuthModal() {
  authModal.classList.remove("active");
  authModal.setAttribute("aria-hidden", "true");
}

loginButton.addEventListener("click", openAuthModal);
authClose.addEventListener("click", closeAuthModal);

authModal.addEventListener("click", event => {
  if (event.target === authModal) {
    closeAuthModal();
  }
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape" && authModal.classList.contains("active")) {
    closeAuthModal();
  }
});

// ======================================
// Login / Registration Tabs
// ======================================

showLogin.addEventListener("click", () => {
  loginForm.hidden = false;
  registerForm.hidden = true;

  showLogin.classList.add("active");
  showRegister.classList.remove("active");

  authMessage.textContent = "";
});

showRegister.addEventListener("click", () => {
  loginForm.hidden = true;
  registerForm.hidden = false;

  showRegister.classList.add("active");
  showLogin.classList.remove("active");

  authMessage.textContent = "";
});

// ======================================
// Load Departments from Supabase
// ======================================

async function loadDepartments() {
  const select = document.getElementById("regDepartment");

  const { data, error } = await supabaseClient
    .from("departments")
    .select("id, name")
    .order("id");

  if (error) {
    console.error("Department Error:", error.message);
    authMessage.textContent =
      "Department লোড করা যায়নি। পরে আবার চেষ্টা করো।";
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

document.getElementById("year").textContent =
  new Date().getFullYear();

// ======================================
// Registration
// ======================================

registerForm.addEventListener("submit", async event => {
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
    authMessage.textContent =
      "Department ও Semester নির্বাচন করো।";
    return;
  }

  submitButton.disabled = true;
  authMessage.textContent = "Account তৈরি হচ্ছে...";

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

    if (data.session) {
      authMessage.textContent =
        "Registration সফল! Admin Approval-এর জন্য অপেক্ষা করো।";
    } else {
      authMessage.textContent =
        "Registration সফল! Email Confirmation প্রয়োজন হলে Email চেক করো।";
    }

    registerForm.reset();

  } catch (error) {
    console.error("Registration Error:", error);

    authMessage.textContent =
      "Registration Error: " + error.message;

  } finally {
    submitButton.disabled = false;
  }
});

// ======================================
// Student Login
// ======================================


loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const message = document.getElementById("authMessage");
  const submitButton = loginForm.querySelector(
    'button[type="submit"]'
  );

  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;

  submitButton.disabled = true;
  message.textContent = "Login হচ্ছে...";

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
      throw new Error("Student profile পাওয়া যায়নি।");
    }

    // Step 3: Check approval
    if (profile.account_status !== "approved") {
      await supabaseClient.auth.signOut();

      message.textContent =
        "তোমার Account এখনো Admin দ্বারা Approved হয়নি।";

      return;
    }

    // Step 4: Redirect
    message.textContent = "Login সফল! Dashboard-এ যাচ্ছি...";

    window.location.href = "dashboard.html";

  } catch (error) {
    console.error("Login Error:", error);
    message.textContent = "Login Error: " + error.message;

  } finally {
    submitButton.disabled = false;
  }
});


// ======================================
// Initialize
// ======================================

loadDepartments();
