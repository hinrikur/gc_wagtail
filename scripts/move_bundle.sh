#!/bin/bash

# move js + css to local kjarninn fork
cp apps/ui_test/static/js/annotate-bundle.js ../kjarninn/apps/greynir_correct/static/js/annotate-bundle.js
cp apps/ui_test/static/css/grammar-annotation.css ../kjarninn/apps/greynir_correct/static/css/grammar-annotation.css
cp apps/ui_test/static/js/remove-anns.js ../kjarninn/apps/greynir_correct/static/js/remove-anns.js
