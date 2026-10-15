/**
 * M-A-R-K-S | Plataforma de Inteligência Comercial
 * Frontend Core Application Module (SPA) - Versão Definitiva
 */

const API_URL = 'https://agencia-marks-1.onrender.com/api';

document.addEventListener('DOMContentLoaded', () => {
    // Inicia o relógio
    startClock();

    // Verifica se já existe sessão ativa
    const token = localStorage.getItem('marks_token');
    const user = JSON.parse(localStorage.getItem('marks_user') || 'null');

    // Controla a splash screen e a exibição inicial após 1.5 segundo
    setTimeout(() => {
        const splash = document.getElementById('splash-screen');
        if (splash) {
            splash.style.display = 'none';
        }

        if (token && user) {
            showApp(user);
        } else {
            showLogin();
        }
    }, 1500);

    setupLoginForm();
    setupNavigation();
    setupLogout();
    setupLeadForm();
    setupAIGenerator();
});

function showLogin() {
    const authContainer = document.getElementById('auth-container');
    const appContainer = document.getElementById('app-container');
    
    if (authContainer) {
        authContainer.classList.remove('hidden');
        authContainer.style.display = 'flex';
    }
    if (appContainer) {
        appContainer.classList.add('hidden');
        appContainer.style.display = 'none';
    }
}

function showApp(user) {
    const authContainer = document.getElementById('auth-container');
    const appContainer = document.getElementById('app-container');

    if (authContainer) {
        authContainer.classList.add('hidden');
        authContainer.style.display = 'none';
    }
    if (appContainer) {
        appContainer.classList.remove('hidden');
        appContainer.style.display = 'flex';
    }

    const usernameEl = document.getElementById('sidebar-username');
    const companyEl = document.getElementById('sidebar-company');
    const welcomeEl = document.getElementById('welcome-user-name');
    const roleBadge = document.getElementById('user-role-badge');
    const navCompanies = document.getElementById('nav-companies');

    if (usernameEl) usernameEl.textContent = user.name || 'Utilizador';
    if (companyEl) companyEl.textContent = user.company_name || 'Organização Principal';
    if (welcomeEl) welcomeEl.textContent = user.name || 'Utilizador';
    
    if (roleBadge) {
        roleBadge.textContent = user.role === 'admin' ? 'Administrador' : 'Cliente';
    }

    if (navCompanies) {
        navCompanies.style.display = user.role === 'admin' ? 'block' : 'none';
    }

    loadLeads();
}

function setupLoginForm() {
    const form = document.getElementById('login-form');
    const errorDiv = document.getElementById('auth-error');

    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (errorDiv) {
            errorDiv.classList.add('hidden');
            errorDiv.textContent = '';
        }

        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'A autenticar...';
        }

        try {
            const response = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Credenciais inválidas.');
            }

            localStorage.setItem('marks_token', data.token);
            localStorage.setItem('marks_user', JSON.stringify(data.user));

            showApp(data.user);
        } catch (err) {
            if (errorDiv) {
                errorDiv.textContent = err.message;
                errorDiv.classList.remove('hidden');
            }
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Entrar na Plataforma';
            }
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
            const targetSection = document.getElementById(targetId);

            if (targetSection) targetSection.classList.add('active');
            if (pageTitle) pageTitle.textContent = item.textContent.replace(/^[^\w\s]+/, '').trim();

            if (['prospeccao-view', 'funil-view', 'dashboard-view'].includes(targetId)) {
                loadLeads();
            }
        });
    });
}

function setupLogout() {
    const btnLogout = document.getElementById('btn-logout');
    if (!btnLogout) return;

    btnLogout.addEventListener('click', () => {
        localStorage.removeItem('marks_token');
        localStorage.removeItem('marks_user');
        showLogin();
    });
}

function loadLeads() {
    const token = localStorage.getItem('marks_token');
    if (!token) return;

    fetch(`${API_URL}/leads`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(res => {
        if (res.status === 401 || res.status === 403) {
            localStorage.removeItem('marks_token');
            localStorage.removeItem('marks_user');
            showLogin();
            throw new Error('Sessão expirada.');
        }
        return res.json();
    })
    .then(data => {
        if (data && data.leads) {
            renderLeadsTable(data.leads);
            renderKanban(data.leads);
            
            const metricLeads = document.getElementById('metric-total-leads');
            if (metricLeads) metricLeads.textContent = data.leads.length;
        }
    })
    .catch(err => console.error('Erro ao buscar leads:', err));
}

function renderLeadsTable(leads) {
    const tbody = document.querySelector('#table-leads tbody');
    if (!tbody) return;

    if (!leads || leads.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">Nenhum lead cadastrado.</td></tr>';
        return;
    }

    tbody.innerHTML = leads.map(lead => `
        <tr>
            <td><strong>${escapeHtml(lead.name)}</strong></td>
            <td>${escapeHtml(lead.company_name || '-')}</td>
            <td>${escapeHtml(lead.email || '-')}</td>
            <td>${escapeHtml(lead.phone || '-')}</td>
            <td><span class="badge">${escapeHtml(lead.stage || 'Prospecção')}</span></td>
        </tr>
    `).join('');
}

function renderKanban(leads) {
    const stages = [
        { name: 'Prospecção', id: 'cards-prospeccao' },
        { name: 'Contato', id: 'cards-contato' },
        { name: 'Proposta', id: 'cards-proposta' },
        { name: 'Fechado', id: 'cards-fechado' }
    ];

    stages.forEach(stageInfo => {
        const container = document.getElementById(stageInfo.id);
        if (!container) return;

        const filteredLeads = (leads || []).filter(l => (l.stage || 'Prospecção') === stageInfo.name);

        if (filteredLeads.length === 0) {
            container.innerHTML = '<p style="font-size: 0.75rem; color: var(--text-muted); text-align: center; padding: 10px;">Sem itens</p>';
        } else {
            container.innerHTML = filteredLeads.map(l => `
                <div class="kanban-card">
                    <h5>${escapeHtml(l.name)}</h5>
                    <p>${escapeHtml(l.company_name || 'Particular')}</p>
                    ${l.phone ? `<p style="font-size: 0.7rem; color: var(--primary-orange); margin-top: 4px;">📱 ${escapeHtml(l.phone)}</p>` : ''}
                </div>
            `).join('');
        }
    });
}

function setupLeadForm() {
    const formLead = document.getElementById('form-new-lead');
    if (!formLead) return;

    formLead.addEventListener('submit', async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('marks_token');
        if (!token) return;

        const leadData = {
            name: document.getElementById('lead-name').value.trim(),
            email: document.getElementById('lead-email').value.trim(),
            phone: document.getElementById('lead-phone').value.trim(),
            company_name: document.getElementById('lead-company').value.trim(),
            stage: 'Prospecção'
        };

        try {
            const res = await fetch(`${API_URL}/leads`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(leadData)
            });

            if (!res.ok) throw new Error('Erro ao salvar.');
            formLead.reset();
            loadLeads();
        } catch (err) {
            alert('Não foi possível cadastrar o lead.');
        }
    });
}

function setupAIGenerator() {
    const btnAI = document.getElementById('btn-generate-ai');
    if (!btnAI) return;

    btnAI.addEventListener('click', async () => {
        const token = localStorage.getItem('marks_token');
        if (!token) return;

        const objectionInput = document.getElementById('ai-objection');
        const resultBox = document.getElementById('ai-result-box');
        const resultText = document.getElementById('ai-result-text');
        const objection = objectionInput ? objectionInput.value.trim() : '';

        btnAI.disabled = true;
        btnAI.textContent = 'A gerar estratégia...';

        try {
            const res = await fetch(`${API_URL}/ai/generate-copy`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ objection })
            });

            const data = await res.json();
            if (res.ok && data.copy) {
                if (resultText) resultText.textContent = data.copy;
                if (resultBox) resultBox.style.display = 'block';
            }
        } catch (err) {
            alert('Erro ao consultar IA.');
        } finally {
            btnAI.disabled = false;
            btnAI.textContent = 'Gerar Estratégia Comercial';
        }
    });
}

function startClock() {
    const timeElement = document.getElementById('current-time');
    if (!timeElement) return;

    const update = () => {
        const now = new Date();
        timeElement.textContent = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    };

    update();
    setInterval(update, 1000);
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
