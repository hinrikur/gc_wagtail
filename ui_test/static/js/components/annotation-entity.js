
const React = window.React;
const Modifier = window.DraftJS.Modifier;
const DraftUtils = window.Draftail.DraftUtils;

// const dangerouslySetInnerHTML = window.React.dangerouslySetInnerHTML()



const Portal = require('./portal.js');
const AnnotationPopover = require('./popover.js');
const IconButton = require('./icon-button.js');

var entityMap = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;'
};

function escapeHtml(string) {
  return String(string).replace(/[&<>"'`=\/]/g, function (s) {
    return entityMap[s];
  });
}

function createMarkup(txt) {
  return { __html: txt };
}

function formatAnnotation(txt) {
  // Hack to convert all text within single quotation marks in
  // an annotation to bold, while also escaping the annotation
  // text to valid HTML
  var fmt = txt.replace(/'[^']*'/g, function (s) {
    // Be careful to not use characters that will be HTML-escaped
    // in the dummy markers
    return "[bold]" + s.slice(1, -1) + "[~bold]";
  });
  fmt = escapeHtml(fmt);
  // Replace the dummy markers with HTML tags
  replaced = fmt.replace(/\[bold\]/g, "<b>").replace(/\[~bold\]/g, "</b>");
  // Returned as React element
  return React.createElement("div", {
    // className: "ann-popover-contents", // incorrect placement of this className
    dangerouslySetInnerHTML: createMarkup(replaced)
  });
}

class AnnotationEntity extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      showTooltipAt: null
    };
    this.openTooltip = this.openTooltip.bind(this);
    this.closeTooltip = this.closeTooltip.bind(this);
  }
  /* :: openTooltip: (e: Event) => void; */

  openTooltip(e) {
    const trigger = e.target;

    if (trigger instanceof Element) {
      this.setState({
        showTooltipAt: trigger.getBoundingClientRect()
      });
    }
  }
  /* :: closeTooltip: () => void; */

  closeTooltip() {
    this.setState({
      showTooltipAt: null
    });
  }

  render() {
    const {
      editorState,
      entityKey,
      contentState,
      children,
      onEdit,
      onRemove,
      icon,
      label,
      data
    } = this.props;

    const { showTooltipAt } = this.state;
    // 'ann' element, conteins the annotation 
    return React.createElement(
      "ann",
      {
        role: "button",
        onMouseUp: this.openTooltip,
        className: "ann"
      },
      React.createElement(
        "span",
        {
          className: "TooltipEntity__text"
        },
        children
      ),
      showTooltipAt &&
      // Portal for popover/tooltip
      React.createElement(
        Portal,
        {
          onClose: this.closeTooltip,
          closeOnClick: true,
          closeOnType: true,
          closeOnResize: true
        },
        // AnnotationPopover component
        React.createElement(
          AnnotationPopover,
          {
            target: showTooltipAt,
            direction: "top"
          },
          // div for popover contents
          React.createElement(
            "div",
            {
              className: "ann-popover-contents"
            },
            // div for annoatation text message
            React.createElement(
              "div",
              {
                className: "ann-text"
              },
              formatAnnotation(this.props.data.text)
            ),

            // div for annotation detail if present
            typeof this.props.data.detail !== "undefined" && this.props.data.detail !== null
              ? React.createElement(
                "div",
                {
                  className: "ann-detail"
                },
                formatAnnotation(this.props.data.detail)
              )
              : null
          ),

          React.createElement(
            IconButton,
            {
              name: "yes",
              // active,
              label: "Samþykkja",
              title: "Samþykkja uppástungu",
              icon: "glyphicon glyphicon-ok normal",
              onClick: onEdit.bind(null, entityKey),
              // onClick: onRemove.bind(this.props.data.suggest, entityKey),
            }
            // "button",
            // {
            //     type: "button",
            //     className: "Annotation__button_yes",
            //     //   onClick: onEdit.bind(null, entityKey)
            //     onClick: onRemove.bind(null, entityKey),
            //     icon: "check"
            // },
            // "Samþykkja"
          ),
          React.createElement(
            IconButton,
            {
              name: "no",
              // active,
              label: "Hafna",
              title: "Hafna uppástungu",
              icon: "glyphicon glyphicon-remove normal",
              onClick: onRemove.bind(null, entityKey),
            }
          ),
          //     React.createElement(
          // "button",
          // {
          //   type: "button",
          //   className: "Annotation__button_no",
          //   onClick: onRemove.bind(null, entityKey)
          // },
          // "Hafna"
        )
      )

    );
  }
}

module.exports = AnnotationEntity;