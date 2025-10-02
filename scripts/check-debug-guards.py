#!/usr/bin/env python3
# scripts/check-debug-guards.py
# Smart checker for debug_otp guards

import re
import sys
from pathlib import Path

def check_file(filepath):
    """Check if debug_otp usages are properly guarded"""
    with open(filepath, 'r') as f:
        content = f.read()
    
    # Find all debug_otp usages
    pattern = r'(debug_otp)'
    matches = [(m.start(), m.group()) for m in re.finditer(pattern, content)]
    
    if not matches:
        return True, []
    
    unguarded = []
    
    for pos, match_text in matches:
        # Get surrounding context (500 chars before)
        start = max(0, pos - 500)
        context = content[start:pos + 100]
        
        # Skip comments
        if '//' in context.split('\n')[-1] or '/*' in context:
            continue
        
        # Check if inside NODE_ENV guard
        if 'process.env.NODE_ENV' in context and 'development' in context:
            continue
        
        # Check if it's just a comment or type definition
        line = content[start:pos + 100].split('\n')[-1]
        if line.strip().startswith('//') or line.strip().startswith('*'):
            continue
        if 'Expecting' in line or 'debug_otp?' in line:
            continue
            
        unguarded.append((filepath, pos, line.strip()))
    
    return len(unguarded) == 0, unguarded

def main():
    client_src = Path('secure-gate-access/client/src')
    
    if not client_src.exists():
        print("❌ Client src directory not found")
        return 1
    
    all_files = list(client_src.rglob('*.js')) + list(client_src.rglob('*.jsx'))
    all_guarded = True
    
    print("🔍 Checking debug_otp guards in all files...")
    
    for filepath in all_files:
        if '__tests__' in str(filepath) or 'node_modules' in str(filepath):
            continue
            
        guarded, unguarded_list = check_file(filepath)
        
        if not guarded:
            all_guarded = False
            print(f"\n❌ {filepath.relative_to(client_src.parent.parent)}:")
            for path, pos, line in unguarded_list:
                print(f"   Line: {line}")
    
    if all_guarded:
        print("✅ All debug_otp usages are properly guarded!")
        return 0
    else:
        print("\n❌ Found unguarded debug_otp usages")
        return 1

if __name__ == '__main__':
    sys.exit(main())
