(function() {
  (function(jQuery) {
      return jQuery.widget('IKS.hallocorrect', {
          options: {
              editable: null,
              toolbar: null,
              uuid: '',
              buttonCssClass: null,
              image: true,
          },
          populateToolbar: function(toolbar) {
              var buttonElement, buttonset;
              buttonset = jQuery('<span class="' + this.widgetName + '"></span>');
              buttonElement = jQuery('<span></span>');
              buttonElement.hallobutton({
                  uuid: this.options.uuid,
                  editable: this.options.editable,
                  label: 'Lesa yfir',
                  command: alert( "Handler for click called." ),
                  icon: 'fa fa-file-code-o',
                  cssClass: this.options.buttonCssClass
              });
              //   buttonElement.click = alert("Correct button clicked");
            //   buttonElement.on('click', function(event) {
            //     alert( "Handler for click called." );
            //   });
              buttonset.append(buttonElement);
              buttonset.hallobuttonset();
              return toolbar.append(buttonset);
          }

            
      });
  })(jQuery);
}).call(this);