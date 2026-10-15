const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../lib/database');
const { authenticateToken, JWT_SECRET } = require('../middleware/AuthMiddleware');

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Por favor, informe e-mail e senha.' });
  }

  const query = `
    SELECT users.*, companies.name as company_name 
    FROM users 
    LEFT JOIN companies ON users.company_id = companies.id 
    WHERE users.email = ?
  `;

  db.get(query, [email], async (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Erro interno no servidor ao autenticar.' });
    }

    if (!user) {
      return res.status(401).json({ error: 'Credenciais inválidas. Verifique o e-mail e a senha.' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Credenciais inválidas. Verifique o e-mail e a senha.' });
    }

    const tokenPayload = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      company_id: user.company_id,
      company_name: user.company_name
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '8h' });

    // Registrar log de login
    db.run('INSERT INTO activity_logs (user_id, action) VALUES (?, ?)', [user.id, 'Realizou login na plataforma']);

    return res.json({
      message: 'Autenticado com sucesso!',
      token,
      user: tokenPayload
    });
  });
});

// GET /api/auth/me
router.get('/me', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;

