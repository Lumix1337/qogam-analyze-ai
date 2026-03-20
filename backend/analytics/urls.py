from django.urls import path
from .views import WeeklyAnalysisView, DistrictRatingView, DocumentAnalysisView

urlpatterns = [
    path('generate-analysis/', WeeklyAnalysisView.as_view(), name='generate-analysis'),
    path('ratings/', DistrictRatingView.as_view(), name='district-ratings'),
    path('upload-report/', DocumentAnalysisView.as_view(), name='upload-report'),
]
