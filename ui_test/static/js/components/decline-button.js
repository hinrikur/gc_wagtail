const React = window.React;
// const Icon = window.Draftail.Icon;

const Portal = require('./portal.js');
const FeedbackMenu = require('./feedbackMenu.js');

class DeclineButton extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            showTooltipOnHover: true
        };
        // for hover tooltip
        this.onMouseDown = this.onMouseDown.bind(this);
        this.onMouseLeave = this.onMouseLeave.bind(this);
        // for feedback menu
        this.openFeedback = this.openFeedback.bind(this);
        this.closeFeedback = this.closeFeedback.bind(this);
    }
    /* :: onMouseDown: (e: Event) => void; */

    onMouseDown(e) {
        const { name, onClick } = this.props;
        e.preventDefault();
        this.setState({
            showTooltipOnHover: false
        });

        if (onClick) {
            onClick(name || "");
        }
    }
    /* :: onMouseLeave: () => void; */

    onMouseLeave() {
        this.setState({
            showTooltipOnHover: true
        });
    }

    openFeedback(e) {
        const trigger = e.target;

        if (trigger instanceof Element) {
            this.setState({
                showFeedbackAt: trigger.getBoundingClientRect()
            });
        }
    }
    /* :: closeFeedback: () => void; */

    closeFeedback() {
        this.setState({
            showFeedbackAt: null
        });
    }

    render() {
        const {
            name,
            active,
            label,
            title,
            icon,
            onClick,
            onMouseUp,
        } = this.props;

        const { showTooltipOnHover } = this.state;
        const { showFeedbackAt } = this.state;
        return React.createElement(
            "button", {
                // name: name,
                className: `Annotation__button_${name}${active ? " Annotation__button_yes--active" : ""
                    }`,
                type: "button",
                "aria-label": title || null,
                "data-draftail-balloon": title && showTooltipOnHover ? true : null,
                tabIndex: -1,
                onClick: onClick,
                onMouseUp: this.openFeedback
                // onMouseDown: this.onMouseDown,
                // onMouseLeave: this.onMouseLeave
            },
            typeof icon !== "undefined" && icon !== null ?
                /*#__PURE__*/
                React.createElement("span", {
                    className: icon
                }) :
                null,
            label ?
                /*#__PURE__*/
                React.createElement(
                    "span", 
                    {
                        className: "Annotation__button__label"
                    },
                    label
                ) : null,
        
            showFeedbackAt &&
            // Portal for feedback menu
            React.createElement(
                Portal, {
                onClose: this.closeFeedback,
                closeOnClick: true,
                closeOnType: true,
                closeOnResize: true
            },
                // AnnotationPopover component
                React.createElement(
                    FeedbackMenu, {
                    target: showFeedbackAt,
                    direction: "top",
                    // annClass: annClass
                }
                )
            )
        );
    }
}

module.exports = DeclineButton;