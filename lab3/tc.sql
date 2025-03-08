DROP TABLE IF EXISTS edges CASCADE;
DROP TABLE IF EXISTS vertices CASCADE;

CREATE TABLE edges (
    "from" VARCHAR(5),
    "to" VARCHAR(5)
);

CREATE TABLE vertices (
    "name" VARCHAR(5)
);

INSERT INTO vertices ("name") VALUES
    ('A'),
    ('B'),
    ('C'),
    ('D'),
    ('E');


INSERT INTO edges ("from", "to") VALUES
    ('A', 'B'),
    ('B', 'C'),
    ('C', 'A'),
    ('A', 'D'),
    ('D', 'E');

-- CREATE TABLE edges2 AS SELECT * FROM edges NATURAL JOIN vertices where vertices.name = edges."from";