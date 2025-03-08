# 22B1003
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
    

    def loadData(self, filename):
        try:
            with open(filename, 'r') as f:
                self.cursor.execute(f.read())
            self.conn.commit()
        except Exception as e:
            self.conn.rollback()
            print(f"Error loading data: {e}")

    
    # execute the query (sigma, pi, gamma, join) encountered during parsing
    def executeQuery(self, query):
        try:
            self.cursor.execute(query)
            self.conn.commit()
        except Exception as e:
            self.conn.rollback()
            print(e)
    
    # follow the format given, use tabulate library
    def printTable(self, reln):
        try:
            # execute query
            query = "SELECT * FROM " + reln
            self.cursor.execute(query)
            cols2 = [f"{desc[0]}" for desc in self.cursor.description]
            cols = [f'{reln}.{desc[0]}' for desc in self.cursor.description]
            cols_rename = [f'{reln}.{desc[0]} AS {desc[0]}' for desc in self.cursor.description]
            self.cursor.execute(f"SELECT {','.join(cols_rename)} FROM {reln} ORDER BY {','.join(cols)}")
            rows = self.cursor.fetchall()
            print(tabulate(rows, headers=cols2, tablefmt="grid"))
        except Exception as e:
            self.conn.rollback()
            print(e)
            
        
myRelaX = None

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

    elif cmd.startswith("\\data"):
        if myRelaX == None:
            raise Exception("connection not made")
        else:
            words = cmd.split(' ')
            if len(words) != 2:
                raise Exception('Incorrect Command')
            myRelaX.loadData(words[1])
            
    # TODO : Fill the queries here
    elif cmd.startswith("="):
        if myRelaX == None:
            raise Exception("connection not made")
        else:
            if len(cmd.split()) < 3:
                raise Exception("Invalid Query")
            operation = cmd.split()[2]
            if operation == "sigma":
                p = list(parse('= {} sigma [{}] {}', cmd))
                query = f"DROP TABLE IF EXISTS " + p[0] + "; " + "CREATE TABLE " + p[0] + " AS SELECT * FROM " + p[2] + " WHERE " + p[1] + ";"
            elif operation == "join":
                p = list(parse('= {} join [{}] {} {}', cmd))
                query = f"DROP TABLE IF EXISTS " + p[0] + "; " + "CREATE TABLE " + p[0] + " AS SELECT * FROM " + p[2] + " NATURAL JOIN " + p[3] + " WHERE " + p[1] + ";"
            elif operation == "pi":
                p = list(parse('= {} pi [{}] {}', cmd))
                query = f"""DROP TABLE IF EXISTS {p[0]} ; CREATE TABLE {p[0]} AS SELECT {p[1]} FROM {p[2]};"""
            elif operation == "gamma":
                p = list(parse('= {} gamma [{}] [{}] {}', cmd))
                query = f"DROP TABLE IF EXISTS " + p[0] + "; " + "CREATE TABLE " + p[0] + " AS SELECT " + p[1] + ", " + p[2] + "FROM " + p[3] + " GROUP BY " + p[1] + " AS " + p[0] + ";"
            elif operation == "tc":
                p = list(parse('= {} tc {} {}', cmd)) 
                query = f"""DROP TABLE IF EXISTS {p[0]};
                CREATE TABLE {p[0]} AS
                WITH RECURSIVE reach(ver) AS (
                    SELECT {p[2]}::varchar AS ver
                    UNION
                    SELECT s.to
                    FROM {p[1]} s
                    JOIN reach r ON s.from = r.ver
                )
                SELECT ver FROM reach;
                """ 
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
