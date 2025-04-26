import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

// PostgreSQL 연결 설정
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// 새로운 연결 풀 생성
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// drizzle ORM 인스턴스 생성
export const db = drizzle(pool, { schema });
