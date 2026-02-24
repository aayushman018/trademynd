import os
import psycopg2
import json

db_url = "postgresql://postgres.fzmrzyepcdvmdyphktvy:Aayupass%23supabase%232026@aws-1-eu-west-1.pooler.supabase.com:6543/postgres"

print("Connecting to DB...")
try:
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()
    
    cur.execute("SELECT created_at, instrument, entry_price, raw_input_data FROM trades ORDER BY created_at DESC LIMIT 3;")
    rows = cur.fetchall()
    for r in rows:
        print(f"Created: {r[0]}, Instrument: {r[1]}, Entry: {r[2]}")
        print(f"Raw Input: {json.dumps(r[3], indent=2) if r[3] else 'None'}\n")
        
except Exception as e:
    print("Error:", e)
finally:
    if 'conn' in locals() and conn:
        cur.close()
        conn.close()
