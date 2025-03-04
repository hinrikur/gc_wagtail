from django import template
from django.utils.safestring import mark_safe

from wagtail.models import Page
from articles.models import ArticlePage

register = template.Library()


@register.simple_tag()
def parse_csv_as_table(
    table_data,
    table_caption,
    table_header_row,
    table_header_column,
    table_bootstrap,
    table_footnote,
    separator="|",
):

    rows = table_data.split("\n")

    html = '<table class="%s">' % table_bootstrap

    if table_caption:
        html += "<caption>%s</caption>" % table_caption

        if table_footnote:
            html += '<caption class="footnote">%s</caption>' % table_footnote

    for row_num, row in enumerate(rows):

        if row_num == 0:
            if table_header_row:
                html += " <thead>"
            else:
                html += " <tbody>"

        html += "  <tr>"

        row = row.replace(" %s" % separator, "%s" % separator)
        row = row.replace("%s " % separator, "%s" % separator)
        cells = row.split("%s" % separator)

        for cell_num, cell in enumerate(cells):

            if row_num == 0 and table_header_row:
                html += "   <th>%s</th>" % cell
            else:
                if cell_num == 0 and table_header_column:
                    html += "   <th>%s</th>" % cell
                else:
                    html += "   <td>%s</td>" % cell

        html += "  </tr>"

        if row_num == 0 and table_header_row:
            html += " </thead>"
            html += " <tbody>"

    html += " </tbody>"
    html += "</table>"

    return mark_safe(html)


@register.simple_tag()
def parse_csv_as_kox_table(
    table_data,
    table_caption,
    table_header_row,
    table_header_column,
    table_bootstrap,
    table_footnote,
    separator="|",
):

    rows = table_data.split("\n")

    html = '<table class="%s">' % table_bootstrap

    if table_caption:
        html += "<caption>%s</caption>" % table_caption

        if table_footnote:
            html += '<caption class="footnote">%s</caption>' % table_footnote

    for row_num, row in enumerate(rows):

        if row_num == 0:
            if table_header_row:
                html += "<thead>"
            else:
                html += "<tbody>"

        html += "<tr>"

        row = row.replace(" %s" % separator, "%s" % separator)
        row = row.replace("%s " % separator, "%s" % separator)
        cells = row.split("%s" % separator)

        for cell_num, cell in enumerate(cells):

            if row_num == 0 and table_header_row:
                html += "   <th>%s</th>" % cell
            else:
                if cell_num == 0 and table_header_column:
                    html += "<th>%s</th>" % cell
                else:
                    html += (
                        '<td><div class="color" style="background-color:rgba(140, 198, 63, %s)">'
                        % cell
                    )
                    html += '<div class="row-hover">%.0f%s</div></div></td>' % (
                        (float(cell) * 100),
                        "%",
                    )

        html += "</tr>"

        if row_num == 0 and table_header_row:
            html += "</thead>"
            html += "<tbody>"

    html += "</tbody>"
    html += "</table>"

    return mark_safe(html)


@register.inclusion_tag("oc_article/latest_articles.html")
def latest_articles(category_slug, order="-first_published_at", count=5, offset=0):
    pages = ArticlePage.objects.filter(category__slug=category_slug).order_by(order)[
        offset : count + offset
    ]
    return {"articles": [p.specific for p in pages]}
