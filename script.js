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
            const storedTasks = JSON.parse(localStorage.getItem('tasks')) || [];
            tasks = storedTasks.map(task => ({ ...task, subtasks: task.subtasks || [] }));
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
            <button data-action="add-subtask">Add Subtask</button>
            <button data-action="delete" class="delete-btn">Delete</button>
        `;
        return menu;
    };

    const createSubtaskElement = (subtask, parentId) => {
        const subtaskItem = document.createElement('li');
        subtaskItem.className = `subtask-item ${subtask.completed ? 'completed' : ''}`;
        subtaskItem.dataset.id = subtask.id;
        subtaskItem.dataset.parentId = parentId;
        subtaskItem.innerHTML = `
            <input type="checkbox" ${subtask.completed ? 'checked' : ''} data-action="toggle-subtask">
            <label>${subtask.text}</label>
            <button class="delete-btn" data-action="delete-subtask">×</button>
        `;
        return subtaskItem;
    };

    const createTaskElement = (task) => {
        const taskItem = document.createElement('li');
        taskItem.className = `task-item ${task.completed ? 'completed' : ''}`;
        taskItem.dataset.id = task.id;
        taskItem.draggable = true;

        taskItem.innerHTML = `
            <div class="task-content">
                <input type="checkbox" ${task.completed ? 'checked' : ''} data-action="toggle">
                <label>${task.text}</label>
                <div class="actions">
                    <button class="edit-btn" data-action="open-edit-menu">&#8942;</button>
                </div>
            </div>
        `;
        taskItem.querySelector('.actions').appendChild(createEditMenu());

        if (task.subtasks && task.subtasks.length > 0) {
            const subtaskList = document.createElement('ul');
            subtaskList.className = 'subtask-list';
            task.subtasks.forEach(subtask => {
                subtaskList.appendChild(createSubtaskElement(subtask, task.id));
            });
            taskItem.appendChild(subtaskList);
        }
        return taskItem;
    };

    const renderTasks = () => {
        const activeInput = document.querySelector('.rename-input, .subtask-input');
        if (activeInput) activeInput.blur();

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
        toggleEditMenu(taskItem);
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
            if (newText && newText !== label.textContent) updateTaskText(taskId, newText);
            else renderTasks();
        };
        input.addEventListener('blur', finishRename);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') input.blur();
            if (e.key === 'Escape') renderTasks();
        });
    };

    const showAddSubtaskInput = (taskItem, parentId) => {
        toggleEditMenu(taskItem);
        // Prevent adding another input if one already exists
        if (taskItem.querySelector('.subtask-input-container')) return;

        const container = document.createElement('div');
        container.className = 'subtask-input-container';
        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = 'Add new subtask...';
        input.className = 'subtask-input';
        container.appendChild(input);
        taskItem.appendChild(container);
        input.focus();

        const finishAddSubtask = () => {
            const text = input.value.trim();
            if (text) addSubtask(parentId, text);
            else renderTasks(); // Re-render to remove the input
        };
        input.addEventListener('blur', finishAddSubtask);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') input.blur();
            if (e.key === 'Escape') renderTasks();
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
        const subtaskItem = target.closest('.subtask-item');

        if (subtaskItem) {
            const parentId = Number(subtaskItem.dataset.parentId);
            const subtaskId = Number(subtaskItem.dataset.id);
            if (action === 'toggle-subtask') toggleSubtask(parentId, subtaskId);
            else if (action === 'delete-subtask') deleteSubtask(parentId, subtaskId);
            return;
        }

        if (taskItem) {
            const taskId = Number(taskItem.dataset.id);
            switch (action) {
                case 'open-edit-menu': toggleEditMenu(taskItem); break;
                case 'toggle': toggleTask(taskId); break;
                case 'delete': deleteTask(taskId); break;
                case 'rename': handleRename(taskItem, taskId); break;
                case 'add-subtask': showAddSubtaskInput(taskItem, taskId); break;
            }
        }
    };

    // ... (rest of the functions: handleInputBlur, Drag & Drop, Task Logic, Theme, Init) ...
    const handleInputBlur = () => {
        if (taskInput.value.trim() === '') {
            targetList = 'inbox';
            updateInputPlaceholder();
        }
    };
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
    const addTask = () => {
        const taskText = taskInput.value.trim();
        if (taskText === '') return;
        tasks.push({ id: Date.now(), text: taskText, completed: false, list: targetList, subtasks: [] });
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
    const addSubtask = (parentId, subtaskText) => {
        const parentTask = tasks.find(task => task.id === parentId);
        if (parentTask) {
            parentTask.subtasks.push({ id: Date.now(), text: subtaskText, completed: false });
            saveAndRender();
        }
    };
    const toggleSubtask = (parentId, subtaskId) => {
        const parentTask = tasks.find(task => task.id === parentId);
        if (parentTask) {
            const subtask = parentTask.subtasks.find(st => st.id === subtaskId);
            if (subtask) {
                subtask.completed = !subtask.completed;
                saveAndRender();
            }
        }
    };
    const deleteSubtask = (parentId, subtaskId) => {
        const parentTask = tasks.find(task => task.id === parentId);
        if (parentTask) {
            parentTask.subtasks = parentTask.subtasks.filter(st => st.id !== subtaskId);
            saveAndRender();
        }
    };
    const saveAndRender = () => {
        saveTasks();
        renderTasks();
    };
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
