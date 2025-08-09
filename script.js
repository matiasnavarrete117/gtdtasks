document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const taskInput = document.getElementById('task-input');
    const addTaskBtn = document.getElementById('add-task-btn');
    const listsContainer = document.querySelector('.lists-container');
    const themeToggle = document.getElementById('theme-toggle');

    // --- State ---
    let tasks = [];
    let draggedTaskId = null;
    let targetList = 'inbox';

    // --- Data Persistence ---
    const saveTasks = () => localStorage.setItem('tasks', JSON.stringify(tasks));
    const loadTasks = () => {
        try {
            const storedTasks = JSON.parse(localStorage.getItem('tasks'));
            tasks = Array.isArray(storedTasks) ? storedTasks : [];
        } catch (error) {
            console.error("Failed to parse tasks from localStorage", error);
            tasks = [];
        }
    };

    // --- DOM Manipulation ---
    const createTaskElement = (task) => {
        const taskItem = document.createElement('li');
        taskItem.className = `task-item ${task.completed ? 'completed' : ''}`;
        taskItem.dataset.id = task.id;
        taskItem.draggable = true;

        taskItem.innerHTML = `
            <input type="checkbox" ${task.completed ? 'checked' : ''} data-action="toggle">
            <label>${task.text}</label>
            <div class="actions">
                <button class="delete-btn" data-action="delete">×</button>
            </div>
        `;
        return taskItem;
    };

    const renderTasks = () => {
        document.querySelectorAll('.task-list').forEach(list => list.innerHTML = '');
        tasks.forEach(task => {
            const listEl = document.getElementById(`${task.list}-list`);
            if (listEl) listEl.appendChild(createTaskElement(task));
        });
    };

    const updateInputPlaceholder = () => {
        const formattedName = targetList.replace('-', ' ');
        taskInput.placeholder = targetList === 'inbox' ? "Add a new task..." : `Add to ${formattedName}...`;
    };

    // --- Event Handlers ---
    const handleContainerClick = (e) => {
        const target = e.target;

        // Check for 'add-to-list' action
        const addBtn = target.closest('[data-action="add-to-list"]');
        if (addBtn) {
            targetList = addBtn.dataset.list;
            updateInputPlaceholder();
            taskInput.focus();
            return;
        }

        // Check for actions within a task item
        const taskItem = target.closest('.task-item');
        if (taskItem) {
            const actionTarget = target.closest('[data-action]');
            if (actionTarget) {
                const action = actionTarget.dataset.action;
                const taskId = Number(taskItem.dataset.id);

                if (action === 'toggle') {
                    toggleTask(taskId);
                } else if (action === 'delete') {
                    deleteTask(taskId);
                }
            }
        }
    };

    const handleInputBlur = () => {
        if (taskInput.value.trim() === '') {
            targetList = 'inbox';
            updateInputPlaceholder();
        }
    };

    // --- Drag & Drop ---
    const handleDragStart = (e) => {
        if (e.target.classList.contains('task-item')) {
            draggedTaskId = Number(e.target.dataset.id);
            e.dataTransfer.effectAllowed = 'move';
            setTimeout(() => e.target.classList.add('dragging'), 0);
        }
    };
    const handleDragEnd = (e) => {
        if (e.target.classList.contains('task-item')) e.target.classList.remove('dragging');
        draggedTaskId = null;
    };
    const handleDragOver = (e) => {
        e.preventDefault();
        const list = e.target.closest('.list');
        if (list) list.classList.add('drag-over');
    };
    const handleDragLeave = (e) => {
        const list = e.target.closest('.list');
        if (list) list.classList.remove('drag-over');
    };
    const handleDrop = (e) => {
        e.preventDefault();
        const list = e.target.closest('.list');
        if (list) {
            list.classList.remove('drag-over');
            if (draggedTaskId) {
                const newTargetList = list.querySelector('.task-list').dataset.listName;
                moveTask(draggedTaskId, newTargetList);
            }
        }
    };

    // --- Task Logic ---
    const addTask = () => {
        const taskText = taskInput.value.trim();
        if (taskText === '') return;
        tasks.push({ id: Date.now(), text: taskText, completed: false, list: targetList });
        targetList = 'inbox';
        updateInputPlaceholder();
        saveAndRender();
        taskInput.value = '';
        taskInput.focus();
    };
    const deleteTask = (id) => {
        tasks = tasks.filter(task => task.id !== id);
        saveAndRender();
    };
    const toggleTask = (id) => {
        const task = tasks.find(task => task.id === id);
        if (task) {
            task.completed = !task.completed;
            saveAndRender();
        }
    };
    const moveTask = (id, newList) => {
        const task = tasks.find(task => task.id === id);
        if (task && task.list !== newList) {
            task.list = newList;
            saveAndRender();
        }
    };
    const saveAndRender = () => {
        saveTasks();
        renderTasks();
    };

    // --- Theme Switcher ---
    const initTheme = () => {
        const savedTheme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        document.body.dataset.theme = savedTheme;
        themeToggle.checked = savedTheme === 'dark';

        themeToggle.addEventListener('change', () => {
            const newTheme = themeToggle.checked ? 'dark' : 'light';
            document.body.dataset.theme = newTheme;
            localStorage.setItem('theme', newTheme);
        });
    };

    // --- Initialization ---
    const init = () => {
        initTheme();
        loadTasks();
        renderTasks();

        addTaskBtn.addEventListener('click', addTask);
        taskInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') addTask(); });
        taskInput.addEventListener('blur', handleInputBlur);

        listsContainer.addEventListener('click', handleContainerClick);
        listsContainer.addEventListener('dragstart', handleDragStart);
        listsContainer.addEventListener('dragend', handleDragEnd);
        listsContainer.addEventListener('dragover', handleDragOver);
        listsContainer.addEventListener('dragleave', handleDragLeave);
        listsContainer.addEventListener('drop', handleDrop);
    };

    init();
});
