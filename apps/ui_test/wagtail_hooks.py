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





from draftjs_exporter.dom import DOM
from wagtail.admin.rich_text.converters.html_to_contentstate import InlineEntityElementHandler


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
        'description': 'Færa leiðréttingar\ninn í skjalið',
    }

    features.register_editor_plugin(
        'draftail', feature_name, draftail_features.EntityFeature(
            control,
            js=['js/annotate-bundle.js'],
            css={'all': ['css/grammar-annotation.css']}
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



@hooks.register('register_rich_text_features')
def register_remove_annotation_feature(features):
    features.default_features.append('remove-annotation')
    """

    """
    feature_name = 'remove-annotation'
    type_ = 'RMVANN'

    control = {
        'type': type_,
        'label': 'Ljúka',
        'description': 'Ljúka yfirferð\nog eyða leiðréttingum',
    }

    features.register_editor_plugin(
        'draftail', feature_name, draftail_features.EntityFeature(
            control,
            js=['js/remove-anns-bundle.js'],
            css={'all': ['css/grammar-annotation.css']}
        )
    )

    features.register_converter_rule('contentstate', feature_name, {
        # Note here that the conversion is more complicated than for blocks and inline styles.
        'from_database_format': {'span[data-remove-annotation]': RemoveAnnotationElementHandler(type_)},
        'to_database_format': {'entity_decorators': {type_: remove_annotations_decorator}},
    })


# Testing annotation replacement

def remove_annotations_decorator(props):
    """
    Draft.js ContentState to database HTML.
    Converts the RMVANN entities into a span tag.
    """
    return DOM.create_element('span', {
        'data-remove-annotation': props['remove-annotation'],
    }, props['children'])


class RemoveAnnotationElementHandler(InlineEntityElementHandler):
    """
    Database HTML to Draft.js ContentState.
    Converts the span tag into a RMVANN entity, with the right data.
    """
    mutability = 'IMMUTABLE'

    def get_attribute_data(self, attrs):
        """
        
        """
        return {
            'remove-annotation': attrs['data-remove-annotation'],
        }





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



