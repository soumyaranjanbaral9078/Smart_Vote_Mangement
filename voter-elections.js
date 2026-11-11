
document.addEventListener("DOMContentLoaded", () => {
    displayVoterElections();
});

function displayVoterElections() {
    const container = document.getElementById("voterElectionList");

    if (!container) return;

    const elections = JSON.parse(
        localStorage.getItem("smartVoteElections") || "[]"
    );

    const candidates = JSON.parse(
        localStorage.getItem("smartVoteCandidates") || "[]"
    );

    const votes = JSON.parse(
        localStorage.getItem("smartVoteVotes") || "[]"
    );

    const currentUser = typeof getCurrentUser === "function"
        ? getCurrentUser()
        : null;

    if (!currentUser || currentUser.role !== "voter") {
        window.location.href = "login.html";
        return;
    }

    const now = new Date();

    const activeElections = elections.filter(election => {
        const start = new Date(election.startDate);
        const end = new Date(election.endDate);

        return election.status === "active" &&
               now >= start &&
               now <= end;
    });

    if (activeElections.length === 0) {
        container.innerHTML = `
            <div class="voter-election-empty">
                <i class="fa-solid fa-calendar-xmark"></i>
                <h3>No Active Elections</h3>
                <p>There are currently no elections available for voting.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = activeElections.map(election => {
        const selectedCandidates = candidates.filter(candidate =>
            election.candidateIds.includes(candidate.id) &&
            candidate.status === "active"
        );

        const alreadyVoted = votes.some(vote =>
            vote.electionId === election.id &&
            vote.voterId === currentUser.id
        );

        return `
            <div class="voter-election-card">

                <div class="voter-election-icon">
                    <i class="fa-solid fa-vote-yea"></i>
                </div>

                <span class="election-status active">Active</span>

                <h3>${escapeVoterElection(election.title)}</h3>

                <p>${escapeVoterElection(
                    election.description || "Participate in this election."
                )}</p>

                <div class="voter-election-details">

                    <div>
                        <i class="fa-solid fa-layer-group"></i>
                        ${escapeVoterElection(election.type)}
                    </div>

                    <div>
                        <i class="fa-solid fa-location-dot"></i>
                        ${escapeVoterElection(election.location)}
                    </div>

                    <div>
                        <i class="fa-solid fa-users"></i>
                        ${selectedCandidates.length} Candidates
                    </div>

                    <div>
                        <i class="fa-solid fa-calendar"></i>
                        Ends: ${new Date(election.endDate).toLocaleString("en-IN")}
                    </div>

                </div>

                <div class="voter-election-candidates">
                    <strong>Participating Candidates</strong>

                    ${selectedCandidates.map(candidate => `
                        <div class="voter-election-candidate">
                            <span>${escapeVoterElection(candidate.name)}</span>
                            <small>${escapeVoterElection(candidate.party)}</small>
                        </div>
                    `).join("")}
                </div>

                <div class="voter-election-footer">
                    ${
                        alreadyVoted
                        ? '<span class="vote-completed-label"><i class="fa-solid fa-circle-check"></i> Vote Submitted</span>'
                        : `<a class="cast-vote-btn"
                              href="vote.html?electionId=${encodeURIComponent(election.id)}">
                              <i class="fa-solid fa-check-to-slot"></i> Cast Your Vote
                           </a>`
                    }
                </div>

            </div>
        `;
    }).join("");
}

function escapeVoterElection(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}
