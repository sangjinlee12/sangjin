// 직접 PostgreSQL 연결 테스트
const { Pool } = require('pg');

// 연결 설정
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function testConnection() {
  try {
    console.log('PostgreSQL 연결 시도 중...');
    
    // 간단한 쿼리 실행
    const result = await pool.query('SELECT NOW()');
    console.log('연결 성공!', result.rows[0]);
    
    // 테이블 생성 시도
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS test_table (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('테이블 생성 성공!');
      
      // 데이터 삽입 시도
      await pool.query(`
        INSERT INTO test_table (name) VALUES ($1)
      `, ['테스트 데이터']);
      console.log('데이터 삽입 성공!');
      
      // 데이터 조회
      const data = await pool.query('SELECT * FROM test_table');
      console.log('조회된 데이터:', data.rows);
    } catch (err) {
      console.error('SQL 작업 실패:', err);
    }
  } catch (err) {
    console.error('연결 실패:', err);
  } finally {
    // 연결 종료
    pool.end();
  }
}

testConnection();