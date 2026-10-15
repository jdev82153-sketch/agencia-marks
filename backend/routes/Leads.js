const express = require('express');
const router = express.Router();
const db = require('../lib/database');
const { authenticateToken } = require('../middleware/AuthMiddleware');

// Garantir que a tabela de leads existe
db.run(`
  CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    company_name TEXT,
    stage TEXT DEFAULT 'Prospecção', -- Prospecção, Contato, Proposta, Fechado
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
  )
`);

// GET /api/leads - Listar leads da empresa do usuário logado (Isolamento Multi-Tenant)
router.get('/', authenticateToken, (req, res) => {
  const companyId = req.user.company_id;
  
  // Se for admin geral, pode ver todos ou filtrar pela empresa
  let query = 'SELECT * FROM leads WHERE company_id = ? ORDER BY created_at DESC';
  let params = [companyId];

  if (req.user.role === 'admin' && !companyId) {
    query = 'SELECT * FROM leads ORDER BY created_at DESC';
    params = [];
  }

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Erro ao buscar leads.' });
    }
    res.json({ leads: rows });
  });
});

// POST /api/leads - Cadastrar novo lead
router.post('/', authenticateToken, (req, res) => {
  const { name, email, phone, company_name, notes, stage } = req.body;
  const companyId = req.user.company_id || 1;

  if (!name) {
    return res.status(400).json({ error: 'O nome do lead ou contato é obrigatório.' });
  }

  const query = `
    INSERT INTO leads (company_id, name, email, phone, company_name, stage, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  db.run(query, [companyId, name, email, phone, company_name, stage || 'Prospecção', notes], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Erro ao cadastrar lead.' });
    }
    res.json({
      message: 'Lead cadastrado com sucesso!',
      leadId: this.lastID
    });
  });
});

// PUT /api/leads/:id/stage - Atualizar estágio do funil
router.put('/:id/stage', authenticateToken, (req, res) => {
  const { stage } = req.body;
  const leadId = req.params.id;

  db.run('UPDATE leads SET stage = ? WHERE id = ?', [stage, leadId], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Erro ao atualizar estágio do lead.' });
    }
    res.json({ message: 'Estágio do lead atualizado!' });
  });
});

module.exports = router;
