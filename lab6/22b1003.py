# Name: Saksham Rathi
# Roll Number: 22B1003

import sys
from pyspark import SparkContext, SparkConf
from pyspark.sql import SparkSession
from pyspark.sql.functions import col

def parse_line(line):
    vertex, neighbours = line.split(":")
    vertex = int(vertex)
    neighbours = list(map(int, neighbours.split()))
    return vertex, neighbours

def map_phase(vertex, neighbours):
    for neighbour in neighbours:
        if vertex < neighbour:
            yield ((vertex, neighbour), ('E', None))
            for neighbour2 in neighbours:
                if neighbour < neighbour2:
                    yield ((neighbour, neighbour2), ('C', vertex))

def reduce_phase(key, values):
    if_edge = False
    for value in values:
        if value[0] == 'E':
            if_edge = True
            break
    if not if_edge:
        return
    for value in values:
        if value[0] == 'C':
            tuple_triangle = sorted((value[1], key[0], key[1]))
            yield tuple_triangle

def find_triangles(input_file):
    conf = SparkConf().setAppName("FindTriangles").setMaster("local")
    sc = SparkContext(conf=conf)
    rdd = sc.textFile(input_file)
    graph_rdd = rdd.map(parse_line)
    map_rdd = graph_rdd.flatMap(lambda x: map_phase(*x))
    reduce_rdd = map_rdd.groupByKey().flatMap(lambda x: reduce_phase(x[0], x[1]))
    triangles = reduce_rdd.collect()
    triangles = sorted(triangles)
    for triangle in triangles:
        print(" ".join(map(str, triangle)))
    sc.stop()

def single_source_shortest_path(input_file, source_vertex):
    spark = SparkSession.builder.appName("SingleSourceShortestPath").getOrCreate()
    rdd = spark.sparkContext.textFile(input_file)
    edges_rdd = rdd.map(parse_line)
    edges_df = edges_rdd.flatMap(lambda x: [(x[0], nbr, min(x[0], nbr)) for nbr in x[1]]).toDF(["source", "destination", "edge_weight"])
    distances_df = spark.createDataFrame([(source_vertex, 0)], ["vertex", "distance"])
    while True:
        new_distances_df = distances_df.alias("D").join(edges_df.alias("E"), col("D.vertex") == col("E.source")) \
            .select(col("E.destination").alias("vertex"), (col("D.distance") + col("E.edge_weight")).alias("distance"))
        updated_distances_df = distances_df.union(new_distances_df) \
            .groupBy("vertex").min("distance").withColumnRenamed("min(distance)", "distance")
        if updated_distances_df.exceptAll(distances_df).count() == 0:
            break
        distances_df = updated_distances_df
    result = distances_df.orderBy("vertex").collect()
    for row in result:
        print(f"{row['vertex']}, {row['distance']}")
    spark.stop()

def main():
    num_argc = len(sys.argv)
    if num_argc == 2:
        filename = sys.argv[1]
        find_triangles(filename)
    elif num_argc == 3:
        filename = sys.argv[1]
        source_vertex = sys.argv[2]
        single_source_shortest_path(filename, int(source_vertex))
    else:
        print("Usage: python 22b1003.py <filename> <source_vertex> (optional)")
        sys.exit(1)

if __name__ == "__main__":
    main()
