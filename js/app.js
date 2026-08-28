/**
 * Greenwood Academy - Student Notes Management
 * Vanilla JavaScript Application
 */

// ==========================================
// DOM Selectors
// ==========================================
const studentForm = document.getElementById('student-form');
const inputInternalId = document.getElementById('internal-id');
const inputName = document.getElementById('student-name');
const inputRollNumber = document.getElementById('roll-number');
const inputClass = document.getElementById('student-class');
const inputNotes = document.getElementById('student-notes');
const rollFeedback = document.getElementById('roll-feedback');

const submitBtn = document.getElementById('submit-btn');
const cancelEditBtn = document.getElementById('cancel-edit-btn');
const formTitle = document.getElementById('form-title');

const searchInput = document.getElementById('search-input');
const clearSearchBtn = document.getElementById('clear-search-btn');

const tableBody = document.getElementById('table-body');
const totalCountDisplay = document.getElementById('total-count');

// Bootstrap Modals and Toasts elements
const deleteModalEl = document.getElementById('deleteModal');
const deleteModal = new bootstrap.Modal(deleteModalEl);
const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
const deleteStudentName = document.getElementById('delete-student-name');

const toastEl = document.getElementById('action-toast');
const actionToast = new bootstrap.Toast(toastEl);
const toastMessage = document.getElementById('toast-message');

// ==========================================
// Application State
// ==========================================
let studentsList = [];
let editMode = false;
let deleteTargetId = null; // Stores the internal UUID of the student to be deleted

// ==========================================
// Initialization
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    loadFromLocalStorage();
    renderStudentsTable(studentsList);
});

// ==========================================
// Core Functions (Data & Rendering)
// ==========================================

/**
 * Loads students from localStorage into the state array
 */
const loadFromLocalStorage = () => {
    const data = localStorage.getItem('greenwoodStudents');
    if (data) {
        try {
            studentsList = JSON.parse(data);
        } catch (error) {
            console.error("Failed to parse localStorage data", error);
            studentsList = [];
        }
    } else {
        studentsList = [];
    }
};

/**
 * Saves current studentsList array to localStorage
 */
const saveToLocalStorage = () => {
    localStorage.setItem('greenwoodStudents', JSON.stringify(studentsList));
};

/**
 * Renders the HTML table based on the provided student array
 * @param {Array} studentsToRender - The array of student objects to display
 */
const renderStudentsTable = (studentsToRender) => {
    tableBody.innerHTML = '';
    
    // Update total count pill in the header
    totalCountDisplay.textContent = studentsList.length;

    // Handle Empty State
    if (studentsToRender.length === 0) {
        const row = document.createElement('tr');
        const emptyMessage = searchInput.value.trim() !== '' 
            ? 'No students found matching your search.' 
            : 'No students found. Add a new student to get started.';
            
        row.innerHTML = `
            <td colspan="6">
                <div class="empty-state">
                    <p class="mb-0 fs-5">${emptyMessage}</p>
                </div>
            </td>
        `;
        tableBody.appendChild(row);
        return;
    }

    // Populate rows
    studentsToRender.forEach((student, index) => {
        const row = document.createElement('tr');
        
        // Escape notes to prevent HTML injection/breakage in title tag
        const safeNotes = student.notes 
            ? student.notes.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;') 
            : '<em class="text-muted">No notes</em>';
        
        row.innerHTML = `
            <td class="ps-4 text-muted">${index + 1}</td>
            <td class="fw-medium">${student.name}</td>
            <td><span class="badge bg-secondary">${student.rollNumber}</span></td>
            <td>${student.className}</td>
            <td class="notes-col">
                <span class="note-truncate" title="${student.notes || 'No notes available'}">
                    ${safeNotes}
                </span>
            </td>
            <td class="text-center pe-4">
                <div class="btn-group btn-group-sm" role="group">
                    <button type="button" class="btn btn-outline-primary edit-btn" data-id="${student.id}" title="Edit Student">
                        Edit
                    </button>
                    <button type="button" class="btn btn-outline-danger delete-btn" data-id="${student.id}" title="Delete Student">
                        Delete
                    </button>
                </div>
            </td>
        `;
        tableBody.appendChild(row);
    });
};

/**
 * Helper to display Bootstrap toast notifications
 * @param {string} message - Notification text
 * @param {string} type - 'success', 'danger', or 'warning'
 */
const showToast = (message, type = 'success') => {
    toastMessage.textContent = message;
    
    // Reset toast colors
    toastEl.classList.remove('bg-success', 'bg-danger', 'bg-warning');
    
    // Apply new color
    toastEl.classList.add(`bg-${type}`);
    actionToast.show();
};

/**
 * Resets the form and switches back to "Add" mode
 */
const resetForm = () => {
    studentForm.reset();
    studentForm.classList.remove('was-validated');
    
    // Reset fields validation UI manually in case they are lingering
    inputRollNumber.classList.remove('is-invalid');
    
    inputInternalId.value = '';
    editMode = false;
    
    formTitle.textContent = 'Add New Student';
    submitBtn.textContent = 'Save Student';
    submitBtn.classList.replace('btn-primary', 'btn-success');
    cancelEditBtn.classList.add('d-none');
};

// ==========================================
// Event Listeners
// ==========================================

/**
 * Handle Form Submission (Add or Update)
 */
studentForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    // 1. Basic Bootstrap Form Validation (checking required fields)
    if (!studentForm.checkValidity()) {
        studentForm.classList.add('was-validated');
        return;
    }

    // 2. Fetch Values
    const id = inputInternalId.value;
    const name = inputName.value.trim();
    const rollNumber = inputRollNumber.value.trim();
    const className = inputClass.value.trim();
    const notes = inputNotes.value.trim();

    // 3. Custom Validation: Unique Student ID / Roll Number
    // Check if another student (not the one currently being edited) has this roll number
    const isDuplicateRoll = studentsList.some(student => 
        student.rollNumber.toLowerCase() === rollNumber.toLowerCase() && student.id !== id
    );

    if (isDuplicateRoll) {
        inputRollNumber.classList.add('is-invalid');
        rollFeedback.textContent = `Student ID '${rollNumber}' is already in use.`;
        return; // Stop submission
    } else {
        inputRollNumber.classList.remove('is-invalid');
    }

    // 4. Create or Update Object
    if (editMode) {
        // Find and update existing student
        const studentIndex = studentsList.findIndex(s => s.id === id);
        if (studentIndex > -1) {
            studentsList[studentIndex] = { ...studentsList[studentIndex], name, rollNumber, className, notes };
            showToast('Student record updated successfully.', 'success');
        }
    } else {
        // Create new student
        const newStudent = {
            id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(), // Fallback for older browsers
            name,
            rollNumber,
            className,
            notes
        };
        studentsList.push(newStudent);
        showToast('New student added successfully.', 'success');
    }

    // 5. Finalize
    saveToLocalStorage();
    
    // Apply current search filter if active, otherwise render full list
    filterTable(searchInput.value);
    
    resetForm();
});

/**
 * Handle Cancel Edit Button
 */
cancelEditBtn.addEventListener('click', () => {
    resetForm();
});

/**
 * Event Delegation for Table Actions (Edit & Delete)
 */
tableBody.addEventListener('click', (e) => {
    // Check if Edit button clicked
    const editBtn = e.target.closest('.edit-btn');
    if (editBtn) {
        const studentId = editBtn.dataset.id;
        const student = studentsList.find(s => s.id === studentId);
        if (student) {
            // Populate form
            inputInternalId.value = student.id;
            inputName.value = student.name;
            inputRollNumber.value = student.rollNumber;
            inputClass.value = student.className;
            inputNotes.value = student.notes;
            
            // Switch UI to Edit Mode
            editMode = true;
            formTitle.textContent = 'Update Student';
            submitBtn.textContent = 'Update Student';
            submitBtn.classList.replace('btn-success', 'btn-primary');
            cancelEditBtn.classList.remove('d-none');
            
            // Scroll to top smoothly so user sees the form on mobile
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }

    // Check if Delete button clicked
    const deleteBtn = e.target.closest('.delete-btn');
    if (deleteBtn) {
        const studentId = deleteBtn.dataset.id;
        const student = studentsList.find(s => s.id === studentId);
        
        if (student) {
            deleteTargetId = studentId;
            deleteStudentName.textContent = student.name;
            deleteModal.show();
        }
    }
});

/**
 * Handle Delete Confirmation from Modal
 */
confirmDeleteBtn.addEventListener('click', () => {
    if (deleteTargetId) {
        // Filter out the deleted student
        studentsList = studentsList.filter(s => s.id !== deleteTargetId);
        saveToLocalStorage();
        
        // Re-apply search filter if one exists
        filterTable(searchInput.value);
        
        // If the deleted student was currently being edited, reset the form
        if (editMode && inputInternalId.value === deleteTargetId) {
            resetForm();
        }

        deleteModal.hide();
        showToast('Student deleted successfully.', 'danger');
        deleteTargetId = null;
    }
});

/**
 * Handle Search Input (Real-time filtering)
 */
const filterTable = (query) => {
    const searchTerm = query.trim().toLowerCase();
    
    if (searchTerm === '') {
        renderStudentsTable(studentsList);
    } else {
        const filteredList = studentsList.filter(student => 
            student.name.toLowerCase().includes(searchTerm)
        );
        renderStudentsTable(filteredList);
    }
};

searchInput.addEventListener('input', (e) => {
    filterTable(e.target.value);
});

/**
 * Handle Clear Search Button
 */
clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    filterTable('');
    searchInput.focus();
});