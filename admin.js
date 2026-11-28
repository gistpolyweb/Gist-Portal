// ======================================
// GIST ADMIN DASHBOARD
// ======================================

const SUPABASE_URL = "https://fnioecvkmnwwugqtykdk.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_jtUI6zIeKlH4y0Key2b4QQ_xWP7aDds";
const VIDEO_STORAGE_BUCKET = "course-videos";
const NOTICE_STORAGE_BUCKET = "notice-attachments";
const MAX_VIDEO_SIZE_BYTES = 150 * 1024 * 1024; // 150MB
const MAX_NOTICE_FILE_BYTES = 15 * 1024 * 1024; // 15MB

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

    await Promise.all([loadStudents(), loadAllDepartments(), loadAdminNotices()]);
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

  const selectIds = ["subjectDeptSelect", "courseDeptSelect", "adminDeptSelect", "manageDeptSelect"];
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
// DYNAMIC DROPDOWNS FOR COURSE, LESSON & MANAGE FORMS
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

async function populateCoursesDropdown(subjectId, targetSelectEl) {
  targetSelectEl.innerHTML = '<option value="">কোর্স সিলেক্ট করুন</option>';
  if (!subjectId) return;

  const { data, error } = await supabaseClient
    .from("courses")
    .select("id, title")
    .eq("subject_id", subjectId)
    .order("id");

  if (error || !data || data.length === 0) {
    targetSelectEl.innerHTML = '<option value="">এই সাবজেক্টে কোনো কোর্স নেই</option>';
    return;
  }

  data.forEach(course => {
    const opt = document.createElement("option");
    opt.value = course.id;
    opt.textContent = course.title;
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
  await populateCoursesDropdown(subjectId, document.getElementById("adminCourseSelect"));
});

// Manage / Delete Lessons Dropdowns
async function handleManageSubjectChange() {
  const deptId = document.getElementById("manageDeptSelect").value;
  const semNum = document.getElementById("manageSemesterSelect").value;
  const subSelect = document.getElementById("manageSubjectSelect");
  const courseSelect = document.getElementById("manageCourseSelect");
  const listEl = document.getElementById("manageLessonList");

  courseSelect.innerHTML = '<option value="">আগে সাবজেক্ট সিলেক্ট করুন</option>';
  listEl.innerHTML = '<p class="muted-hint">কোর্স নির্বাচন করলে ওই কোর্সের ভিডিও লেসনগুলো এখানে দেখা যাবে।</p>';
  await populateSubjectsDropdown(deptId, semNum, subSelect);
}

document.getElementById("manageDeptSelect")?.addEventListener("change", handleManageSubjectChange);
document.getElementById("manageSemesterSelect")?.addEventListener("change", handleManageSubjectChange);

document.getElementById("manageSubjectSelect")?.addEventListener("change", async () => {
  const subjectId = document.getElementById("manageSubjectSelect").value;
  document.getElementById("manageLessonList").innerHTML = '<p class="muted-hint">কোর্স নির্বাচন করলে ওই কোর্সের ভিডিও লেসনগুলো এখানে দেখা যাবে।</p>';
  await populateCoursesDropdown(subjectId, document.getElementById("manageCourseSelect"));
});

document.getElementById("manageCourseSelect")?.addEventListener("change", async () => {
  const courseId = document.getElementById("manageCourseSelect").value;
  await loadCourseLessonsForManage(courseId);
});

// ======================================
// LOAD & DELETE VIDEO LESSONS
// ======================================

function extractStorageObjectPath(fileUrl, bucketName) {
  try {
    const url = new URL(fileUrl);
    const marker = `/storage/v1/object/public/${bucketName}/`;
    const idx = url.pathname.indexOf(marker);
    if (idx === -1) return null;
    return decodeURIComponent(url.pathname.slice(idx + marker.length));
  } catch (e) {
    return null;
  }
}

async function loadCourseLessonsForManage(courseId) {
  const listEl = document.getElementById("manageLessonList");
  if (!listEl) return;

  if (!courseId) {
    listEl.innerHTML = '<p class="muted-hint">কোর্স নির্বাচন করলে ওই কোর্সের ভিডিও লেসনগুলো এখানে দেখা যাবে।</p>';
    return;
  }

  listEl.innerHTML = '<p class="muted-hint">লেসন লোড হচ্ছে...</p>';

  const { data, error } = await supabaseClient
    .from("lessons")
    .select("id, title, video_url, lesson_order")
    .eq("course_id", courseId)
    .order("lesson_order");

  if (error) {
    console.error("Manage lesson load error:", error);
    listEl.innerHTML = `<p class="muted-hint">লেসন লোড করতে সমস্যা হয়েছে: ${error.message}</p>`;
    return;
  }

  if (!data || data.length === 0) {
    listEl.innerHTML = '<p class="muted-hint">এই কোর্সে এখনো কোনো ভিডিও লেসন নেই।</p>';
    return;
  }

  const table = document.createElement("table");
  table.innerHTML = `
    <thead>
      <tr>
        <th>Order</th>
        <th>Title</th>
        <th>Source Type</th>
        <th>Action</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;
  const tbody = table.querySelector("tbody");

  data.forEach(lesson => {
    const tr = document.createElement("tr");

    const orderTd = document.createElement("td");
    orderTd.textContent = lesson.lesson_order ?? "-";

    const titleTd = document.createElement("td");
    titleTd.textContent = lesson.title || "Untitled";

    const typeTd = document.createElement("td");
    const isUploadedFile = Boolean(extractStorageObjectPath(lesson.video_url || "", VIDEO_STORAGE_BUCKET));
    typeTd.textContent = isUploadedFile ? "Device Video" : "YouTube / Link";

    const actionTd = document.createElement("td");
    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "delete-lesson-btn";
    delBtn.textContent = "🗑 Delete";
    delBtn.dataset.lessonId = lesson.id;
    delBtn.dataset.videoUrl = lesson.video_url || "";
    delBtn.dataset.lessonTitle = lesson.title || "Lesson";

    actionTd.appendChild(delBtn);
    tr.append(orderTd, titleTd, typeTd, actionTd);
    tbody.appendChild(tr);
  });

  listEl.innerHTML = "";
  listEl.appendChild(table);
}

document.addEventListener("click", async function(event) {
  const delBtn = event.target.closest(".delete-lesson-btn");
  if (!delBtn || !adminUser) return;

  const lessonId = delBtn.dataset.lessonId;
  const lessonTitle = delBtn.dataset.lessonTitle;
  const videoUrl = delBtn.dataset.videoUrl;
  const courseId = document.getElementById("manageCourseSelect")?.value;

  if (!confirm(`"${lessonTitle}" লেসনটি কি সত্যিই ডিলিট করতে চান?`)) return;

  delBtn.disabled = true;
  const adminMsgEl = document.getElementById("adminMessage");
  if (adminMsgEl) adminMsgEl.textContent = "লেসন ডিলিট হচ্ছে...";

  try {
    const storagePath = extractStorageObjectPath(videoUrl, VIDEO_STORAGE_BUCKET);
    if (storagePath) {
      await supabaseClient.storage.from(VIDEO_STORAGE_BUCKET).remove([storagePath]);
    }

    const { error } = await supabaseClient
      .from("lessons")
      .delete()
      .eq("id", lessonId);

    if (error) throw error;

    alert("ভিডিও লেসন সফলভাবে ডিলিট করা হয়েছে!");
    await loadCourseLessonsForManage(courseId);
    if (adminMsgEl) adminMsgEl.textContent = "ভিডিও লেসন ডিলিট সম্পন্ন হয়েছে।";
  } catch (error) {
    console.error("Delete lesson error:", error);
    alert("লেসন ডিলিট করতে সমস্যা হয়েছে: " + error.message);
    delBtn.disabled = false;
    if (adminMsgEl) adminMsgEl.textContent = "লেসন ডিলিট ব্যর্থ হয়েছে।";
  }
});

// ======================================
// NOTICE BOARD (ADD WITH PDF/IMAGE & DELETE)
// ======================================

function resolveNoticeAttachmentType(file) {
  if (!file) return null;
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    return "pdf";
  }
  if (file.type.startsWith("image/") || /\.(jpg|jpeg|png|webp|gif)$/i.test(file.name)) {
    return "image";
  }
  return null;
}

async function uploadNoticeAttachmentToSupabase(file) {
  const attachType = resolveNoticeAttachmentType(file);
  if (!attachType) {
    throw new Error("শুধুমাত্র PDF অথবা Image (JPG, PNG, WebP) ফাইল সংযুক্ত করা যাবে।");
  }
  if (file.size > MAX_NOTICE_FILE_BYTES) {
    throw new Error("সংযুক্ত ফাইলের সাইজ ১৫ MB-এর কম হতে হবে।");
  }

  const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const filePath = `${attachType}s/${Date.now()}_${safeFileName}`;

  const { error: uploadError } = await supabaseClient.storage
    .from(NOTICE_STORAGE_BUCKET)
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false
    });

  if (uploadError) {
    throw new Error("ফাইল আপলোড ব্যর্থ হয়েছে: " + uploadError.message);
  }

  const { data: publicData } = supabaseClient.storage
    .from(NOTICE_STORAGE_BUCKET)
    .getPublicUrl(filePath);

  if (!publicData?.publicUrl) {
    throw new Error("আপলোড করা ফাইলের Public URL পাওয়া যায়নি।");
  }

  return {
    attachment_url: publicData.publicUrl,
    attachment_type: attachType
  };
}

async function loadAdminNotices() {
  const listEl = document.getElementById("adminNoticeList");
  if (!listEl) return;

  listEl.innerHTML = '<p class="muted-hint">Notices loading...</p>';

  const { data, error } = await supabaseClient
    .from("notices")
    .select("id, title, description, attachment_url, attachment_type, created_at")
    .order("id", { ascending: false });

  if (error) {
    console.error("Load notices error:", error);
    listEl.innerHTML = '<p class="muted-hint">নোটিশ লোড করা যায়নি। Supabase-এ notices টেবিল ও পলিসি যাচাই করুন।</p>';
    return;
  }

  if (!data || data.length === 0) {
    listEl.innerHTML = '<p class="muted-hint">এখনো কোনো নোটিশ প্রকাশ করা হয়নি।</p>';
    return;
  }

  const table = document.createElement("table");
  table.innerHTML = `
    <thead>
      <tr>
        <th>Title</th>
        <th>Description</th>
        <th>Attachment</th>
        <th>Action</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;
  const tbody = table.querySelector("tbody");

  data.forEach(notice => {
    const tr = document.createElement("tr");

    const titleTd = document.createElement("td");
    titleTd.textContent = notice.title || "Untitled";

    const descTd = document.createElement("td");
    descTd.textContent = notice.description || "";

    const attachTd = document.createElement("td");
    if (notice.attachment_url) {
      const link = document.createElement("a");
      link.href = notice.attachment_url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.className = "notice-file-link";
      link.textContent = notice.attachment_type === "pdf" ? "📄 PDF দেখুন" : "🖼 Image দেখুন";
      attachTd.appendChild(link);
    } else {
      attachTd.textContent = "—";
    }

    const actionTd = document.createElement("td");
    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "delete-notice-btn";
    delBtn.textContent = "🗑 Delete";
    delBtn.dataset.noticeId = notice.id;
    delBtn.dataset.noticeTitle = notice.title || "Notice";
    delBtn.dataset.attachmentUrl = notice.attachment_url || "";

    actionTd.appendChild(delBtn);
    tr.append(titleTd, descTd, attachTd, actionTd);
    tbody.appendChild(tr);
  });

  listEl.innerHTML = "";
  listEl.appendChild(table);
}

document.getElementById("addNoticeForm")?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!adminUser) return alert("Admin session not found.");

  const title = document.getElementById("noticeTitleInput").value.trim();
  const description = document.getElementById("noticeDescInput").value.trim();
  const fileInput = document.getElementById("noticeAttachmentInput");
  const uploadStatusEl = document.getElementById("noticeUploadStatus");
  const submitBtn = event.target.querySelector('button[type="submit"]');
  const adminMsgEl = document.getElementById("adminMessage");

  if (!title || !description) {
    return alert("দয়া করে নোটিশের শিরোনাম ও বিবরণ লিখুন।");
  }

  submitBtn.disabled = true;
  if (uploadStatusEl) uploadStatusEl.textContent = "";
  if (adminMsgEl) adminMsgEl.textContent = "নোটিশ প্রকাশ হচ্ছে...";

  try {
    let attachment_url = null;
    let attachment_type = null;

    const selectedFile = fileInput?.files?.[0];
    if (selectedFile) {
      if (uploadStatusEl) {
        uploadStatusEl.textContent = `"${selectedFile.name}" আপলোড হচ্ছে...`;
      }
      const uploaded = await uploadNoticeAttachmentToSupabase(selectedFile);
      attachment_url = uploaded.attachment_url;
      attachment_type = uploaded.attachment_type;
    }

   const { error } = await supabaseClient
      .from("notices")
      .insert([{
        title,
        body: description,
        description,
        attachment_url,
        attachment_type
      }]);
    if (error) throw error;

    alert("সফলভাবে নোটিশ প্রকাশ করা হয়েছে!");
    event.target.reset();
    if (uploadStatusEl) uploadStatusEl.textContent = "";
    await loadAdminNotices();
    if (adminMsgEl) adminMsgEl.textContent = "নতুন নোটিশ প্রকাশ সম্পন্ন হয়েছে।";
  } catch (error) {
    console.error("Add notice error:", error);
    alert("নোটিশ প্রকাশ করতে সমস্যা হয়েছে: " + error.message);
    if (uploadStatusEl) uploadStatusEl.textContent = "";
    if (adminMsgEl) adminMsgEl.textContent = "নোটিশ প্রকাশ ব্যর্থ হয়েছে।";
  } finally {
    submitBtn.disabled = false;
  }
});

document.addEventListener("click", async function(event) {
  const delBtn = event.target.closest(".delete-notice-btn");
  if (!delBtn || !adminUser) return;

  const noticeId = delBtn.dataset.noticeId;
  const noticeTitle = delBtn.dataset.noticeTitle;
  const attachmentUrl = delBtn.dataset.attachmentUrl;

  if (!confirm(`"${noticeTitle}" নোটিশটি ডিলিট করতে চান?`)) return;

  delBtn.disabled = true;
  const adminMsgEl = document.getElementById("adminMessage");
  if (adminMsgEl) adminMsgEl.textContent = "নোটিশ ডিলিট হচ্ছে...";

  try {
    const storagePath = extractStorageObjectPath(attachmentUrl, NOTICE_STORAGE_BUCKET);
    if (storagePath) {
      await supabaseClient.storage.from(NOTICE_STORAGE_BUCKET).remove([storagePath]);
    }

    const { error } = await supabaseClient
      .from("notices")
      .delete()
      .eq("id", noticeId);

    if (error) throw error;

    alert("নোটিশ সফলভাবে ডিলিট করা হয়েছে!");
    await loadAdminNotices();
    if (adminMsgEl) adminMsgEl.textContent = "নোটিশ ডিলিট সম্পন্ন হয়েছে।";
  } catch (error) {
    console.error("Delete notice error:", error);
    alert("নোটিশ ডিলিট করতে সমস্যা হয়েছে: " + error.message);
    delBtn.disabled = false;
    if (adminMsgEl) adminMsgEl.textContent = "নোটিশ ডিলিট ব্যর্থ হয়েছে।";
  }
});

// ======================================
// LESSON VIDEO SOURCE SWITCH & STORAGE UPLOAD
// ======================================

const lessonVideoSourceType = document.getElementById("lessonVideoSourceType");
const youtubeUrlGroup = document.getElementById("youtubeUrlGroup");
const deviceVideoGroup = document.getElementById("deviceVideoGroup");
const lessonVideoUrlInput = document.getElementById("lessonVideoUrl");
const lessonVideoFileInput = document.getElementById("lessonVideoFile");
const lessonUploadStatus = document.getElementById("lessonUploadStatus");

function syncLessonVideoSourceUI() {
  const isFileMode = lessonVideoSourceType?.value === "file";
  if (youtubeUrlGroup) youtubeUrlGroup.hidden = isFileMode;
  if (deviceVideoGroup) deviceVideoGroup.hidden = !isFileMode;

  if (lessonVideoUrlInput) {
    lessonVideoUrlInput.required = !isFileMode;
    if (isFileMode) lessonVideoUrlInput.value = "";
  }
  if (lessonVideoFileInput) {
    lessonVideoFileInput.required = isFileMode;
    if (!isFileMode) lessonVideoFileInput.value = "";
  }
  if (lessonUploadStatus) {
    lessonUploadStatus.textContent = "";
  }
}

lessonVideoSourceType?.addEventListener("change", syncLessonVideoSourceUI);

async function uploadVideoToSupabase(file) {
  if (!file.type.startsWith("video/")) {
    throw new Error("দয়া করে একটি বৈধ ভিডিও ফাইল (MP4, WebM, OGG) নির্বাচন করুন।");
  }
  if (file.size > MAX_VIDEO_SIZE_BYTES) {
    throw new Error("ভিডিও ফাইলের সাইজ ১৫০ MB-এর কম হতে হবে।");
  }

  const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const filePath = `lessons/${Date.now()}_${safeFileName}`;

  const { error: uploadError } = await supabaseClient.storage
    .from(VIDEO_STORAGE_BUCKET)
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false
    });

  if (uploadError) {
    throw new Error("Storage আপলোড ব্যর্থ হয়েছে: " + uploadError.message);
  }

  const { data: publicData } = supabaseClient.storage
    .from(VIDEO_STORAGE_BUCKET)
    .getPublicUrl(filePath);

  if (!publicData?.publicUrl) {
    throw new Error("আপলোড করা ভিডিওর Public URL পাওয়া যায়নি।");
  }

  return publicData.publicUrl;
}

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
  const sourceType = lessonVideoSourceType?.value || "youtube";
  const lesson_order = parseInt(document.getElementById("lessonOrder").value, 10);

  if (!course_id) return alert("দয়া করে সঠিক কোর্স সিলেক্ট করুন।");

  const submitBtn = event.target.querySelector('button[type="submit"]');
  const adminMsgEl = document.getElementById("adminMessage");
  submitBtn.disabled = true;

  try {
    let video_url = "";

    if (sourceType === "file") {
      const selectedFile = lessonVideoFileInput?.files?.[0];
      if (!selectedFile) {
        throw new Error("দয়া করে ডিভাইস থেকে একটি ভিডিও ফাইল নির্বাচন করুন।");
      }

      adminMsgEl.textContent = "ডিভাইস থেকে ভিডিও আপলোড হচ্ছে...";
      if (lessonUploadStatus) {
        lessonUploadStatus.textContent = `"${selectedFile.name}" আপলোড হচ্ছে, অনুগ্রহ করে অপেক্ষা করুন...`;
      }

      video_url = await uploadVideoToSupabase(selectedFile);
    } else {
      video_url = lessonVideoUrlInput?.value.trim() || "";
      if (!video_url) {
        throw new Error("দয়া করে একটি YouTube ভিডিও লিংক দিন।");
      }
    }

    adminMsgEl.textContent = "ভিডিও লেসন সেভ হচ্ছে...";

    const { error } = await supabaseClient
      .from("lessons")
      .insert([{ course_id, title, video_url, lesson_order }]);

    if (error) throw error;

    alert("সফলভাবে ভিডিও লেসন যোগ করা হয়েছে!");
    event.target.reset();
    syncLessonVideoSourceUI();
    document.getElementById("adminSubjectSelect").innerHTML = '<option value="">আগে ডিপার্টমেন্ট ও সেমিস্টার সিলেক্ট করুন</option>';
    document.getElementById("adminCourseSelect").innerHTML = '<option value="">আগে সাবজেক্ট সিলেক্ট করুন</option>';

    const activeManageCourseId = document.getElementById("manageCourseSelect")?.value;
    if (activeManageCourseId && activeManageCourseId === course_id) {
      await loadCourseLessonsForManage(course_id);
    }

    adminMsgEl.textContent = "ভিডিও সফলভাবে যুক্ত হয়েছে।";
  } catch (error) {
    alert("ভিডিও যোগ করতে সমস্যা হয়েছে: " + error.message);
    if (lessonUploadStatus) lessonUploadStatus.textContent = "";
    adminMsgEl.textContent = "ভিডিও যোগ ব্যর্থ হয়েছে।";
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