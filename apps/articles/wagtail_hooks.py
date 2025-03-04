# -*- coding: utf-8 -*-

import json
from wagtail.core import hooks

# from wagtail.admin.rich_text import HalloPlugin
from django.utils.translation import gettext_lazy as _
from django.utils.html import format_html
from wagtail.core.whitelist import attribute_rule, check_url, allow_without_attributes
from wagtail.admin.rich_text.converters.editor_html import WhitelistRule
from wagtail.contrib.redirects.models import Redirect
from wagtail.models import Site
from django.utils.html import escape

from wagtail.core.rich_text import LinkHandler


@hooks.register("construct_homepage_summary_items")
def remove_summary_items(request, items):
    for i in items:
        items.remove(i)


# TODO
# @hooks.register('before_move_page')
# def redirect_before_move(self, page, dest):
#     old_url_path_for_redirect = page.url
#     if old_url_path_for_redirect[-1] == "/":
#         old_url_path_for_redirect = old_url_path_for_redirect[0:-1]

#     r = Redirect.objects.create(
#         old_path = old_url_path_for_redirect,
#         site = Site.objects.get(is_default_site=True),
#         is_permanent = True,
#         redirect_page = page
#     )

#     print("Redirect to old url path created: %s => %s", r.old_path, r.redirect_page)

from wagtail.contrib.modeladmin.helpers import ButtonHelper
from wagtail.contrib.modeladmin.options import ModelAdmin, modeladmin_register
from .models import ArticlePage


class CorrectButtonHelper(ButtonHelper):
    def add_button(self, classnames_add=None, classnames_exclude=None):
        if classnames_add is None:
            classnames_add = []
        if classnames_exclude is None:
            classnames_exclude = []
        classnames = self.add_button_classnames + classnames_add
        cn = self.finalise_classname(classnames, classnames_exclude)
        return {
            "url": self.url_helper.create_url,
            "label": _("Add %s") % self.verbose_name,
            "classname": cn,
            "title": _("Add a new %s") % self.verbose_name,
        }

    def delete_button(self, pk, classnames_add=None, classnames_exclude=None):
        if classnames_add is None:
            classnames_add = []
        if classnames_exclude is None:
            classnames_exclude = []
        classnames = self.add_button_classnames + classnames_add
        cn = self.finalise_classname(classnames, classnames_exclude)
        return {
            "url": reverse("your_custom_url"),
            "label": _("Delete"),
            "classname": "custom-css-class",
            "title": _("Delete this item"),
        }


class ArticlePageAdmin(ModelAdmin):
    model = ArticlePage
    button_helper_class = CorrectButtonHelper


modeladmin_register(ArticlePageAdmin)

# @hooks.register('insert_global_admin_js')
# def global_admin_js():
#     code_str1 = "<script async src='https://www.googletagmanager.com/gtag/js?id=UA-68611392-3'></script>"
#     code_str2 = "<script>window.dataLayer = window.dataLayer || [];"
#     code_str3 = "function gtag(){{dataLayer.push(arguments);}}"
#     code_str4 = "gtag('js', new Date());gtag('config', 'UA-68611392-3');</script>"
#     code_strs = code_str1 + code_str2 + code_str3 + code_str4
#     return format_html(format(code_strs))


class NoFollowExternalLinkHandler(LinkHandler):
    identifier = "external"

    @classmethod
    def expand_db_attributes(cls, attrs):
        href = attrs["href"]
        return '<a href="%s" target="_blank" rel="noopener nofollower">' % escape(href)


@hooks.register("register_rich_text_features")
def register_external_link(features):
    features.register_link_type(NoFollowExternalLinkHandler)


# @hooks.register('register_rich_text_features')
# def register_html_feature(features):
#     features.register_editor_plugin(
#         'hallo', 'html',
#         HalloPlugin(
#             name='hallohtml',
#             js=[],
#         )
#     )
#     features.register_converter_rule('editorhtml', 'html', [
#         WhitelistRule('blockquote', allow_without_attributes),
#         WhitelistRule('table', attribute_rule({'class': True})),
#         WhitelistRule('tr', attribute_rule({'class': True})),
#         WhitelistRule('th', attribute_rule({'class': True, 'colspan': True})),
#         WhitelistRule('td', attribute_rule({'class': True, 'colspan': True})),
#         WhitelistRule('tbody', attribute_rule({'class': True})),
#         WhitelistRule('thead', attribute_rule({'class': True})),
#         WhitelistRule('tfoot', attribute_rule({'class': True})),
#         WhitelistRule('caption', attribute_rule({'class': True})),
#         WhitelistRule('h1', attribute_rule({'class': True, 'id': True, 'data': True})),
#         WhitelistRule('h2', attribute_rule({'class': True, 'id': True, 'data': True})),
#         WhitelistRule('h3', attribute_rule({'class': True, 'id': True, 'data': True})),
#         WhitelistRule('h4', attribute_rule({'class': True, 'id': True, 'data': True})),
#         WhitelistRule('h5', attribute_rule({'class': True, 'id': True, 'data': True})),
#         WhitelistRule('a', attribute_rule({'class': True, 'href': True})),
#         WhitelistRule('div', attribute_rule({'class':True, 'id':True, 'data':True, 'style': True})),
#         WhitelistRule('canvas', attribute_rule({'class':True, 'id': True, 'height': True, 'width': True, 'data': True})),
#         WhitelistRule('iframe', attribute_rule({'src':True, 'id': True, 'type': True, 'width': True, 'height': True, 'frameborder': True, 'scrolling': True, 'style': True})),
#     ])
#     features.default_features.append('html')


# @hooks.register("insert_editor_js")
# def editor_js():
#     return format_html(
#         """
#         <script>


#         function initSlugAutoPopulate() {{
#             if (!$('body').hasClass('page-is-live')) {{

#                 var now = new Date();
#                 var d = date_format(now);
#                 var slugFollowsTitle = false;

#                 $('#id_title').on('focus', function() {{
#                     /* slug should only follow the title field if its value matched the title's value at the time of focus */
#                     var currentSlug = $('#id_slug').val();
#                     var slugifiedTitle = cleanForSlug(this.value, true);
#                     slugFollowsTitle = (currentSlug.replace(d, "") == slugifiedTitle);
#                 }});

#                 $('#id_title').on('keyup keydown keypress blur', function() {{
#                     if (slugFollowsTitle) {{
#                         var slugifiedTitle = d + cleanForSlug(this.value, true);
#                         $('#id_slug').val(slugifiedTitle);
#                     }}
#                 }});
#             }}
#         }}

#         $(function(){{
#             $("input#url_to_copy").on("click", function () {{
#                 $(this).select();
#             }});
#         }});

#         function pad_2(number) {{
#              return (number < 10 ? '0' : '') + number;
#         }}


#         function date_format(date) {{
#              return date.getFullYear() + '-' +
#                     pad_2(date.getMonth()+1) + '-' +
#                     pad_2(date.getDate()) + '-';
#         }}

#         registerHalloPlugin('hallohtml');

#         delete halloPlugins['halloreundo'];


#         </script>
#     """
#     )
