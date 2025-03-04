# -*- coding: utf-8 -*-
from wagtail.core import blocks
from wagtail.core.blocks.field_block import RichTextBlock
from wagtail.images.blocks import ImageChooserBlock
from wagtail.embeds.blocks import EmbedBlock
from wagtail.snippets.blocks import SnippetChooserBlock
from wagtail.documents.blocks import DocumentChooserBlock

# from django.utils.translation import ugettext_lazy as _

# from ads.models import Adspot
from .templates import ArticleTemplate

# from kox.models import KoxTableBlock, KoxChart, ElectedRepsBlock, AlthingiRepsBlock


class ImageBlock(blocks.StructBlock):
    images = blocks.ListBlock(
        blocks.StructBlock(
            [
                (
                    "image",
                    ImageChooserBlock(
                        formats=["full-width", "left", "right"], required=True
                    ),
                ),
                ("caption", blocks.CharBlock(required=False)),
                ("credit", blocks.CharBlock(required=False)),
                (
                    "image_type",
                    blocks.ChoiceBlock(
                        choices=(
                            ("header_image", "Header image"),
                            ("content_image", "Content image"),
                            ("full_width_content_image", "Full width content image"),
                        ),
                        required=True,
                    ),
                ),
            ]
        )
    )
    block_classes = blocks.CharBlock(required=False)

    class Meta:
        icon = "image"


class DocTemplateChooser(blocks.StructBlock):
    html_template = DocumentChooserBlock()


# class KoxChartChooser(blocks.StructBlock):
#     kox_chart = SnippetChooserBlock(KoxChart, required=True)


class BlockquoteBlock(blocks.StructBlock):
    blockquote = blocks.CharBlock(classname="full blockquote")
    block_classes = blocks.CharBlock(required=False)

    class Meta:
        icon = "openquote"


class ParagraphBlock(blocks.StructBlock):
    paragraph = blocks.RichTextBlock()
    block_classes = blocks.CharBlock(required=False)

    class Meta:
        icon = "bold"


class SvarBlock(blocks.StructBlock):
    name = blocks.CharBlock()
    afstada = blocks.CharBlock(required=False)
    svar = blocks.ChoiceBlock(
        choices=(
            ("ja", "Ja"),
            ("nei", "Nei"),
            ("svarar_ekki", "Svarar ekki"),
            ("ekki_akvedid", "Ekki akvedid"),
        ),
        required=False,
    )
    image = ImageChooserBlock()
    flokkur = blocks.TextBlock(help_text=_("Enter .svg code."), required=False)
    block_classes = blocks.CharBlock(required=False)

    class Meta:
        icon = "user"


class SocialBlock(blocks.StructBlock):
    facebook = blocks.BooleanBlock(
        required=False, help_text=_("Add Facebook share option")
    )
    twitter = blocks.BooleanBlock(
        required=False, help_text=_("Add Twitter share option")
    )
    twitter_text = blocks.CharBlock(
        required=False,
        max_length=140,
        help_text=_("Custom share text for Twitter. Max 140 spaces."),
    )

    class Meta:
        icon = "site"


class TableBlock(blocks.StructBlock):
    breidd = blocks.ChoiceBlock(
        [
            ("col-md-12 col-md-push-0", "Breiðast (md-12)"),
            ("col-md-10 col-md-push-1", "Millibreidd (md-10)"),
            ("col-md-8 col-md-push-2", "Mjótt (md-8)"),
            ("col-md-6 col-md-push-3", "Hálf breidd (md-6)"),
        ],
        help_text="Veldu breidd töflunnar. Allar breiddir verða full-width í minnstu tækjum (col-xs-12).",
        required=True,
    )
    table = blocks.TextBlock(
        rows=10,
        help_text=_(
            "Enter your table as comma separated values, one line for each row."
        ),
    )
    caption = blocks.CharBlock(required=False)
    footnote = blocks.TextBlock(
        required=False, help_text=_("Enter notes to explain your data")
    )
    header_row = blocks.BooleanBlock(
        required=False, help_text=_("Render first row as header if checked")
    )
    header_column = blocks.BooleanBlock(
        required=False, help_text=_("Render first column as header if checked")
    )
    bootstrap = blocks.CharBlock(
        required=False,
        default="table ",
        help_text=_(
            "Styles: table-striped, table-bordered, table-hover, table-condensed"
        ),
    )
    block_classes = blocks.CharBlock(required=False)

    class Meta:
        icon = "list-ol"


class NoRepTableBlock(blocks.StructBlock):
    breidd = blocks.ChoiceBlock(
        [
            ("col-md-12 col-md-push-0", "Breiðast (md-12)"),
            ("col-md-10 col-md-push-1", "Millibreidd (md-10)"),
            ("col-md-8 col-md-push-2", "Mjótt (md-8)"),
            ("col-md-6 col-md-push-3", "Hálf breidd (md-6)"),
        ],
        help_text="Veldu breidd töflunnar. Allar breiddir verða full-width í minnstu tækjum (col-xs-12).",
        required=True,
    )
    table = blocks.TextBlock(
        rows=10,
        help_text=_(
            "Only numeric data. Enter your table as comma separated values, one line for each row."
        ),
    )
    caption = blocks.CharBlock(required=False)
    header_row = blocks.BooleanBlock(
        required=False, help_text=_("Render first row as header if checked")
    )
    header_column = blocks.BooleanBlock(
        required=False, help_text=_("Render first column as header if checked")
    )
    bootstrap = blocks.CharBlock(
        required=False,
        help_text=_(
            "Styles: table-striped, table-bordered, table-hover, table-condensed"
        ),
    )
    footnote = blocks.TextBlock(
        required=False, help_text=_("Enter notes to explain your data")
    )
    block_classes = blocks.CharBlock(
        required=False, help_text=_("text-center, text-right, border-left, white")
    )
    break_container = blocks.BooleanBlock(
        required=False, default=False, help_text=_("Notist með Container Block")
    )

    class Meta:
        icon = "list-ol"


class HeaderBlockNoImage(blocks.StructBlock):
    title = blocks.CharBlock(classname="full title")
    subtitle = blocks.CharBlock(classname="subtitle")
    block_classes = blocks.CharBlock(required=False)

    class Meta:
        icon = "title"


class HeaderBlockClean(blocks.StructBlock):
    title = blocks.CharBlock(classname="full title")
    subtitle = blocks.CharBlock(classname="subtitle")
    block_classes = blocks.CharBlock(required=False)

    class Meta:
        icon = "title"


class AuthorBlock(blocks.StructBlock):
    extra_info = blocks.CharBlock(required=False)

    class Meta:
        icon = "user"


class PageChooserBlock(blocks.StructBlock):
    title = blocks.CharBlock(
        required=False, help_text=_("Optional title with featured content")
    )
    page = blocks.PageChooserBlock(required=True)

    class Meta:
        icon = "doc-full-inverse"


class InterviewBlock(blocks.StructBlock):
    name = blocks.CharBlock()
    about = blocks.CharBlock(required=False)
    image = ImageChooserBlock()
    block_classes = blocks.CharBlock(required=False)

    class Meta:
        icon = "user"


# class AdspotBlock(blocks.StructBlock):
#     adspot = SnippetChooserBlock(Adspot, required=True)

#     class Meta:
#         icon = 'view'


class ArticleTemplateChooser(blocks.StructBlock):
    article_template = SnippetChooserBlock(ArticleTemplate, required=True)

    class Meta:
        icon = "view"


class TagListBlock(blocks.StructBlock):
    heading = blocks.CharBlock(classname="full title")
    tag = blocks.CharBlock(
        help_text="Ath að hástafir og lágstafir skipta máli í töggum."
    )
    count = blocks.IntegerBlock(
        default=10,
        help_text="Fjöldi atriða í lista sem birtist. Tíu atriði eru sjálfgefin.",
    )
    block_classes = blocks.CharBlock(required=False)

    class Meta:
        icon = "doc-full"


class StartContainerBlock(blocks.StructBlock):
    container_value = blocks.CharBlock()
    block_classes = blocks.CharBlock(required=False)

    class Meta:
        icon = "unlocked"


class EndContainerBlock(blocks.StructBlock):
    block_classes = blocks.CharBlock(required=False)

    class Meta:
        icon = "locked"


class ContentBrandingBlock(blocks.StructBlock):
    title = blocks.CharBlock(classname="title")
    brand_logo = DocumentChooserBlock(required=False)
    block_classes = blocks.CharBlock(required=False)

    class Meta:
        icon = "horizontalrule"


class BasicHeaderBlock(blocks.StructBlock):
    header_size = blocks.ChoiceBlock(
        [
            ("fullscreen", "Fylla í vafraglugga"),
            ("halfscreen", "Hálf hæð vafraglugga, full breidd"),
            ("splitscreen", "Vafraglugga deilt milli myndar og fyrirsagnar"),
            ("landscapepriority", "Myndskurður í forgangi – á breiddina"),
            ("portraitpriority", "Myndskurður í forgangi – á hæðina"),
            ("video", "Bakgrunnsmyndband fyllir í vafraglugga"),
            ("noscreen", "Engin mynd birt"),
        ],
        help_text="Veldu stærð myndarinnar.",
        required=True,
    )
    extra_image = ImageChooserBlock(
        required=False,
        help_text="Veldu sérstaka mynd til að birta yfir grein. Slepptu til að nota Header Image.",
    )
    crop_image = blocks.BooleanBlock(
        required=False,
        default=False,
        help_text="Viltu nota fókus svæði myndar? Þetta skilyrðir hlutföll mynda.",
    )
    bgvideo_link = blocks.URLBlock(
        required=False,
        label="Bakgrunnsmyndband slóð",
        help_text="Bakgrunnsmynd verður myndband frá YouTube eða Vimeo",
    )
    bgvideo_mp4 = DocumentChooserBlock(
        required=False,
        label="Bakgrunnsmyndband hýst",
        help_text="Bakgrunnsmynd verður myndband sem hýst er hjá Kjarnanum.",
    )
    extra_title = blocks.CharBlock(
        required=False,
        classname="full title",
        help_text="Sérstök fyrirsögn yfir grein. Slepptu til að birta Title.",
    )
    extra_subtitle = blocks.CharBlock(
        required=False,
        classname="subtitle",
        help_text="Sérstök undirfyrirsögn yfir grein. Slepptu til að birta Subtitle.",
    )
    calluna = blocks.BooleanBlock(
        required=False, help_text="Viltu hafa letrið Calluna í fyrirsögn?"
    )
    display_category = blocks.BooleanBlock(
        required=False, default=True, help_text="Viltu birta category-miða?"
    )
    display_author = blocks.BooleanBlock(
        required=False, default=True, help_text="Viltu birta nafn höfundar og mynd?"
    )
    display_social = blocks.BooleanBlock(
        required=False, default=True, help_text="Viltu birta tengla á samfélagsmiðla?"
    )
    block_classes = blocks.CharBlock(required=False)


# class CommonEditingBlock(blocks.StreamBlock):
#     basic_header_block = BasicHeaderBlock(icon='title')
#     image_block = ImageBlock()
#     paragraph_block = ParagraphBlock()
#     blockquote_block = BlockquoteBlock()
#     interview_block = InterviewBlock()
#     social_block = SocialBlock()
#     page_chooser_block = PageChooserBlock()
#     tag_list_block = TagListBlock()
#     html = blocks.RawHTMLBlock()
#     embed = EmbedBlock(icon='media')
#     # adspot_block = AdspotBlock()
#     table_block = TableBlock()
#     no_rep_table_block = NoRepTableBlock()
#     # kox_table_block = KoxTableBlock()
#     # kox_chart = KoxChartChooser(icon='snippet')
#     # elected_reps = ElectedRepsBlock()
#     # althingi_reps = AlthingiRepsBlock()
#     svar_block = SvarBlock()
#     start_container_block = StartContainerBlock()
#     end_container_block = EndContainerBlock()
#     content_branding_block = ContentBrandingBlock()
#     header_block_no_image = HeaderBlockNoImage()
#     header_block_clean = HeaderBlockClean()
#     author_block = AuthorBlock()
#     html_template = DocTemplateChooser()
#     article_template = ArticleTemplateChooser()


class ArticlePageBlock(blocks.StreamBlock):
    paragraph = RichTextBlock(
        template="kjarninn/articles/block_templates/paragraph_block.html"
    )
    html = blocks.RawHTMLBlock(
        template="kjarninn/articles/block_templates/html_block.html"
    )
