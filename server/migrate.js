import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const connectionString=process.env.DIRECT_URL || process.env.DATABASE_URL;
if(!connectionString){console.error('Configura DIRECT_URL (preferido) o DATABASE_URL para ejecutar migraciones.');process.exit(1);}
const pool=new pg.Pool({connectionString,ssl:{rejectUnauthorized:false},max:1,connectionTimeoutMillis:15000});
const here=path.dirname(fileURLToPath(import.meta.url));
try{
 await pool.query('CREATE TABLE IF NOT EXISTS schema_migrations (filename text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
 const dir=path.resolve(here,'../database/migrations');
 const files=(await readdir(dir)).filter(f=>f.endsWith('.sql')).sort();
 for(const filename of files){
  const exists=await pool.query('SELECT 1 FROM schema_migrations WHERE filename=$1',[filename]);
  if(exists.rowCount)continue;
  const sql=await readFile(path.join(dir,filename),'utf8');
  const client=await pool.connect();
  try{await client.query('BEGIN');await client.query(sql);await client.query('INSERT INTO schema_migrations(filename) VALUES($1)',[filename]);await client.query('COMMIT');console.log('Aplicada:',filename);}
  catch(error){await client.query('ROLLBACK');throw error;}
  finally{client.release();}
 }
 console.log('Migraciones completadas.');
}catch(error){console.error('Error de migración:',error.message);process.exitCode=1;}
finally{await pool.end();}
