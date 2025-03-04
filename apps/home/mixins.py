from django.db import models
from django.core.validators import MinValueValidator

from wagtail.contrib.settings.models import BaseSetting, register_setting
from wagtail.models import Page
from wagtail.core.fields import RichTextField
from wagtail.admin.edit_handlers import FieldPanel, PageChooserPanel
from wagtail.snippets.models import register_snippet
from wagtail.snippets.edit_handlers import SnippetChooserPanel


class RelatedPageMixin(models.Model):

    related_page = models.ForeignKey(
        "wagtailcore.Page",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="reverse_related_page",
    )

    class Meta:
        abstract = True

    content_panels = [
        PageChooserPanel("related_page"),
    ]


class BaseTemplate(models.Model):
    title = models.CharField(max_length=255, blank=True)
    filename = models.CharField(max_length=255, blank=True)

    panels = [
        FieldPanel("title"),
        FieldPanel("filename"),
    ]

    def __str__(self):
        return self.title


register_snippet(BaseTemplate)


@register_snippet
class ContributionCallout(models.Model):
    title = models.CharField(max_length=255, blank=True)
    body = RichTextField()
    cta_copy = models.CharField(max_length=255, blank=True)
    views_per_week = models.IntegerField(default=0, validators=[MinValueValidator(0)])

    def __str__(self):
        return self.title


@register_setting
class ContributionSettings(BaseSetting):
    callout_active = models.BooleanField(
        default=False, verbose_name="Kveikt á styrktarbeiðni í greinum"
    )
    callout_snippet = models.ForeignKey(
        ContributionCallout,
        null=True,
        on_delete=models.SET_NULL,
        verbose_name="Efni til að birta neðst í greinum",
    )

    panels = [SnippetChooserPanel("callout_snippet"), FieldPanel("callout_active")]

    class Meta:
        verbose_name = "Styrkir"


@register_setting
class GeneralSiteSettings(BaseSetting):
    base_template = models.ForeignKey(
        BaseTemplate, null=True, on_delete=models.SET_NULL
    )
    template_dir = models.CharField(max_length=255, blank=True)
    head_js = models.TextField(blank=True, null=True)
    google_analytics_property = models.CharField(max_length=255, blank=True)

    panels = [
        SnippetChooserPanel("base_template"),
        FieldPanel("template_dir"),
        FieldPanel("head_js"),
    ]


class SiteSettingsTemplateMixin(object):
    def get_template(self, request):
        app_settings = GeneralSiteSettings.for_site(request.site)
        template = super(SiteSettingsTemplateMixin, self).get_template(request)

        if app_settings.template_dir != "":
            return "%s/%s" % (app_settings.template_dir, template)
        return template


class SiteSettingsTemplateResponseMixin(object):
    def get_template_names(self):
        request = self.request
        app_settings = GeneralSiteSettings.for_site(request.site)
        template = super(SiteSettingsTemplateResponseMixin, self).get_template_names()[
            0
        ]

        if app_settings.template_dir != "":
            return "%s/%s" % (app_settings.template_dir, template)
        return [template]
