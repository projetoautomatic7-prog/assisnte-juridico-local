#!/bin/bash

# Clean-Unused-Features

# List of features in use
USED_FEATURES=(
"FEATURE_ONE"
"FEATURE_TWO"
"FEATURE_THREE"
)

# WARNING: This script can result in an invalid JSON file (e.g. with trailing
# commas) because it removes lines without considering the JSON structure.
# A more robust solution would use a JSON-aware tool like 'jq'.

# Get all feature flags from the configuration file
# Using a while read loop is safer for parsing lines of output from grep.
grep -oP 'FEATURE_\w+' config.json | while read -r feature; do
  if [[ ! " ${USED_FEATURES[@]} " =~ " ${feature} " ]]; then
    # The original script had an error here. Using a different delimiter for
    # sed, like '#', prevents errors if the feature name contains special
    # characters for sed's regex like '/'.
    sed -i "\#${feature}#d" config.json
    echo "Removed unused feature: $feature"
  fi
done