
document.addEventListener("DOMContentLoaded", function () {

    // 1. Admin login verification
    const currentUser = getCurrentUser();

    if (!currentUser || currentUser.role !== "admin") {
        return;
    }

    // 2. HTML elements
    const candidateForm = document.getElementById("candidateForm");
    const candidateId = document.getElementById("candidateId");
    const candidateName = document.getElementById("candidateName");
    const candidateParty = document.getElementById("candidateParty");
    const candidatePosition = document.getElementById("candidatePosition");
    const candidateConstituency = document.getElementById("candidateConstituency");
    const candidateStatus = document.getElementById("candidateStatus");
    const candidatePhoto = document.getElementById("candidatePhoto");
    const candidateDescription = document.getElementById("candidateDescription");

    const candidateSearch = document.getElementById("candidateSearch");
    const candidateStatusFilter = document.getElementById("candidateStatusFilter");
    const candidateTableBody = document.getElementById("candidateTableBody");

    const candidateCount = document.getElementById("candidateCount");
    const statCandidates = document.getElementById("statCandidates");

    const formTitle = document.getElementById("candidateFormTitle");
    const saveButton = document.getElementById("saveCandidateBtn");
    const cancelButton = document.getElementById("cancelCandidateEdit");
    const formMessage = document.getElementById("candidateFormMessage");

    let selectedPhoto = "";

    // 3. Get candidates from LocalStorage
    function getCandidates() {
        return JSON.parse(
            localStorage.getItem("smartVoteCandidates")
        ) || [];
    }

    // 4. Save candidates in LocalStorage
    function saveCandidates(candidates) {
        localStorage.setItem(
            "smartVoteCandidates",
            JSON.stringify(candidates)
        );
    }

    // 5. Update candidate count
    function updateCandidateCount() {
        const total = getCandidates().length;

        candidateCount.textContent = total;

        if (statCandidates) {
            statCandidates.textContent = total;
        }
    }

    // 6. Prevent HTML injection in displayed text
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

    // 7. Display message
    function showMessage(message, success) {
        formMessage.textContent = message;
        formMessage.style.color = success ? "#13845d" : "#c04444";
    }

    // 8. Display candidates
    function displayCandidates() {

        const candidates = getCandidates();

        const searchText = candidateSearch.value.toLowerCase().trim();
        const selectedStatus = candidateStatusFilter.value;

        const filteredCandidates = candidates.filter(function (candidate) {

            const matchesSearch =
                (candidate.name || "").toLowerCase().includes(searchText) ||
                (candidate.party || "").toLowerCase().includes(searchText) ||
                (candidate.constituency || "").toLowerCase().includes(searchText);

            const matchesStatus =
                selectedStatus === "all" ||
                candidate.status === selectedStatus;

            return matchesSearch && matchesStatus;
        });

        if (filteredCandidates.length === 0) {
            candidateTableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="empty-row">
                        No matching candidates found.
                    </td>
                </tr>
            `;

            document.getElementById("candidateTableNote").textContent =
                "No matching candidate records.";

            updateCandidateCount();
            return;
        }

        candidateTableBody.innerHTML = filteredCandidates.map(function (candidate) {

            const status = candidate.status || "active";

            const photoHTML = candidate.photo
                ? `<img src="${candidate.photo}" alt="Candidate photo">`
                : `<i class="fa-solid fa-user"></i>`;

            return `
                <tr>
                    <td>
                        <div class="candidate-person">
                            <div class="candidate-photo">
                                ${photoHTML}
                            </div>

                            <div>
                                <strong>${escapeHTML(candidate.name)}</strong>
                                <small>${escapeHTML(candidate.id)}</small>
                            </div>
                        </div>
                    </td>

                    <td>${escapeHTML(candidate.party)}</td>

                    <td>${escapeHTML(candidate.position)}</td>

                    <td>${escapeHTML(candidate.constituency)}</td>

                    <td>
                        <span class="status-badge ${
                            status === "active" ? "status-active" : "status-blocked"
                        }">
                            ${escapeHTML(status)}
                        </span>
                    </td>

                    <td>
                        <div class="candidate-actions">

                            <button
                                type="button"
                                class="action-btn candidate-edit-btn"
                                data-action="edit"
                                data-id="${escapeHTML(candidate.id)}"
                                title="Edit Candidate"
                                aria-label="Edit Candidate">

                                <i class="fa-solid fa-pen"></i>
                            </button>

                            <button
                                type="button"
                                class="action-btn candidate-delete-btn"
                                data-action="delete"
                                data-id="${escapeHTML(candidate.id)}"
                                title="Delete Candidate"
                                aria-label="Delete Candidate">

                                <i class="fa-solid fa-trash"></i>
                            </button>

                        </div>
                    </td>
                </tr>
            `;
        }).join("");

        document.getElementById("candidateTableNote").textContent =
            `Showing ${filteredCandidates.length} of ${candidates.length} candidates.`;

        updateCandidateCount();
    }

    // 9. Upload candidate photo
    candidatePhoto.addEventListener("change", function () {

        const file = this.files[0];

        if (!file) {
            selectedPhoto = "";
            return;
        }

        const allowedTypes = [
            "image/jpeg",
            "image/png",
            "image/webp"
        ];

        if (!allowedTypes.includes(file.type)) {
            showMessage("Please select a JPG, PNG or WEBP image.", false);
            this.value = "";
            selectedPhoto = "";
            return;
        }

        if (file.size > 500 * 1024) {
            showMessage("Photo size must be 500 KB or less.", false);
            this.value = "";
            selectedPhoto = "";
            return;
        }

        const reader = new FileReader();

        reader.onload = function () {
            selectedPhoto = reader.result;
            showMessage("Photo selected successfully.", true);
        };

        reader.onerror = function () {
            showMessage("Unable to read the selected photo.", false);
            selectedPhoto = "";
        };

        reader.readAsDataURL(file);
    });

    // 10. Add or Update Candidate
    candidateForm.addEventListener("submit", function (event) {

        event.preventDefault();

        const name = candidateName.value.trim();
        const party = candidateParty.value.trim();
        const position = candidatePosition.value;
        const constituency = candidateConstituency.value.trim();
        const status = candidateStatus.value;
        const description = candidateDescription.value.trim();

        if (!name || !party || !position || !constituency) {
            showMessage("Please complete all required fields.", false);
            return;
        }

        let candidates = getCandidates();

        const editingId = candidateId.value;

        // Duplicate check
        const duplicate = candidates.find(function (candidate) {

            return candidate.name.toLowerCase() === name.toLowerCase() &&
                   candidate.party.toLowerCase() === party.toLowerCase() &&
                   candidate.id !== editingId;
        });

        if (duplicate) {
            showMessage(
                "This candidate already exists with the same party.",
                false
            );
            return;
        }

        if (editingId) {

            // Update existing candidate
            candidates = candidates.map(function (candidate) {

                if (candidate.id === editingId) {

                    return {
                        ...candidate,
                        name: name,
                        party: party,
                        position: position,
                        constituency: constituency,
                        status: status,
                        description: description,
                        photo: selectedPhoto || candidate.photo || "",
                        updatedAt: new Date().toISOString()
                    };
                }

                return candidate;
            });

            showMessage("Candidate updated successfully.", true);

        } else {

            // Create new candidate
            const newCandidate = {
                id: "CAN-" + Date.now(),
                name: name,
                party: party,
                position: position,
                constituency: constituency,
                status: status,
                description: description,
                photo: selectedPhoto,
                createdAt: new Date().toISOString()
            };

            candidates.push(newCandidate);

            showMessage("Candidate added successfully.", true);
        }

        try {
            saveCandidates(candidates);
        } catch (error) {
            showMessage(
                "Unable to save candidate. Browser storage may be full.",
                false
            );
            return;
        }

        resetForm();
        refreshCandidates();
    });

    // 11. Reset form
    function resetForm() {

        candidateForm.reset();

        candidateId.value = "";
        selectedPhoto = "";

        formTitle.textContent = "Add New Candidate";

        saveButton.innerHTML =
            '<i class="fa-solid fa-plus"></i> Add Candidate';

        cancelButton.hidden = true;
    }

    // 12. Edit and Delete buttons
    candidateTableBody.addEventListener("click", function (event) {

        const button = event.target.closest("button[data-action]");

        if (!button) {
            return;
        }

        const id = button.dataset.id;
        const action = button.dataset.action;

        let candidates = getCandidates();

        const candidate = candidates.find(function (item) {
            return item.id === id;
        });

        if (!candidate) {
            showMessage("Candidate record not found.", false);
            return;
        }

        if (action === "edit") {

            candidateId.value = candidate.id;
            candidateName.value = candidate.name;
            candidateParty.value = candidate.party;
            candidatePosition.value = candidate.position;
            candidateConstituency.value = candidate.constituency;
            candidateStatus.value = candidate.status || "active";
            candidateDescription.value = candidate.description || "";

            selectedPhoto = candidate.photo || "";

            candidatePhoto.value = "";

            formTitle.textContent = "Update Candidate";

            saveButton.innerHTML =
                '<i class="fa-solid fa-floppy-disk"></i> Update Candidate';

            cancelButton.hidden = false;

            showMessage("Edit candidate details and save changes.", true);

            document.getElementById("candidates").scrollIntoView({
                behavior: "smooth"
            });

        } else if (action === "delete") {

            const confirmed = confirm(
                "Are you sure you want to delete " + candidate.name + "?"
            );

            if (!confirmed) {
                return;
            }

            candidates = candidates.filter(function (item) {
                return item.id !== id;
            });

            try {
                saveCandidates(candidates);
            } catch (error) {
                showMessage("Unable to update browser storage.", false);
                return;
            }

            if (candidateId.value === id) {
                resetForm();
            }

            showMessage("Candidate deleted successfully.", true);

            refreshCandidates();
        }
    });

    // 13. Cancel editing
    cancelButton.addEventListener("click", function () {
        resetForm();
        showMessage("Edit cancelled.", true);
    });

    // 14. Search and filter
    candidateSearch.addEventListener("input", displayCandidates);

    candidateStatusFilter.addEventListener("change", displayCandidates);

    // 15. Refresh candidate list and count
    function refreshCandidates() {
        displayCandidates();
        updateCandidateCount();
    }

    // Initial load
    refreshCandidates();

});
