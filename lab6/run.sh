#!/bin/bash

RANDOM=69

for i in {1..10}
do
    source=$(($RANDOM % 100 + 1))
    python3 22b1003.py input_disconnected.txt $source > saksham_disconnected_$source.txt
    diff saksham_disconnected_$source.txt ~/Downloads/outputs/kavya_disconnected_$source.txt
done