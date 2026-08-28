/**
 * Greenwood Academy - Student Notes Management
 * Vanilla JS Application - Refactored for modularity, sorting, and filtering.
 */

// ==========================================
// 1. STATE MANAGEMENT
// ==========================================
const State = {
    students: [],
    editId: null,
    deleteId: null,
    filters: {
        search: '',
        status: 'All',
        className: 'All'
    },
    sort: {
        column: 'name',     // default sort by name
        direction: 'asc'    // 'asc' or 'desc'
    }
};

const STORAGE_KEY = 'greenwoodStudentsData';

// ==========================================
// 2. DOM ELEMENTS
// ==========================================
const DOM = {
    // Form Elements
    form: document.getElementById('student-form'),
    formTitle: document.getElementById('form-title'),
    id: document.getElementById('internal-id'),
    name: document.getElementById('student-name'),
    rollNumber: document.getElementById('roll-number'),
    className: document.getElementById('student-class'),
    status: document.getElementById('student-status'),
    statusLabel: document.getElementById('status-label'),
    notes: document.getElementById('student-notes'),
    submitBtn: document.getElementById('submit-btn'),
    cancelBtn: document.getElementById('cancel-edit-btn'),
    
    // Feedback Elements
    nameFeedback: document.getElementById('name-feedback'),
    rollFeedback: document.getElementById('roll-feedback'),

    // Table & Data Elements
    tableBody: document.getElementById('table-body'),
    sortableHeaders: document.querySelectorAll('th.sortable'),
    
    // Filters Elements
    filterSearch: document.getElementById('filter-search'),
    filterStatus: document.getElementById('filter-status'),
    filterClass: document.getElementById('filter-class'),
    
    // Statistics
    statTotal: document.getElementById('stat-total'),
    statActive: document.getElementById('stat-active'),
    statInactive: document.getElementById('stat-inactive'),

    // Modals & Toasts
    deleteModal: new bootstrap.Modal(document.getElementById('deleteModal')),
    confirmDeleteBtn: document.getElementById('confirm-delete-btn'),
    deleteStudentName: document.getElementById('delete-student-name'),
    toastEl: document.getElementById('action-toast'),
    toast: new bootstrap.Toast(document.getElementById('action-toast')),
    toastMessage: document.getElementById('toast-message'),
};

// ==========================================
// 3. INITIALIZATION & STORAGE
// ==========================================
const initApp = () => {
    loadData();
    setupEventListeners();
    updateUI();
};

const loadData = () => {
    try {
        const rawData = localStorage.getItem(STORAGE_KEY);
        if (rawData) {
            State.students = JSON.parse(rawData);
            
            // Migration for old data to ensure new fields exist
            State.students = State.students.map(s => ({
                ...s,
                status: s.status || 'Active',
                createdAt: s.createdAt || new Date().toISOString(),
                updatedAt: s.updatedAt || new Date().toISOString()
            }));
        }
    } catch (e) {
        console.error("Storage error:", e);
        State.students = [];
    }
};

const saveData = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(State.students));
};

// ==========================================
// 4. DATA PROCESSING (Filtering & Sorting)
// ==========================================
const getProcessedData = () => {
    // 1. Filter
    let processed = State.students.filter(student => {
        const matchSearch = student.name.toLowerCase().includes(State.filters.search.toLowerCase());
        const matchStatus = State.filters.status === 'All' || student.status === State.filters.status;
        const matchClass = State.filters.className === 'All' || student.className === State.filters.className;
        
        return matchSearch && matchStatus && matchClass;
    });

    // 2. Sort
    processed.sort((a, b) => {
        let valA = a[State.sort.column].toLowerCase();
        let valB = b[State.sort.column].toLowerCase();
        
        if (valA < valB) return State.sort.direction === 'asc' ? -1 : 1;
        if (valA > valB) return State.sort.direction === 'asc' ? 1 : -1;
        return 0;
    });

    return processed;
};

// ==========================================
// 5. RENDERING (UI Updates)
// ==========================================
const updateUI = () => {
    const dataToRender = getProcessedData();
    renderTable(dataToRender);
    renderStats();
    populateClassDropdown();
    updateSortHeaders();
};

const renderTable = (students) => {
    DOM.tableBody.innerHTML = '';

    if (students.length === 0) {
        DOM.tableBody.innerHTML = `
            <tr><td colspan="7">
                <div class="empty-state">
                    <i class="bi bi-folder2-open display-4"></i>
                    <p class="mb-0 mt-3 fs-5">No students found matching your criteria.</p>
                </div>
            </td></tr>`;
        return;
    }

    students.forEach(student => {
        const row = document.createElement('tr');
        
        // Escape HTML to prevent injection
        const safeNotes = student.notes 
            ? student.notes.replace(/</g, '&lt;').replace(/>/g, '&gt;') 
            : '<em class="text-muted">No notes</em>';
        
        const badgeClass = student.status === 'Active' ? 'badge-active' : 'badge-inactive';
        const formattedDate = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(student.createdAt));

        row.innerHTML = `
            <td class="fw-bold">${student.name}</td>
            <td><span class="badge bg-light text-dark border">${student.rollNumber}</span></td>
            <td>${student.className}</td>
            <td><span class="badge rounded-pill ${badgeClass}">${student.status}</span></td>
            <td class="text-muted small">${formattedDate}</td>
            <td class="notes-col">
                <span class="note-truncate" title="${student.notes || ''}">${safeNotes}</span>
            </td>
            <td class="text-center pe-4">
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-light border edit-btn" data-id="${student.id}" title="Edit"><i class="bi bi-pencil"></i></button>
                    <button class="btn btn-light border text-danger delete-btn" data-id="${student.id}" title="Delete"><i class="bi bi-trash"></i></button>
                </div>
            </td>
        `;
        DOM.tableBody.appendChild(row);
    });
};

const renderStats = () => {
    const total = State.students.length;
    const active = State.students.filter(s => s.status === 'Active').length;
    
    DOM.statTotal.textContent = total;
    DOM.statActive.textContent = active;
    DOM.statInactive.textContent = total - active;
};

const populateClassDropdown = () => {
    // Preserve current selection
    const currentSelection = DOM.filterClass.value;
    
    // Extract unique classes
    const uniqueClasses = [...new Set(State.students.map(s => s.className))].sort();
    
    DOM.filterClass.innerHTML = '<option value="All">All Classes</option>';
    uniqueClasses.forEach(cls => {
        const option = document.createElement('option');
        option.value = cls;
        option.textContent = cls;
        DOM.filterClass.appendChild(option);
    });

    // Re-apply selection if it still exists
    if (uniqueClasses.includes(currentSelection)) {
        DOM.filterClass.value = currentSelection;
    } else {
        DOM.filterClass.value = 'All';
        State.filters.className = 'All'; // Sync state
    }
};

const updateSortHeaders = () => {
    DOM.sortableHeaders.forEach(th => {
        th.classList.remove('sort-asc', 'sort-desc');
        if (th.dataset.sort === State.sort.column) {
            th.classList.add(`sort-${State.sort.direction}`);
        }
    });
};

// ==========================================
// 6. VALIDATION & CRUD OPERATIONS
// ==========================================
const validateInput = (name, rollNumber) => {
    let isValid = true;
    
    // Reset visual errors
    DOM.name.classList.remove('is-invalid');
    DOM.rollNumber.classList.remove('is-invalid');

    // Case-insensitive duplicate name check (ignoring current edit)
    const isDupName = State.students.some(s => 
        s.name.toLowerCase() === name.toLowerCase() && s.id !== State.editId
    );
    
    if (isDupName) {
        DOM.name.classList.add('is-invalid');
        DOM.nameFeedback.textContent = `Student name '${name}' already exists.`;
        isValid = false;
    }

    // Case-insensitive duplicate ID check (ignoring current edit)
    const isDupRoll = State.students.some(s => 
        s.rollNumber.toLowerCase() === rollNumber.toLowerCase() && s.id !== State.editId
    );
    
    if (isDupRoll) {
        DOM.rollNumber.classList.add('is-invalid');
        DOM.rollFeedback.textContent = `Student ID '${rollNumber}' is already in use.`;
        isValid = false;
    }

    return isValid;
};

const handleFormSubmit = (e) => {
    e.preventDefault();

    // Base HTML5 Validation
    if (!DOM.form.checkValidity()) {
        DOM.form.classList.add('was-validated');
        return;
    }

    // Extract values
    const name = DOM.name.value.trim();
    const rollNumber = DOM.rollNumber.value.trim();
    const className = DOM.className.value.trim();
    const status = DOM.status.checked ? 'Active' : 'Inactive';
    const notes = DOM.notes.value.trim();
    const now = new Date().toISOString();

    // Custom Duplicate Validation
    if (!validateInput(name, rollNumber)) return;

    if (State.editId) {
        // Update
        const index = State.students.findIndex(s => s.id === State.editId);
        if (index > -1) {
            State.students[index] = {
                ...State.students[index],
                name, rollNumber, className, status, notes,
                updatedAt: now
            };
            showToast('Student record updated successfully.', 'success');
        }
    } else {
        // Create
        State.students.push({
            id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
            name, rollNumber, className, status, notes,
            createdAt: now,
            updatedAt: now
        });
        showToast('New student added successfully.', 'primary');
    }

    saveData();
    resetForm();
    updateUI();
};

const handleEdit = (id) => {
    const student = State.students.find(s => s.id === id);
    if (!student) return;

    State.editId = student.id;
    
    // Populate form
    DOM.name.value = student.name;
    DOM.rollNumber.value = student.rollNumber;
    DOM.className.value = student.className;
    DOM.notes.value = student.notes;
    DOM.status.checked = (student.status === 'Active');
    DOM.statusLabel.textContent = student.status === 'Active' ? 'Active Student' : 'Inactive Student';

    // Change UI state
    DOM.formTitle.textContent = 'Edit Student';
    DOM.submitBtn.innerHTML = '<i class="bi bi-save me-1"></i> Update Record';
    DOM.cancelBtn.classList.remove('d-none');
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

const confirmDelete = () => {
    if (!State.deleteId) return;

    State.students = State.students.filter(s => s.id !== State.deleteId);
    
    // If the deleted student was being edited, reset form
    if (State.editId === State.deleteId) resetForm();

    saveData();
    updateUI();
    DOM.deleteModal.hide();
    showToast('Student record deleted permanently.', 'danger');
    State.deleteId = null;
};

// ==========================================
// 7. UTILITIES & EVENT LISTENERS
// ==========================================
const resetForm = () => {
    DOM.form.reset();
    DOM.form.classList.remove('was-validated');
    DOM.name.classList.remove('is-invalid');
    DOM.rollNumber.classList.remove('is-invalid');
    
    DOM.status.checked = true;
    DOM.statusLabel.textContent = 'Active Student';
    
    State.editId = null;
    DOM.formTitle.textContent = 'Add New Student';
    DOM.submitBtn.innerHTML = '<i class="bi bi-plus-circle me-1"></i> Save Student';
    DOM.cancelBtn.classList.add('d-none');
};

const showToast = (message, colorTheme = 'primary') => {
    DOM.toastMessage.textContent = message;
    DOM.toastEl.className = `toast align-items-center text-white border-0 shadow-lg bg-${colorTheme}`;
    DOM.toast.show();
};

const setupEventListeners = () => {
    // Form Events
    DOM.form.addEventListener('submit', handleFormSubmit);
    DOM.cancelBtn.addEventListener('click', resetForm);
    DOM.status.addEventListener('change', (e) => {
        DOM.statusLabel.textContent = e.target.checked ? 'Active Student' : 'Inactive Student';
    });

    // Table Actions (Delegation)
    DOM.tableBody.addEventListener('click', (e) => {
        const editBtn = e.target.closest('.edit-btn');
        const deleteBtn = e.target.closest('.delete-btn');

        if (editBtn) handleEdit(editBtn.dataset.id);
        if (deleteBtn) {
            const student = State.students.find(s => s.id === deleteBtn.dataset.id);
            if (student) {
                State.deleteId = student.id;
                DOM.deleteStudentName.textContent = student.name;
                DOM.deleteModal.show();
            }
        }
    });

    // Delete Confirmation
    DOM.confirmDeleteBtn.addEventListener('click', confirmDelete);

    // Filtering
    DOM.filterSearch.addEventListener('input', (e) => {
        State.filters.search = e.target.value;
        updateUI();
    });
    DOM.filterStatus.addEventListener('change', (e) => {
        State.filters.status = e.target.value;
        updateUI();
    });
    DOM.filterClass.addEventListener('change', (e) => {
        State.filters.className = e.target.value;
        updateUI();
    });

    // Sorting
    DOM.sortableHeaders.forEach(th => {
        th.addEventListener('click', () => {
            const column = th.dataset.sort;
            if (State.sort.column === column) {
                // Toggle direction
                State.sort.direction = State.sort.direction === 'asc' ? 'desc' : 'asc';
            } else {
                // New column, default asc
                State.sort.column = column;
                State.sort.direction = 'asc';
            }
            updateUI();
        });
    });
};

// Bootstrap App
document.addEventListener('DOMContentLoaded', initApp);