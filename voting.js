
const VOTE_STORAGE_KEY = "smartVoteVotes";

let currentElection = null;
let currentVoter = null;
let votingAllowed = false;

document.addEventListener("DOMContentLoaded", () => {
    initializeVotingPage();
});

function initializeVotingPage() {
    currentVoter = typeof getCurrentUser === "function"
        ? getCurrentUser()
        : null;

    if (!currentVoter || currentVoter.role !== "voter") {
        window.location.href = "login.html";
        return;
    }

    // Check the latest voter account status.
    const users = JSON.parse(
        localStorage.getItem("smartVoteUsers") || "[]"
    );

    const latestVoter = users.find(user => user.id === currentVoter.id);

    if (!latestVoter || latestVoter.status !== "active") {
        sessionStorage.removeItem("smartVoteUser");
        sessionStorage.removeItem("smartVoteSession");
        window.location.href = "login.html";
        return;
    }

    currentVoter = latestVoter;

    const params = new URLSearchParams(window.location.search);
    const electionId = params.get("electionId");

    if (!electionId) {
        showVotingError("Election ID is missing. Please select an election from your dashboard.");
        return;
    }

    const elections = JSON.parse(
        localStorage.getItem("smartVoteElections") || "[]"
    );

    currentElection = elections.find(
        election => election.id === electionId
    );

    if (!currentElection) {
        showVotingError("The requested election could not be found.");
        return;
    }

    const now = new Date();
    const start = new Date(currentElection.startDate);
    const end = new Date(currentElection.endDate);

    if (
        currentElection.status !== "active" ||
        now < start ||
        now > end
    ) {
        showVotingError("This election is not currently open for voting.");
        return;
    }

    if (hasAlreadyVoted()) {
        showVotingError("You have already submitted your vote for this election.");
        return;
    }

    displayElectionDetails();
    displayVotingCandidates();

    document.getElementById("votingForm")
        .addEventListener("submit", submitVote);
}

function getStoredVotes() {
    return JSON.parse(
        localStorage.getItem(VOTE_STORAGE_KEY) || "[]"
    );
}

function hasAlreadyVoted() {
    return getStoredVotes().some(vote =>
        vote.electionId === currentElection.id &&
        vote.voterId === currentVoter.id
    );
}

function displayElectionDetails() {
    document.getElementById("voteElectionTitle").textContent =
        currentElection.title;

    document.getElementById("voteElectionDescription").textContent =
        currentElection.description || "Participate in this election.";

    document.getElementById("voteStartDate").textContent =
        formatVoteDate(currentElection.startDate);

    document.getElementById("voteEndDate").textContent =
        formatVoteDate(currentElection.endDate);

    document.getElementById("voteLocation").textContent =
        currentElection.location;
}

function displayVotingCandidates() {
    const container = document.getElementById("votingCandidateList");

    const candidates = JSON.parse(
        localStorage.getItem("smartVoteCandidates") || "[]"
    );

    const electionCandidates = candidates.filter(candidate =>
        currentElection.candidateIds.includes(candidate.id) &&
        candidate.status === "active"
    );

    if (electionCandidates.length < 2) {
        showVotingError(
            "This election does not currently have at least two active candidates."
        );
        return;
    }

    container.innerHTML = electionCandidates.map(candidate => {
        const photo = candidate.photo &&
            candidate.photo.startsWith("data:image/")
            ? `<img class="voting-candidate-photo"
                    src="${candidate.photo}"
                    alt="Candidate photo">`
            : `<div class="voting-candidate-placeholder">
                    <i class="fa-solid fa-user"></i>
               </div>`;

        return `
            <label class="voting-candidate-option">
                <input type="radio"
                       name="selectedCandidate"
                       value="${escapeVoteHTML(candidate.id)}"
                       required>

                ${photo}

                <span class="voting-candidate-details">
                    <strong>${escapeVoteHTML(candidate.name)}</strong>
                    <small>${escapeVoteHTML(candidate.party)}</small>
                    <small>${escapeVoteHTML(candidate.position)}</small>
                </span>
            </label>
        `;
    }).join("");

    container.querySelectorAll(".voting-candidate-option").forEach(option => {
        option.addEventListener("click", () => {
            container.querySelectorAll(".voting-candidate-option")
                .forEach(item => item.classList.remove("selected"));

            option.classList.add("selected");

            document.getElementById("submitVoteBtn").disabled = false;
        });
    });

    votingAllowed = true;
}

function submitVote(event) {
    event.preventDefault();

    if (!votingAllowed || !currentElection || !currentVoter) {
        showVotingError("Voting is not available.");
        return;
    }

    // Recheck election dates and status before submission.
    const elections = JSON.parse(
        localStorage.getItem("smartVoteElections") || "[]"
    );

    const latestElection = elections.find(
        election => election.id === currentElection.id
    );

    const now = new Date();

    if (
        !latestElection ||
        latestElection.status !== "active" ||
        now < new Date(latestElection.startDate) ||
        now > new Date(latestElection.endDate)
    ) {
        showVotingError("This election is no longer open for voting.");
        return;
    }

    // Recheck voter status.
    const users = JSON.parse(
        localStorage.getItem("smartVoteUsers") || "[]"
    );

    const latestVoter = users.find(
        user => user.id === currentVoter.id
    );

    if (!latestVoter || latestVoter.status !== "active") {
        showVotingError("Your voter account is not active.");
        return;
    }

    const votes = getStoredVotes();

    // Prevent a second vote through the normal application flow.
    if (votes.some(vote =>
        vote.electionId === currentElection.id &&
        vote.voterId === currentVoter.id
    )) {
        showVotingError("You have already voted in this election.");
        return;
    }

    const selected = document.querySelector(
        'input[name="selectedCandidate"]:checked'
    );

    if (!selected) {
        showVotingError("Please select a candidate before submitting.");
        return;
    }

    const latestCandidates = JSON.parse(
        localStorage.getItem("smartVoteCandidates") || "[]"
    );

    const selectedCandidate = latestCandidates.find(candidate =>
        candidate.id === selected.value &&
        candidate.status === "active" &&
        latestElection.candidateIds.includes(candidate.id)
    );

    if (!selectedCandidate) {
        showVotingError("The selected candidate is no longer available.");
        return;
    }

    const confirmed = confirm(
        "Are you sure you want to submit your vote? You cannot change it afterward."
    );

    if (!confirmed) return;

    const receiptId = "VOTE-" + Date.now();

    const voteRecord = {
        id: receiptId,
        electionId: currentElection.id,
        voterId: currentVoter.id,
        voterEmail: currentVoter.email,
        candidateId: selectedCandidate.id,
        submittedAt: new Date().toISOString()
    };

    try {
        votes.push(voteRecord);

        localStorage.setItem(
            VOTE_STORAGE_KEY,
            JSON.stringify(votes)
        );

        votingAllowed = false;

        document.getElementById("votingForm").classList.add("hidden-section");

        document.getElementById("voteReceiptId").textContent = receiptId;

        document.getElementById("voteReceiptDate").textContent =
            new Date(voteRecord.submittedAt).toLocaleString("en-IN");

        document.getElementById("voteConfirmation")
            .classList.remove("hidden-section");

        document.getElementById("voteConfirmation")
            .scrollIntoView({ behavior: "smooth" });

    } catch (error) {
        showVotingError(
            "Unable to save your vote. Browser storage may be full."
        );
    }
}

function showVotingError(message) {
    const messageBox = document.getElementById("votingMessage");

    messageBox.textContent = message;
    messageBox.classList.remove("hidden-section");
    messageBox.classList.add("error");

    document.getElementById("votingForm")
        ?.classList.add("hidden-section");

    document.getElementById("votingElectionTitle").textContent =
        currentElection?.title || "Voting unavailable";
}

function formatVoteDate(value) {
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

function escapeVoteHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

