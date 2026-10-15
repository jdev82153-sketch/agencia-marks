// URL da API (Modifique para a URL do seu back-end no Render quando fizer o deploy)
const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'http://localhost:3000/api' 
    : 'https://SEU-APP-NO-RENDER.onrender.com/api'; // <--- Atualize com sua URL do Render

document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    // Verificar se já existe token salvo
    const token = localStorage.getItem('marks_token');
    const user = JSON.parse(localStorage.getItem('marks_user') || 'null');

    // Simular o término do Fade-in da Splash Screen (1.5s)
    setTimeout(() => {
        const splash = document.getElementById('splash-screen');
        if (splash) splash.classList.add('hidden');

        if (token && user) {
            showApp(user);
        } else {
            showLogin();
        }
    }, 1500);

    setupLoginForm();
    setupNavigation();
    setupLogout();
}

function showLogin() {
    document.getElementById('auth-container').classList.remove('hidden');
    document.getElementById('app-container').classList.add('hidden');
}

function showApp(user) {
    document.getElementById('auth-container').classList.add('hidden');
    document.getElementById('app-container').classList.remove('hidden');

    // Preencher dados do usuário
    document.getElementById('sidebar-username').textContent = user.name;
    document.getElementById('sidebar-company').textContent = user.company_name || 'Organização Principal';
    document.getElementById('welcome-user-name').textContent = user.name;
    
    const roleBadge = document.getElementById('user-role-badge');
    roleBadge.textContent = user.role === 'admin' ? 'Administrador' : 'Cliente';

    // Mostrar menu de empresas apenas para admin
    if (user.role === 'admin') {
        document.getElementById('nav-companies').style.display = 'block';
    }
}

function setupLoginForm() {
    const form = document.getElementById('login-form');
    const errorDiv = document.getElementById('auth-error');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorDiv.classList.add('hidden');

        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        try {
            const response = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Erro ao autenticar.');
            }

            // Salvar token e usuário
            localStorage.setItem('marks_token', data.token);
            localStorage.setItem('marks_user', JSON.stringify(data.user));

            showApp(data.user);
        } catch (err) {
            errorDiv.textContent = err.message;
            errorDiv.classList.remove('hidden');
        }
    });
}

function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.view-section');
    const pageTitle = document.getElementById('page-title');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            
            navItems.forEach(nav => nav.classList.remove('active'));
            sections.forEach(sec => sec.classList.remove('active'));

            item.classList.add('active');
            const targetId = item.getAttribute('data-target');
            document.getElementById(targetId).classList.add('active');
            pageTitle.textContent = item.textContent.replace(/^[^\w\s]+/, '').trim();
        });
    });
}

function setupLogout() {
    document.getElementById('btn-logout').addEventListener('click', () => {
        localStorage.removeItem('marks_token');
        localStorage.removeItem('marks_user');
        showLogin();
    });
}
