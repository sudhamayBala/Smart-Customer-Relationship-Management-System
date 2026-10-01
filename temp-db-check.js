const mysql = require('mysql2/promise');

(async () => {
  const conn = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'SBbala200092@#',
    database: 'propflow',
  });

  const [rows] = await conn.query(
    'SELECT id, name, email, password_hash, role, status FROM users ORDER BY created_at DESC LIMIT 20'
  );

  console.log(JSON.stringify(rows, null, 2));
  await conn.end();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
