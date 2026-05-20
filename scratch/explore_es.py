import json
import os

es_path = r'C:\Users\wrait\OneDrive\Desktop\programacion\fitgo\i18n\translations\es.json'

with open(es_path, 'r', encoding='utf-8') as f:
    es_data = json.load(f)

print("Top level keys in es.json:", list(es_data.keys()))

if 'exerciseNames' in es_data:
    exercise_keys = list(es_data['exerciseNames'].keys())
    print("\nNumber of exerciseNames:", len(exercise_keys))
    print("Sample exerciseNames (first 10):")
    for k in exercise_keys[:10]:
        print(f"  {k} -> {es_data['exerciseNames'][k]}")

if 'equipment' in es_data:
    equipment_keys = list(es_data['equipment'].keys())
    print("\nNumber of equipment keys:", len(equipment_keys))
    print("Sample equipment (first 10):")
    for k in equipment_keys[:10]:
        print(f"  {k} -> {es_data['equipment'][k]}")
