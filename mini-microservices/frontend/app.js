// Global state
let currentUser = null;
let authToken = null;

// DOM Elements
const authSection = document.getElementById('auth-section');
const userSection = document.getElementById('user-section');
const tasksSection = document.getElementById('tasks-section');
const userWelcome = document.getElementById('user-welcome');
const tasksList = document.getElementById('tasks-list');

// Forms
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const taskForm = document.getElementById('task-form');

// Buttons and tabs
const loginTab = document.getElementById('login-tab');
const registerTab = document.getElementById('register-tab');
const logoutBtn = document.getElementById('logout-btn');

// Initialize app
document.addEventListener('DOMContentLoaded', function () {
	setupEventListeners();
	checkServiceHealth();

	// Check if user is already logged in
	const savedToken = localStorage.getItem('authToken');
	const savedUser = localStorage.getItem('currentUser');

	if (savedToken && savedUser) {
		authToken = savedToken;
		currentUser = JSON.parse(savedUser);
		showUserInterface();
	}
});

// Event Listeners
function setupEventListeners() {
	// Tab switching
	loginTab.addEventListener('click', () => switchTab('login'));
	registerTab.addEventListener('click', () => switchTab('register'));

	// Form submissions
	loginForm.addEventListener('submit', handleLogin);
	registerForm.addEventListener('submit', handleRegister);
	taskForm.addEventListener('submit', handleAddTask);

	// Logout
	logoutBtn.addEventListener('click', handleLogout);
}

// Tab switching
function switchTab(tab) {
	if (tab === 'login') {
		loginTab.classList.add('active');
		registerTab.classList.remove('active');
		loginForm.classList.remove('hidden');
		registerForm.classList.add('hidden');
	} else {
		registerTab.classList.add('active');
		loginTab.classList.remove('active');
		registerForm.classList.remove('hidden');
		loginForm.classList.add('hidden');
	}
}

// Authentication Functions
async function handleLogin(e) {
	e.preventDefault();

	const username = document.getElementById('login-username').value;
	const password = document.getElementById('login-password').value;

	try {
		const response = await fetch('/api/auth/login', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ username, password })
		});

		const data = await response.json();

		if (response.ok) {
			authToken = data.token;
			currentUser = data.user;

			// Save to localStorage
			localStorage.setItem('authToken', authToken);
			localStorage.setItem('currentUser', JSON.stringify(currentUser));

			showMessage('Login successful!', 'success');
			showUserInterface();
		} else {
			showMessage(data.error || 'Login failed', 'error');
		}
	} catch (error) {
		showMessage('Connection error', 'error');
		console.error('Login error:', error);
	}
}

async function handleRegister(e) {
	e.preventDefault();

	const username = document.getElementById('register-username').value;
	const email = document.getElementById('register-email').value;
	const password = document.getElementById('register-password').value;

	try {
		const response = await fetch('/api/auth/register', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ username, email, password })
		});

		const data = await response.json();

		if (response.ok) {
			authToken = data.token;
			currentUser = data.user;

			// Save to localStorage
			localStorage.setItem('authToken', authToken);
			localStorage.setItem('currentUser', JSON.stringify(currentUser));

			showMessage('Registration successful!', 'success');
			showUserInterface();
		} else {
			showMessage(data.error || 'Registration failed', 'error');
		}
	} catch (error) {
		showMessage('Connection error', 'error');
		console.error('Register error:', error);
	}
}

function handleLogout() {
	authToken = null;
	currentUser = null;

	localStorage.removeItem('authToken');
	localStorage.removeItem('currentUser');

	showAuthInterface();
	showMessage('Logged out successfully', 'info');
}

// Interface Management
function showUserInterface() {
	authSection.classList.add('hidden');
	userSection.classList.remove('hidden');
	tasksSection.classList.remove('hidden');

	userWelcome.textContent = `Welcome, ${currentUser.username}!`;
	loadTasks();
}

function showAuthInterface() {
	authSection.classList.remove('hidden');
	userSection.classList.add('hidden');
	tasksSection.classList.add('hidden');

	// Clear forms
	loginForm.reset();
	registerForm.reset();
}

// Task Management
async function loadTasks() {
	try {
		const response = await fetch('/api/tasks', {
			headers: {
				'Authorization': `Bearer ${authToken}`
			}
		});

		const data = await response.json();

		if (response.ok) {
			displayTasks(data.tasks);
		} else {
			showMessage(data.error || 'Failed to load tasks', 'error');
		}
	} catch (error) {
		showMessage('Failed to load tasks', 'error');
		console.error('Load tasks error:', error);
	}
}

function displayTasks(tasks) {
	if (tasks.length === 0) {
		tasksList.innerHTML = '<p class="loading">No tasks yet. Add your first task above!</p>';
		return;
	}

	tasksList.innerHTML = tasks.map(task => `
        <div class="task-item ${task.completed ? 'completed' : ''}">
            <div class="task-header">
                <span class="task-title">${escapeHtml(task.title)}</span>
                <div class="task-actions">
                    ${!task.completed ? `
                        <button class="task-button complete-btn" onclick="toggleTask(${task.id}, true)">
                            Complete
                        </button>
                    ` : `
                        <button class="task-button complete-btn" onclick="toggleTask(${task.id}, false)">
                            Undo
                        </button>
                    `}
                    <button class="task-button delete-btn" onclick="deleteTask(${task.id})">
                        Delete
                    </button>
                </div>
            </div>
            ${task.description ? `
                <div class="task-description">${escapeHtml(task.description)}</div>
            ` : ''}
            <div class="task-meta">
                Created: ${new Date(task.created_at).toLocaleDateString()}
                ${task.updated_at !== task.created_at ?
			`• Updated: ${new Date(task.updated_at).toLocaleDateString()}` : ''}
            </div>
        </div>
    `).join('');
}

async function handleAddTask(e) {
	e.preventDefault();

	const title = document.getElementById('task-title').value.trim();
	const description = document.getElementById('task-description').value.trim();

	if (!title) {
		showMessage('Task title is required', 'error');
		return;
	}

	try {
		const response = await fetch('/api/tasks', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${authToken}`
			},
			body: JSON.stringify({ title, description })
		});

		const data = await response.json();

		if (response.ok) {
			showMessage('Task added successfully!', 'success');
			taskForm.reset();
			loadTasks();
		} else {
			showMessage(data.error || 'Failed to add task', 'error');
		}
	} catch (error) {
		showMessage('Failed to add task', 'error');
		console.error('Add task error:', error);
	}
}

async function toggleTask(taskId, completed) {
	try {
		const response = await fetch(`/api/tasks/${taskId}`, {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${authToken}`
			},
			body: JSON.stringify({ completed })
		});

		const data = await response.json();

		if (response.ok) {
			showMessage(`Task ${completed ? 'completed' : 'reopened'}!`, 'success');
			loadTasks();
		} else {
			showMessage(data.error || 'Failed to update task', 'error');
		}
	} catch (error) {
		showMessage('Failed to update task', 'error');
		console.error('Toggle task error:', error);
	}
}

async function deleteTask(taskId) {
	if (!confirm('Are you sure you want to delete this task?')) {
		return;
	}

	try {
		const response = await fetch(`/api/tasks/${taskId}`, {
			method: 'DELETE',
			headers: {
				'Authorization': `Bearer ${authToken}`
			}
		});

		const data = await response.json();

		if (response.ok) {
			showMessage('Task deleted successfully!', 'success');
			loadTasks();
		} else {
			showMessage(data.error || 'Failed to delete task', 'error');
		}
	} catch (error) {
		showMessage('Failed to delete task', 'error');
		console.error('Delete task error:', error);
	}
}

// Service Health Monitoring
async function checkServiceHealth() {
	const services = [
		{ name: 'gateway', url: '/health', element: 'gateway-status' },
		{ name: 'user-service', url: 'http://localhost:3001/health', element: 'user-service-status' },
		{ name: 'task-service', url: 'http://localhost:3002/health', element: 'task-service-status' }
	];

	for (const service of services) {
		try {
			const response = await fetch(service.url);
			const statusElement = document.getElementById(service.element);
			const statusLight = statusElement.querySelector('.status-light');

			if (response.ok) {
				statusLight.textContent = '●';
				statusLight.className = 'status-light online';
			} else {
				statusLight.textContent = '●';
				statusLight.className = 'status-light offline';
			}
		} catch (error) {
			const statusElement = document.getElementById(service.element);
			const statusLight = statusElement.querySelector('.status-light');
			statusLight.textContent = '●';
			statusLight.className = 'status-light offline';
		}
	}
}

// Utility Functions
function showMessage(message, type = 'info') {
	const messageEl = document.getElementById('message');
	messageEl.textContent = message;
	messageEl.className = `message ${type}`;
	messageEl.classList.remove('hidden');

	setTimeout(() => {
		messageEl.classList.add('hidden');
	}, 4000);
}

function escapeHtml(text) {
	const div = document.createElement('div');
	div.textContent = text;
	return div.innerHTML;
}

// Refresh service health every 30 seconds
setInterval(checkServiceHealth, 30000);