from django.conf.urls import url
from articles.views import CategoryDetailView, AuthorDetailView


urlpatterns = [
    url(r'^category/(?P<slug>.*)/$', CategoryDetailView.as_view()),
    url(r'^author/(?P<slug>.*)/$', AuthorDetailView.as_view()),
]