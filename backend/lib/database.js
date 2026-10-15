const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.resolve(__dirname, 'marks_database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Erro ao conectar ao banco de dados:', err.message);
  } else {
    console.log('✅ Conectado ao banco de dados SQLite M-A-R-K-S');
  }
});

// Inicialização das tabelas
db.serialize(() => {
  // Tabela de Empresas (Multi-tenant)
  db.run(`
    CREATE TABLE IF NOT EXISTS companies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      plan TEXT DEFAULT 'pro',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tabela de Usuários
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'client', -- 'admin' ou 'client'
      company_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL
    )
  `);

  // Log de Atividades
  db.run(`
    CREATE TABLE IF NOT EXISTS activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Criar empresa matriz e usuário Admin inicial se não existirem
  db.get("SELECT * FROM companies WHERE id = 1", [], (err, company) => {
    if (!company) {
      db.run("INSERT INTO companies (name, plan) VALUES ('M-A-R-K-S Matriz', 'enterprise')", function(err) {
        if (!err) {
          const companyId = this.lastID;
          db.get("SELECT * FROM users WHERE email = 'admin@marks.com'", [], async (err, user) => {
            if (!user) {
              const hashedPassword = await bcrypt.hash('admin123', 10);
              db.run(
                "INSERT INTO users (name, email, password, role, company_id) VALUES (?, ?, ?, ?, ?)",
                ['Administrador M-A-R-K-S', 'admin@marks.com', hashedPassword, 'admin', companyId],
                () => {
                  console.log('⚡ Usuário Admin padrão criado: admin@marks.com / admin123');
                }
              );
            }
          });
        }
      });
    }
  });
});

module.exports = db;

