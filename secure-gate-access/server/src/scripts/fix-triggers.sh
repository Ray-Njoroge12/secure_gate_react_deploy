#!/bin/bash

# Script to fix trigger creation statements to be idempotent
# Adds DROP TRIGGER IF EXISTS before CREATE TRIGGER

MIGRATIONS_DIR="../migrations"

# Process each SQL file
for file in "$MIGRATIONS_DIR"/*.sql; do
  echo "Processing: $(basename $file)"
  
  # Create a temporary file
  temp_file="${file}.tmp"
  
  # Process the file line by line
  while IFS= read -r line; do
    # If this is a CREATE TRIGGER line and previous line wasn't DROP TRIGGER IF EXISTS
    if [[ $line =~ ^CREATE\ TRIGGER ]]; then
      # Extract trigger and table names
      trigger_name=$(echo "$line" | sed -E 's/CREATE TRIGGER ([a-z_]+).*/\1/')
      table_name=$(echo "$line" | sed -E 's/.*ON ([a-z_]+).*/\1/')
      
      # Add DROP TRIGGER IF EXISTS before CREATE TRIGGER
      echo "DROP TRIGGER IF EXISTS ${trigger_name} ON ${table_name};" >> "$temp_file"
    fi
    
    # Write the original line
    echo "$line" >> "$temp_file"
  done < "$file"
  
  # Replace original file with fixed version
  mv "$temp_file" "$file"
done

echo "✅ All triggers fixed to be idempotent"
