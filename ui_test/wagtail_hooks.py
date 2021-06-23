# -*- coding: utf-8 -*-
import json
import wagtail.admin.rich_text.editors.draftail.features as draftail_features
from django.utils.html import format_html, format_html_join
from wagtail.admin.rich_text import HalloPlugin
from wagtail.admin.rich_text.converters.html_to_contentstate import InlineStyleElementHandler
from wagtail.core import hooks

from wagtail.admin.rich_text.converters.editor_html import WhitelistRule
from wagtail.core.whitelist import allow_without_attributes, attribute_rule, check_url

from django.templatetags.static import static
from django.utils.safestring import mark_safe

from wagtail.core import hooks


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
            'url': self.url_helper.create_url,
            'label': _('Add %s') % self.verbose_name,
            'classname': cn,
            'title': _('Add a new %s') % self.verbose_name,
        }

    def delete_button(self, pk, classnames_add=None, classnames_exclude=None):
        if classnames_add is None:
            classnames_add = []
        if classnames_exclude is None:
            classnames_exclude = []
        classnames = self.add_button_classnames + classnames_add
        cn = self.finalise_classname(classnames, classnames_exclude)
        return {
            'url': reverse("your_custom_url"),
            'label': _('Delete'),
            'classname': "custom-css-class",
            'title': _('Delete this item')
        }

class ArticlePageAdmin(ModelAdmin):
    model = ArticlePage
    button_helper_class = CorrectButtonHelper

modeladmin_register(ArticlePageAdmin)


# Testing demo from wagtial docs
# #########################################################
# #########################################################
# #########################################################
# #########################################################
# #########################################################

from draftjs_exporter.dom import DOM
from wagtail.admin.rich_text.converters.html_to_contentstate import InlineEntityElementHandler

# @hooks.register('register_rich_text_features')
# def register_correct_feature(features):
#     features.default_features.append('correction')
#     """
#     Registering the `correction` feature, which uses the `CORRECTION` Draft.js entity type,
#     and is stored as HTML with a `<span data-correction>` tag.
#     """
#     feature_name = 'correction'
#     type_ = 'CORRECTION'

#     control = {
#         'type': type_,
#         'label': 'Y',
#         'description': 'Lesa yfir',
#     }

#     features.register_editor_plugin(
#         'draftail', feature_name, draftail_features.EntityFeature(
#             control,
#             # js=['js/correct.js', 'js/rsuitejs-index-bundle.js'],
#             js=['js/correct-bundle.js'],
#             css={'all': ['css/correct.css']}
#         )
#     )

#     features.register_converter_rule('contentstate', feature_name, {
#         # Note here that the conversion is more complicated than for blocks and inline styles.
#         'from_database_format': {'span[data-correction]': CorrectEntityElementHandler(type_)},
#         'to_database_format': {'entity_decorators': {type_: correct_entity_decorator}},
#     })



# def correct_entity_decorator(props):
#     """
#     Draft.js ContentState to database HTML.
#     Converts the CORRECTION entities into a span tag.
#     """
#     return DOM.create_element('span', {
#         'data-correction': props['correction'],
#     }, props['children'])


# class CorrectEntityElementHandler(InlineEntityElementHandler):
#     """
#     Database HTML to Draft.js ContentState.
#     Converts the span tag into a CORRECTION entity, with the right data.
#     """
#     mutability = 'IMMUTABLE'

#     def get_attribute_data(self, attrs):
#         """
#         Take the ``correction`` value from the ``data-correction`` HTML attribute.
#         """
#         return {
#             'correction': attrs['data-correction'],
        # }


# Testing annotation replacement

@hooks.register('register_rich_text_features')
def register_annotation_feature(features):
    features.default_features.append('annotate')
    """
    Registering the `annotate` feature, which uses the `DANNOTATE` Draft.js entity type,
    and is stored as HTML with a `<span data-annotation>` tag.
    """
    feature_name = 'annotate'
    type_ = 'ANNOTATION'

    control = {
        'type': type_,
        'label': 'Lesa yfir',
        'description': 'Prófa leiðréttingu',
    }

    features.register_editor_plugin(
        'draftail', feature_name, draftail_features.EntityFeature(
            control,
            js=['js/annotate-bundle.js'],
            css={'all': ['css/correct.css']}
        )
    )

    features.register_converter_rule('contentstate', feature_name, {
        # Note here that the conversion is more complicated than for blocks and inline styles.
        'from_database_format': {'span[data-annotation]': AnnotationEntityElementHandler(type_)},
        'to_database_format': {'entity_decorators': {type_: annotation_entity_decorator}},
    })


# Testing annotation replacement

def annotation_entity_decorator(props):
    """
    Draft.js ContentState to database HTML.
    Converts the ANNOTATE entities into a span tag.
    """
    return DOM.create_element('span', {
        'data-annotation': props['annotation'],
    }, props['children'])


class AnnotationEntityElementHandler(InlineEntityElementHandler):
    """
    Database HTML to Draft.js ContentState.
    Converts the span tag into a ANNOTATE entity, with the right data.
    """
    mutability = 'MUTABLE'

    def get_attribute_data(self, attrs):
        """
        Take the ``annotation`` value from the ``data-annotation`` HTML attribute.
        """
        return {
            'annotation': attrs['data-annotation'],
        }

# #########################################################
# #########################################################
# #########################################################
# #########################################################
# #########################################################


# removed because not part of edit panel
# class WelcomePanel:
#     order = 110

#     def render(self):
#         return mark_safe("""
#         <section class="panel summary nice-padding">
#           <h3>Dashboard Panel Section Title</h3>
#           <button data-modal-trigger="some-param">Open Modal</button>
#         </section>
#         """)
# 
# @hooks.register('construct_homepage_panels')
# def add_another_welcome_panel(request, panels):
#     panels.append(WelcomePanel())


# @hooks.register('register_rich_text_features')
# def register_mark_feature(features):
#     """
#     Registering the `mark` feature, which uses the `MARK` Draft.js inline style type,
#     and is stored as HTML with a `<mark>` tag.
#     """
#     feature_name = 'mark'
#     type_ = 'MARK'
#     tag = 'mark'

#     # 2. Configure how Draftail handles the feature in its toolbar.
#     control = {
#         'type': type_,
#         'label': '☆',
#         'description': 'Mark',
#         # This isn’t even required – Draftail has predefined styles for MARK.
#         # 'style': {'textDecoration': 'line-through'},
#     }

#     # 3. Call register_editor_plugin to register the configuration for Draftail.
#     features.register_editor_plugin(
#         'draftail', feature_name, draftail_features.InlineStyleFeature(control)
#     )

#     # 4.configure the content transform from the DB to the editor and back.
#     db_conversion = {
#         'from_database_format': {tag: InlineStyleElementHandler(type_)},
#         'to_database_format': {'style_map': {type_: tag}},
#     }

#     # 5. Call register_converter_rule to register the content transformation conversion.
#     features.register_converter_rule('contentstate', feature_name, db_conversion)

#     # 6. (optional) Add the feature to the default features list to make it available
#     # on rich text fields that do not specify an explicit 'features' list
#     features.default_features.append('mark')

# @hooks.register('insert_global_admin_js')
# def global_admin_js():
#     code_str1 = "<script async src='https://www.googletagmanager.com/gtag/js?id=UA-68611392-3'></script>"
#     code_str2 = "<script>window.dataLayer = window.dataLayer || [];"
#     code_str3 = "function gtag(){{dataLayer.push(arguments);}}"
#     code_str4 = "gtag('js', new Date());gtag('config', 'UA-68611392-3');</script>"
#     code_strs = code_str1 + code_str2 + code_str3 + code_str4
#     return format_html(format(code_strs))


# @hooks.register('register_rich_text_features')
# def register_embed_feature(features):
#     features.register_editor_plugin(
#         'hallo', 'correct',
#         HalloPlugin(
#             name='hallocorrect',
#             js=['ui_test/static/js/hallo-correct.js'],
#         )
#     )
#     features.register_converter_rule('hallocorrect', 'correct', [
#         WhitelistRule('hallocorrect', attribute_rule({'class': True, 'id': True, 'data': True})),
#     ])
#     features.default_features.append('correct')


@hooks.register('register_rich_text_features')
def register_html_feature(features):
    features.register_editor_plugin(
        'hallo', 'html',
        HalloPlugin(
            name='hallohtml',
            js=[],
        )
    )
    features.register_converter_rule('editorhtml', 'html', [
        WhitelistRule('blockquote', allow_without_attributes),
        WhitelistRule('table', attribute_rule({'class': True})),
        WhitelistRule('tr', attribute_rule({'class': True})),
        WhitelistRule('th', attribute_rule({'class': True, 'colspan': True})),
        WhitelistRule('td', attribute_rule({'class': True, 'colspan': True})),
        WhitelistRule('tbody', attribute_rule({'class': True})),
        WhitelistRule('thead', attribute_rule({'class': True})),
        WhitelistRule('tfoot', attribute_rule({'class': True})),
        WhitelistRule('caption', attribute_rule({'class': True})),
        WhitelistRule('h1', attribute_rule({'class': True, 'id': True, 'data': True})),
        WhitelistRule('h2', attribute_rule({'class': True, 'id': True, 'data': True})),
        WhitelistRule('h3', attribute_rule({'class': True, 'id': True, 'data': True})),
        WhitelistRule('h4', attribute_rule({'class': True, 'id': True, 'data': True})),
        WhitelistRule('h5', attribute_rule({'class': True, 'id': True, 'data': True})),
        WhitelistRule('a', attribute_rule({'class': True, 'href': True})),
        WhitelistRule('div', attribute_rule({'class':True, 'id':True, 'data':True, 'style': True})),
        WhitelistRule('canvas', attribute_rule({'class':True, 'id': True, 'height': True, 'width': True, 'data': True})),
        WhitelistRule('iframe', attribute_rule({'src':True, 'id': True, 'type': True, 'width': True, 'height': True, 'frameborder': True, 'scrolling': True, 'style': True})),
    ])
    features.default_features.append('html')



@hooks.register('insert_editor_js')
def editor_js():
    return format_html("""
        <script>

        function initSlugAutoPopulate() {{
            if (!$('body').hasClass('page-is-live')) {{

                var now = new Date();
                var d = date_format(now);
                var slugFollowsTitle = false;

                $('#id_title').on('focus', function() {{
                    /* slug should only follow the title field if its value matched the title's value at the time of focus */
                    var currentSlug = $('#id_slug').val();
                    var slugifiedTitle = cleanForSlug(this.value, true);
                    slugFollowsTitle = (currentSlug.replace(d, "") == slugifiedTitle);
                }});

                $('#id_title').on('keyup keydown keypress blur', function() {{
                    if (slugFollowsTitle) {{
                        var slugifiedTitle = d + cleanForSlug(this.value, true);
                        $('#id_slug').val(slugifiedTitle);
                    }}
                }});
            }}
        }}

        $(function(){{
            $("input#url_to_copy").on("click", function () {{
                $(this).select();
            }});
        }});

        function pad_2(number) {{
             return (number < 10 ? '0' : '') + number;
        }}

        function date_format(date) {{
             return date.getFullYear() + '-' +
                    pad_2(date.getMonth()+1) + '-' +
                    pad_2(date.getDate()) + '-';
        }}

        

        registerHalloPlugin('hallohtml');

        delete halloPlugins['halloreundo'];

        // registerHalloPlugin('hallocorrect')

        </script>
    """)

# print('debug - outside -----------------------------------')




# @hooks.register('register_rich_text_features')
# def register_correct_feature(features):
#     features.register_converter_rule('editorhtml', 'correct', [
#         WhitelistRule('correct-button', allow_without_attributes),
#     ])

# @hooks.register('register_rich_text_features')
# def register_embed_feature(features):
#     # print('debug - inside -----------------------------------')
#     features.register_editor_plugin(
#         'hallo', 'simplecolorpicker',
#         HalloPlugin(
#             name='hallocorrect',
#             js=['ui_test/static/js/hallocorrect.js'],
#             options={
#                 'format': False,
#                 'allowedTags': [
#                     'p', 'em', 'strong', 'div', 'ol', 'ul', 'li', 'a', 'figure', 'blockquote', 'cite', 'img'],
#                 'allowedAttributes': ['style'],
#             }
#         )
#     )

# @hooks.register('register_rich_text_features')
# def register_correct_feature(features):
#     features.register_converter_rule('editorhtml', 'simplecolorpicker', [
#         WhitelistRule('simple-color-picker', allow_without_attributes),
#     ])