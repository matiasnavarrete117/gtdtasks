document.addEventListener('DOMContentLoaded', () => {
    const taskInput = document.getElementById('task-input');
    const addTaskBtn = document.getElementById('add-task-btn');
    const listsContainer = document.querySelector('.lists-container');

    const LISTS = ['inbox', 'next-actions', 'waiting-for', 'projects', 'someday-maybe'];
    let tasks = [];

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

        const moveBtn = document.createElement('button');
        moveBtn.classList.add('move-btn');
        moveBtn.innerHTML = '&#8644;'; // Move icon
        moveBtn.dataset.action = 'open-move-dropdown';

        const deleteBtn = document.createElement('button');
        deleteBtn.classList.add('delete-btn');
        deleteBtn.textContent = '×';
        deleteBtn.dataset.action = 'delete';

        actions.appendChild(moveBtn);
        actions.appendChild(deleteBtn);

        taskItem.appendChild(checkbox);
        taskItem.appendChild(label);
        taskItem.appendChild(actions);

        // Move Dropdown (created but not shown)
        taskItem.appendChild(createMoveDropdown(task));

        return taskItem;
    };

    const createMoveDropdown = (task) => {
        const dropdown = document.createElement('div');
        dropdown.classList.add('move-dropdown');

        LISTS.forEach(listName => {
            if (listName !== task.list) {
                const moveOption = document.createElement('button');
                moveOption.textContent = `Move to ${listName.replace('-', ' ')}`;
                moveOption.dataset.action = 'move';
                moveOption.dataset.targetList = listName;
                dropdown.appendChild(moveOption);
            }
        });
        return dropdown;
    };

    const renderTasks = () => {
        // Clear all lists
        document.querySelectorAll('.task-list').forEach(list => list.innerHTML = '');

        // Render each task into its correct list
        tasks.forEach(task => {
            const listEl = document.getElementById(`${task.list}-list`);
            if (listEl) {
                listEl.appendChild(createTaskElement(task));
            }
        });
    };

    // --- Event Handlers ---
    const handleListClick = (e) => {
        const action = e.target.dataset.action;
        if (!action) return;

        const taskItem = e.target.closest('.task-item');
        const taskId = Number(taskItem.dataset.id);

        switch (action) {
            case 'toggle':
                toggleTask(taskId);
                break;
            case 'delete':
                deleteTask(taskId);
                break;
            case 'open-move-dropdown':
                toggleMoveDropdown(taskItem);
                break;
            case 'move':
                const targetList = e.target.dataset.targetList;
                moveTask(taskId, targetList);
                break;
        }
    };

    const toggleMoveDropdown = (taskItem) => {
        const dropdown = taskItem.querySelector('.move-dropdown');
        // Close other dropdowns
        document.querySelectorAll('.move-dropdown.show').forEach(d => {
            if (d !== dropdown) d.classList.remove('show');
        });
        dropdown.classList.toggle('show');
    };

    // --- Task Logic ---
    const addTask = () => {
        const taskText = taskInput.value.trim();
        if (taskText === '') return;

        const newTask = {
            id: Date.now(),
            text: taskText,
            completed: false,
            list: 'inbox' // Always add to inbox
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
        if (task && LISTS.includes(targetList)) {
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
        listsContainer.addEventListener('click', handleListClick);

        // Close dropdown if clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.task-item')) {
                document.querySelectorAll('.move-dropdown.show').forEach(d => {
                    d.classList.remove('show');
                });
            }
        });
    };

    init();
});
