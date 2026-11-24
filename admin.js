// ======================================
// GIST ADMIN DASHBOARD
// ======================================

const SUPABASE_URL = "https://fnioecvkmnwwugqtykdk.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_jtUI6zIeKlH4y0Key2b4QQ_xWP7aDds";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

let adminUser = null;

// ======================================
// ADMIN ACCESS CHECK
// ======================================

async function loadAdminDashboard() {
  const message = document.getElementById("adminMessage");

  try {
    message.textContent = "Checking Admin Access...";

    const { data, error } = await supabaseClient.auth.getSession();
    if (error) throw error;

    const user = data.session?.user;
    if (!user) {
      window.location.href = "index.html";
      return;
    }

    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("full_name, role, account_status")
      .eq("id", user.id)
      .single();

    if (profileError) throw profileError;

    if (profile.role !== "admin" || profile.account_status !== "approved") {
      alert("Admin permission required!");
      await supabaseClient.auth.signOut();
      window.location.href = "index.html";
      return;
    }

    adminUser = user;
    message.textContent = "Welcome Admin: " + profile.full_name;

    await Promise.all([loadStudents(), loadAllDepartments()]);
  } catch (error) {
    console.error(error);
    message.textContent = "Dashboard Error: " + error.message;
  }
}

// ======================================
// LOAD ALL STUDENTS
// ======================================

async function loadStudents() {
  const studentTable = document.getElementById("studentTable");
  const pendingTable = document.getElementById("pendingTable");

  studentTable.textContent = "Loading students...";
  pendingTable.textContent = "Loading requests...";

  const { data, error } = await supabaseClient
    .from("profiles")
    .select("id, full_name, student_id, role, account_status")
    .eq("role", "student")
    .order("full_name");

  if (error) {
    console.error(error);
    studentTable.textContent = error.message;
    pendingTable.textContent = error.message;
    return;
  }

  const students = data || [];
  const approved = students.filter(s => s.account_status === "approved").length;
  const pending = students.filter(s => s.account_status === "pending").length;
  const rejected = students.filter(s => s.account_status === "rejected").length;

  document.getElementById("totalStudents").textContent = students.length;
  document.getElementById("approvedStudents").textContent = approved;
  document.getElementById("pendingStudents").textContent = pending;
  document.getElementById("rejectedStudents").textContent = rejected;

  // ALL STUDENTS TABLE
  studentTable.innerHTML = "";
  if (students.length === 0) {
    studentTable.textContent = "No students found.";
  } else {
    const table = document.createElement("table");
    table.innerHTML = `
      <thead>
        <tr>
          <th>Name</th>
          <th>Student ID</th>
          <th>Role</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;
    const tbody = table.querySelector("tbody");

    students.forEach(student => {
      const tr = document.createElement("tr");
      [student.full_name || "N/A", student.student_id || "N/A", student.role || "student"].forEach(val => {
        const td = document.createElement("td");
        td.textContent = val;
        tr.appendChild(td);
      });

      const statusTd = document.createElement("td");
      const badge = document.createElement("span");
      badge.className = "status-badge status-" + student.account_status;
      badge.textContent = student.account_status || "unknown";
      statusTd.appendChild(badge);
      tr.appendChild(statusTd);

      tbody.appendChild(tr);
    });
    studentTable.appendChild(table);
  }

  // PENDING REQUEST TABLE
  pendingTable.innerHTML = "";
  const pendingStudents = students.filter(s => s.account_status === "pending");

  if (pendingStudents.length === 0) {
    pendingTable.textContent = "No pending registration requests.";
    return;
  }

  const table = document.createElement("table");
  table.innerHTML = `
    <thead>
      <tr>
        <th>Name</th>
        <th>Student ID</th>
        <th>Status</th>
        <th>Action</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;
  const tbody = table.querySelector("tbody");

  pendingStudents.forEach(student => {
    const tr = document.createElement("tr");

    const nameTd = document.createElement("td");
    nameTd.textContent = student.full_name || "N/A";

    const idTd = document.createElement("td");
    idTd.textContent = student.student_id || "N/A";

    const statusTd = document.createElement("td");
    const badge = document.createElement("span");
    badge.className = "status-badge status-pending";
    badge.textContent = "Pending";
    statusTd.appendChild(badge);

    const actionTd = document.createElement("td");
    const actions = document.createElement("div");
    actions.className = "admin-actions";

    const approveBtn = document.createElement("button");
    approveBtn.className = "approve-btn";
    approveBtn.textContent = "✓ Approve";
    approveBtn.dataset.action = "approved";
    approveBtn.dataset.id = student.id;

    const rejectBtn = document.createElement("button");
    rejectBtn.className = "reject-btn";
    rejectBtn.textContent = "✕ Reject";
    rejectBtn.dataset.action = "rejected";
    rejectBtn.dataset.id = student.id;

    actions.append(approveBtn, rejectBtn);
    actionTd.appendChild(actions);

    tr.append(nameTd, idTd, statusTd, actionTd);
    tbody.appendChild(tr);
  });

  pendingTable.appendChild(table);
}

// ======================================
// APPROVE / REJECT STUDENT
// ======================================

document.addEventListener("click", async function(event) {
  const button = event.target.closest("#pendingTable button[data-action]");
  if (!button || !adminUser) return;

  const studentId = button.dataset.id;
  const newStatus = button.dataset.action;
  if (!["approved", "rejected"].includes(newStatus)) return;

  const studentName = button.closest("tr").querySelector("td").textContent;
  const actionText = newStatus === "approved" ? "Approve" : "Reject";

  if (!confirm(`${actionText} ${studentName}?`)) return;

  const buttons = button.closest("tr").querySelectorAll("button");
  buttons.forEach(btn => btn.disabled = true);
  document.getElementById("adminMessage").textContent = "Updating student status...";

  try {
    const { data, error } = await supabaseClient
      .from("profiles")
      .update({ account_status: newStatus })
      .eq("id", studentId)
      .eq("role", "student")
      .eq("account_status", "pending")
      .select("id");

    if (error) throw error;
    if (!data || data.length === 0) {
      throw new Error("Student status was not updated. Check RLS permissions.");
    }

    alert(newStatus === "approved" ? "Student Approved Successfully!" : "Student Rejected Successfully!");
    await loadStudents();
    document.getElementById("adminMessage").textContent = "Student status updated successfully.";
  } catch (error) {
    console.error(error);
    alert("Update Error: " + error.message);
    buttons.forEach(btn => btn.disabled = false);
  }
});

// ======================================
// LOAD ALL DEPARTMENTS (SINGLE UNIFIED FUNCTION)
// ======================================

async function loadAllDepartments() {
  const { data, error } = await supabaseClient
    .from("departments")
    .select("id, name")
    .order("id");

  if (error) {
    console.error("Error loading departments:", error);
    return;
  }

  const selectIds = ["subjectDeptSelect", "courseDeptSelect", "adminDeptSelect"];
  selectIds.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = '<option value="">ডিপার্টমেন্ট সিলেক্ট করুন</option>';
    data.forEach(dept => {
      const opt = document.createElement("option");
      opt.value = dept.id;
      opt.textContent = dept.name;
      el.appendChild(opt);
    });
  });
}

// ======================================
// DYNAMIC DROPDOWNS FOR COURSE & LESSON FORMS
// ======================================

async function populateSubjectsDropdown(deptId, semNum, targetSelectEl) {
  targetSelectEl.innerHTML = '<option value="">সাবজেক্ট সিলেক্ট করুন</option>';
  if (!deptId || !semNum) return;

  const { data, error } = await supabaseClient
    .from("subjects")
    .select("id, name")
    .eq("department_id", deptId)
    .eq("semester_number", semNum)
    .order("name");

  if (error) {
    console.error("Error loading subjects:", error);
    return;
  }

  if (data.length === 0) {
    targetSelectEl.innerHTML = '<option value="">এই সেমিস্টারে কোনো সাবজেক্ট নেই</option>';
    return;
  }

  data.forEach(sub => {
    const opt = document.createElement("option");
    opt.value = sub.id;
    opt.textContent = sub.name;
    targetSelectEl.appendChild(opt);
  });
}

// Course Form Dropdowns
document.getElementById("courseDeptSelect")?.addEventListener("change", () => {
  populateSubjectsDropdown(
    document.getElementById("courseDeptSelect").value,
    document.getElementById("courseSemesterSelect").value,
    document.getElementById("courseSubjectSelect")
  );
});
document.getElementById("courseSemesterSelect")?.addEventListener("change", () => {
  populateSubjectsDropdown(
    document.getElementById("courseDeptSelect").value,
    document.getElementById("courseSemesterSelect").value,
    document.getElementById("courseSubjectSelect")
  );
});

// Lesson Form Dropdowns
async function handleLessonSubjectChange() {
  const deptId = document.getElementById("adminDeptSelect").value;
  const semNum = document.getElementById("adminSemesterSelect").value;
  const subSelect = document.getElementById("adminSubjectSelect");
  document.getElementById("adminCourseSelect").innerHTML = '<option value="">আগে সাবজেক্ট সিলেক্ট করুন</option>';
  await populateSubjectsDropdown(deptId, semNum, subSelect);
}

document.getElementById("adminDeptSelect")?.addEventListener("change", handleLessonSubjectChange);
document.getElementById("adminSemesterSelect")?.addEventListener("change", handleLessonSubjectChange);

document.getElementById("adminSubjectSelect")?.addEventListener("change", async () => {
  const subjectId = document.getElementById("adminSubjectSelect").value;
  const courseSelect = document.getElementById("adminCourseSelect");
  courseSelect.innerHTML = '<option value="">কোর্স সিলেক্ট করুন</option>';

  if (!subjectId) return;

  const { data, error } = await supabaseClient
    .from("courses")
    .select("id, title")
    .eq("subject_id", subjectId)
    .order("id");

  if (error || data.length === 0) {
    courseSelect.innerHTML = '<option value="">এই সাবজেক্টে কোনো কোর্স নেই</option>';
    return;
  }

  data.forEach(course => {
    const opt = document.createElement("option");
    opt.value = course.id;
    opt.textContent = course.title;
    courseSelect.appendChild(opt);
  });
});

// ======================================
// FORM SUBMISSIONS (SUBJECT, COURSE, LESSON)
// ======================================

document.getElementById("addSubjectForm")?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const department_id = document.getElementById("subjectDeptSelect").value;
  const semester_number = document.getElementById("subjectSemesterSelect").value;
  const name = document.getElementById("subjectName").value.trim();

  const submitBtn = event.target.querySelector('button[type="submit"]');
  submitBtn.disabled = true;

  try {
    const { error } = await supabaseClient
      .from("subjects")
      .insert([{ department_id, semester_number, name }]);

    if (error) throw error;
    alert("সফলভাবে নতুন সাবজেক্ট যোগ করা হয়েছে!");
    event.target.reset();
  } catch (error) {
    alert("সাবজেক্ট যোগ করতে সমস্যা হয়েছে: " + error.message);
  } finally {
    submitBtn.disabled = false;
  }
});

document.getElementById("addCourseForm")?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const subject_id = document.getElementById("courseSubjectSelect").value;
  const title = document.getElementById("courseTitle").value.trim();
  const description = document.getElementById("courseDesc").value.trim();

  if (!subject_id) return alert("দয়া করে সঠিক সাবজেক্ট সিলেক্ট করুন।");

  const submitBtn = event.target.querySelector('button[type="submit"]');
  submitBtn.disabled = true;

  try {
    const { error } = await supabaseClient
      .from("courses")
      .insert([{ subject_id, title, description }]);

    if (error) throw error;
    alert("সফলভাবে নতুন কোর্স যোগ করা হয়েছে!");
    event.target.reset();
    document.getElementById("courseSubjectSelect").innerHTML = '<option value="">আগে ডিপার্টমেন্ট ও সেমিস্টার সিলেক্ট করুন</option>';
  } catch (error) {
    alert("কোর্স যোগ করতে সমস্যা হয়েছে: " + error.message);
  } finally {
    submitBtn.disabled = false;
  }
});

document.getElementById("addLessonForm")?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!adminUser) return alert("Admin session not found.");

  const course_id = document.getElementById("adminCourseSelect").value;
  const title = document.getElementById("lessonTitle").value.trim();
  const video_url = document.getElementById("lessonVideoUrl").value.trim();
  const lesson_order = parseInt(document.getElementById("lessonOrder").value, 10);

  if (!course_id) return alert("দয়া করে সঠিক কোর্স সিলেক্ট করুন।");

  const submitBtn = event.target.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  document.getElementById("adminMessage").textContent = "ভিডিও সেভ হচ্ছে...";

  try {
    const { error } = await supabaseClient
      .from("lessons")
      .insert([{ course_id, title, video_url, lesson_order }]);

    if (error) throw error;
    alert("সফলভাবে ভিডিও লেসন যোগ করা হয়েছে!");
    event.target.reset();
    document.getElementById("adminSubjectSelect").innerHTML = '<option value="">আগে ডিপার্টমেন্ট ও সেমিস্টার সিলেক্ট করুন</option>';
    document.getElementById("adminCourseSelect").innerHTML = '<option value="">আগে সাবজেক্ট সিলেক্ট করুন</option>';
    document.getElementById("adminMessage").textContent = "ভিডিও সফলভাবে যুক্ত হয়েছে।";
  } catch (error) {
    alert("ভিডিও যোগ করতে সমস্যা হয়েছে: " + error.message);
    document.getElementById("adminMessage").textContent = "ভিডিও যোগ ব্যর্থ হয়েছে।";
  } finally {
    submitBtn.disabled = false;
  }
});

// ======================================
// ADMIN LOGOUT & START
// ======================================

document.getElementById("adminLogout")?.addEventListener("click", async () => {
  const { error } = await supabaseClient.auth.signOut();
  if (error) return alert("Logout Error: " + error.message);
  window.location.href = "index.html";
});

loadAdminDashboard();