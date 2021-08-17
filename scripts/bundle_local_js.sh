#!/bin/bash

browserify apps/ui_test/static/js/annotate.js -o apps/ui_test/static/js/annotate-bundle.js
browserify apps/ui_test/static/js/remove-anns.js -o apps/ui_test/static/js/remove-anns-bundle.js