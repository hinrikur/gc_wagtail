
const React = window.React;
const Modifier = window.DraftJS.Modifier;



const Portal = require('./portal.js');
const AnnotationPopover = require('./popover.js');
  
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

        // const currentContentState = editorState.getCurrentContent();

        // console.log("Editor State from within entity:", currentContentState)

        const { showTooltipAt } = this.state;
        const { url } = contentState.getEntity(entityKey).getData(); // Contrary to what JSX A11Y says, this should be a button but it shouldn't be focusable.
        const errCode = data.code;
        const errSuggestion = data.suggest;
        const errMessage = data.text;

        //   const newContentState = Modifier.replaceText(currentContent, selectionState, selectedText, null, annotationEntityKey);
        // onReplace = () => {
        //     console.log(`replacing word with "${this.props.data.suggest}"`);
        //   }

        return /*#__PURE__*/ React.createElement(
            "ann",
            {
                role: "button",
                onMouseUp: this.openTooltip,
                className: "ann"
            },
          // /*#__PURE__*/ React.createElement(Icon, {
          //   icon: icon,
          //   className: "TooltipEntity__icon"
          // }),
          /*#__PURE__*/ React.createElement(
                "span",
                {
                    className: "TooltipEntity__text"
                },
                children
            ),
            showTooltipAt &&
            /*#__PURE__*/ React.createElement(
                Portal,
                {
                    onClose: this.closeTooltip,
                    closeOnClick: true,
                    closeOnType: true,
                    closeOnResize: true
                },
              /*#__PURE__*/ React.createElement(
                    AnnotationPopover,
                    {
                        target: showTooltipAt,
                        direction: "top"
                    },
                    //     /*#__PURE__*/ React.createElement(
                    //   "a",
                    //   {
                    //     href: url,
                    //     title: url,
                    //     target: "_blank",
                    //     rel: "noopener noreferrer",
                    //     className: "Tooltip__link"
                    //   },
                    //   this.props.data.code
                    // ),
                    React.createElement(
                        "div",
                        {

                        },
                        //   React.createElement(
                        //       "h2",
                        //       {
                        //           className: "AnnotationClassLabel",
                        //       },
                        //       this.props.data.code
                        // "Hello World!"
                        //   ),
                        React.createElement(
                            "h3",
                            {
                                className: "AnnotationMessage"
                            },
                            this.props.data.text
                        )
                    ),

                /*#__PURE__*/ React.createElement(
                        "button",
                        {
                            type: "button",
                            className: "Annotation__button_yes",
                            //   onClick: onEdit.bind(null, entityKey)
                            onClick: onRemove.bind(null, entityKey),
                            icon: "check"
                        },
                        "Samþykkja"
                    ),
                /*#__PURE__*/ React.createElement(
                        "button",
                        {
                            type: "button",
                            className: "Annotation__button_no",
                            onClick: onRemove.bind(null, entityKey)
                        },
                        "Hafna"
                    )
                )
            )
        );
    }
}

module.exports = AnnotationEntity;