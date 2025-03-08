# Name: Saksham Rathi
# Roll Number: 22B1003
# Date: 26 January 2025

from tabulate import tabulate
import psycopg2 as pg
from psycopg2 import sql
from parse import *

class PGShell:
    def __init__(self, hostname, port, database, username, password) -> None:
        self.hostname = hostname
        self.port = port
        self.database = database
        self.username = username
        self.password = password
        self.conn, self.cursor = self.connectDB()
                  
    def __del__(self) -> None:
        if self.cursor:
            self.cursor.close()
        if self.conn:
            self.conn.close()
      
    # returns the connection and cursor  
    def connectDB(self):
        try:
            conn = pg.connect(host = self.hostname, port = self.port, database = self.database, user = self.username, password = self.password)
            cursor = conn.cursor()
            return conn, cursor
        except Exception as e:
            print(e)
    
    def loadSchema(self, filename):
        try:
            with open(filename, 'r') as f:
                self.cursor.execute(f.read())
            self.conn.commit()
        except Exception as e:
            self.conn.rollback()
            print(e)
    
  
    # list of all table_name in database
    def getTables(self) -> list:
        try:
            query = """SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' and table_type = 'BASE TABLE' order by table_name;"""
            self.cursor.execute(query)
            cols = ['Table Name']
            tables = [[row[0]] for row in self.cursor.fetchall()]
            print(tabulate(tables, headers = cols, tablefmt="grid"))
            return tables
        
        except Exception as e:
            self.conn.rollback()
            print(e)
    
    def printMetaData(self, relation):
        try:
            query = f"""
                        WITH columns_info AS (
                            SELECT 
                                c.table_name,
                                c.column_name,
                                c.is_nullable AS Nullable,
                                c.data_type AS Type,
                                COALESCE(c.character_maximum_length, c.numeric_precision, 0) AS Length
                            FROM 
                                information_schema.columns c
                            WHERE 
                                c.table_name = '{relation}'
                        ),
                        primary_keys AS (
                            SELECT 
                                isku.table_name, 
                                isku.column_name, 
                                'Primary Key' AS Primary_Key
                            FROM 
                                information_schema.table_constraints table_ct
                            JOIN 
                                information_schema.key_column_usage isku
                            ON 
                                table_ct.constraint_name = isku.constraint_name
                            WHERE 
                                table_ct.constraint_type = 'PRIMARY KEY' AND isku.table_name = '{relation}'
                        ),
                        foreign_keys AS (
                            SELECT 
                                x.table_name, 
                                x.column_name, 
                                CONCAT(COALESCE(y.table_name, ''), '.', COALESCE(y.column_name, '')) AS Foreign_Key
                            FROM 
                                information_schema.referential_constraints c
                            JOIN 
                                information_schema.key_column_usage x
                            ON 
                                x.constraint_name = c.constraint_name
                            JOIN 
                                information_schema.key_column_usage y
                            ON 
                                y.ordinal_position = x.position_in_unique_constraint 
                                AND y.constraint_name = c.unique_constraint_name
                            WHERE 
                                x.table_name = '{relation}'
                        )
                        SELECT 
                            c_info.column_name AS "Column Name",
                            COALESCE(pk.Primary_Key, '') AS "Primary Key",
                            CASE WHEN c_info.Nullable = 'YES' THEN 'YES' ELSE 'NO' END AS "Nullable",
                            COALESCE(fk.Foreign_Key, '') AS "Foreign Key Reference",
                            c_info.Type AS "Data Type",
                            c_info.Length AS "Length"
                        FROM 
                            columns_info c_info
                        LEFT JOIN 
                            primary_keys pk
                        ON 
                            c_info.column_name = pk.column_name
                        LEFT JOIN 
                            foreign_keys fk
                        ON 
                            c_info.column_name = fk.column_name
                        order by c_info.column_name;
                        """
            self.cursor.execute(query, (relation, relation, relation))
            rows = self.cursor.fetchall()
            cols = [desc[0] for desc in self.cursor.description]
            print(tabulate(rows, headers=cols, tablefmt="grid"))
        except Exception as e:
            self.conn.rollback()
            print(f"Error: {e}")

    # drop every table present in the database
    def clearData(self):
        try:
            query = """
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
            """
            self.cursor.execute(query)
            tables = [row[0] for row in self.cursor.fetchall()]
            for table in tables:
                drop_query = f"DROP TABLE IF EXISTS {table} CASCADE;"
                self.cursor.execute(drop_query)
            self.conn.commit()
        except Exception as e:
            self.conn.rollback()
            print(e)
        
myRelaX = None #initialize with an instance of PGShell when passed \connect cmd

def parse_cmd(cmd):
    global myRelaX
    cmd = str(cmd)
    if cmd.startswith("\\connect"):
        params = cmd.split()
        hostname = params[1]
        port = params[2]
        database = params[3]
        username = params[4]
        password = params[5]
        myRelaX = PGShell(hostname, port, database, username, password)
    
    elif cmd.startswith("\\ddl"):
        if myRelaX == None:
            raise Exception("connection not made")
        else:
            words = cmd.split(' ')
            if (len(words) != 2):
                raise Exception('Incorrect Command')
            myRelaX.loadSchema(words[1])

    elif cmd == "\\d":
        if myRelaX == None:
            raise Exception("connection not made")
        else:
            myRelaX.getTables()
            # print(myRelaX.getTables())
            pass
        
    elif cmd.startswith("\\r"):
        if myRelaX == None:
            raise Exception("connection not made")
        else:
            words = cmd.split(' ')
            if (len(words) != 2):
                raise Exception('Incorrect Command')
            relation = cmd.split()[1]
            myRelaX.printMetaData(relation)
        
    elif cmd == "\\q":
        if myRelaX != None:
            del myRelaX
        exit()
            
    elif cmd == "\\clear":
        if myRelaX == None:
            raise Exception("connection not made")
        else:
            myRelaX.clearData()

    else:
        raise Exception("Invalid Command")
        

def main():
    while True:
        cmd = input("pgshell# ").strip()
        try:
            parse_cmd(cmd)
        except Exception as e:
            print(e)

if __name__ == '__main__':
    main()
