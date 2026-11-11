
document.addEventListener("DOMContentLoaded", function () {

    // 1. Check voter login
    const currentUser = getCurrentUser();

    if (!currentUser || currentUser.role !== "voter") {
        window.location.href = "login.html";
        return;
    }

    // 2. Get the latest account information from LocalStorage
    const registeredUsers =
        JSON.parse(localStorage.getItem("smartVoteUsers")) || [];

    const voter = registeredUsers.find(function (user) {
        return user.id === currentUser.id;
    });

    if (!voter || voter.status === "blocked") {

        // Remove the existing login session
        sessionStorage.removeItem("smartVoteUser");
        sessionStorage.removeItem("smartVoteSession");

        alert("Your account is blocked or no longer available. Please contact the administrator.");

        window.location.href = "login.html";
        return;
    }

    // 3. Display voter information
    function setText(elementId, value) {
        const element = document.getElementById(elementId);

        if (element) {
            element.textContent = value || "-";
        }
    }

    const voterName = voter.name || "Voter";
    const voterEmail = voter.email || "-";
    const voterMobile = voter.mobile || "-";
    const voterId = voter.id || "Not available";
    const voterStatus = voter.status || "active";

    setText("sidebarVoterName", voterName);
    setText("topbarVoterName", voterName);
    setText("welcomeVoterName", voterName);
    setText("welcomeVoterId", voterId);

    setText("summaryName", voterName);
    setText("summaryEmail", voterEmail);
    setText("summaryMobile", voterMobile);
    setText("summaryStatus", voterStatus);

    setText("profileName", voterName);
    setText("profileVoterId", voterId);
    setText("profileFullName", voterName);
    setText("profileEmail", voterEmail);
    setText("profileMobile", voterMobile);
    setText("profileStatus", voterStatus);

    // Registration date
    const registrationDate = voter.createdAt
        ? new Date(voter.createdAt).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        })
        : "Not available";

    setText("profileCreatedAt", registrationDate);

    // Account status styling
    ["summaryStatus", "profileStatus"].forEach(function (id) {

        const element = document.getElementById(id);

        if (element) {
            element.classList.remove("active-text", "blocked-text");

            if (voterStatus === "active") {
                element.classList.add("active-text");
            } else {
                element.classList.add("blocked-text");
            }
        }
    });

    setText(
        "accountStatus",
        voterStatus.charAt(0).toUpperCase() + voterStatus.slice(1)
    );

    // Date
    setText(
        "voterCurrentDate",
        new Date().toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        })
    );

    // 4. Read election information
    const elections =
        JSON.parse(localStorage.getItem("smartVoteElections")) || [];

    const activeElections = elections.filter(function (election) {
        return election.status === "active";
    });

    setText("availableElectionCount", activeElections.length);

    // 5. Read this voter's submitted votes
    const allVotes =
        JSON.parse(localStorage.getItem("smartVoteVotes")) || [];

    const myVotes = allVotes.filter(function (vote) {
        return vote.voterId === voter.id ||
               vote.voterEmail === voter.email;
    });

    setText("votesSubmittedCount", myVotes.length);

    // 6. Navigation
    const navigationLinks = document.querySelectorAll(
        ".voter-nav a[data-section]"
    );

    const sections = document.querySelectorAll(".voter-section");

    const pageHeading = document.getElementById("pageHeading");

    function openSection(sectionId, link) {

        sections.forEach(function (section) {
            section.classList.add("hidden-voter-section");
        });

        const selectedSection = document.getElementById(sectionId);

        if (selectedSection) {
            selectedSection.classList.remove("hidden-voter-section");
        }

        navigationLinks.forEach(function (navLink) {
            navLink.classList.remove("active");
        });

        if (link) {
            link.classList.add("active");
            pageHeading.textContent = link.textContent.trim();
        }

        document.getElementById("voterSidebar").classList.remove("open");
    }

    navigationLinks.forEach(function (link) {

        link.addEventListener("click", function (event) {

            event.preventDefault();

            openSection(this.dataset.section, this);
        });
    });

    // 7. View Profile button
    document.querySelectorAll("[data-go='profile']").forEach(function (button) {

        button.addEventListener("click", function () {

            const profileLink = document.querySelector(
                ".voter-nav a[data-section='profile']"
            );

            openSection("profile", profileLink);
        });
    });

    // 8. Mobile menu
    document.getElementById("voterMenuToggle").addEventListener(
        "click",
        function () {
            document.getElementById("voterSidebar").classList.toggle("open");
        }
    );

    // 9. Logout
    document.getElementById("voterLogout").addEventListener(
        "click",
        function () {

            const confirmed = confirm("Are you sure you want to logout?");

            if (confirmed) {
                logout();
            }
        }
    );

});
