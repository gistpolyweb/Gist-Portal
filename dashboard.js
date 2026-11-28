// ======================================
// GIST POLYTECHNIC - STUDENT DASHBOARD
// ======================================

const SUPABASE_URL = "https://fnioecvkmnwwugqtykdk.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_jtUI6zIeKlH4y0Key2b4QQ_xWP7aDds";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);


// ======================================
// COMMON HELPERS
// ======================================

function setActiveButton(container, selectedButton) {
  container.querySelectorAll(".subject-item").forEach(button => {
    button.classList.remove("active");
  });

  selectedButton.classList.add("active");
}

function resetElement(element, message) {
  element.textContent = message;
}

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
// DASHBOARD LOAD
// ======================================

async function loadDashboard() {
  const message = document.getElementById("dashboardMessage");

  try {
    message.textContent = "Dashboard loading...";

    const { data: sessionData, error: sessionError } =
      await supabaseClient.auth.getSession();

    if (sessionError) throw sessionError;

    const user = sessionData.session?.user;

    if (!user) {
      window.location.href = "index.html";
      return;
    }

    const { data: profile, error } = await supabaseClient
      .from("profiles")
      .select(`
        full_name,
        student_id,
        department_id,
        semester_number,
        role,
        account_status
      `)
      .eq("id", user.id)
      .single();

    if (error) throw error;

    if (profile.account_status !== "approved") {
      await supabaseClient.auth.signOut();
      window.location.href = "index.html";
      return;
    }

    const { data: department, error: deptError } =
      await supabaseClient
        .from("departments")
        .select("name")
        .eq("id", profile.department_id)
        .single();

    if (deptError) throw deptError;

    document.getElementById("studentName").textContent =
      profile.full_name || "Not Available";

    document.getElementById("studentId").textContent =
      profile.student_id || "Not Available";

    document.getElementById("studentDepartment").textContent =
      department?.name || "Not Available";

    document.getElementById("studentSemester").textContent =
      profile.semester_number
        ? profile.semester_number + " Semester"
        : "Not Available";

    await Promise.all([loadSubjects(profile), loadStudentNotices()]);

    message.textContent = "Dashboard loaded successfully!";

  } catch (error) {
    console.error("Dashboard Error:", error);
    message.textContent = "Dashboard Error: " + error.message;
  }
}


// ======================================
// LOAD STUDENT NOTICE BOARD (VIEW & DOWNLOAD PDF / IMAGE)
// ======================================

async function loadStudentNotices() {
  const container = document.getElementById("studentNoticeList");
  if (!container) return;

  container.innerHTML = "<p>Notices loading...</p>";

  try {
    const { data, error } = await supabaseClient
      .from("notices")
      .select("id, title, body, description, attachment_url, attachment_type, created_at")
      .order("id", { ascending: false });

    if (error) throw error;

    if (!data || data.length === 0) {
      container.innerHTML = "<p>এখনো কোনো নতুন নোটিশ প্রকাশ করা হয়নি।</p>";
      return;
    }

    container.innerHTML = "";
    const grid = document.createElement("div");
    grid.style.cssText = "display: flex; flex-direction: column; gap: 16px;";

    data.forEach(notice => {
      const card = document.createElement("article");
      card.style.cssText =
        "padding: 18px 20px; border: 1px solid #e4e9f5; border-radius: 14px; background: #fbfcff; box-shadow: 0 4px 14px rgba(23, 39, 76, 0.04);";

      const badge = document.createElement("span");
      badge.textContent = "📢 NOTICE";
      badge.style.cssText =
        "display: inline-block; padding: 4px 10px; border-radius: 20px; background: #e8efff; color: #3157d5; font-size: 11px; font-weight: 800; letter-spacing: 0.5px;";

      const titleEl = document.createElement("h3");
      titleEl.textContent = notice.title || "নোটিশ";
      titleEl.style.cssText = "margin: 8px 0 6px; font-size: 18px; color: #162447;";

      const descEl = document.createElement("p");
      descEl.textContent = notice.description || notice.body || "";
      descEl.style.cssText = "margin: 0; font-size: 14.5px; color: #475569; line-height: 1.6;";

      card.append(badge, titleEl, descEl);

      if (notice.attachment_url) {
        const isPdf =
          notice.attachment_type === "pdf" ||
          String(notice.attachment_url).toLowerCase().endsWith(".pdf");

        const actionRow = document.createElement("div");
        actionRow.style.cssText =
          "display: flex; flex-wrap: wrap; gap: 10px; margin-top: 12px;";

        const viewBtn = document.createElement("a");
        viewBtn.href = notice.attachment_url;
        viewBtn.target = "_blank";
        viewBtn.rel = "noopener noreferrer";
        viewBtn.textContent = isPdf ? "📄 PDF বড় করে দেখুন" : "👁 ইমেজ বড় করে দেখুন";
        viewBtn.style.cssText =
          "display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 9px; background: #e9edff; color: #3157d5; font-size: 13.5px; font-weight: 700; text-decoration: none;";

        const downloadBtn = document.createElement("button");
        downloadBtn.type = "button";
        downloadBtn.textContent = isPdf ? "⬇ PDF ডাউনলোড করুন" : "⬇ ইমেজ ডাউনলোড করুন";
        downloadBtn.style.cssText =
          "display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border: 0; border-radius: 9px; background: linear-gradient(110deg, #12834f, #18a566); color: #fff; font-size: 13.5px; font-weight: 700; font-family: 'Hind Siliguri', sans-serif; cursor: pointer;";

        downloadBtn.addEventListener("click", () => {
          triggerFileDownload(
            notice.attachment_url,
            isPdf ? "notice.pdf" : "notice-image.jpg",
            downloadBtn
          );
        });

        actionRow.append(viewBtn, downloadBtn);

        if (isPdf) {
          const pdfFrame = document.createElement("iframe");
          pdfFrame.src = notice.attachment_url;
          pdfFrame.title = notice.title || "Notice PDF";
          pdfFrame.loading = "lazy";
          pdfFrame.style.cssText =
            "display: block; width: 100%; height: 380px; margin-top: 12px; border: 1px solid #dce3f0; border-radius: 12px; background: #ffffff;";
          card.append(pdfFrame, actionRow);
        } else {
          const imgLink = document.createElement("a");
          imgLink.href = notice.attachment_url;
          imgLink.target = "_blank";
          imgLink.rel = "noopener noreferrer";

          const img = document.createElement("img");
          img.src = notice.attachment_url;
          img.alt = notice.title || "Notice Image";
          img.loading = "lazy";
          img.style.cssText =
            "display: block; max-width: 100%; max-height: 360px; margin-top: 12px; border-radius: 12px; border: 1px solid #dce3f0; object-fit: contain;";

          imgLink.appendChild(img);
          card.append(imgLink, actionRow);
        }
      }

      grid.appendChild(card);
    });

    container.appendChild(grid);
  } catch (err) {
    console.error("Student notice error:", err);
    container.innerHTML = "<p>নোটিশ লোড করতে সমস্যা হয়েছে।</p>";
  }
}


// ======================================
// LOAD SUBJECTS
// ======================================

async function loadSubjects(profile) {
  const subjectList = document.getElementById("subjectList");
  const courseList = document.getElementById("courseList");
  const lessonList = document.getElementById("lessonList");
  const videoPlayer = document.getElementById("videoPlayer");

  subjectList.textContent = "Subjects loading...";

  resetElement(courseList, "প্রথমে একটি Subject নির্বাচন করো।");
  resetElement(lessonList, "প্রথমে একটি Course নির্বাচন করো।");
  videoPlayer.innerHTML = "";

  const { data, error } = await supabaseClient
    .from("subjects")
    .select("id, name")
    .eq("department_id", profile.department_id)
    .eq("semester_number", profile.semester_number)
    .order("name");

  if (error) {
    console.error("Subject Error:", error);
    subjectList.textContent = "Subject load করতে সমস্যা হয়েছে।";
    return;
  }

  if (!data || data.length === 0) {
    subjectList.textContent =
      "এই Semester-এ এখনো কোনো Subject যোগ করা হয়নি।";
    return;
  }

  subjectList.innerHTML = "";

  data.forEach(subject => {
    const button = document.createElement("button");

    button.type = "button";
    button.className = "subject-item";
    button.textContent = subject.name;

    button.addEventListener("click", () => {
      setActiveButton(subjectList, button);
      loadCourses(subject.id);
    });

    subjectList.appendChild(button);
  });
}


// ======================================
// LOAD COURSES
// ======================================

async function loadCourses(subjectId) {
  const courseList = document.getElementById("courseList");
  const lessonList = document.getElementById("lessonList");
  const videoPlayer = document.getElementById("videoPlayer");

  courseList.textContent = "Courses loading...";
  lessonList.textContent = "প্রথমে একটি Course নির্বাচন করো।";
  videoPlayer.innerHTML = "";

  const { data, error } = await supabaseClient
    .from("courses")
    .select("id, title, description")
    .eq("subject_id", subjectId)
    .order("id");

  if (error) {
    console.error("Course Error:", error);
    courseList.textContent = "Course load করতে সমস্যা হয়েছে।";
    return;
  }

  if (!data || data.length === 0) {
    courseList.textContent =
      "এই Subject-এ এখনো কোনো Course যোগ করা হয়নি।";
    return;
  }

  courseList.innerHTML = "";

  data.forEach(course => {
    const button = document.createElement("button");

    button.type = "button";
    button.className = "subject-item";
    button.textContent = course.title;

    button.addEventListener("click", () => {
      setActiveButton(courseList, button);
      loadLessons(course.id);
    });

    courseList.appendChild(button);
  });
}


// ======================================
// LOAD VIDEO LESSONS
// ======================================

async function loadLessons(courseId) {
  const lessonList = document.getElementById("lessonList");
  const videoPlayer = document.getElementById("videoPlayer");

  lessonList.textContent = "Lessons loading...";
  videoPlayer.innerHTML = "";

  const { data, error } = await supabaseClient
    .from("lessons")
    .select("id, title, video_url, lesson_order")
    .eq("course_id", courseId)
    .order("lesson_order");

  if (error) {
    console.error("Lesson Error:", error);
    lessonList.textContent = "Lesson load করতে সমস্যা হয়েছে।";
    return;
  }

  if (!data || data.length === 0) {
    lessonList.textContent =
      "এই Course-এ এখনো কোনো Lesson যোগ করা হয়নি।";
    return;
  }

  lessonList.innerHTML = "";

  data.forEach(lesson => {
    const button = document.createElement("button");

    button.type = "button";
    button.className = "subject-item";
    button.textContent = "▶ " + lesson.title;

    button.addEventListener("click", () => {
      setActiveButton(lessonList, button);
      playVideo(lesson);
    });

    lessonList.appendChild(button);
  });
}


// ======================================
// VIDEO PLAYER (YOUTUBE & UPLOADED FILE)
// ======================================

function extractYouTubeId(rawUrl) {
  try {
    const url = new URL(rawUrl);
    let videoId = null;

    if (url.hostname === "youtu.be") {
      videoId = url.pathname.slice(1).split("/")[0];
    } else if (
      url.hostname === "youtube.com" ||
      url.hostname === "www.youtube.com" ||
      url.hostname === "m.youtube.com"
    ) {
      videoId = url.searchParams.get("v");
      if (!videoId && url.pathname.startsWith("/embed/")) {
        videoId = url.pathname.split("/")[2];
      }
    } else if (url.hostname === "www.youtube-nocookie.com") {
      if (url.pathname.startsWith("/embed/")) {
        videoId = url.pathname.split("/")[2];
      }
    }

    if (videoId && /^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
      return videoId;
    }
  } catch (error) {
    return null;
  }
  return null;
}

function isDirectVideoFileUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    if (!["http:", "https:"].includes(url.protocol)) return false;

    const lowerPath = url.pathname.toLowerCase();
    const hasVideoExt = /\.(mp4|webm|ogg|mov|m4v)$/.test(lowerPath);
    const isSupabaseStorage = lowerPath.includes("/storage/v1/object/public/");

    return hasVideoExt || isSupabaseStorage;
  } catch (error) {
    return false;
  }
}

function playVideo(lesson) {
  const videoPlayer = document.getElementById("videoPlayer");
  videoPlayer.innerHTML = "";

  if (!lesson.video_url) {
    videoPlayer.textContent = "এই Lesson-এর Video পাওয়া যায়নি।";
    return;
  }

  const videoUrl = lesson.video_url.trim();
  const heading = document.createElement("h3");
  heading.textContent = lesson.title;
  videoPlayer.appendChild(heading);

  const youtubeId = extractYouTubeId(videoUrl);
  if (youtubeId) {
    const iframe = document.createElement("iframe");
    iframe.src = "https://www.youtube-nocookie.com/embed/" + youtubeId;
    iframe.title = lesson.title;
    iframe.width = "100%";
    iframe.height = "400";
    iframe.allowFullscreen = true;
    iframe.allow =
      "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
    iframe.loading = "lazy";
    iframe.referrerPolicy = "strict-origin-when-cross-origin";
    videoPlayer.appendChild(iframe);
    return;
  }

  if (isDirectVideoFileUrl(videoUrl)) {
    const videoEl = document.createElement("video");
    videoEl.src = videoUrl;
    videoEl.controls = true;
    videoEl.preload = "metadata";
    videoEl.style.width = "100%";
    videoEl.style.maxWidth = "900px";
    videoEl.style.borderRadius = "14px";
    videoEl.style.background = "#101b3c";
    videoEl.style.boxShadow = "0 10px 28px rgba(23, 39, 76, 0.15)";
    videoPlayer.appendChild(videoEl);
    return;
  }

  videoPlayer.textContent = "Video Link সঠিক নয় বা সাপোর্টেড নয়।";
}


// ======================================
// LOGOUT
// ======================================

document
  .getElementById("logoutButton")
  .addEventListener("click", async () => {

    const { error } = await supabaseClient.auth.signOut();

    if (error) {
      console.error("Logout Error:", error);
      alert("Logout করতে সমস্যা হয়েছে।");
      return;
    }

    window.location.href = "index.html";
  });


// ======================================
// START DASHBOARD
// ======================================

loadDashboard();