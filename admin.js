
document.addEventListener("DOMContentLoaded", function () {

    // Check admin login
    const currentUser = getCurrentUser();

    if (!currentUser || currentUser.role !== "admin") {
        window.location.href = "login.html";
        return;
    }

    // Admin details
    const adminName = currentUser.name || "Administrator";

    document.getElementById("sidebarAdminName").textContent = adminName;
    document.getElementById("topbarAdminName").textContent = adminName;
    document.getElementById("welcomeAdminName").textContent = adminName;

    // Date
    document.getElementById("adminDate").textContent =
        new Date().toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        });

    // HTML elements
    const votersTableBody = document.getElementById("votersTableBody");
    const recentVotersBody = document.getElementById("recentVotersBody");
    const voterSearch = document.getElementById("voterSearch");
    const statusFilter = document.getElementById("statusFilter");

    // Get registered voters
    function getVoters() {
        const users = JSON.parse(localStorage.getItem("smartVoteUsers")) || [];
        return users.filter(user => user.role === "voter");
    }

    // Save registered voters
    function saveVoters(voters) {
        localStorage.setItem("smartVoteUsers", JSON.stringify(voters));
    }

    // Display dashboard statistics
    function updateStatistics() {
        const voters = getVoters();

        const candidates =
            JSON.parse(localStorage.getItem("smartVoteCandidates")) || [];

        const elections =
            JSON.parse(localStorage.getItem("smartVoteElections")) || [];

        const votes =
            JSON.parse(localStorage.getItem("smartVoteVotes")) || [];

        document.getElementById("statVoters").textContent = voters.length;
        document.getElementById("statCandidates").textContent = candidates.length;
        document.getElementById("statElections").textContent = elections.length;
        document.getElementById("statVotes").textContent = votes.length;

        document.getElementById("voterCount").textContent = voters.length;
    }

    // Show toast message
    function showToast(message) {
        const toast = document.getElementById("adminToast");

        toast.textContent = message;
        toast.classList.add("show");

        setTimeout(function () {
            toast.classList.remove("show");
        }, 2500);
    }

    // Prevent user data from being interpreted as HTML
    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, function (character) {
            return {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;"
            }[character];
        });
    }

    // Display all voters
    function displayVoters() {
        const voters = getVoters();

        const searchText = voterSearch.value.toLowerCase().trim();
        const selectedStatus = statusFilter.value;

        const filteredVoters = voters.filter(function (voter) {

            const matchesSearch =
                (voter.name || "").toLowerCase().includes(searchText) ||
                (voter.email || "").toLowerCase().includes(searchText) ||
                (voter.mobile || "").toLowerCase().includes(searchText);

            const matchesStatus =
                selectedStatus === "all" ||
                (voter.status || "active") === selectedStatus;

            return matchesSearch && matchesStatus;
        });

        if (filteredVoters.length === 0) {
            votersTableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="empty-row">
                        No matching voters found.
                    </td>
                </tr>
            `;
            document.getElementById("voterTableNote").textContent =
                "No matching voter accounts.";
            return;
        }

        votersTableBody.innerHTML = filteredVoters.map(function (voter) {

            const status = voter.status || "active";
            const date = voter.createdAt
                ? new Date(voter.createdAt).toLocaleDateString("en-IN")
                : "Not available";

            const actionLabel = status === "active" ? "Block voter" : "Activate voter";
            const actionIcon = status === "active"
                ? "fa-ban"
                : "fa-user-check";

            return `
                <tr>
                    <td>${escapeHTML(voter.id || "N/A")}</td>

                    <td>
                        <span class="voter-name">${escapeHTML(voter.name)}</span>
                        <span class="voter-email">${escapeHTML(voter.email)}</span>
                    </td>

                    <td>${escapeHTML(voter.mobile)}</td>

                    <td>${escapeHTML(date)}</td>

                    <td>
                        <span class="status-badge status-${escapeHTML(status)}">
                            ${escapeHTML(status)}
                        </span>
                    </td>

                    <td>
                        <div class="action-buttons">
                            <button
                                type="button"
                                class="action-btn block-btn"
                                data-action="toggle"
                                data-id="${escapeHTML(voter.id)}"
                                title="${actionLabel}"
                                aria-label="${actionLabel}">
                                <i class="fa-solid ${actionIcon}"></i>
                            </button>

                            <button
                                type="button"
                                class="action-btn delete-btn"
                                data-action="delete"
                                data-id="${escapeHTML(voter.id)}"
                                title="Delete voter"
                                aria-label="Delete voter">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join("");

        document.getElementById("voterTableNote").textContent =
            `Showing ${filteredVoters.length} of ${voters.length} registered voters.`;
    }

    // Display latest five registered voters
    function displayRecentVoters() {
        const voters = getVoters()
            .slice()
            .sort(function (a, b) {
                return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
            })
            .slice(0, 5);

        if (voters.length === 0) {
            recentVotersBody.innerHTML = `
                <tr>
                    <td colspan="3" class="empty-row">
                        No registered voters yet.
                    </td>
                </tr>
            `;
            return;
        }

        recentVotersBody.innerHTML = voters.map(function (voter) {

            const status = voter.status || "active";

            return `
                <tr>
                    <td>
                        <span class="voter-name">${escapeHTML(voter.name)}</span>
                    </td>

                    <td>${escapeHTML(voter.email)}</td>

                    <td>
                        <span class="status-badge status-${escapeHTML(status)}">
                            ${escapeHTML(status)}
                        </span>
                    </td>
                </tr>
            `;
        }).join("");
    }

    // Block / Activate / Delete voter
    votersTableBody.addEventListener("click", function (event) {

        const button = event.target.closest("button[data-action]");

        if (!button) {
            return;
        }

        const voterId = button.dataset.id;
        const action = button.dataset.action;

        let voters = getVoters();

        if (action === "toggle") {

            voters = voters.map(function (voter) {

                if (voter.id === voterId) {
                    voter.status =
                        (voter.status || "active") === "active"
                            ? "blocked"
                            : "active";
                }

                return voter;
            });

            saveVoters(voters);
            showToast("Voter status updated successfully.");

        } else if (action === "delete") {

            const confirmed = confirm(
                "Are you sure you want to delete this voter account?"
            );

            if (!confirmed) {
                return;
            }

            voters = voters.filter(function (voter) {
                return voter.id !== voterId;
            });

            saveVoters(voters);
            showToast("Voter deleted successfully.");
        }

        refreshDashboard();
    });

    // Search and filter
    voterSearch.addEventListener("input", displayVoters);
    statusFilter.addEventListener("change", displayVoters);

    // Navigation
    document.querySelectorAll(".admin-nav a[data-section]").forEach(function (link) {

        link.addEventListener("click", function (event) {

            event.preventDefault();

            const sectionId = this.dataset.section;

            document.querySelectorAll(".admin-section").forEach(function (section) {
                section.classList.add("hidden-section");
            });

            document.getElementById(sectionId).classList.remove("hidden-section");

            document.querySelectorAll(".admin-nav a").forEach(function (navLink) {
                navLink.classList.remove("active");
            });

            this.classList.add("active");

            document.querySelector(".admin-topbar h2").textContent =
                this.textContent.trim();

            document.getElementById("adminSidebar").classList.remove("open");
        });
    });

    // Quick action and View All buttons
    document.querySelectorAll("[data-go='voters']").forEach(function (button) {

        button.addEventListener("click", function () {

            document.querySelectorAll(".admin-section").forEach(function (section) {
                section.classList.add("hidden-section");
            });

            document.getElementById("voters").classList.remove("hidden-section");

            document.querySelectorAll(".admin-nav a").forEach(function (link) {
                link.classList.toggle(
                    "active",
                    link.dataset.section === "voters"
                );
            });

            document.querySelector(".admin-topbar h2").textContent =
                "Manage Voters";
        });
    });

    // Mobile menu
    document.getElementById("menuToggle").addEventListener("click", function () {
        document.getElementById("adminSidebar").classList.toggle("open");
    });

    // Logout
    document.getElementById("adminLogout").addEventListener("click", function () {

        const confirmed = confirm("Are you sure you want to logout?");

        if (confirmed) {
            logout();
        }
    });

    // Refresh all dashboard information
    function refreshDashboard() {
        updateStatistics();
        displayVoters();
        displayRecentVoters();
    }

    // Initial load
    refreshDashboard();

});
