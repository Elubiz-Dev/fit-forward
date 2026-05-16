import json
import os

base_path = r'c:\Users\wrait\OneDrive\Desktop\programacion\fitgo\i18n\translations'
en_path = os.path.join(base_path, 'en.json')

with open(en_path, 'r', encoding='utf-8') as f:
    en_data = json.load(f)

def get_keys(data, prefix=''):
    keys = set()
    for k, v in data.items():
        full_key = f"{prefix}.{k}" if prefix else k
        if isinstance(v, dict):
            keys.update(get_keys(v, full_key))
        else:
            keys.add(full_key)
    return keys

en_keys = get_keys(en_data)

langs = ['es', 'fr', 'it', 'pt', 'de', 'ru']

for lang in langs:
    lang_path = os.path.join(base_path, f'{lang}.json')
    if not os.path.exists(lang_path):
        print(f"File {lang}.json not found")
        continue
    
    with open(lang_path, 'r', encoding='utf-8') as f:
        lang_data = json.load(f)
    
    lang_keys = get_keys(lang_data)
    missing = en_keys - lang_keys
    
    if missing:
        print(f"\nMissing keys in {lang}.json ({len(missing)}):")
        for m in sorted(list(missing)):
            print(f"  {m}")
    else:
        print(f"\nNo missing keys in {lang}.json")
