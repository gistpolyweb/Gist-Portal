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
const navLinks = Array.from(document.querySelectorAll(".main-nav > a[href^='#']"));

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
// Mobile Navigation & Active Scroll Spy
// ======================================

function closeMobileMenu() {
  mainNav?.classList.remove("open");
  menuToggle?.setAttribute("aria-expanded", "false");
  if (menuToggle) menuToggle.textContent = "☰";
}

menuToggle?.addEventListener("click", () => {
  const isOpen = mainNav.classList.toggle("open");

  menuToggle.setAttribute("aria-expanded", String(isOpen));
  menuToggle.textContent = isOpen ? "✕" : "☰";
});

mainNav?.querySelectorAll("a").forEach(link => {
  link.addEventListener("click", () => {
    closeMobileMenu();
  });
});

function updateActiveNavLink() {
  if (!navLinks.length) return;

  const scrollPos = window.scrollY + 130;
  let currentId = "home";

  navLinks.forEach(link => {
    const targetId = link.getAttribute("href")?.slice(1);
    const section = targetId ? document.getElementById(targetId) : null;
    if (section && section.offsetTop <= scrollPos) {
      currentId = targetId;
    }
  });

  navLinks.forEach(link => {
    const isMatch = link.getAttribute("href") === `#${currentId}`;
    link.classList.toggle("active", isMatch);
  });
}

window.addEventListener("scroll", updateActiveNavLink, { passive: true });
window.addEventListener("load", updateActiveNavLink);

// ======================================
// Learning Section Live / Preview Logic
// ======================================

const resourceDesc = document.getElementById("resourceDesc");
const resourceBadge = document.getElementById("resourceBadge");
const previewSubjectsList = document.getElementById("previewSubjectsList");
const learningStatusNote = document.getElementById("learningStatusNote");

let departmentsCache = [];

const departmentKeywordsMap = {
  Civil: ["civil"],
  Electrical: ["electrical"],
  Computer: ["computer"]
};

const departmentDisplayMap = {
  Civil: "Civil Technology",
  Electrical: "Electrical Technology",
  Computer: "Computer Technology"
};

function getSemesterNumber(semesterValue) {
  if (!semesterValue) return 1;
  const match = String(semesterValue).match(/\d+/);
  return match ? Number(match[0]) : 1;
}

async function resolveDepartmentId(selectedDeptKey) {
  if (!departmentsCache.length) {
    const { data, error } = await supabaseClient
      .from("departments")
      .select("id, name")
      .order("id");

    if (!error && Array.isArray(data)) {
      departmentsCache = data;
    }
  }

  const keywords = departmentKeywordsMap[selectedDeptKey] || [selectedDeptKey.toLowerCase()];

  const matched = departmentsCache.find(dept => {
    const deptNameLower = String(dept.name || "").toLowerCase();
    return keywords.some(kw => deptNameLower.includes(kw));
  });

  if (matched) return matched.id;

  if (selectedDeptKey === "Electrical") return 1;
  if (selectedDeptKey === "Computer") return 3;
  return null;
}

async function renderLearningPreview() {
  if (!departmentSelect || !semesterSelect || !resourceTitle) return;

  const deptKey = departmentSelect.value;
  const semesterLabel = semesterSelect.value;
  const semesterNum = getSemesterNumber(semesterLabel);
  const deptFullName = departmentDisplayMap[deptKey] || deptKey;

  resourceTitle.textContent = `${deptFullName} — ${semesterLabel} সেমিস্টার`;

  if (previewSubjectsList) {
    previewSubjectsList.innerHTML = "";
  }

  if (resourceDesc) {
    resourceDesc.textContent = "এই সেমিস্টারের বিষয় ও কোর্স যাচাই করা হচ্ছে...";
  }

  if (resourceBadge) {
    resourceBadge.textContent = "লোড হচ্ছে...";
  }

  try {
    const deptId = await resolveDepartmentId(deptKey);

    let query = supabaseClient
      .from("subjects")
      .select("id, name, department_id, semester_number")
      .eq("semester_number", semesterNum)
      .order("id");

    if (deptId !== null && deptId !== undefined) {
      query = query.eq("department_id", deptId);
    }

    const { data: subjects, error } = await query;
    if (error) throw error;

    if (Array.isArray(subjects) && subjects.length > 0) {
      const subjectIds = subjects.map(s => s.id);

      let courseCountBySubject = {};
      if (subjectIds.length > 0) {
        const { data: coursesData, error: coursesError } = await supabaseClient
          .from("courses")
          .select("id, subject_id, title")
          .in("subject_id", subjectIds);

        if (!coursesError && Array.isArray(coursesData)) {
          coursesData.forEach(course => {
            courseCountBySubject[course.subject_id] =
              (courseCountBySubject[course.subject_id] || 0) + 1;
          });
        }
      }

      if (resourceBadge) {
        resourceBadge.textContent = `${subjects.length}টি বিষয়`;
      }

      if (resourceDesc) {
        resourceDesc.textContent = `${deptFullName}-এর ${semesterLabel} সেমিস্টারের বিষয়সমূহ (বিস্তারিত লেকচার দেখতে লগইন করুন):`;
      }

      if (previewSubjectsList) {
        subjects.forEach(sub => {
          const chip = document.createElement("button");
          chip.type = "button";
          const cCount = courseCountBySubject[sub.id] || 0;
          chip.textContent = cCount > 0 ? `${sub.name} (${cCount} কোর্স)` : sub.name;
          chip.style.cssText =
            "padding: 6px 13px; border-radius: 20px; border: 1px solid #bce5cc; background: #e6f6ec; color: #07834b; font-size: 12px; font-weight: 600; font-family: 'Hind Siliguri', sans-serif; cursor: pointer;";

          chip.addEventListener("click", () => {
            showToast(`"${sub.name}" এর কোর্স ও রিসোর্স দেখতে Student Portal-এ লগইন করুন।`);
          });

          previewSubjectsList.appendChild(chip);
        });
      }

      if (learningStatusNote) {
        learningStatusNote.textContent =
          "Supabase-এর subjects ও courses টেবিল থেকে লাইভ তথ্য দেখানো হচ্ছে।";
      }
      return;
    }

    if (resourceBadge) resourceBadge.textContent = "শীঘ্রই আসছে";
    if (resourceDesc) {
      resourceDesc.textContent = "এই সেমিস্টারের বিষয় ও লেকচার যুক্ত হলে এখানে দেখা যাবে।";
    }
    if (learningStatusNote) {
      learningStatusNote.textContent =
        "নির্বাচিত ডিপার্টমেন্ট ও সেমিস্টারের জন্য এখনো কোনো বিষয় যুক্ত করা হয়নি।";
    }
  } catch (err) {
    console.error("Learning preview error:", err);
    if (resourceBadge) resourceBadge.textContent = "শীঘ্রই আসছে";
    if (resourceDesc) {
      resourceDesc.textContent = "এই সেমিস্টারের বিষয় ও লেকচার যুক্ত হলে এখানে দেখা যাবে।";
    }
    if (learningStatusNote) {
      learningStatusNote.textContent =
        "Frontend Preview সক্রিয় আছে। RLS নীতি বা সংযোগ যাচাই করলে লাইভ বিষয় দেখা যাবে।";
    }
  }
}

if (semesterSelect) {
  for (let i = 1; i <= 8; i++) {
    const option = document.createElement("option");
    option.value = `${i}ম`;
    option.textContent = `${i}ম সেমিস্টার`;
    semesterSelect.appendChild(option);
  }
}

departmentSelect?.addEventListener("change", renderLearningPreview);
semesterSelect?.addEventListener("change", renderLearningPreview);

document.querySelectorAll("[data-dept]").forEach(link => {
  link.addEventListener("click", event => {
    const targetDept = link.dataset.dept;
    if (departmentSelect && targetDept) {
      departmentSelect.value = targetDept;
      renderLearningPreview();
    }

    const href = link.getAttribute("href");
    if (href && href.startsWith("#")) {
      const targetEl = document.querySelector(href);
      if (targetEl) {
        event.preventDefault();
        closeMobileMenu();
        targetEl.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  });
});

renderLearningPreview();

// ======================================
// File Direct Download Helper (Cross-Origin Safe)
// ======================================

async function triggerFileDownload(fileUrl, fallbackName = "notice-file", triggerBtn = null) {
  const originalLabel = triggerBtn ? triggerBtn.textContent : "";
  if (triggerBtn) {
    triggerBtn.disabled = true;
    triggerBtn.textContent = "ডাউনলোড হচ্ছে...";
  }

  try {
    const response = await fetch(fileUrl);
    if (!response.ok) throw new Error("Download failed");
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);

    const urlPath = new URL(fileUrl).pathname;
    const extractedName = decodeURIComponent(urlPath.split("/").pop() || fallbackName);

    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = extractedName;
    document.body.appendChild(a);
    a.click();
    a.remove();

    setTimeout(() => URL.revokeObjectURL(blobUrl), 4000);
  } catch (err) {
    window.open(fileUrl, "_blank", "noopener,noreferrer");
  } finally {
    if (triggerBtn) {
      triggerBtn.disabled = false;
      triggerBtn.textContent = originalLabel;
    }
  }
}

// ======================================
// Notice Board Live Loader (View & Download PDF / Image)
// ======================================

async function loadHomeNotices() {
  const noticeBoardList = document.getElementById("noticeBoardList");
  if (!noticeBoardList) return;

  try {
    const { data, error } = await supabaseClient
      .from("notices")
      .select("id, title, body, description, attachment_url, attachment_type, created_at")
      .order("id", { ascending: false })
      .limit(5);

    if (error || !Array.isArray(data) || data.length === 0) return;

    noticeBoardList.innerHTML = "";
    data.forEach(item => {
      const block = document.createElement("div");
      block.style.cssText = "padding: 14px 0; border-bottom: 1px solid rgba(0,0,0,0.08);";

      const tag = document.createElement("span");
      tag.className = "notice-tag";
      tag.textContent = "NOTICE";

      const strong = document.createElement("strong");
      strong.style.cssText = "display: block; margin-top: 6px; font-size: 16px;";
      strong.textContent = item.title || "";

      const small = document.createElement("small");
      small.style.cssText = "display: block; margin-top: 4px; line-height: 1.55;";
      small.textContent = item.description || item.body || "";

      block.append(tag, strong, small);

      if (item.attachment_url) {
        const isPdf =
          item.attachment_type === "pdf" ||
          String(item.attachment_url).toLowerCase().endsWith(".pdf");

        const actionBar = document.createElement("div");
        actionBar.style.cssText =
          "display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px;";

        const viewBtn = document.createElement("a");
        viewBtn.href = item.attachment_url;
        viewBtn.target = "_blank";
        viewBtn.rel = "noopener noreferrer";
        viewBtn.textContent = isPdf ? "📄 PDF বড় করে দেখুন" : "👁 ইমেজ বড় করে দেখুন";
        viewBtn.style.cssText =
          "display: inline-flex; align-items: center; gap: 5px; padding: 7px 13px; border-radius: 8px; background: #e8efff; color: #1e42b8; font-size: 13px; font-weight: 700; text-decoration: none;";

        const downloadBtn = document.createElement("button");
        downloadBtn.type = "button";
        downloadBtn.textContent = isPdf ? "⬇ PDF ডাউনলোড" : "⬇ ইমেজ ডাউনলোড";
        downloadBtn.style.cssText =
          "display: inline-flex; align-items: center; gap: 5px; padding: 7px 13px; border: 0; border-radius: 8px; background: #0b7a4b; color: #fff; font-size: 13px; font-weight: 700; font-family: 'Hind Siliguri', sans-serif; cursor: pointer;";

        downloadBtn.addEventListener("click", () => {
          triggerFileDownload(
            item.attachment_url,
            isPdf ? "notice.pdf" : "notice-image.jpg",
            downloadBtn
          );
        });

        actionBar.append(viewBtn, downloadBtn);

        if (isPdf) {
          const pdfFrame = document.createElement("iframe");
          pdfFrame.src = item.attachment_url;
          pdfFrame.title = item.title || "Notice PDF";
          pdfFrame.loading = "lazy";
          pdfFrame.style.cssText =
            "display: block; width: 100%; height: 320px; margin-top: 10px; border: 1px solid #d8e1f0; border-radius: 10px; background: #f8fafc;";
          block.append(pdfFrame, actionBar);
        } else {
          const imgLink = document.createElement("a");
          imgLink.href = item.attachment_url;
          imgLink.target = "_blank";
          imgLink.rel = "noopener noreferrer";

          const img = document.createElement("img");
          img.src = item.attachment_url;
          img.alt = item.title || "Notice Image";
          img.loading = "lazy";
          img.style.cssText =
            "display: block; max-width: 100%; max-height: 300px; margin-top: 10px; border-radius: 10px; border: 1px solid #e2e8f0; object-fit: contain;";

          imgLink.appendChild(img);
          block.append(imgLink, actionBar);
        }
      }

      noticeBoardList.appendChild(block);
    });

    if (noticeBoardList.lastElementChild) {
      noticeBoardList.lastElementChild.style.borderBottom = "none";
    }
  } catch (err) {
    console.error("Home notice load error:", err);
  }
}

loadHomeNotices();

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
  }, 2800);
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

  closeMobileMenu();

  if (tab === "register") {
    switchToRegisterTab();
    setTimeout(() => document.getElementById("regName")?.focus(), 50);
  } else {
    switchToLoginTab();
    setTimeout(() => document.getElementById("loginEmail")?.focus(), 50);
  }
}

function closeAuthModal() {
  if (!authModal) return;

  authModal.classList.remove("active");
  authModal.setAttribute("aria-hidden", "true");
}

window.openAuthModal = openAuthModal;

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
    const { data, error } =
      await supabaseClient.auth.signInWithPassword({
        email,
        password
      });

    if (error) throw error;

    console.log("Authentication successful:", data.user.id);

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

    if (profile.account_status !== "approved") {
      await supabaseClient.auth.signOut();

      if (message) {
        message.textContent =
          "তোমার Account এখনো Admin দ্বারা Approved হয়নি।";
      }

      return;
    }

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