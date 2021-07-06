const React = window.React;
// const Icon = window.Draftail.Icon;

const Portal = require('./portal.js');
const Popover = require('./popover.js');
const IconButton = require('./icon-button.js');

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

    buttonHandler(command, key) {
        // console.log("buttonHandler function called")
        // console.log(onCommand)
        command(key);
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
            onRemove,
            entityKey,
            data
        } = this.props;

        const annData = data.annotation;
        const postData = data.replyGreynirAPI;

        const { showTooltipOnHover } = this.state;
        const { showFeedbackAt } = this.state;
        return React.createElement(
            "button", {
            // name: name,
            className: `${name}${active ? " Annotation__button_yes--active" : ""
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
                    Popover, {
                    target: showFeedbackAt,
                    direction: "bottom-left",
                    clsName: "Tooltip Feedback"
                    // annClass: annClass
                },
                    React.createElement(
                        "div", {
                        className: "feedback-menu-contents"
                    },
                    React.createElement('div',
                    {
                        className: "feedback-title"
                    },
                    "Ástæða höfnunar:"
                    ),
                        React.createElement(
                            "div",
                            {
                                className: "feedback-button-1"
                            },
                            React.createElement(
                                IconButton, {
                                name: "feedback-button",
                                // active,
                                label: "Ekki villa",
                                title: "Merkti textinn inniheldur ekki villu",
                                icon: "glyphicon glyphicon-circle-remove normal",
                                onClick: () => {
                                    postData('fake-url', annData, "reject", "not-error");
                                    this.buttonHandler(onRemove, entityKey);
                                }
                            }
                            )
                        ),
                        React.createElement(
                            "div",
                            {
                                className: "feedback-button-2"
                            },
                            React.createElement(
                                IconButton, {
                                name: "feedback-button",
                                // active,
                                label: "Röng ábending",
                                title: "Ábendingin á ekki við villuna í textanum",
                                icon: "glyphicon glyphicon-flag-waving normal",
                                onClick: () => {
                                    postData('fake-url', annData, "reject", "wrong-error");
                                    this.buttonHandler(onRemove, entityKey);
                                }
                            }
                            )
                        ),
                        React.createElement(
                            "div",
                            {
                                className: "feedback-button-3"
                            },
                            React.createElement(
                                IconButton, {
                                name: "feedback-button",
                                // active,
                                label: "Annað",
                                title: "Hafna ábendingu af annarri ástæðu (þarf ekki að tilgreina)",
                                icon: "glyphicon glyphicon-circle-question normal",
                                onClick: () => {
                                    postData('fake-url', annData, "reject", "other");
                                    this.buttonHandler(onRemove, entityKey);
                                }
                            }
                            )
                        )
                    )
                )
            )

        );
    }
}

module.exports = DeclineButton;