# -*- coding: utf-8 -*-
import logging

from django.contrib.auth.models import User
from django.db import models
from django.utils.translation import ugettext_lazy as _
from django import forms
from django.db import models, connection, transaction
from django.db.models import Q
from django.core.paginator import Paginator, EmptyPage, PageNotAnInteger

from wagtail.core.models import Page, Site, Orderable
from wagtail.core import blocks
from wagtail.core.fields import RichTextField, StreamField
from wagtail.images.blocks import ImageChooserBlock
from wagtail.images.edit_handlers import ImageChooserPanel
from wagtail.embeds.blocks import EmbedBlock
from wagtail.admin.edit_handlers import FieldPanel, StreamFieldPanel, MultiFieldPanel, PageChooserPanel, InlinePanel, TabbedInterface, ObjectList
from wagtail.snippets.edit_handlers import SnippetChooserPanel
from wagtail.snippets.models import register_snippet
from wagtail.search import index
from wagtail.contrib.redirects.models import Redirect
from modelcluster.models import ClusterableModel

# from oc_core.panels import ColorFieldPanel

from taggit.models import TaggedItemBase
from modelcluster.fields import ParentalKey
from modelcluster.tags import ClusterTaggableManager

# from .blocks import CommonEditingBlock

from home.mixins import SiteSettingsTemplateMixin, GeneralSiteSettings, RelatedPageMixin

from wagtail.admin.edit_handlers import EditHandler
from django.utils.html import format_html
from django.utils.safestring import mark_safe

logger = logging.getLogger('wagtail.core')

from django.utils import translation

class TranslatedField(object):
    def __init__(self, en_field, is_field):
        self.en_field = en_field
        self.is_field = is_field

    def __get__(self, instance, owner):
        en = getattr(instance, self.en_field)
        isl = getattr(instance, self.is_field)

        if translation.get_language() == 'is':
            return isl
        else:
            return en


class DisplayFooPropertyPanel(EditHandler):
    def __init__(self, heading='', classname='', help_text=''):
        self.heading = heading
        self.classname = classname
        self.help_text = help_text

    def render(self):
        if self.instance.full_url is not None:
            return mark_safe(format_html('''


    <h2>
        <label for="id_title">
            Vefslóð
        </label>
    </h2>
    <div class="object-help help">Vefslóðin til að afrita. ATH það hefur engin áhrif að breyta þessum reit.</div>
    <fieldset class="">
        <legend>Vefslóð</legend>
        <ul class="fields">
            <li class="">
                <div class="field char_field text_input">
                    <div class="field-content">
                        <div class="input  ">
                            <input id="url_to_copy" maxlength="255" name="display_url" type="text" value="{0}" style="color: #333">
                            <span></span>
                        </div>
                    </div>
                </div>
            </li>
        </ul>
    </fieldset>

            ''', self.instance.full_url))
        else:
            return ''


class Author(models.Model, index.Indexed):
    title = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, blank=True, null=True)
    twitter_user = models.SlugField(max_length=255, blank=True, null=True)
    email = models.EmailField(max_length=255, blank=True, null=True)
    image = models.ForeignKey(
        'wagtailimages.Image',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='+'
    )
    facebook_image = models.ForeignKey(
        'wagtailimages.Image',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='+'
    )
    list_cluster = models.IntegerField(verbose_name=_('Ordering'), default=99, help_text="Vinsamlegast notið tölur 0-99")
    panels = [
        FieldPanel('title', classname="full title"),
        FieldPanel('slug'),
        FieldPanel('email'),
        FieldPanel('twitter_user'),
        ImageChooserPanel('image'),
        ImageChooserPanel('facebook_image'),
        FieldPanel('list_cluster'),
    ]

    search_fields = [
        index.SearchField('title', partial_match=True),
    ]

    class Meta:
        verbose_name = _('Höfundur')
        verbose_name_plural = _('Höfundar')
        ordering = ['list_cluster', 'title']

    def __str__(self):
        return "%s" % (self.title)

    def get_children(self, count=50):
        ids = []
        ids += self.articlepage_set.filter(live=True).filter(Q(author_name_override="")|Q(author_name_override=None)).order_by('-first_published_at').values_list('pk', flat=True)[:count]
        ids += self.blockarticlepage_set.filter(live=True).filter(Q(author_name_override="")|Q(author_name_override=None)).order_by('-first_published_at').values_list('pk', flat=True)[:count]
        ids += self.mediapage_set.filter(live=True).filter(Q(author_name_override="")|Q(author_name_override=None)).order_by('-first_published_at').values_list('pk', flat=True)[:count]
        return Page.objects.filter(pk__in=ids).order_by('-first_published_at').specific()[:count]


register_snippet(Author)


class TagIndexPage(Page):

    def get_context(self, request):
        # Filter by tag
        tag = request.GET.get('tag')
        articles = Page.objects.live()
        #articles = BlockArticlePage.objects.live()
        #articles = ArticlePage.objects.live()
        #articles = articles.filter(tags__name=tag)
        articles = articles.order_by('-first_published_at','-go_live_at','latest_revision_created_at')
        articles = articles.filter(
            Q(articlepage__tags__name=tag) |\
            Q(blockarticlepage__tags__name=tag) |\
            Q(mediapage__tags__name=tag)
        ).distinct()

        # Update template context
        context = super(TagIndexPage, self).get_context(request)
        context['articles'] = articles
        return context


class ArticleTag(TaggedItemBase):
    content_object = ParentalKey('ArticlePage', null=True, blank=True, related_name="%(app_label)s_%(class)s_taggeditems")


# class BlockArticleTag(TaggedItemBase):
#     content_object = ParentalKey('BlockArticlePage', null=True, blank=True, related_name="%(app_label)s_%(class)s_taggeditems")


class Category(models.Model, index.Indexed):
    title = models.CharField(max_length=255, db_index=True, verbose_name=_('Title'))
    title_en = models.CharField(max_length=255, blank=True, null=True, db_index=True, verbose_name=_('English title'))
    backend_title = models.CharField(max_length=255, null=True, blank=False, verbose_name=_('Bakendatitill'))
    slug = models.SlugField(verbose_name=_('Slug'), max_length=255, blank=True, null=True)
    color = models.CharField(max_length=255, default='#000000')
    list_cluster = models.IntegerField(verbose_name=_('Ordering'), default=99, help_text="Vinsamlegast notið tölur 0-99")

    translated_title = TranslatedField(
        'title_en',
        'title',
    )
    panels = [
        FieldPanel('title', classname="full title"),
        FieldPanel('title_en', classname="full title"),
        FieldPanel('backend_title'),
        FieldPanel('slug', classname="col6"),
        FieldPanel('color', classname="col6 colorpicker-field"),
        FieldPanel('list_cluster', classname="col12"),
    ]

    search_fields = [
        index.SearchField('title', partial_match=True),
    ]

    def get_children(self, count=50):
        ids = []
        ids += self.articlepage_set.filter(live=True).order_by('-first_published_at').values_list('pk', flat=True)[:count]
        ids += self.blockarticlepage_set.filter(live=True).order_by('-first_published_at').values_list('pk', flat=True)[:count]
        ids += self.mediapage_set.filter(live=True).order_by('-first_published_at').values_list('pk', flat=True)[:count]
        return Page.objects.filter(pk__in=ids).order_by('-first_published_at').specific()[:count]

    class Meta:
        verbose_name = _('Category')
        verbose_name_plural = _('Categories')
        ordering = ['list_cluster', 'backend_title', 'title']

    def __str__(self):
        return "%s - %s" % (self.backend_title, self.title)

register_snippet(Category)


class MovePagesMixin(object):
    @transaction.atomic  # only commit when all descendants are properly updated
    def move(self, target, pos=None):
        """
        Extension to the treebeard 'move' method to ensure that url_path is updated too.
        """
        page = Page.objects.get(id=self.id)
        old_url_path_for_redirect = page.url
        if old_url_path_for_redirect[-1] == "/":
            old_url_path_for_redirect = old_url_path_for_redirect[0:-1]
        old_url_path = page.url_path
        super(Page, self).move(target, pos=pos)
        # treebeard's move method doesn't actually update the in-memory instance, so we need to work
        # with a freshly loaded one now
        new_self = Page.objects.get(id=self.id)
        new_url_path = new_self.set_url_path(new_self.get_parent())
        new_self.save()
        new_self._update_descendant_url_paths(old_url_path, new_url_path)

        # Log
        logger.info("Page moved: \"%s\" id=%d path=%s", self.title, self.id, new_url_path)

        r = Redirect.objects.create(
            old_path = old_url_path_for_redirect,
            site = Site.objects.get(is_default_site=True),
            is_permanent = True,
            redirect_page = new_self
        )

        print(r)

        logger.info("Redirect to old url path created: %s => %s", r.old_path, r.redirect_page)


class AuthorMixin(models.Model):
    author = models.ForeignKey(Author, null=True, blank=False, on_delete=models.SET_NULL)
    author_name_override = models.CharField(max_length=255, blank=True, null=True)
    author_image_override = models.ForeignKey(
        'wagtailimages.Image',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='+'
    )
    author_show_as_large = models.BooleanField(default=False)

    class Meta:
        abstract = True

author_panels = [
    SnippetChooserPanel('author'),
    FieldPanel('author_name_override'),
    ImageChooserPanel('author_image_override'),
    FieldPanel('author_show_as_large')
]

class CategoryMixin(models.Model):
    category = models.ForeignKey(Category, null=True, blank=False, on_delete=models.SET_NULL)

    class Meta:
        abstract = True

category_panels =  SnippetChooserPanel('category')



class ArticleMixin(models.Model):
    subtitle = models.CharField(max_length=255, null=True, blank=True)
    styles_override = models.TextField(null=True, blank=True)
    additional_js = models.TextField(null=True, blank=True)
    extra_title = models.CharField(blank=True,max_length=255, null=True)
    auto_refresh = models.BooleanField(default=False)

    class Meta:
        abstract = True


BASE_ARTICLE_CONTENT_PANELS = [
    FieldPanel('title', classname='full title'),
    FieldPanel('extra_title'),
    FieldPanel('subtitle'),
    category_panels,
    MultiFieldPanel(author_panels, 'Author override'),
]

class ArticleTagStuffMixin(object):
    def tag_list(self):
        return [tag.name for tag in self.tags.all()]

class LinkFields(models.Model):
    link_page = models.ForeignKey(
        'wagtailcore.Page',
        null=True,
        blank=True,
        related_name='+',
        on_delete=models.SET_NULL
    )

    @property
    def link(self):
        if self.link_page:
            return self.link_page.url

    panels = [
        PageChooserPanel('link_page'),
    ]

    class Meta:
        abstract = True

class RelatedLink(LinkFields):
    panels = [
        MultiFieldPanel(LinkFields.panels, "Link"),
    ]

    class Meta:
        abstract = True

# class KoxChartsPlacement(Orderable, models.Model):
#   page = ParentalKey('ArticlePage', related_name='kox_chart_placement')
#   kox_chart = models.ForeignKey('kox.KoxChart', null=True, blank=True, related_name='+', on_delete=models.SET_NULL)

#   class Meta:
#     verbose_name = "Birta kox spárit"
#     verbose_name_plural = "Birta kox spárit"
#     ordering = ['sort_order']

#   panels = [
#     SnippetChooserPanel('kox_chart'),
#   ]

#   def __str__(self):
#     return self.page.title + " -> " + self.koxchart.heiti

class ArticlePage(SiteSettingsTemplateMixin, MovePagesMixin, Page, RelatedPageMixin, CategoryMixin, ArticleTagStuffMixin, AuthorMixin, ArticleMixin):
    SUB_ARTICLE_LAYOUT_CHOICES = (
        ('none', "Fela hliðarefni"),
        ('half', "Einn dálkur"),
        ('full', "Tveir dálkar"),
    )
    HEADER_IMAGE_LAYOUT_CHOICES = (
        ('default', "Sjálfval"),
        ('landscape', "Mynd á breiddina"),
        ('portrait', "Mynd á hæðina"),
        ('video', "Birta myndband"),
        ('noimg', "Fela mynd"),
    )
    tags = ClusterTaggableManager(through=ArticleTag, blank=True)
    body = RichTextField(blank=False)
    header_image = models.ForeignKey(
        'wagtailimages.Image',
        null=True,
        blank=False,
        on_delete=models.SET_NULL,
        related_name='+'
    )
    header_image_caption = models.CharField(max_length=255, blank=True, null=True)
    header_image_credit = models.CharField(max_length=255, blank=True, null=True)
    editors_notes = models.TextField(blank=True, null=True, help_text="<br> býr til nýja línu. <i>...</i> skáletrar. <b>...</b> feitletrar.")
    note_date = models.DateField(max_length=255, blank=True, null=True, help_text="Dagsetning athugasemdar. Valkvætt.")
    related_links_title = models.CharField(max_length=80, blank=True, null=True, help_text="Shortcode: [links]")
    sub_article_title = models.CharField(max_length=255, blank=True, null=True)
    sub_article = RichTextField(blank=True, help_text="Shortcode: [box] — <p> skilgreinir meginmál.")
    sub_article_layout = models.CharField(max_length=255, null=True, choices=SUB_ARTICLE_LAYOUT_CHOICES, default='none')
    header_image_crop = models.BooleanField(default=False, help_text="Viltu láta myndskurð ráðast af fókus svæði?")
    header_image_layout = models.CharField(max_length=225, choices=HEADER_IMAGE_LAYOUT_CHOICES, default='default', help_text="Veldu myndastillingu á aðalmynd. Hefur aðeins áhrif á þessari síðu.")
    header_video = models.CharField(max_length=225, blank=True, null=True, help_text="Slóð á myndbönd frá YouTube og Vimeo.")

    
    correct = models.TextField(blank=True, null=True, help_text='FieldPanel viðmót')

    content_panels = BASE_ARTICLE_CONTENT_PANELS + [
        FieldPanel('tags'),
        MultiFieldPanel(
            [
                ImageChooserPanel('header_image'),
                FieldPanel('header_image_caption'),
                FieldPanel('header_image_credit'),
            ], "Header image"
        ),
        MultiFieldPanel(
            [   
                FieldPanel('body'),
                FieldPanel('correct')
            ], 'Body'
        ), 
    ]

    aukahlutir_panels = [
        MultiFieldPanel([
            FieldPanel('header_image_layout'),
            FieldPanel('header_image_crop'),
        ], heading="Myndbirting", classname="collapsible"),
        MultiFieldPanel([
            FieldPanel('header_video'),
        ], heading="Myndband", classname="collapsible collapsed"),
        MultiFieldPanel([
            FieldPanel('related_links_title'),
            InlinePanel('related_links', label="Related links"),
        ], heading="Tengdar greinar", classname="collapsible"),
        # MultiFieldPanel([
        #     InlinePanel('kox_chart_placement', label="Kox spárit"),
        # ], heading="Kosningaspá", classname="collapsible collapsed"),
        MultiFieldPanel([
            FieldPanel('sub_article_layout', widget=forms.widgets.RadioSelect),
            FieldPanel('sub_article_title'),
            FieldPanel('sub_article'),
        ], heading="Hliðarefni", classname="collapsible"),
        MultiFieldPanel([
            FieldPanel('editors_notes', widget=forms.widgets.Textarea({'rows':5})),
            FieldPanel('note_date'),
        ], heading="Athugasemd ritstjórnar", classname="collapsible"),
    ]

    promote_panels = Page.promote_panels + [
        MultiFieldPanel(
            [
                FieldPanel('auto_refresh'),
            ], "Display options"
        ),
    ]

    settings_panels = Page.settings_panels + [
        # DisplayFooPropertyPanel(classname='full'),
        RelatedPageMixin.content_panels[0],
        FieldPanel('styles_override', widget=forms.widgets.Textarea({'rows':10})),
        FieldPanel('additional_js'),
    ]

    search_fields = Page.search_fields + [
        index.SearchField('subtitle'),
        index.SearchField('body'),
    ]

    edit_handler = TabbedInterface([
        ObjectList(content_panels, heading='Efni'),
        ObjectList(aukahlutir_panels, heading="Aukahlutir"),
        ObjectList(promote_panels, heading='Sýnileiki'),
        ObjectList(settings_panels, heading='Stillingar', classname="settings"),
    ])

class ArticlePageRelatedLink(Orderable, RelatedLink):
    page = ParentalKey('ArticlePage', related_name="related_links")

# class BlockArticlePage(SiteSettingsTemplateMixin, MovePagesMixin, Page, CategoryMixin, ArticleTagStuffMixin, AuthorMixin, ArticleMixin):
#     """
#     Article built with multiple types of blocks.
#     Blocks can be repeated and/or combined in any way.
#     """
#     tags = ClusterTaggableManager(through=BlockArticleTag, blank=True)
#     header_image = models.ForeignKey(
#         'wagtailimages.Image',
#         null=True,
#         blank=False,
#         on_delete=models.SET_NULL,
#         related_name='+'
#     )
#     header_image_credit = models.CharField(max_length=255, blank=True, null=True)
#     body = StreamField(CommonEditingBlock())
#     transparent_header = models.BooleanField(default=False, blank=True)

# BlockArticlePage.content_panels = BASE_ARTICLE_CONTENT_PANELS + [
#     FieldPanel('tags'),
#     MultiFieldPanel(
#         [
#             ImageChooserPanel('header_image'),
#             FieldPanel('header_image_credit'),
#         ], "Header image"
#     ),
#     StreamFieldPanel('body'),
# ]

# BlockArticlePage.promote_panels = Page.promote_panels + [
#     MultiFieldPanel(
#         [
#             FieldPanel('auto_refresh'),
#         ], "Display options"
#     ),
# ]

# BlockArticlePage.settings_panels = Page.settings_panels + [
#     DisplayFooPropertyPanel(classname='full'),
#     FieldPanel('transparent_header'),
#     FieldPanel('styles_override'),
#     FieldPanel('additional_js'),
# ]

# BlockArticlePage.search_fields = Page.search_fields + [
#     index.SearchField('subtitle'),
#     index.SearchField('body'),
# ]


# class ArticleIndexPage(SiteSettingsTemplateMixin, Page):
#     layout = StreamField([
#         ], blank=True)
#     override_template = models.CharField(max_length=255, blank=True)
#     category = models.ForeignKey(
#         'Category',
#         null=True,
#         blank=True,
#         on_delete=models.SET_NULL,
#         related_name='+'
#       )

#     def get_context(self, request):
#         context = super(ArticleIndexPage, self).get_context(request)

#         # Get the full unpaginated listing of resource pages as a queryset -
#         # replace this with your own query as appropriate
#         article_index_children = Page.objects.live().child_of(self).order_by('-first_published_at').specific()
#         paginator = Paginator(article_index_children, 50) # Show no. of resources per page
#         page = request.GET.get('page')
#         try:
#             article_index_children = paginator.page(page)
#         except PageNotAnInteger:
#             # If page is not an integer, deliver first page.
#             article_index_children = paginator.page(1)
#         except EmptyPage:
#             # If page is out of range (e.g. 9999), deliver last page of results.
#             article_index_children = paginator.page(paginator.num_pages)

#         # make the variable 'resources' available on the template
#         context['article_index_children'] = article_index_children

#         return context

#     def get_template(self, request, *args, **kwargs):
#         app_settings = GeneralSiteSettings.for_site(request.site)
#         template = super(ArticleIndexPage, self).get_template(request)

#         if self.override_template != '':
#              template = "%s/%s" % (app_settings.template_dir, self.override_template)
#         if request.is_ajax():
#             return self.ajax_template or template
#         else:
#             return template


# ArticleIndexPage.content_panels = ArticleIndexPage.content_panels + [
#   FieldPanel('override_template', classname="full"),
#   SnippetChooserPanel('category'),
# ]


# class LatestArticlesPage(SiteSettingsTemplateMixin, Page):
#     override_template = models.CharField(max_length=255, blank=True)

#     def get_context(self, request):
#         context = super(LatestArticlesPage, self).get_context(request)

#         # Get the full unpaginated listing of resource pages as a queryset -
#         # replace this with your own query as appropriate
#         all_articles = Page.objects.live().descendant_of(request.site.root_page.specific).filter(content_type__model__in=['articlepage', 'blockarticlepage', 'mediapage','subpage', 'liveblogpage']).order_by('-first_published_at','-go_live_at','latest_revision_created_at')
#         paginator = Paginator(all_articles, 50) # Show no. of resources per page
#         page = request.GET.get('page')
#         try:
#             all_articles = paginator.page(page)
#         except PageNotAnInteger:
#             # If page is not an integer, deliver first page.
#             all_articles = paginator.page(1)
#         except EmptyPage:
#             # If page is out of range (e.g. 9999), deliver last page of results.
#             all_articles = paginator.page(paginator.num_pages)

#         # make the variable 'resources' available on the template
#         context['all_articles'] = all_articles

#         # Get the full unpaginated listing of resource pages as a queryset -
#         # replace this with your own query as appropriate
#         all_blogs = Page.objects.live().descendant_of(request.site.root_page.specific).filter(content_type__model__in=['blogpage']).order_by('-first_published_at','-go_live_at','latest_revision_created_at')
#         paginator = Paginator(all_blogs, 50) # Show no. of resources per page
#         page = request.GET.get('page')
#         try:
#             all_blogs = paginator.page(page)
#         except PageNotAnInteger:
#             # If page is not an integer, deliver first page.
#             all_blogs = paginator.page(1)
#         except EmptyPage:
#             # If page is out of range (e.g. 9999), deliver last page of results.
#             all_blogs = paginator.page(paginator.num_pages)

#         # make the variable 'resources' available on the template
#         context['all_blogs'] = all_blogs

#         return context

#     def get_template(self, request, *args, **kwargs):
#         app_settings = GeneralSiteSettings.for_site(request.site)
#         template = super(LatestArticlesPage, self).get_template(request)

#         if self.override_template != '':
#              template = "%s/%s" % (app_settings.template_dir, self.override_template)
#         if request.is_ajax():
#             return self.ajax_template or template
#         else:
#             return template


# LatestArticlesPage.content_panels = LatestArticlesPage.content_panels + [
#   FieldPanel('override_template', classname="full"),
# ]