
/* ==========================================
   SMARTVOTE - APPLICATION JAVASCRIPT
========================================== */

document.addEventListener("DOMContentLoaded", function () {

    console.log("SmartVote Application Started Successfully");

    initializeSession();
    initializeTheme();
    initializeSidebar();
    initializeNavigation();
    initializeDate();
    initializeDashboard();

});


/* ==========================================
   1. SESSION STORAGE
========================================== */

function initializeSession() {

    if (!sessionStorage.getItem("smartVoteVisitor")) {

        sessionStorage.setItem(
            "smartVoteVisitor",
            "active"
        );

    }

    console.log(
        "Visitor Session:",
        sessionStorage.getItem("smartVoteVisitor")
    );

}


/* ==========================================
   2. DARK AND LIGHT THEME
========================================== */

function initializeTheme() {

    const themeButton = document.getElementById("themeToggle");

    const savedTheme = localStorage.getItem("smartVoteTheme");

    if (savedTheme === "dark") {

        document.body.classList.add("dark-theme");

    }

    updateThemeIcon();

    themeButton.addEventListener("click", function () {

        document.body.classList.toggle("dark-theme");

        const currentTheme =
            document.body.classList.contains("dark-theme")
                ? "dark"
                : "light";

        localStorage.setItem(
            "smartVoteTheme",
            currentTheme
        );

        updateThemeIcon();

    });

}


function updateThemeIcon() {

    const themeButton = document.getElementById("themeToggle");

    const icon = themeButton.querySelector("i");

    if (document.body.classList.contains("dark-theme")) {

        icon.className = "fa-solid fa-sun";

        themeButton.title = "Switch to Light Mode";

    } else {

        icon.className = "fa-solid fa-moon";

        themeButton.title = "Switch to Dark Mode";

    }

}


/* ==========================================
   3. RESPONSIVE SIDEBAR
========================================== */

function initializeSidebar() {

    const sidebar = document.getElementById("sidebar");

    const menuToggle = document.getElementById("menuToggle");

    const closeSidebar = document.getElementById("closeSidebar");

    const overlay = document.getElementById("sidebarOverlay");


    function openMenu() {

        sidebar.classList.add("open");

        overlay.classList.add("show");

    }


    function closeMenu() {

        sidebar.classList.remove("open");

        overlay.classList.remove("show");

    }


    menuToggle.addEventListener("click", openMenu);

    closeSidebar.addEventListener("click", closeMenu);

    overlay.addEventListener("click", closeMenu);


    document.querySelectorAll(".nav-link").forEach(function (link) {

        link.addEventListener("click", function () {

            if (window.innerWidth <= 900) {

                closeMenu();

            }

        });

    });

}


/* ==========================================
   4. NAVIGATION ACTIVE STATE
========================================== */

function initializeNavigation() {

    const navLinks = document.querySelectorAll(
        '.nav-link[href^="#"]'
    );

    navLinks.forEach(function (link) {

        link.addEventListener("click", function () {

            navLinks.forEach(function (item) {

                item.classList.remove("active");

            });

            link.classList.add("active");

        });

    });

}


/* ==========================================
   5. CURRENT DATE
========================================== */

function initializeDate() {

    const dateElement = document.getElementById("currentDate");

    const today = new Date();

    const options = {
        day: "2-digit",
        month: "short",
        year: "numeric"
    };

    dateElement.textContent = today.toLocaleDateString(
        "en-IN",
        options
    );

}


/* ==========================================
   6. DASHBOARD STATISTICS
========================================== */

function initializeDashboard() {

    const statistics = {

        voters: 0,

        candidates: 0,

        elections: 0,

        votes: 0

    };


    document.getElementById("totalVoters").textContent =
        statistics.voters;

    document.getElementById("totalCandidates").textContent =
        statistics.candidates;

    document.getElementById("totalElections").textContent =
        statistics.elections;

    document.getElementById("totalVotes").textContent =
        statistics.votes;


    console.log("Dashboard Statistics Loaded");

}
