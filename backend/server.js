const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares globais
app.use(cors());
app.use(express.json());

// Rota de teste de saúde da API
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'API Agência Marks rodando com sucesso!',
    timestamp: new Date()
  });
});

// Inicialização do servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor da Agência Marks rodando na porta ${PORT}`);
});

