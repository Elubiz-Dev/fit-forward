import os
import re
import json

base_path = r'C:\Users\wrait\OneDrive\Desktop\programacion\fitgo'
translations_path = os.path.join(base_path, 'i18n', 'translations')

def get_all_keys(data, prefix=''):
    keys = set()
    for k, v in data.items():
        full_key = f"{prefix}.{k}" if prefix else k
        if isinstance(v, dict):
            keys.update(get_all_keys(v, full_key))
        else:
            keys.add(full_key)
    return keys

with open(os.path.join(translations_path, 'en.json'), 'r', encoding='utf-8') as f:
    en_data = json.load(f)
with open(os.path.join(translations_path, 'es.json'), 'r', encoding='utf-8') as f:
    es_data = json.load(f)

en_keys = get_all_keys(en_data)
es_keys = get_all_keys(es_data)

# Regex to find t('key') or t("key") or t(`key`)
# Matches keys like dashboard.muscleDirectory
t_regex = re.compile(r"\bt\(\s*['\"\`]([a-zA-Z0-9_\-\.\:\/]+)['\"\`]")

extracted_keys = set()
dynamic_patterns = []

for root, dirs, files in os.walk(base_path):
    if any(d in root for d in ['.git', 'node_modules', '.expo', 'dist']):
        continue
    for f in files:
        if f.endswith(('.ts', '.tsx')):
            path = os.path.join(root, f)
            try:
                with open(path, 'r', encoding='utf-8') as file:
                    content = file.read()
                    # Find all static keys
                    for m in t_regex.finditer(content):
                        extracted_keys.add(m.group(1))
                    # Find dynamic patterns
                    # E.g. t('exerciseNames.' + ...) or t(`exerciseNames.${...}`)
                    dyn_matches = re.findall(r"\bt\(\s*['\"\`]([a-zA-Z0-9_\-\.]+[\.\:\/])['\"\`]\s*\+", content)
                    for dm in dyn_matches:
                        dynamic_patterns.append((f, dm))
                    dyn_matches2 = re.findall(r"\bt\(\s*['\"\`]([a-zA-Z0-9_\-\.]+[\.\:\/])\$\{", content)
                    for dm in dyn_matches2:
                        dynamic_patterns.append((f, dm))
            except Exception as e:
                pass

print('Extracted static keys count:', len(extracted_keys))

# Keys used in code but missing in EN
missing_en = sorted(list(extracted_keys - en_keys))
print('\nStatic keys used in code but missing in EN (total %d):' % len(missing_en))
for k in missing_en:
    print(f'  {k}')

# Keys used in code but missing in ES
missing_es = sorted(list(extracted_keys - es_keys))
print('\nStatic keys used in code but missing in ES (total %d):' % len(missing_es))
for k in missing_es:
    print(f'  {k}')

print('\nDynamic key prefixes found:')
for f, p in sorted(list(set(dynamic_patterns))):
    print(f'  {f}: {p}')
