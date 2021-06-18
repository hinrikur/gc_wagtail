# gc_wagtail

Repository for testing GreynirCorrect UI in Wagtail environment


## Notes on contents

### `./ui_test/`

- Analogous to Kjarninn "Article Page" app

### `./ui_test/static/`

- contains all relevant `.js` files for grammar annotation

### `./ui_test/wagtail_hooks.py`

- important for implementing grammar annotation
- see [DraftTail documentation](https://docs.wagtail.io/en/v2.13.2/advanced_topics/customisation/extending_draftail.htmlt) 
- important snippets
  - `@hooks.register('register_rich_text_features')` 
  - `correct_entity_decorator`
  - `DebugAnnotateEntityElementHandler`