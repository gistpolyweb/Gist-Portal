
// ======================================
// GIST ADMIN DASHBOARD
// ======================================

const SUPABASE_URL =
  "https://fnioecvkmnwwugqtykdk.supabase.co";

const SUPABASE_ANON_KEY =
  "sb_publishable_jtUI6zIeKlH4y0Key2b4QQ_xWP7aDds";

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

    const { data, error } =
      await supabaseClient.auth.getSession();

    if (error) throw error;

    const user = data.session?.user;

    if (!user) {
      window.location.href = "index.html";
      return;
    }

    const { data: profile, error: profileError } =
      await supabaseClient
        .from("profiles")
        .select("full_name, role, account_status")
        .eq("id", user.id)
        .single();

    if (profileError) throw profileError;

    if (
      profile.role !== "admin" ||
      profile.account_status !== "approved"
    ) {
      alert("Admin permission required!");

      await supabaseClient.auth.signOut();

      window.location.href = "index.html";
      return;
    }

    adminUser = user;

    message.textContent =
      "Welcome Admin: " + profile.full_name;

    await loadStudents();
    loadAdminDepartments();

  } catch (error) {
    console.error(error);
    message.textContent =
      "Dashboard Error: " + error.message;
  }
}


// ======================================
// LOAD ALL STUDENTS
// ======================================

async function loadStudents() {
  const studentTable =
    document.getElementById("studentTable");

  const pendingTable =
    document.getElementById("pendingTable");

  studentTable.textContent = "Loading students...";
  pendingTable.textContent = "Loading requests...";

  const { data, error } = await supabaseClient
    .from("profiles")
    .select(`
      id,
      full_name,
      student_id,
      role,
      account_status
    `)
    .eq("role", "student")
    .order("full_name");

  if (error) {
    console.error(error);

    studentTable.textContent = error.message;
    pendingTable.textContent = error.message;
    return;
  }

  const students = data || [];

  const approved = students.filter(
    s => s.account_status === "approved"
  ).length;

  const pending = students.filter(
    s => s.account_status === "pending"
  ).length;

  const rejected = students.filter(
    s => s.account_status === "rejected"
  ).length;

  document.getElementById("totalStudents").textContent =
    students.length;

  document.getElementById("approvedStudents").textContent =
    approved;

  document.getElementById("pendingStudents").textContent =
    pending;

  document.getElementById("rejectedStudents").textContent =
    rejected;


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

      [
        student.full_name || "N/A",
        student.student_id || "N/A",
        student.role || "student"
      ].forEach(value => {
        const td = document.createElement("td");
        td.textContent = value;
        tr.appendChild(td);
      });

      const statusTd = document.createElement("td");
      const badge = document.createElement("span");

      badge.className =
        "status-badge status-" + student.account_status;

      badge.textContent =
        student.account_status || "unknown";

      statusTd.appendChild(badge);
      tr.appendChild(statusTd);

      tbody.appendChild(tr);
    });

    studentTable.appendChild(table);
  }


  // PENDING REQUEST TABLE

  pendingTable.innerHTML = "";

  const pendingStudents = students.filter(
    s => s.account_status === "pending"
  );

  if (pendingStudents.length === 0) {
    pendingTable.textContent =
      "No pending registration requests.";
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
  const button = event.target.closest(
    "#pendingTable button[data-action]"
  );

  if (!button) return;

  if (!adminUser) {
    alert("Admin session not found.");
    return;
  }

  const studentId = button.dataset.id;
  const newStatus = button.dataset.action;

  if (!["approved", "rejected"].includes(newStatus)) {
    return;
  }

  const studentName =
    button.closest("tr").querySelector("td").textContent;

  const actionText =
    newStatus === "approved" ? "Approve" : "Reject";

  const confirmed = confirm(
    `${actionText} ${studentName}?`
  );

  if (!confirmed) return;

  const buttons = button.closest("tr").querySelectorAll("button");

  buttons.forEach(btn => btn.disabled = true);

  document.getElementById("adminMessage").textContent =
    "Updating student status...";

  try {
    const { data, error } = await supabaseClient
      .from("profiles")
      .update({
        account_status: newStatus
      })
      .eq("id", studentId)
      .eq("role", "student")
      .eq("account_status", "pending")
      .select("id");

    if (error) throw error;

    if (!data || data.length === 0) {
      throw new Error(
        "Student status was not updated. Check RLS permissions or current status."
      );
    }

    alert(
      newStatus === "approved"
        ? "Student Approved Successfully!"
        : "Student Rejected Successfully!"
    );

    await loadStudents();

    document.getElementById("adminMessage").textContent =
      "Student status updated successfully.";

  } catch (error) {
    console.error(error);

    alert("Update Error: " + error.message);

    document.getElementById("adminMessage").textContent =
      "Update failed: " + error.message;

    buttons.forEach(btn => btn.disabled = false);
  }
});


// ======================================
// ADMIN LOGOUT
// ======================================

document
  .getElementById("adminLogout")
  .addEventListener("click", async () => {

    const { error } =
      await supabaseClient.auth.signOut();

    if (error) {
      alert("Logout Error: " + error.message);
      return;
    }

    window.location.href = "index.html";
  });


// ======================================
// START DASHBOARD
// ======================================
// ======================================
// ADD VIDEO LESSON TO DATABASE
// ======================================

document.getElementById("addLessonForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!adminUser) {
    alert("Admin session not found.");
    return;
  }

  const course_id = document.getElementById("lessonCourseId").value.trim();
  const title = document.getElementById("lessonTitle").value.trim();
  const video_url = document.getElementById("lessonVideoUrl").value.trim();
  const lesson_order = parseInt(document.getElementById("lessonOrder").value);

  const submitBtn = event.target.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  document.getElementById("adminMessage").textContent = "ভিডিও সেভ হচ্ছে...";

  try {
    const { data, error } = await supabaseClient
      .from("lessons")
      .insert([
        {
          course_id: course_id,
          title: title,
          video_url: video_url,
          lesson_order: lesson_order
        }
      ]);

    if (error) throw error;

    alert("সফলভাবে ভিডিও লেসন যোগ করা হয়েছে!");
    document.getElementById("addLessonForm").reset();
    document.getElementById("adminMessage").textContent = "ভিডিও সফলভাবে যুক্ত হয়েছে।";

  } catch (error) {
    console.error("Error adding lesson:", error);
    alert("ভিডিও যোগ করতে সমস্যা হয়েছে: " + error.message);
    document.getElementById("adminMessage").textContent = "ভিডিও যোগ ব্যর্থ হয়েছে।";
  } finally {
    submitBtn.disabled = false;
  }
});
// ======================================
// DYNAMIC DROPDOWNS FOR ADDING LESSONS
// ======================================

async function loadAdminDepartments() {
  const deptSelect = document.getElementById("adminDeptSelect");
  if (!deptSelect) return;

  const { data, error } = await supabaseClient
    .from("departments")
    .select("id, name")
    .order("id");

  if (error) {
    console.error("Error loading departments:", error);
    return;
  }

  deptSelect.innerHTML = '<option value="">ডিপার্টমেন্ট সিলেক্ট করুন</option>';
  data.forEach(dept => {
    const opt = document.createElement("option");
    opt.value = dept.id;
    opt.textContent = dept.name;
    deptSelect.appendChild(opt);
  });
}

// When Department or Semester changes, load Subjects
async function loadAdminSubjects() {
  const deptId = document.getElementById("adminDeptSelect").value;
  const semNum = document.getElementById("adminSemesterSelect").value;
  const subjectSelect = document.getElementById("adminSubjectSelect");
  const courseSelect = document.getElementById("adminCourseSelect");

  subjectSelect.innerHTML = '<option value="">সাবজেক্ট সিলেক্ট করুন</option>';
  courseSelect.innerHTML = '<option value="">আগে সাবজেক্ট সিলেক্ট করুন</option>';

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
    subjectSelect.innerHTML = '<option value="">এই সেমিস্টারে কোনো সাবজেক্ট নেই</option>';
    return;
  }

  data.forEach(sub => {
    const opt = document.createElement("option");
    opt.value = sub.id;
    opt.textContent = sub.name;
    subjectSelect.appendChild(opt);
  });
}

// When Subject changes, load Courses
async function loadAdminCourses() {
  const subjectId = document.getElementById("adminSubjectSelect").value;
  const courseSelect = document.getElementById("adminCourseSelect");

  courseSelect.innerHTML = '<option value="">কোর্স সিলেক্ট করুন</option>';

  if (!subjectId) return;

  const { data, error } = await supabaseClient
    .from("courses")
    .select("id, title")
    .eq("subject_id", subjectId)
    .order("id");

  if (error) {
    console.error("Error loading courses:", error);
    return;
  }

  if (data.length === 0) {
    courseSelect.innerHTML = '<option value="">এই সাবজেক্টে কোনো কোর্স নেই</option>';
    return;
  }

  data.forEach(course => {
    const opt = document.createElement("option");
    opt.value = course.id;
    opt.textContent = course.title;
    courseSelect.appendChild(opt);
  });
}

// Event listeners for dropdown changes
document.getElementById("adminDeptSelect")?.addEventListener("change", loadAdminSubjects);
document.getElementById("adminSemesterSelect")?.addEventListener("change", loadAdminSubjects);
document.getElementById("adminSubjectSelect")?.addEventListener("change", loadAdminCourses);


// ======================================
// SUBMIT NEW VIDEO LESSON
// ======================================

document.getElementById("addLessonForm")?.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!adminUser) {
    alert("Admin session not found.");
    return;
  }

  const course_id = document.getElementById("adminCourseSelect").value;
  const title = document.getElementById("lessonTitle").value.trim();
  const video_url = document.getElementById("lessonVideoUrl").value.trim();
  const lesson_order = parseInt(document.getElementById("lessonOrder").value);

  if (!course_id) {
    alert("দয়া করে সঠিক কোর্স সিলেক্ট করুন।");
    return;
  }

  const submitBtn = event.target.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  document.getElementById("adminMessage").textContent = "ভিডিও সেভ হচ্ছে...";

  try {
    const { data, error } = await supabaseClient
      .from("lessons")
      .insert([
        {
          course_id: course_id,
          title: title,
          video_url: video_url,
          lesson_order: lesson_order
        }
      ]);

    if (error) throw error;

    alert("সফলভাবে ভিডিও লেসন যোগ করা হয়েছে!");
    document.getElementById("addLessonForm").reset();
    document.getElementById("adminMessage").textContent = "ভিডিও সফলভাবে যুক্ত হয়েছে।";
    
    loadAdminDepartments();
    document.getElementById("adminSubjectSelect").innerHTML = '<option value="">আগে ডিপার্টমেন্ট ও সেমিস্টার সিলেক্ট করুন</option>';
    document.getElementById("adminCourseSelect").innerHTML = '<option value="">আগে সাবজেক্ট সিলেক্ট করুন</option>';

  } catch (error) {
    console.error("Error adding lesson:", error);
    alert("ভিডিও যোগ করতে সমস্যা হয়েছে: " + error.message);
    document.getElementById("adminMessage").textContent = "ভিডিও যোগ ব্যর্থ হয়েছে।";
  } finally {
    submitBtn.disabled = false;
  }
});
// ======================================
// LOAD DEPARTMENTS FOR NEW SUBJECT & COURSE FORMS
// ======================================

async function loadGeneralDepartments() {
  const { data, error } = await supabaseClient
    .from("departments")
    .select("id, name")
    .order("id");

  if (error) {
    console.error("Error loading departments:", error);
    return;
  }

  const subjDept = document.getElementById("subjectDeptSelect");
  const courseDept = document.getElementById("courseDeptSelect");

  if (subjDept) subjDept.innerHTML = '<option value="">ডিপার্টমেন্ট সিলেক্ট করুন</option>';
  if (courseDept) courseDept.innerHTML = '<option value="">ডিপার্টমেন্ট সিলেক্ট করুন</option>';

  data.forEach(dept => {
    if (subjDept) {
      const opt1 = document.createElement("option");
      opt1.value = dept.id;
      opt1.textContent = dept.name;
      subjDept.appendChild(opt1.cloneNode(true));
    }
    if (courseDept) {
      const opt2 = document.createElement("option");
      opt2.value = dept.id;
      opt2.textContent = dept.name;
      courseDept.appendChild(opt2);
    }
  });
}

// Load Subjects for Course Form based on Dept & Semester
async function loadCourseSubjects() {
  const deptId = document.getElementById("courseDeptSelect").value;
  const semNum = document.getElementById("courseSemesterSelect").value;
  const subSelect = document.getElementById("courseSubjectSelect");

  subSelect.innerHTML = '<option value="">সাবজেক্ট সিলেক্ট করুন</option>';

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

  data.forEach(sub => {
    const opt = document.createElement("option");
    opt.value = sub.id;
    opt.textContent = sub.name;
    subSelect.appendChild(opt);
  });
}

document.getElementById("courseDeptSelect")?.addEventListener("change", loadCourseSubjects);
document.getElementById("courseSemesterSelect")?.addEventListener("change", loadCourseSubjects);


// ======================================
// SUBMIT NEW SUBJECT
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
    document.getElementById("addSubjectForm").reset();
    
    // Refresh video & course dropdowns if needed
    if (typeof loadAdminDepartments === "function") loadAdminDepartments();

  } catch (error) {
    console.error("Error adding subject:", error);
    alert("সাবজেক্ট যোগ করতে সমস্যা হয়েছে: " + error.message);
  } finally {
    submitBtn.disabled = false;
  }
});


// ======================================
// SUBMIT NEW COURSE
// ======================================

document.getElementById("addCourseForm")?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const subject_id = document.getElementById("courseSubjectSelect").value;
  const title = document.getElementById("courseTitle").value.trim();
  const description = document.getElementById("courseDesc").value.trim();

  if (!subject_id) {
    alert("দয়া করে সঠিক সাবজেক্ট সিলেক্ট করুন।");
    return;
  }

  const submitBtn = event.target.querySelector('button[type="submit"]');
  submitBtn.disabled = true;

  try {
    const { error } = await supabaseClient
      .from("courses")
      .insert([{ subject_id, title, description }]);

    if (error) throw error;

    alert("সফলভাবে নতুন কোর্স যোগ করা হয়েছে!");
    document.getElementById("addCourseForm").reset();
    document.getElementById("courseSubjectSelect").innerHTML = '<option value="">আগে ডিপার্টমেন্ট ও সেমিস্টার সিলেক্ট করুন</option>';

  } catch (error) {
    console.error("Error adding course:", error);
    alert("কোর্স যোগ করতে সমস্যা হয়েছে: " + error.message);
  } finally {
    submitBtn.disabled = false;
  }
});
loadGeneralDepartments();
loadAdminDashboard();
