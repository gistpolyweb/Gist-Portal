
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

    await loadSubjects(profile);

    message.textContent = "Dashboard loaded successfully!";

  } catch (error) {
    console.error("Dashboard Error:", error);
    message.textContent = "Dashboard Error: " + error.message;
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
// YOUTUBE VIDEO PLAYER
// ======================================

function playVideo(lesson) {
  const videoPlayer = document.getElementById("videoPlayer");

  videoPlayer.innerHTML = "";

  if (!lesson.video_url) {
    videoPlayer.textContent =
      "এই Lesson-এর Video Link পাওয়া যায়নি।";
    return;
  }

  const videoUrl = lesson.video_url.trim();

  let videoId = null;

  try {
    const url = new URL(videoUrl);

    if (url.hostname === "youtu.be") {
      videoId = url.pathname.slice(1).split("/")[0];
    }

    else if (
      url.hostname === "youtube.com" ||
      url.hostname === "www.youtube.com" ||
      url.hostname === "m.youtube.com"
    ) {
      videoId = url.searchParams.get("v");

      if (!videoId && url.pathname.startsWith("/embed/")) {
        videoId = url.pathname.split("/")[2];
      }
    }

    else if (url.hostname === "www.youtube-nocookie.com") {
      if (url.pathname.startsWith("/embed/")) {
        videoId = url.pathname.split("/")[2];
      }
    }

  } catch (error) {
    console.error("Invalid Video URL:", error);
  }

  if (!videoId || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
    videoPlayer.textContent = "YouTube Video Link সঠিক নয়।";
    return;
  }

  const heading = document.createElement("h3");
  heading.textContent = lesson.title;

  const iframe = document.createElement("iframe");

  iframe.src =
    "https://www.youtube-nocookie.com/embed/" + videoId;

  iframe.title = lesson.title;
  iframe.width = "100%";
  iframe.height = "400";
  iframe.allowFullscreen = true;

  iframe.allow =
    "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";

  iframe.loading = "lazy";
  iframe.referrerPolicy = "strict-origin-when-cross-origin";

  videoPlayer.appendChild(heading);
  videoPlayer.appendChild(iframe);
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
