(function() {
  (function(jQuery) {
      return jQuery.widget('IKS.hallocorrect', {
          options: {
              editable: null,
              toolbar: null,
              uuid: '',
              buttonCssClass: null
          },
          populateToolbar: function(toolbar) {
              var buttonElement, buttonset;
              buttonset = jQuery('<span class="' + this.widgetName + '"></span>');
              buttonElement = jQuery('<span></span>');
              buttonElement.hallobutton({
                  uuid: this.options.uuid,
                  editable: this.options.editable,
                  label: 'Lesa yfir',
                  command: 'correct',
                  icon: '',
                  cssClass: this.options.buttonCssClass
              });
              buttonset.append(buttonElement);
              buttonset.hallobuttonset();
              return toolbar.append(buttonset);
          }
      });
  })(jQuery);
}).call(this);