

from django.db import models
from wagtail.snippets.models import register_snippet

from home.mixins import SiteSettingsTemplateMixin

class ArticleTemplate(SiteSettingsTemplateMixin, models.Model):
    title = models.CharField(max_length=255)
    date = models.DateField(max_length=255, blank=True, null=True, help_text="Stofndagsetning.")
    description = models.CharField(max_length=255, blank=True, null=True)
    template_path = models.CharField(max_length=255, help_text="/model/[mappa]/[template].html")

    def __str__(self):
        return "%s" % (self.title)

register_snippet(ArticleTemplate)
