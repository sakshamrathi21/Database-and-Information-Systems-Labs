import psycopg2
from psycopg2 import extras

con = psycopg2.connect(database = 'ecommerce', user = 'test', password = 'test')

with con:
    cursor = con.cursor(cursor_factory = psycopg2.extras.DictCursor)
    cursor.execute("SELECT * FROM cars")
    rows = cursor.fetchall()
    for row in rows:
        print(f"{row['id']} {row['name']} {row['price']}")