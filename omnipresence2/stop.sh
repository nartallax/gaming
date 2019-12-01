#!/bin/bash

kill `ps aux | grep -P "node\s+omnipresence.js$" | grep -P "^.*?\d+" -o | grep -P "\d+" -o`