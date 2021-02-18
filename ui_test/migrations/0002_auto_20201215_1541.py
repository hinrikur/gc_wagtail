# Generated by Django 3.1.4 on 2020-12-15 15:41

from django.conf import settings
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('contenttypes', '0002_remove_content_type_name'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('wagtailcore', '0059_apply_collection_ordering'),
        ('wagtailredirects', '0006_redirect_increase_max_length'),
        ('wagtailforms', '0004_add_verbose_name_plural'),
        ('ui_test', '0001_initial'),
    ]

    operations = [
        migrations.RenameModel(
            old_name='BookPage',
            new_name='UiTestPage',
        ),
    ]
