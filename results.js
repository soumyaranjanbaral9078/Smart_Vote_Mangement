
document.addEventListener("DOMContentLoaded", () => {
    initializeResultsDashboard();
});

function initializeResultsDashboard() {
    const currentUser = typeof getCurrentUser === "function"
        ? getCurrentUser()
        : null;

    if (!currentUser || currentUser.role !== "admin") {
        window.location.href = "login.html";
        return;
    }

    const select = document.getElementById("resultElectionSelect");

    if (!select) return;

    populateResultElections();

    select.addEventListener("change", displayElectionResults);

    document.getElementById("refreshResultsBtn")
        .addEventListener("click", () => {
            populateResultElections();
            displayElectionResults();
        });
}

function getResultData(key) {
    return JSON.parse(localStorage.getItem(key) || "[]");
}

function escapeResultHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

function populateResultElections() {
    const select = document.getElementById("resultElectionSelect");
    const elections = getResultData("smartVoteElections");

    const previousValue = select.value;

    select.innerHTML = '<option value="">Select an election</option>';

    elections.forEach(election => {
        const option = document.createElement("option");

        option.value = election.id;
        option.textContent = election.title;

        select.appendChild(option);
    });

    if (elections.some(election => election.id === previousValue)) {
        select.value = previousValue;
    } else if (elections.length > 0) {
        select.value = elections[0].id;
    }

    displayElectionResults();
}

function displayElectionResults() {
    const electionId = document.getElementById(
        "resultElectionSelect"
    ).value;

    const elections = getResultData("smartVoteElections");
    const election = elections.find(item => item.id === electionId);

    const content = document.getElementById("resultsContent");
    const empty = document.getElementById("resultsEmpty");

    if (!election) {
        content.classList.add("hidden-section");
        empty.classList.remove("hidden-section");

        empty.innerHTML = `
            <i class="fa-solid fa-chart-column"></i>
            <h3>No Election Selected</h3>
            <p>Create an election first to view its results.</p>
        `;
        return;
    }

    content.classList.remove("hidden-section");
    empty.classList.add("hidden-section");

    calculateAndDisplayResults(election);
}

function calculateAndDisplayResults(election) {
    const candidates = getResultData("smartVoteCandidates");
    const votes = getResultData("smartVoteVotes");
    const users = getResultData("smartVoteUsers");

    const electionCandidates = candidates.filter(candidate =>
        election.candidateIds.includes(candidate.id)
    );

    // Only count records belonging to this election and its assigned candidates.
    const validVotes = votes.filter(vote =>
        vote.electionId === election.id &&
        electionCandidates.some(candidate =>
            candidate.id === vote.candidateId
        )
    );

    const registeredVoters = users.filter(user =>
        user.role === "voter" && user.status === "active"
    );

    const totalVotes = validVotes.length;
    const totalVoters = registeredVoters.length;

    const turnout = totalVoters > 0
        ? (totalVotes / totalVoters) * 100
        : 0;

    const results = electionCandidates.map(candidate => {
        const candidateVotes = validVotes.filter(vote =>
            vote.candidateId === candidate.id
        ).length;

        const percentage = totalVotes > 0
            ? (candidateVotes / totalVotes) * 100
            : 0;

        return {
            candidate,
            votes: candidateVotes,
            percentage
        };
    });

    results.sort((a, b) => b.votes - a.votes);

    // Election heading
    document.getElementById("resultElectionTitle").textContent =
        election.title;

    document.getElementById("resultElectionDetails").textContent =
        `${election.type} • ${election.location} • ${formatResultDate(election.startDate)} to ${formatResultDate(election.endDate)}`;

    const statusElement = document.getElementById("resultElectionStatus");

    statusElement.textContent = election.status;
    statusElement.className = `election-status ${escapeResultHTML(election.status)}`;

    // Summary cards
    document.getElementById("resultTotalVoters").textContent =
        totalVoters;

    document.getElementById("resultTotalVotes").textContent =
        totalVotes;

    document.getElementById("resultTurnout").textContent =
        `${turnout.toFixed(1)}%`;

    document.getElementById("resultCandidateCount").textContent =
        electionCandidates.length;

    // Winner / tie
    displayElectionWinner(results, totalVotes);

    // Chart and table
    displayCandidateChart(results);
    displayResultTable(results);
}

function displayElectionWinner(results, totalVotes) {
    const winnerCard = document.getElementById("resultsWinnerCard");
    const winnerName = document.getElementById("resultWinnerName");
    const winnerDetails = document.getElementById("resultWinnerDetails");

    if (totalVotes === 0 || results.length === 0) {
        winnerCard.classList.remove("hidden-section");
        winnerName.textContent = "No Winner Yet";
        winnerDetails.textContent =
            "No valid votes have been submitted for this election.";
        return;
    }

    const highestVotes = results[0].votes;

    const winners = results.filter(result =>
        result.votes === highestVotes
    );

    if (winners.length > 1) {
        winnerName.textContent = "Election Tied";

        winnerDetails.textContent = winners.map(result =>
            `${result.candidate.name} (${result.votes} votes)`
        ).join(" • ");
    } else {
        winnerName.textContent = winners[0].candidate.name;

        winnerDetails.textContent =
            `${winners[0].candidate.party} • ${highestVotes} votes • ${winners[0].percentage.toFixed(1)}%`;
    }
}

function displayCandidateChart(results) {
    const chart = document.getElementById("candidateResultChart");

    if (results.length === 0) {
        chart.innerHTML = '<p class="results-no-votes">No candidates assigned to this election.</p>';
        return;
    }

    if (results.every(result => result.votes === 0)) {
        chart.innerHTML = '<p class="results-no-votes">No votes submitted yet. The chart will update when voters cast their votes.</p>';
        return;
    }

    chart.innerHTML = results.map(result => `
        <div class="result-bar-item">

            <div class="result-bar-heading">
                <strong>${escapeResultHTML(result.candidate.name)}</strong>
                <span>${result.votes} votes (${result.percentage.toFixed(1)}%)</span>
            </div>

            <div class="result-bar-track">
                <div class="result-bar-fill"
                     style="width: ${result.percentage.toFixed(2)}%">
                </div>
            </div>

        </div>
    `).join("");
}

function displayResultTable(results) {
    const table = document.getElementById("resultTableBody");

    if (results.length === 0) {
        table.innerHTML = `
            <tr>
                <td colspan="5" style="text-align:center;">
                    No candidates found.
                </td>
            </tr>
        `;
        return;
    }

    table.innerHTML = results.map((result, index) => `
        <tr>
            <td><span class="result-rank">${index + 1}</span></td>

            <td>
                <strong>${escapeResultHTML(result.candidate.name)}</strong>
            </td>

            <td>${escapeResultHTML(result.candidate.party)}</td>

            <td>${result.votes}</td>

            <td>${result.percentage.toFixed(2)}%</td>
        </tr>
    `).join("");
}

function formatResultDate(value) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "-";

    return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}

/* =====================================
   SMARTVOTE PDF ELECTION REPORT
===================================== */

document.addEventListener("DOMContentLoaded", () => {
    const downloadButton = document.getElementById("downloadResultPDF");

    if (downloadButton) {
        downloadButton.addEventListener("click", generateElectionPDF);
    }
});

function generateElectionPDF() {

    if (!window.jspdf || !window.jspdf.jsPDF) {
        alert("PDF library could not load. Please check your internet connection.");
        return;
    }

    const electionId = document.getElementById(
        "resultElectionSelect"
    ).value;

    if (!electionId) {
        alert("Please select an election first.");
        return;
    }

    const elections = getResultData("smartVoteElections");
    const candidates = getResultData("smartVoteCandidates");
    const votes = getResultData("smartVoteVotes");
    const users = getResultData("smartVoteUsers");

    const election = elections.find(item => item.id === electionId);

    if (!election) {
        alert("Election not found.");
        return;
    }

    const electionCandidates = candidates.filter(candidate =>
        election.candidateIds.includes(candidate.id)
    );

    const validVotes = votes.filter(vote =>
        vote.electionId === election.id &&
        electionCandidates.some(candidate =>
            candidate.id === vote.candidateId
        )
    );

    const registeredVoters = users.filter(user =>
        user.role === "voter" && user.status === "active"
    );

    const totalVotes = validVotes.length;
    const totalVoters = registeredVoters.length;

    const turnout = totalVoters > 0
        ? (totalVotes / totalVoters) * 100
        : 0;

    const resultData = electionCandidates.map(candidate => {

        const candidateVotes = validVotes.filter(vote =>
            vote.candidateId === candidate.id
        ).length;

        const percentage = totalVotes > 0
            ? (candidateVotes / totalVotes) * 100
            : 0;

        return {
            name: candidate.name,
            party: candidate.party,
            votes: candidateVotes,
            percentage
        };

    }).sort((a, b) => b.votes - a.votes);

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    const left = 18;
    const right = pageWidth - 18;

    // HEADER
    doc.setFillColor(30, 41, 90);
    doc.rect(0, 0, pageWidth, 43, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(23);
    doc.text("SmartVote", left, 19);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("ONLINE VOTING MANAGEMENT SYSTEM", left, 27);
    doc.text("ELECTION REPORT", left, 35);

    // REPORT INFORMATION
    let y = 57;

    doc.setTextColor(30, 41, 59);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.text("Election Information", left, y);

    y += 10;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");

    const details = [
        ["Election Title", election.title],
        ["Election Type", election.type],
        ["Location", election.location],
        ["Start Date", formatResultDate(election.startDate)],
        ["End Date", formatResultDate(election.endDate)],
        ["Election Status", election.status.toUpperCase()],
        ["Report Generated", new Date().toLocaleString("en-IN")]
    ];

    details.forEach(([label, value]) => {
        doc.setFont("helvetica", "bold");
        doc.text(label + ":", left, y);

        doc.setFont("helvetica", "normal");

        const lines = doc.splitTextToSize(
            String(value ?? "-"),
            115
        );

        doc.text(lines, 75, y);

        y += Math.max(7, lines.length * 5);
    });

    // SUMMARY
    y += 5;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.text("Election Summary", left, y);

    y += 12;

    const summary = [
        ["Registered Voters", String(totalVoters)],
        ["Votes Submitted", String(totalVotes)],
        ["Voter Turnout", turnout.toFixed(2) + "%"],
        ["Total Candidates", String(electionCandidates.length)]
    ];

    const cardWidth = (pageWidth - 42) / 2;
    const cardHeight = 19;

    summary.forEach((item, index) => {

        const column = index % 2;
        const row = Math.floor(index / 2);

        const x = left + column * (cardWidth + 6);
        const cardY = y + row * (cardHeight + 7);

        doc.setFillColor(239, 242, 255);
        doc.roundedRect(
            x,
            cardY,
            cardWidth,
            cardHeight,
            2,
            2,
            "F"
        );

        doc.setTextColor(71, 85, 105);
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.text(item[0], x + 5, cardY + 7);

        doc.setTextColor(49, 46, 129);
        doc.setFontSize(13);
        doc.setFont("helvetica", "bold");
        doc.text(item[1], x + 5, cardY + 15);
    });

    y += 58;

    // WINNER INFORMATION
    doc.setFontSize(15);
    doc.setTextColor(30, 41, 59);
    doc.text("Winner Information", left, y);

    y += 10;

    if (totalVotes === 0 || resultData.length === 0) {

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text("No winner available. No votes have been submitted.", left, y);

        y += 12;

    } else {

        const highestVotes = resultData[0].votes;

        const winners = resultData.filter(item =>
            item.votes === highestVotes
        );

        doc.setFillColor(254, 243, 199);
        doc.roundedRect(left, y, pageWidth - 36, 23, 3, 3, "F");

        doc.setTextColor(120, 53, 15);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);

        const winnerText = winners.length > 1
            ? "Election Tied: " + winners.map(item => item.name).join(", ")
            : "Winner: " + winners[0].name;

        const winnerLines = doc.splitTextToSize(
            winnerText,
            pageWidth - 50
        );

        doc.text(winnerLines, left + 5, y + 9);

        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");

        const winnerDetail = winners.length > 1
            ? `${highestVotes} votes each`
            : `${highestVotes} votes | ${winners[0].percentage.toFixed(2)}%`;

        doc.text(winnerDetail, left + 5, y + 17);

        y += 32;
    }

    // CANDIDATE RESULT TABLE
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(15);
    doc.text("Candidate-wise Results", left, y);

    y += 10;

    const headers = [
        ["Rank", "Candidate", "Party", "Votes", "Percentage"]
    ];

    const rows = resultData.map((item, index) => [
        String(index + 1),
        item.name,
        item.party,
        String(item.votes),
        item.percentage.toFixed(2) + "%"
    ]);

    if (rows.length === 0) {
        rows.push(["-", "No candidates", "-", "0", "0.00%"]);
    }

    const columnWidths = [15, 55, 45, 25, 30];
    const rowHeight = 10;

    // Table header
    doc.setFillColor(79, 70, 229);
    doc.rect(left, y, pageWidth - 36, rowHeight, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");

    let x = left;

    headers[0].forEach((header, index) => {
        doc.text(header, x + 2, y + 6.5);
        x += columnWidths[index];
    });

    y += rowHeight;

    // Table rows with page overflow handling
    doc.setFont("helvetica", "normal");

    rows.forEach((row, rowIndex) => {

        if (y + rowHeight > pageHeight - 22) {
            addReportFooter(doc);

            doc.addPage();
            y = 22;

            // Repeat header on the next page
            doc.setFillColor(79, 70, 229);
            doc.rect(left, y, pageWidth - 36, rowHeight, "F");

            doc.setTextColor(255, 255, 255);
            doc.setFont("helvetica", "bold");

            let headerX = left;

            headers[0].forEach((header, index) => {
                doc.text(header, headerX + 2, y + 6.5);
                headerX += columnWidths[index];
            });

            y += rowHeight;
            doc.setFont("helvetica", "normal");
        }

        if (rowIndex % 2 === 0) {
            doc.setFillColor(245, 247, 252);
            doc.rect(left, y, pageWidth - 36, rowHeight, "F");
        }

        doc.setTextColor(51, 65, 85);
        doc.setFontSize(8);

        let rowX = left;

        row.forEach((value, index) => {

            const textValue = doc.splitTextToSize(
                String(value),
                columnWidths[index] - 4
            );

            doc.text(textValue[0], rowX + 2, y + 6.5);
            rowX += columnWidths[index];
        });

        y += rowHeight;
    });

    // FOOTER
    addReportFooter(doc);

    const safeName = election.title
        .replace(/[^a-z0-9]/gi, "_")
        .replace(/_+/g, "_");

    doc.save(`SmartVote_${safeName}_Report.pdf`);
}

function addReportFooter(doc) {

    const pageCount = doc.internal.getNumberOfPages();
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();

    for (let page = 1; page <= pageCount; page++) {

        doc.setPage(page);

        doc.setDrawColor(203, 213, 225);
        doc.line(18, pageHeight - 15, pageWidth - 18, pageHeight - 15);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);

        doc.text(
            "SmartVote | Educational Demonstration Report",
            18,
            pageHeight - 9
        );

        doc.text(
            `Page ${page} of ${pageCount}`,
            pageWidth - 18,
            pageHeight - 9,
            { align: "right" }
        );
    }
}
