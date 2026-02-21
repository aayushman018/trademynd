import sqlite3
try:
    conn = sqlite3.connect('sql_app.db')
    cursor = conn.cursor()
    cursor.execute("UPDATE users SET plan='elite' WHERE email='demo@trademynd.com'")
    conn.commit()
    if cursor.rowcount > 0:
        print(f"Successfully updated demo@trademynd.com plan to 'elite'.")
    else:
        print("User demo@trademynd.com not found.")
    conn.close()
except Exception as e:
    print(f"Error: {e}")
