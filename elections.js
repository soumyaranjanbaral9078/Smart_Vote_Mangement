
const ELECTION_STORAGE_KEY = "smartVoteElections";
const CANDIDATE_STORAGE_KEY = "smartVoteCandidates";

document.addEventListener("DOMContentLoaded", () => {
    const currentUser = typeof getCurrentUser === "function"
        ? getCurrentUser()
        : null;

    if (!currentUser || currentUser.role !== "admin") {
        window.location.href = "login.html";
        return;
    }

    initializeElectionManagement();
});

function getElections() {
    return JSON.parse(localStorage.getItem(ELECTION_STORAGE_KEY) || "[]");
}

function saveElections(elections) {
    localStorage.setItem(ELECTION_STORAGE_KEY, JSON.stringify(elections));
}

function getActiveCandidates() {
    const candidates = JSON.parse(
        localStorage.getItem(CANDIDATE_STORAGE_KEY) || "[]"
    );

    return candidates.filter(candidate => candidate.status === "active");
}

function escapeElectionHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

function initializeElectionManagement() {
    const form = document.getElementById("electionForm");

    if (!form) return;

    displayElectionCandidates();
    displayElections();

    form.addEventListener("submit", saveElection);

    document.getElementById("electionSearch")
        .addEventListener("input", displayElections);

    document.getElementById("electionStatusFilter")
        .addEventListener("change", displayElections);

    document.getElementById("cancelElectionEdit")
        .addEventListener("click", resetElectionForm);

    document.getElementById("electionTableBody")
        .addEventListener("click", handleElectionActions);
}

function displayElectionCandidates(selectedIds = []) {
    const container = document.getElementById(
        "electionCandidateOptions"
    );

    const candidates = getActiveCandidates();

    if (candidates.length === 0) {
        container.innerHTML = "<p>No active candidates available. Add active candidates first.</p>";
        return;
    }

    container.innerHTML = candidates.map(candidate => `
        <label class="election-candidate-option">
            <input type="checkbox"
                   name="electionCandidates"
                   value="${escapeElectionHTML(candidate.id)}"
                   ${selectedIds.includes(candidate.id) ? "checked" : ""}>

            <span>
                <strong>${escapeElectionHTML(candidate.name)}</strong>
                <br>
                <small>${escapeElectionHTML(candidate.party)}</small>
            </span>
        </label>
    `).join("");
}

function saveElection(event) {
    event.preventDefault();

    const message = document.getElementById("electionFormMessage");
    message.textContent = "";
    message.className = "candidate-form-message";

    const id = document.getElementById("electionId").value;
    const title = document.getElementById("electionTitle").value.trim();
    const type = document.getElementById("electionType").value;
    const startDate = document.getElementById("electionStart").value;
    const endDate = document.getElementById("electionEnd").value;
    const location = document.getElementById("electionLocation").value.trim();
    const status = document.getElementById("electionStatus").value;
    const description = document.getElementById("electionDescription").value.trim();

    const candidateIds = Array.from(
        document.querySelectorAll(
            'input[name="electionCandidates"]:checked'
        )
    ).map(input => input.value);

    if (!title || !type || !startDate || !endDate || !location) {
        showElectionMessage("Please complete all required fields.", "error");
        return;
    }

    if (new Date(endDate) <= new Date(startDate)) {
        showElectionMessage(
            "End date must be later than start date.",
            "error"
        );
        return;
    }

    if (candidateIds.length < 2) {
        showElectionMessage(
            "Please select at least two active candidates.",
            "error"
        );
        return;
    }

    const availableIds = getActiveCandidates().map(candidate => candidate.id);

    if (!candidateIds.every(candidateId => availableIds.includes(candidateId))) {
        showElectionMessage(
            "One or more selected candidates are no longer active. Please review your selection.",
            "error"
        );
        return;
    }

    const elections = getElections();

    const electionData = {
        id: id || "ELE-" + Date.now(),
        title,
        type,
        startDate,
        endDate,
        location,
        status,
        description,
        candidateIds,
        createdAt: id
            ? elections.find(election => election.id === id)?.createdAt
                || new Date().toISOString()
            : new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    try {
        if (id) {
            const index = elections.findIndex(election => election.id === id);

            if (index === -1) {
                showElectionMessage("Election not found.", "error");
                return;
            }

            elections[index] = electionData;
        } else {
            elections.push(electionData);
        }

        saveElections(elections);

        showElectionMessage(
            id ? "Election updated successfully!" : "Election created successfully!",
            "success"
        );

        resetElectionForm();
        displayElections();
        updateElectionStatistics();

    } catch (error) {
        showElectionMessage(
            "Unable to save election. Browser storage may be full.",
            "error"
        );
    }
}

function displayElections() {
    const tableBody = document.getElementById("electionTableBody");
    if (!tableBody) return;

    const search = document.getElementById("electionSearch")
        .value.trim().toLowerCase();

    const status = document.getElementById("electionStatusFilter").value;

    const elections = getElections();

    const filtered = elections.filter(election => {
        const matchesSearch =
            election.title.toLowerCase().includes(search) ||
            election.location.toLowerCase().includes(search) ||
            election.type.toLowerCase().includes(search);

        const matchesStatus =
            status === "all" || election.status === status;

        return matchesSearch && matchesStatus;
    });

    if (filtered.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align:center;">
                    No elections found.
                </td>
            </tr>
        `;
    } else {
        tableBody.innerHTML = filtered.map(election => `
            <tr>
                <td>
                    <strong>${escapeElectionHTML(election.title)}</strong>
                    <br>
                    <small>${escapeElectionHTML(election.location)}</small>
                </td>

                <td>${escapeElectionHTML(election.type)}</td>

                <td>${formatElectionDate(election.startDate)}</td>

                <td>${formatElectionDate(election.endDate)}</td>

                <td>${election.candidateIds.length}</td>

                <td>
                    <span class="election-status ${escapeElectionHTML(election.status)}">
                        ${escapeElectionHTML(election.status)}
                    </span>
                </td>

                <td>
                    <button class="election-action-btn election-edit-btn"
                            data-action="edit"
                            data-id="${escapeElectionHTML(election.id)}"
                            title="Edit">
                        <i class="fa-solid fa-pen"></i>
                    </button>

                    <button class="election-action-btn election-delete-btn"
                            data-action="delete"
                            data-id="${escapeElectionHTML(election.id)}"
                            title="Delete">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join("");
    }

    document.getElementById("electionTableNote").textContent =
        `Showing ${filtered.length} of ${elections.length} elections.`;

    const count = document.getElementById("statElections");
    if (count) count.textContent = elections.length;
}

function formatElectionDate(value) {
    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "-";

    return date.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

function handleElectionActions(event) {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const id = button.dataset.id;
    const action = button.dataset.action;

    if (action === "edit") {
        editElection(id);
    }

    if (action === "delete") {
        deleteElection(id);
    }
}

function editElection(id) {
    const election = getElections().find(item => item.id === id);
    if (!election) return;

    document.getElementById("electionId").value = election.id;
    document.getElementById("electionTitle").value = election.title;
    document.getElementById("electionType").value = election.type;
    document.getElementById("electionStart").value = election.startDate;
    document.getElementById("electionEnd").value = election.endDate;
    document.getElementById("electionLocation").value = election.location;
    document.getElementById("electionStatus").value = election.status;
    document.getElementById("electionDescription").value =
        election.description || "";

    displayElectionCandidates(election.candidateIds);

    document.getElementById("electionFormTitle").textContent =
        "Update Election";

    document.getElementById("saveElectionBtn").innerHTML =
        '<i class="fa-solid fa-save"></i> Update Election';

    document.getElementById("cancelElectionEdit")
        .classList.remove("hidden-section");

    document.getElementById("electionForm").scrollIntoView({
        behavior: "smooth"
    });
}

function deleteElection(id) {
    const confirmed = confirm(
        "Are you sure you want to delete this election?"
    );

    if (!confirmed) return;

    const elections = getElections().filter(
        election => election.id !== id
    );

    saveElections(elections);

    resetElectionForm();
    displayElections();
    updateElectionStatistics();
}

function resetElectionForm() {
    document.getElementById("electionForm").reset();
    document.getElementById("electionId").value = "";

    document.getElementById("electionFormTitle").textContent =
        "Create New Election";

    document.getElementById("saveElectionBtn").innerHTML =
        '<i class="fa-solid fa-plus"></i> Create Election';

    document.getElementById("cancelElectionEdit")
        .classList.add("hidden-section");

    document.getElementById("electionFormMessage").textContent = "";

    displayElectionCandidates();
}

function showElectionMessage(message, type) {
    const element = document.getElementById("electionFormMessage");

    element.textContent = message;
    element.className =
        "candidate-form-message " +
        (type === "success" ? "success-message" : "error-message");
}

function updateElectionStatistics() {
    const count = document.getElementById("statElections");

    if (count) {
        count.textContent = getElections().length;
    }
}
