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
            
    def connectDB(self):
        try:
            conn = pg.connect(host = self.hostname, port = self.port, dbname = self.database, user = self.username, password = self.password)
            cursor = conn.cursor()
            return conn, cursor
        except Exception as e:
            print(e)
    
    def loadSchema(self, filename):
        try:
            with open(filename,"r") as sqlFile:
                self.cursor.execute(sqlFile.read())
                self.conn.commit()
        except Exception as e:
            self.conn.rollback()
            print(e)
    
    def loadData(self, filename):
        try:
            with open(filename,"r") as sqlFile:
                self.cursor.execute(sqlFile.read())
                self.conn.commit()
        except Exception as e:
            self.conn.rollback()
            print(e)
    
    def executeQuery(self, query):
        try:
            self.cursor.execute(query)
            self.conn.commit()
        except Exception as e:
            self.conn.rollback()
            print(e)
    
    def printTable(self, reln):
        try:
            self.cursor.execute(f"select * from {reln}")
            cols = [col[0] for col in self.cursor.description]
            order = ",".join(f'"{col}"' for col in cols)
            self.cursor.execute(f"select * from {reln} order by {order}")
            rows = self.cursor.fetchall()
            print(tabulate(rows, headers=cols, tablefmt="grid"))
        except Exception as e:
            self.conn.rollback()
            print(e)
    
    def getTables(self):
        try:
            self.cursor.execute("""
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = 'public'
                AND table_type = 'BASE TABLE';
            """)
            tables = self.cursor.fetchall()
            table_names = [table[0] for table in tables]
            return table_names
        except Exception as e:
            self.conn.rollback()
            print(e)
    
    def printMetaData(self, relation):
        try:

            primary_key_string = f''' 
                WITH primary_key_data AS (
                    SELECT 
                        c.table_name, 
                        c.column_name AS Column_Name,
                        CASE 
                            WHEN c.column_name = kcu.column_name THEN 'Primary Key' 
                            ELSE '' 
                        END AS "Primary Key"
                    FROM information_schema.columns c
                    LEFT JOIN (
                        SELECT kcu.table_name, kcu.column_name
                        FROM information_schema.table_constraints AS tc
                        JOIN information_schema.key_column_usage AS kcu
                            ON tc.constraint_name = kcu.constraint_name
                        WHERE tc.constraint_type = 'PRIMARY KEY'
                        AND tc.table_name = '{relation}'
                    ) AS kcu
                    ON c.column_name = kcu.column_name
                ),
            '''

            nullable_string = f'''
                nullable_data AS (
                    SELECT
                        table_name,
                        column_name AS "Column_Name",
                        CASE 
                            WHEN is_nullable = 'YES' THEN 'YES'
                            ELSE 'NO'
                        END AS "Nullable"
                    FROM information_schema.columns
                ),
            '''

            table_type = f'''
                type_data AS (
                    SELECT
                        table_name,
                        column_name AS "Column_Name",
                        data_type AS "Data Type",
                        COALESCE(character_maximum_length, numeric_precision, 0) AS "Length"
                    FROM information_schema.columns
                ),
            '''

            foreign_key_string = f'''
                foreign_key_data AS (
                    SELECT
                        c.table_name,
                        c.column_name AS "Column_Name",
                        CASE
                            WHEN ccu.table_name IS NOT NULL AND ccu.column_name IS NOT NULL THEN
                                CONCAT(ccu.table_name, '.', ccu.column_name)
                            ELSE
                                ''
                        END AS "Foreign Key Reference"
                    FROM information_schema.columns c
                    LEFT JOIN information_schema.key_column_usage kcu
                        ON c.table_name = kcu.table_name
                        AND c.column_name = kcu.column_name
                    LEFT JOIN information_schema.table_constraints tc
                        ON tc.constraint_name = kcu.constraint_name
                        AND tc.constraint_type = 'FOREIGN KEY'
                    LEFT JOIN information_schema.constraint_column_usage ccu
                        ON tc.constraint_name = ccu.constraint_name
                )
            '''

            final_query = f"""
                {primary_key_string}
                {nullable_string}
                {table_type}
                {foreign_key_string}

                SELECT 
                    pk.Column_Name AS "Column Name", 
                    pk."Primary Key", 
                    n."Nullable", 
                    fk."Foreign Key Reference", 
                    t."Data Type", 
                    t."Length"
                FROM primary_key_data pk
                JOIN nullable_data n ON pk.table_name = n.table_name AND pk.Column_Name = n."Column_Name"
                JOIN foreign_key_data fk ON pk.table_name = fk.table_name AND pk.Column_Name = fk."Column_Name"
                JOIN type_data t ON pk.table_name = t.table_name AND pk.Column_Name = t."Column_Name" 
                WHERE pk.table_name = '{relation}'
            """

            self.cursor.execute(final_query)
            cols = [col[0] for col in self.cursor.description]
            rows = self.cursor.fetchall()

            self.conn.commit()

            print(tabulate(rows, headers=cols, tablefmt="grid"))

        except Exception as e:
            print(f"An error occurred: {e}")

    def transitive_closure(self, rel, vertex) -> list:
        try:            
            # Create the transitive closure using WITH RECURSIVE
            self.cursor.execute(f"""
                WITH RECURSIVE Reachable AS (
                    SELECT "from" AS Vertex
                    FROM {rel}
                    WHERE "from" = '{vertex}'
                    
                    UNION
                    
                    SELECT r."to"
                    FROM {rel} r
                    JOIN Reachable rc
                    ON r."from" = rc.Vertex
                )
                SELECT DISTINCT Vertex FROM Reachable;
            """)

            # Fetch and display the results
            rows = self.cursor.fetchall()

            print(tabulate(rows, headers=["vertex"], tablefmt="grid"))

        
        except Exception as e:
            self.conn.rollback()
            print(f"Error: {e}")
            return []

    
    def clearData(self):
        try:
            table_list = self.getTables()
            drop_commands = [(f"DROP TABLE IF EXISTS {table} CASCADE;") for table in table_list]
            query = " ".join(drop_commands)
            
            # Execute the query
            self.cursor.execute(query)
            self.conn.commit()
            # print(f"Successfully dropped tables: {table_list}")
        except Exception as e:
            self.conn.rollback()
            print(e)
        
myRelaX = None #initialize with an instance of PGShell when passed \connect cmd

def parse_cmd(cmd):
    global myRelaX
    cmd = str(cmd)
    if cmd.startswith("\\connect"):
        # parse the string and print exceptions. printing exceptions are just for sanctity, it won't be evaluated
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

    elif cmd.startswith("\\data"):
        if myRelaX == None:
            raise Exception("connection not made")
        else:
            words = cmd.split(' ')
            if len(words) != 2:
                raise Exception('Incorrect Command')
            myRelaX.loadData(words[1])
            

    elif cmd.startswith("="):
        if myRelaX == None:
            raise Exception("connection not made")
        else:

            if len(cmd.split()) < 3:
                raise Exception("Invalid Query")
            operation = cmd.split()[2]
            if operation == "sigma":
                p = list(parse('= {} sigma [{}] {}', cmd))
                query = f"DROP TABLE IF EXISTS {p[0]}; CREATE TABLE {p[0]} AS SELECT * FROM {p[2]} WHERE {p[1]}"
                # Query would be of the form  DROP TABLE IF EXISTS .. ; CREATE TABLE .. AS SELECT ...
            elif operation == "join":
                p = list(parse('= {} join [{}] {} {}', cmd))
                query = f"DROP TABLE IF EXISTS {p[0]}; CREATE TABLE {p[0]} AS SELECT * FROM {p[2]} JOIN {p[3]} ON {p[1]}"
            elif operation == "pi":
                p = list(parse('= {} pi [{}] {}', cmd))
                query = f"DROP TABLE IF EXISTS {p[0]}; CREATE TABLE {p[0]} AS SELECT {p[1]} FROM {p[2]}"
            elif operation == "gamma":
                p = list(parse('= {} gamma [{}] [{}] {}', cmd))
                query = f"DROP TABLE IF EXISTS {p[0]}; CREATE TABLE {p[0]} AS SELECT {p[1]}({p[2]}) FROM {p[3]} GROUP BY {p[1]}"
            elif operation == "tc":
                p = list(parse('= {} tc {} {}', cmd))
                rel = p[1]
                vertex = p[2]
                query = f"""DROP TABLE IF EXISTS {p[0]}; CREATE TABLE {p[0]} AS
                    WITH RECURSIVE Reachable AS (
                       SELECT "from" AS Vertex
                       FROM {rel}
                       WHERE "from" = '{vertex}'
                    
                       UNION
                     
                       SELECT r."to"
                       FROM {rel} r JOIN Reachable rc
                    ON r."from" = rc.Vertex
                    )
                    SELECT DISTINCT Vertex FROM Reachable;
                    """                
                 # The query can be written in the form  DROP ... ; CREATE TABle .. AS WITH RECURSIVE ... SELECT .. 
            else:
                raise Exception("Invalid Query")
                
            myRelaX.executeQuery(query)

    elif cmd.startswith("\\p"):
        if myRelaX == None:
            raise Exception("connection not made")
        else:
            words = cmd.split(' ')
            if (len(words) != 2):
                raise Exception('Incorrect Command')
            relation = cmd.split()[1]
            myRelaX.printTable(relation)
        
    elif cmd == "\\d":
        if myRelaX == None:
            raise Exception("connection not made")
        else:
            print(myRelaX.getTables())
        
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
        parse_cmd(cmd)


if __name__ == '__main__':
    main()
