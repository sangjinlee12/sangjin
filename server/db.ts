import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

// PostgreSQL 연결 설정
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// 새로운 연결 풀 생성 (옵션 추가)
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // SSL 인증서 검증 비활성화 (개발 환경용)
  },
  max: 10, // 최대 클라이언트 수
  idleTimeoutMillis: 30000, // 유휴 상태 제한 시간
  connectionTimeoutMillis: 10000 // 연결 타임아웃
});

// 데이터베이스 연결 확인
pool.on('connect', () => {
  console.log('PostgreSQL 데이터베이스에 연결되었습니다.');
});

pool.on('error', (err) => {
  console.error('데이터베이스 연결 오류:', err);
});

// drizzle ORM 인스턴스 생성
export const db = drizzle(pool, { schema });
