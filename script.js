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
    const createEditMenu = () => {
        const menu = document.createElement('div');
        menu.className = 'edit-menu';
        menu.innerHTML = `
            <button data-action="rename">Rename</button>
            <button data-action="delete" class="delete-btn">Delete</button>
        `;
        return menu;
    };

    const createTaskElement = (task) => {
        const taskItem = document.createElement('li');
        taskItem.className = `task-item ${task.completed ? 'completed' : ''}`;
        taskItem.dataset.id = task.id;
        taskItem.draggable = true;

        taskItem.innerHTML = `
            <input type="checkbox" ${task.completed ? 'checked' : ''} data-action="toggle">
            <label>${task.text}</label>
            <div class="actions">
                <button class="edit-btn" data-action="open-edit-menu">&#8942;</button>
            </div>
        `;
        taskItem.querySelector('.actions').appendChild(createEditMenu());
        return taskItem;
    };

    const renderTasks = () => {
        // Close any active rename inputs before re-rendering
        const activeInput = document.querySelector('.rename-input');
        if (activeInput) {
            // This will trigger blur and either save or cancel
            activeInput.blur();
        }
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
    const toggleEditMenu = (taskItem) => {
        const menu = taskItem.querySelector('.edit-menu');
        document.querySelectorAll('.edit-menu.show').forEach(m => {
            if (m !== menu) m.classList.remove('show');
        });
        menu.classList.toggle('show');
    };

    const handleRename = (taskItem, taskId) => {
        toggleEditMenu(taskItem); // Close menu
        const label = taskItem.querySelector('label');
        label.style.display = 'none';

        const input = document.createElement('input');
        input.type = 'text';
        input.value = label.textContent;
        input.className = 'rename-input';

        label.after(input);
        input.focus();
        input.select();

        const finishRename = () => {
            const newText = input.value.trim();
            if (newText && newText !== label.textContent) {
                updateTaskText(taskId, newText);
            }
            // The re-render from updateTaskText or a manual one will remove the input
            // If we just want to cancel without saving, we need to re-render
            if (!newText || newText === label.textContent) {
                renderTasks();
            }
        };

        input.addEventListener('blur', finishRename);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') input.blur(); // Trigger blur to finish
            if (e.key === 'Escape') renderTasks(); // Cancel and re-render
        });
    };

    const handleContainerClick = (e) => {
        const target = e.target;
        const action = target.closest('[data-action]')?.dataset.action;
        if (!action) return;

        if (action === 'add-to-list') {
            targetList = target.closest('[data-action="add-to-list"]').dataset.list;
            updateInputPlaceholder();
            taskInput.focus();
            return;
        }

        const taskItem = target.closest('.task-item');
        if (!taskItem) return;

        const taskId = Number(taskItem.dataset.id);

        switch (action) {
            case 'open-edit-menu':
                toggleEditMenu(taskItem);
                break;
            case 'toggle':
                toggleTask(taskId);
                break;
            case 'delete':
                deleteTask(taskId);
                break;
            case 'rename':
                handleRename(taskItem, taskId);
                break;
        }
    };

    const handleInputBlur = () => {
        if (taskInput.value.trim() === '') {
            targetList = 'inbox';
            updateInputPlaceholder();
        }
    };

    // ... (Drag & Drop handlers remain the same) ...
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
    const updateTaskText = (id, newText) => {
        const task = tasks.find(task => task.id === id);
        if (task) {
            task.text = newText;
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

        document.addEventListener('click', (e) => {
            if (!e.target.closest('.edit-menu') && !e.target.closest('[data-action="open-edit-menu"]')) {
                document.querySelectorAll('.edit-menu.show').forEach(m => m.classList.remove('show'));
            }
        });

        listsContainer.addEventListener('click', handleContainerClick);
        listsContainer.addEventListener('dragstart', handleDragStart);
        listsContainer.addEventListener('dragend', handleDragEnd);
        listsContainer.addEventListener('dragover', handleDragOver);
        listsContainer.addEventListener('dragleave', handleDragLeave);
        listsContainer.addEventListener('drop', handleDrop);
    };

    init();
});
