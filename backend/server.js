require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const authRouter = require('./routers/Auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware de CORS dinâmico e seguro
const allowedOrigins = process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',') : ['*'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  credentials: true
}));

app.use(express.json());

// Servir estáticos do frontend se rodar unificado ou no local
app.use(express.static(path.join(__dirname, '../frontend')));

// Rotas de API
app.use('/api/auth', authRouter);

// Rota de Health Check para monitoramento do Render
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'M-A-R-K-S API', timestamp: new Date() });
});

// Inicialização do Servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor M-A-R-K-S rodando na porta ${PORT}`);
  console.log(`📡 Ambiente preparado para implantação no Render`);
});
