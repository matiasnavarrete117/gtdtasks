document.addEventListener('DOMContentLoaded', () => {
    const taskInput = document.getElementById('task-input');
    const addTaskBtn = document.getElementById('add-task-btn');
    const listsContainer = document.querySelector('.lists-container');

    let tasks = [];
    let draggedTaskId = null;

    // --- Data Persistence ---
    const saveTasks = () => {
        localStorage.setItem('tasks', JSON.stringify(tasks));
    };

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
        taskItem.classList.add('task-item');
        taskItem.dataset.id = task.id;
        taskItem.draggable = true; // Make the item draggable
        if (task.completed) {
            taskItem.classList.add('completed');
        }

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = task.completed;
        checkbox.dataset.action = 'toggle';

        const label = document.createElement('label');
        label.textContent = task.text;

        const actions = document.createElement('div');
        actions.classList.add('actions');

        const deleteBtn = document.createElement('button');
        deleteBtn.classList.add('delete-btn');
        deleteBtn.textContent = '×';
        deleteBtn.dataset.action = 'delete';

        actions.appendChild(deleteBtn);

        taskItem.appendChild(checkbox);
        taskItem.appendChild(label);
        taskItem.appendChild(actions);

        return taskItem;
    };

    const renderTasks = () => {
        document.querySelectorAll('.task-list').forEach(list => list.innerHTML = '');
        tasks.forEach(task => {
            const listEl = document.getElementById(`${task.list}-list`);
            if (listEl) {
                listEl.appendChild(createTaskElement(task));
            }
        });
    };

    // --- Event Handlers ---
    const handleContainerClick = (e) => {
        const action = e.target.dataset.action;
        if (!action) return;

        const taskItem = e.target.closest('.task-item');
        if (!taskItem) return;

        const taskId = Number(taskItem.dataset.id);

        if (action === 'toggle') {
            toggleTask(taskId);
        } else if (action === 'delete') {
            deleteTask(taskId);
        }
    };

    // --- Drag and Drop Handlers ---
    const handleDragStart = (e) => {
        if (e.target.classList.contains('task-item')) {
            draggedTaskId = Number(e.target.dataset.id);
            e.dataTransfer.effectAllowed = 'move';
            // Timeout to allow the DOM to update before adding class
            setTimeout(() => {
                e.target.classList.add('dragging');
            }, 0);
        }
    };

    const handleDragEnd = (e) => {
        if (e.target.classList.contains('task-item')) {
            e.target.classList.remove('dragging');
            draggedTaskId = null;
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault(); // Necessary to allow dropping
        const list = e.target.closest('.list');
        if (list) {
            list.classList.add('drag-over');
        }
    };

    const handleDragLeave = (e) => {
        const list = e.target.closest('.list');
        if (list) {
            list.classList.remove('drag-over');
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        const list = e.target.closest('.list');
        if (list && draggedTaskId) {
            const targetList = list.querySelector('.task-list').dataset.listName;
            moveTask(draggedTaskId, targetList);
            list.classList.remove('drag-over');
        }
    };


    // --- Task Logic ---
    const addTask = () => {
        const taskText = taskInput.value.trim();
        if (taskText === '') return;

        const newTask = {
            id: Date.now(),
            text: taskText,
            completed: false,
            list: 'inbox'
        };
        tasks.push(newTask);
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

    const moveTask = (id, targetList) => {
        const task = tasks.find(task => task.id === id);
        if (task && task.list !== targetList) {
            task.list = targetList;
            saveAndRender();
        }
    };

    const saveAndRender = () => {
        saveTasks();
        renderTasks();
    };

    // --- Initialization ---
    const init = () => {
        loadTasks();
        renderTasks();

        addTaskBtn.addEventListener('click', addTask);
        taskInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') addTask();
        });

        // Event delegation for clicks and drag-drop
        listsContainer.addEventListener('click', handleContainerClick);
        listsContainer.addEventListener('dragstart', handleDragStart);
        listsContainer.addEventListener('dragend', handleDragEnd);
        listsContainer.addEventListener('dragover', handleDragOver);
        listsContainer.addEventListener('dragleave', handleDragLeave);
        listsContainer.addEventListener('drop', handleDrop);
    };

    init();
});
