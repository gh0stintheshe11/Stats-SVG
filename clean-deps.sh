#!/bin/bash

# Run depcheck and save the output
output=$(npx depcheck)

# Extract unused dependencies
unused_dependencies=$(echo "$output" | grep -A 100 "Unused dependencies" | grep -B 100 "Unused devDependencies" | grep "*" | cut -d' ' -f2)

# Extract unused devDependencies
unused_dev_dependencies=$(echo "$output" | grep -A 100 "Unused devDependencies" | grep "*" | cut -d' ' -f2)

# Uninstall unused dependencies
if [ ! -z "$unused_dependencies" ]; then
  npm uninstall $unused_dependencies
fi

# Uninstall unused devDependencies
if [ ! -z "$unused_dev_dependencies" ]; then
  npm uninstall --save-dev $unused_dev_dependencies
fi

echo "Unused dependencies removed."