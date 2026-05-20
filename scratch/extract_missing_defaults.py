import os
import re
import json

base_path = r'C:\Users\wrait\OneDrive\Desktop\programacion\fitgo'
translations_path = os.path.join(base_path, 'i18n', 'translations')

# Load existing translations
def get_all_keys(data, prefix=''):
    keys = set()
    for k, v in data.items():
        full_key = f"{prefix}.{k}" if prefix else k
        if isinstance(v, dict):
            keys.update(get_all_keys(v, full_key))
        else:
            keys.add(full_key)
    return keys

langs = ['es', 'en', 'fr', 'it', 'pt', 'de', 'ru']
lang_data = {}
for lang in langs:
    with open(os.path.join(translations_path, f'{lang}.json'), 'r', encoding='utf-8') as f:
        lang_data[lang] = json.load(f)

# Find t('key', 'default') or t('key')
# We match:
# 1. Single quotes: t('key', 'default') or t('key')
# 2. Double quotes: t("key", "default") or t("key")
# 3. Backticks: t(`key`, `default`) or t(`key`)
patterns = [
    re.compile(r"\bt\(\s*'([a-zA-Z0-9_\-\.\:\/]+)'(?:\s*,\s*'([^']*)')?"),
    re.compile(r"\bt\(\s*\"([a-zA-Z0-9_\-\.\:\/]+)\"(?:\s*,\s*\"([^\"]*)\")?"),
    re.compile(r"\bt\(\s*`([a-zA-Z0-9_\-\.\:\/]+)`(?:\s*,\s*`([^`]*)`)?"),
]

missing_keys_details = {}

for root, dirs, files in os.walk(base_path):
    if any(d in root for d in ['.git', 'node_modules', '.expo', 'dist']):
        continue
    for f in files:
        if f.endswith(('.ts', '.tsx')):
            path = os.path.join(root, f)
            try:
                with open(path, 'r', encoding='utf-8') as file:
                    content = file.read()
                    for pattern in patterns:
                        for m in pattern.finditer(content):
                            key = m.group(1)
                            default_val = m.group(2) if len(m.groups()) > 1 else None
                            
                            # Check if missing in en or es
                            # We can represent nested keys as flat dictionary keys for check
                            def key_exists(data, key_str):
                                parts = key_str.split('.')
                                d = data
                                for p in parts:
                                    if not isinstance(d, dict) or p not in d:
                                        return False
                                    d = d[p]
                                return True
                            
                            is_missing = False
                            for lang in langs:
                                if not key_exists(lang_data[lang], key):
                                    is_missing = True
                                    break
                            
                            if is_missing:
                                if key not in missing_keys_details:
                                    missing_keys_details[key] = {
                                        'files': set(),
                                        'defaults': set()
                                    }
                                missing_keys_details[key]['files'].add(f)
                                if default_val:
                                    missing_keys_details[key]['defaults'].add(default_val)
            except Exception as e:
                pass

print('Found %d keys missing in at least one translation file:' % len(missing_keys_details))
for key, detail in sorted(missing_keys_details.items()):
    defaults = list(detail['defaults'])
    files = list(detail['files'])
    print(f"Key: {key}")
    print(f"  Files: {files}")
    print(f"  Defaults found: {defaults}")
