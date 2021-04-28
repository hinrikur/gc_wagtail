//    jquery-simplecolorpicker plugin for Hallo
//    (c) 2013 Thomas Subera, 25th-Floor
//    Hallo may be freely distributed under the MIT license
(function(jQuery) {
	return jQuery.widget("IKS.hallosimplecolorpicker", {
		colorElement : null,

		options: {
			uuid: '',
			colors: {
				"#7bd148": "Green",
				"#5484ed": "Bold blue",
				"#a4bdfc": "Blue",
				"#46d6db": "Turquoise",
				"#7ae7bf": "Light green",
				"#51b749": "Bold green",
				"#fbd75b": "Yellow",
				"#ffb878": "Orange",
				"#ff887c": "Red",
				"#dc2127": "Bold red",
				"#dbadff": "Purple",
				"#e1e1e1": "Gray",
				"#000000": "Black"
			},
			simplecolorpicker : {
				picker: true
			}
		},
		editable: null,

		_create: function() {
			// Add any actions you want to run on plugin initialization
			// here
		},

		populateToolbar: function(toolbar) {
			var buttonset, widget,
				_this = this;
			widget = this;

			// build select
			this.colorElement = this.createSelectElement();

			buttonset = jQuery("<span class=\"" + widget.widgetName + "\"></span>");
			buttonset.append(this.colorElement);
			buttonset.hallobuttonset();

			// Append the button to toolbar
			toolbar.append(buttonset);

			// initialize the jquery plugin
			this.colorElement.simplecolorpicker(this.options.simplecolorpicker)
				// modify editable on change
				.on('change', function () {
					_this.options.editable.execute('foreColor', _this.colorElement.val());
				});
		},

		// create the Select Element
		createSelectElement: function () {
			var colorElement = jQuery("<select name=\"colorpicker\"></select>");
			jQuery.each(this.options.colors, function(color, label) {
				var option = jQuery("<option></option>")
					.val(color)
					.text(label);
				option.appendTo(colorElement);
			});
			return colorElement;
		},

		cleanupContentClone: function(element) {
			//# Perform content clean-ups before HTML is sent out
		}
	});
})(jQuery);