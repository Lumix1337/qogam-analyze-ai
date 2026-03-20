from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from map_data.models import District, Crime
from users.permissions import IsAdminUser
from datetime import datetime
import random
import os
import json
import docx
from striprtf.striprtf import rtf_to_text
from groq import Groq

class WeeklyAnalysisView(APIView):
    def post(self, request):
        # AI analysis logic here (in future)
        # For now, generate a random risk score and return
        districts = District.objects.all()
        for district in districts:
            district.risk_score = round(random.uniform(0.0, 10.0), 2)
            district.save()
            
        return Response({"status": "Success", "message": "Weekly analysis generated using AI (Mocked)"})

class DistrictRatingView(APIView):
    def get(self, request):
        # Returns regions ordered by danger level (from most dangerous to least)
        districts = District.objects.all().order_by('-risk_score')
        data = [
            {
                "id": d.id,
                "name": d.name,
                "risk_score": d.risk_score
            } for d in districts
        ]
        return Response(data)

class DocumentAnalysisView(APIView):
    parser_classes = (MultiPartParser, FormParser)
    permission_classes = [IsAdminUser]

    def post(self, request):
        file = request.FILES.get('file')
        if not file:
            return Response({"error": "No file uploaded"}, status=400)
            
        filename = file.name.lower()
        text_content = ""
        
        try:
            if filename.endswith('.rtf') or filename.endswith('.doc.rtf'):
                content = file.read().decode('cp1251', errors='ignore')
                text_content = rtf_to_text(content)
            elif filename.endswith('.docx'):
                doc = docx.Document(file)
                text_content = "\n".join([p.text for p in doc.paragraphs])
            else:
                text_content = file.read().decode('utf-8', errors='ignore')
        except Exception as e:
            return Response({"error": f"Failed to parse file: {str(e)}"}, status=400)
            
        if not text_content.strip():
            return Response({"error": "Parsed document is empty"}, status=400)

        # Truncate text content to avoid exceeding context window
        text_content = text_content[:20000]

        client = Groq(api_key=os.environ.get("GROQ_API_KEY", ""))
        
        prompt = f"""
We have an operational daily report about crimes and incidents in different districts of a region. Read the text and extract two structured things:
1. Ratings of danger (risk_score from 0.0 to 10.0, where 10 is most dangerous) for each district mentioned or implied.
2. A list of specific crimes/incidents. 'crime_type' should be one of: 'theft', 'hooliganism', 'beating', 'administrative', 'other'.
IMPORTANT: If an incident happened OUTSIDE Atyrau City (e.g., in other districts like Zhylyoi, Kurmangazy, Kulsary, Inder, Makat, etc.), you MUST provide REAL geographic coordinates (latitude and longitude) for that specific town or village.
ALSO IMPORTANT: If an incident happened IN Atyrau City, try to extract the specific MICRO-DISTRICT (e.g. 'Авангард', 'Привокзальный', 'Жилгородок', 'Нурсая') and set it as the 'district' field. If the micro-district is completely missing from the text, use 'Атырау'.

Return ONLY valid JSON with this exact structure, nothing else:
{{
  "districts": [
    {{"name": "DistrictName", "risk_score": 5.5}}
  ],
  "incidents": [
    {{
      "title": "Short title summary",
      "crime_type": "theft",
      "district": "DistrictName",
      "latitude": 0.0,
      "longitude": 0.0,
      "description": "Short details. ОБЯЗАТЕЛЬНО начните описание с указания соответствующей статьи УК РК или КоАП РК (например: 'Ст. 188 УК РК - Кража: ')."
    }}
  ]
}}

Document text:
{text_content}
"""

        try:
            completion = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1,
                response_format={"type": "json_object"}
            )
            
            result_json = completion.choices[0].message.content
            data = json.loads(result_json)
            
            for dist_data in data.get('districts', []):
                district, _ = District.objects.get_or_create(name=dist_data['name'])
                district.risk_score = dist_data.get('risk_score', district.risk_score)
                district.save()
                
            for inc_data in data.get('incidents', []):
                dist_name = inc_data.get('district')
                district = None
                if dist_name:
                    district, _ = District.objects.get_or_create(name=dist_name)
                    
                lat = inc_data.get('latitude', 0.0)
                lng = inc_data.get('longitude', 0.0)
                
                is_outside_atyrau = False
                if dist_name and dist_name.lower().strip() not in ['атырау', 'город атырау', 'г. атырау', 'г.атырау']:
                    is_outside_atyrau = True

                if is_outside_atyrau and lat != 0.0 and lng != 0.0:
                    # AI provided real coordinates for an outside district or town.
                    # We add a tiny random jitter so multiple incidents don't render on the exact same pixel.
                    lat += random.uniform(-0.005, 0.005)
                    lng += random.uniform(-0.005, 0.005)
                else:
                    # Atyrau city incident, or AI failed to provide coordinates.
                    # Placed randomly within the district's saved polygon or the city's bounding box.
                    is_generic_atyrau = (district and district.name.lower().strip() in ['атырау', 'город атырау', 'г. атырау', 'г.атырау'])
                    
                    if not is_generic_atyrau and district and district.coordinates and 'coordinates' in district.coordinates:
                        geom = district.coordinates
                        try:
                            if geom['type'] == 'Polygon':
                                ring = geom['coordinates'][0]
                            elif geom['type'] == 'MultiPolygon':
                                ring = geom['coordinates'][0][0]
                            else:
                                ring = []
                            if ring:
                                lngs = [pt[0] for pt in ring]
                                lats = [pt[1] for pt in ring]
                                lat = random.uniform(min(lats), max(lats))
                                lng = random.uniform(min(lngs), max(lngs))
                            else:
                                lat = random.uniform(47.05, 47.15)
                                lng = random.uniform(51.85, 51.95)
                        except Exception:
                            lat = random.uniform(47.05, 47.15)
                            lng = random.uniform(51.85, 51.95)
                    else:
                        # Fallback Atyrau box
                        lat = random.uniform(47.05, 47.15)
                        lng = random.uniform(51.85, 51.95)

                Crime.objects.create(
                    title=inc_data.get('title', 'Unknown Crime'),
                    crime_type=inc_data.get('crime_type', 'other'),
                    district=district,
                    latitude=lat,
                    longitude=lng,
                    date_committed=datetime.now(),
                    description=inc_data.get('description', '')
                )
                
            return Response({"status": "Success", "data": data})

        except Exception as e:
            return Response({"error": f"AI Processing failed: {str(e)}"}, status=500)
