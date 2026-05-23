import os
import re

# Directory to scan
site_dir = 'src/site'

# Counter
files_updated = 0
replacements = 0

# Walk through all files
for root, dirs, files in os.walk(site_dir):
    for file in files:
        if file.endswith(('.html', '.js')):
            file_path = os.path.join(root, file)

            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()

                # Count occurrences before replacement
                count = content.count('173')

                if count > 0:
                    # Replace 173 with 195
                    new_content = content.replace('173', '195')

                    # Write back
                    with open(file_path, 'w', encoding='utf-8') as f:
                        f.write(new_content)

                    files_updated += 1
                    replacements += count
                    print(f"[OK] {file_path}: {count} replacements")

            except Exception as e:
                print(f"[ERROR] {file_path}: {e}")

print(f"\n[DONE] Updated {files_updated} files with {replacements} total replacements")
