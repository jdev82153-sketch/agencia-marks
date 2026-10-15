/**
 * M-A-R-K-S | Plataforma de Inteligência Comercial
 * Frontend Core Application Module (SPA)
 */

// Define a URL base da API no Render (com fallback para desenvolvimento local)
const API_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:3000/api'
    : 'https://agencia-marks-1.onrender.com/api';

document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

/**
 * Inicialização do aplicativo
 */
function initApp() {
    // Atualizar relógio no topo da página
    startClock();

    // Recuperar token e dados de sessão
    const token = localStorage.getItem('marks_token');
    const user = JSON.parse(localStorage.getItem('marks_user') || 'null');

    // Executa a transição da Splash Screen de 1.5 segundo
    setTimeout(() => {
        const splash = document.getElementById('splash-screen');
        if (splash) {
            splash.style.transition = 'opacity 0.5s ease';
            splash.style.opacity = '0';
            setTimeout(() => splash.classList.add('hidden'), 500);
        }

        if (token && user) {
            showApp(user);
        } else {
            showLogin();
        }
    }, 1500);

    // Configuração dos Event Listeners dos formulários e navegação
    setupLoginForm();
    setupNavigation();
    setupLogout();
    setupLeadForm();
    setupAIGenerator();
}

/**
 * Exibe a tela de Login e oculta o Painel
 */
function showLogin() {
    const authContainer = document.getElementById('auth-container');
    const appContainer = document.getElementById('app-container');
    
    if (authContainer) authContainer.classList.remove('hidden');
    if (appContainer) appContainer.classList.add('hidden');
}

/**
 * Exibe o Painel Principal (Dashboard) e carrega os dados
 */
function showApp(user) {
    const authContainer = document.getElementById('auth-container');
    const appContainer = document.getElementById('app-container');

    if (authContainer) authContainer.classList.add('hidden');
    if (appContainer) appContainer.classList.remove('hidden');

    // Preencher dados do perfil na interface
    const sidebarUsername = document.getElementById('sidebar-username');
    const sidebarCompany = document.getElementById('sidebar-company');
    const welcomeUserName = document.getElementById('welcome-user-name');
    const roleBadge = document.getElementById('user-role-badge');
    const navCompanies = document.getElementById('nav-companies');

    if (sidebarUsername) sidebarUsername.textContent = user.name || 'Usuário';
    if (sidebarCompany) sidebarCompany.textContent = user.company_name || 'Organização Principal';
    if (welcomeUserName) welcomeUserName.textContent = user.name || 'Usuário';
    
    if (roleBadge) {
        roleBadge.textContent = user.role === 'admin' ? 'Administrador' : 'Cliente';
    }

    // Exibir opção de gestão de empresas apenas para Administradores
    if (navCompanies) {
        navCompanies.style.display = user.role === 'admin' ? 'block' : 'none';
    }

    // Carregar dados de Leads para Dashboard, Prospecção e Funil
    loadLeads();
}

/**
 * Gerenciamento do Formulário de Login
 */
function setupLoginForm() {
    const form = document.getElementById('login-form');
    const errorDiv = document.getElementById('auth-error');

    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (errorDiv) errorDiv.classList.add('hidden');

        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn ? submitBtn.textContent : '';

        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Autenticando...';
        }

        try {
            const response = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Credenciais inválidas. Tente novamente.');
            }

            // Armazenar sessão
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
                submitBtn.textContent = originalText;
            }
        }
    });
}

/**
 * Sistema de navegação em abas (SPA)
 */
function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.view-section');
    const pageTitle = document.getElementById('page-title');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();

            // Desativar todas as abas
            navItems.forEach(nav => nav.classList.remove('active'));
            sections.forEach(sec => sec.classList.remove('active'));

            // Ativar aba clicada
            item.classList.add('active');
            const targetId = item.getAttribute('data-target');
            const targetSection = document.getElementById(targetId);

            if (targetSection) {
                targetSection.classList.add('active');
            }

            if (pageTitle) {
                pageTitle.textContent = item.textContent.replace(/^[^\w\s]+/, '').trim();
            }

            // Recarregar os dados caso troque para módulos dinâmicos
            if (targetId === 'prospeccao-view' || targetId === 'funil-view' || targetId === 'dashboard-view') {
                loadLeads();
            }
        });
    });
}

/**
 * Encerramento de sessão (Logout)
 */
function setupLogout() {
    const btnLogout = document.getElementById('btn-logout');
    if (!btnLogout) return;

    btnLogout.addEventListener('click', () => {
        localStorage.removeItem('marks_token');
        localStorage.removeItem('marks_user');
        showLogin();
    });
}

/**
 * Carrega lista de leads da API
 */
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
            // Token expirado ou inválido
            localStorage.removeItem('marks_token');
            localStorage.removeItem('marks_user');
            showLogin();
            throw new Error('Sessão expirada. Faça login novamente.');
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

/**
 * Renderiza a Tabela na aba de Prospecção
 */
function renderLeadsTable(leads) {
    const tbody = document.querySelector('#table-leads tbody');
    if (!tbody) return;

    if (!leads || leads.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">Nenhum lead cadastrado até o momento.</td></tr>';
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

/**
 * Renderiza os cards do Funil de Vendas (Kanban)
 */
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

/**
 * Configuração do formulário para adicionar novos leads
 */
function setupLeadForm() {
    const formLead = document.getElementById('form-new-lead');
    if (!formLead) return;

    formLead.addEventListener('submit', async (e) => {
        e.preventDefault();

        const token = localStorage.getItem('marks_token');
        if (!token) return;

        const submitBtn = formLead.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.disabled = true;

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

            if (!res.ok) throw new Error('Erro ao salvar o lead.');

            formLead.reset();
            loadLeads();
        } catch (err) {
            alert('Não foi possível cadastrar o lead. Verifique sua conexão.');
        } finally {
            if (submitBtn) submitBtn.disabled = false;
        }
    });
}

/**
 * Configuração da ferramenta de Inteligência Comercial (Gerador de Copy com IA)
 */
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
        btnAI.textContent = 'Gerando Estratégia...';

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
            } else {
                throw new Error(data.error || 'Erro ao gerar texto.');
            }
        } catch (err) {
            alert('Erro ao consultar o Gerador de IA. Tente novamente.');
        } finally {
            btnAI.disabled = false;
            btnAI.textContent = 'Gerar Estratégia Comercial';
        }
    });
}

/**
 * Relógio em tempo real no Topbar
 */
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

/**
 * Função utilitária para tratamento de Strings / Sanitização XSS
 */
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
