import os
import django
import json
import urllib.request
import urllib.error

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()

from map_data.models import SocialObject

# Bounding box for Atyrau
# [47.05, 51.85, 47.16, 51.98]
overpass_url = "http://overpass-api.de/api/interpreter"
query = """
[out:json];
(
  node["amenity"="school"](47.05,51.85,47.16,51.98);
  node["amenity"="hospital"](47.05,51.85,47.16,51.98);
  node["amenity"="clinic"](47.05,51.85,47.16,51.98);
  node["amenity"="kindergarten"](47.05,51.85,47.16,51.98);
  node["amenity"="police"](47.05,51.85,47.16,51.98);
);
out body;
"""
print("Подключение к базе OpenStreetMap для загрузки реальных объектов Атырау...")

try:
    req = urllib.request.Request(overpass_url, data=query.encode('utf-8'))
    response = urllib.request.urlopen(req)
    data = json.loads(response.read())

    added_schools = 0
    added_hospitals = 0
    added_kindergartens = 0
    added_police = 0

    for element in data['elements']:
        if element['type'] == 'node':
            lat = element['lat']
            lon = element['lon']
            tags = element.get('tags', {})
            amenity = tags.get('amenity')
            
            name = tags.get('name:ru', tags.get('name', ''))
            
            if amenity == 'police':
                if not name: name = "Управление полиции"
                SocialObject.objects.create(name=name, object_type="other", latitude=lat, longitude=lon)
                added_police += 1
                
            elif amenity in ['school']:
                if not name: name = "Средняя школа"
                SocialObject.objects.create(name=name, object_type="school", latitude=lat, longitude=lon)
                added_schools += 1
                
            elif amenity in ['hospital', 'clinic']:
                if not name: name = "Медицинское учреждение"
                SocialObject.objects.create(name=name, object_type="hospital", latitude=lat, longitude=lon)
                added_hospitals += 1
                
            elif amenity in ['kindergarten']:
                if not name: name = "Детский сад"
                SocialObject.objects.create(name=name, object_type="kindergarten", latitude=lat, longitude=lon)
                added_kindergartens += 1

    print("\nГотово! Успешно импортировано:")
    print(f"- Полицейских участков: {added_police}")
    print(f"- Школ: {added_schools}")
    print(f"- Больниц/клиник: {added_hospitals}")
    print(f"- Детских садов: {added_kindergartens}")
    
except Exception as e:
    print(f"Ошибка загрузки данных из интернета: {e}")
