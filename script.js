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
            tasks = storedTasks.map(task => ({
                ...task,
                subtasks: task.subtasks || [],
                dueDate: task.dueDate || null,
                repeat: task.repeat || null,
            }));
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
            <button data-action="details">Details</button>
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
        const dueDateHtml = task.dueDate ? `<span class="due-date">&#128197; ${new Date(task.dueDate).toLocaleDateString()}</span>` : '';
        taskItem.innerHTML = `
            <div class="task-content">
                <input type="checkbox" ${task.completed ? 'checked' : ''} data-action="toggle">
                <div class="task-text">
                    <label>${task.text}</label>
                    ${dueDateHtml}
                </div>
                <div class="actions">
                    <button class="edit-btn" data-action="open-edit-menu">&#8942;</button>
                </div>
            </div>
            <div class="details-pane"></div>
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
    const toggleEditMenu = (taskItem) => {
        const menu = taskItem.querySelector('.edit-menu');
        document.querySelectorAll('.edit-menu.show').forEach(m => {
            if (m !== menu) m.classList.remove('show');
        });
        menu.classList.toggle('show');
    };
    const handleRename = (taskItem, taskId) => {
        toggleEditMenu(taskItem);
        const label = taskItem.querySelector('.task-content label');
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
            else renderTasks();
        };
        input.addEventListener('blur', finishAddSubtask);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') input.blur();
            if (e.key === 'Escape') renderTasks();
        });
    };
    const toggleDetailsPane = (taskItem, taskId) => {
        const pane = taskItem.querySelector('.details-pane');
        const isVisible = pane.classList.contains('show');
        document.querySelectorAll('.details-pane.show').forEach(p => {
            p.classList.remove('show');
            p.innerHTML = '';
        });
        if (!isVisible) {
            pane.classList.add('show');
            const task = tasks.find(t => t.id === taskId);
            renderSchedulingControls(pane, task);
        }
    };

    const renderSchedulingControls = (pane, task) => {
        pane.innerHTML = '';
        const { dueDate, repeat } = task;

        // Date Picker
        const dateControl = document.createElement('div');
        dateControl.className = 'details-control';
        dateControl.innerHTML = `<label>Due Date</label>`;
        const datePickerContainer = document.createElement('div');
        datePickerContainer.className = 'date-picker-container';

        const daySelect = document.createElement('select');
        daySelect.dataset.testid = 'day-select';
        for (let i = 1; i <= 31; i++) daySelect.add(new Option(i, i));

        const monthSelect = document.createElement('select');
        monthSelect.dataset.testid = 'month-select';
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        months.forEach((month, i) => monthSelect.add(new Option(month, i)));

        const yearSelect = document.createElement('select');
        yearSelect.dataset.testid = 'year-select';
        const currentYear = new Date().getFullYear();
        for (let i = currentYear - 5; i <= currentYear + 10; i++) yearSelect.add(new Option(i, i));

        const dateToDisplay = dueDate ? new Date(dueDate) : new Date();

        daySelect.value = dateToDisplay.getUTCDate();
        monthSelect.value = dateToDisplay.getUTCMonth();
        yearSelect.value = dateToDisplay.getUTCFullYear();

        const handleDateChange = () => {
            const newDate = new Date(Date.UTC(yearSelect.value, monthSelect.value, daySelect.value));
            setTaskDueDate(task.id, newDate.toISOString().split('T')[0]);
        };

        daySelect.addEventListener('change', handleDateChange);
        monthSelect.addEventListener('change', handleDateChange);
        yearSelect.addEventListener('change', handleDateChange);

        datePickerContainer.append(daySelect, monthSelect, yearSelect);
        dateControl.appendChild(datePickerContainer);

        // Repetition Control (as before)
        const repeatControl = document.createElement('div');
        repeatControl.className = 'details-control';
        const freqSelect = document.createElement('select');
        freqSelect.innerHTML = `<option value="none">Don't repeat</option><option value="daily">Daily</option><option value="weekly">Weekly</option>`;
        freqSelect.value = repeat?.frequency || 'none';

        const intervalContainer = document.createElement('div');
        intervalContainer.className = 'interval-container';
        intervalContainer.innerHTML = `<span>Every</span><input type="number" min="1" value="${repeat?.interval || 1}"><span class="interval-unit">day(s)</span>`;
        intervalContainer.classList.toggle('hidden', !repeat || repeat.frequency === 'none');

        const intervalInput = intervalContainer.querySelector('input');
        const intervalUnit = intervalContainer.querySelector('.interval-unit');

        const handleRepetitionChange = () => {
            const frequency = freqSelect.value;
            intervalContainer.classList.toggle('hidden', frequency === 'none');
            if (frequency === 'daily') intervalUnit.textContent = 'day(s)';
            else if (frequency === 'weekly') intervalUnit.textContent = 'week(s)';
            setTaskRepetition(task.id, frequency, intervalInput.value);
        };
        freqSelect.addEventListener('change', handleRepetitionChange);
        intervalInput.addEventListener('change', handleRepetitionChange);

        repeatControl.appendChild(freqSelect);
        repeatControl.appendChild(intervalContainer);

        pane.appendChild(dateControl);
        pane.appendChild(repeatControl);
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
        const subtaskItem = target.closest('.subtask-item');
        if (subtaskItem) {
            const parentId = Number(subtaskItem.dataset.parentId);
            const subtaskId = Number(subtaskItem.dataset.id);
            if (action === 'toggle-subtask') toggleSubtask(parentId, subtaskId);
            else if (action === 'delete-subtask') deleteSubtask(parentId, subtaskId);
            return;
        }
        const taskItem = target.closest('.task-item');
        if (taskItem) {
            const taskId = Number(taskItem.dataset.id);
            switch (action) {
                case 'open-edit-menu': toggleEditMenu(taskItem); break;
                case 'toggle': toggleTask(taskId); break;
                case 'delete': deleteTask(taskId); break;
                case 'rename': handleRename(taskItem, taskId); break;
                case 'add-subtask': showAddSubtaskInput(taskItem, taskId); break;
                case 'details': toggleEditMenu(taskItem); toggleDetailsPane(taskItem, taskId); break;
            }
        }
    };
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
        tasks.push({ id: Date.now(), text: taskText, completed: false, list: targetList, subtasks: [], dueDate: null, repeat: null });
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
        if (!task) return;
        if (task.repeat && task.repeat.frequency !== 'none') {
            let newDueDate = new Date(task.dueDate || Date.now());
            switch (task.repeat.frequency) {
                case 'daily': newDueDate.setDate(newDueDate.getDate() + task.repeat.interval); break;
                case 'weekly': newDueDate.setDate(newDueDate.getDate() + 7 * task.repeat.interval); break;
            }
            task.dueDate = newDueDate.toISOString().split('T')[0];
        } else {
            task.completed = !task.completed;
        }
        saveAndRender();
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
    const setTaskDueDate = (id, date) => {
        const task = tasks.find(task => task.id === id);
        if (task) {
            task.dueDate = date;
            saveAndRender();
        }
    };
    const setTaskRepetition = (id, frequency, interval) => {
        const task = tasks.find(task => task.id === id);
        if (task) {
            if (frequency === 'none') {
                task.repeat = null;
            } else {
                task.repeat = { frequency, interval: Number(interval) };
            }
            saveTasks();
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
            const detailsPane = e.target.closest('.details-pane');
            const detailsBtn = e.target.closest('[data-action="details"]');
            if (!detailsPane && !detailsBtn) {
                 document.querySelectorAll('.details-pane.show').forEach(p => {
                    p.classList.remove('show');
                    p.innerHTML = '';
                });
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
