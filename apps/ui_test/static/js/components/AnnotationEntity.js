const React = window.React;

const Portal = require('./Portal.js');
const Popover = require('./Popover.js');
const IconButton = require('./IconButton.js');
const DeclineButton = require('./DeclineButton.js');

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

function formatAnnotation(txt, note = "") {
    // Hack to convert all text within single quotation marks in
    // an annotation to bold, while also escaping the annotation
    // text to valid HTML
    // Allows an additional 'note', used for errors in sentence parsing
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
        dangerouslySetInnerHTML: createMarkup(replaced + note)
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
        this.buttonHandler = this.buttonHandler.bind(this);
        this.popoverButtons = this.popoverButtons.bind(this);
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

    // handler for triggering Draftail entity source via command passed
    // removes entity with onRemove, triggers entity source with onEdit
    // closes popover/tooltip at button click (bug fix)
    buttonHandler(command, key) {
        // console.log("buttonHandler function called")
        // console.log(onCommand)
        command(key);
        this.setState({
            showTooltipAt: null
        });
    }

    popoverButtons(props) {
        const annClass = props.annClass;
        // const buttonHandler = this.buttonHandler.bind(this);
        const entityKey = props.entityKey;
        const onRemove = props.onRemove;
        const onEdit = props.onEdit;
        const data = props.data;
        const annData = data.annotation;
        const postData = data.replyGreynirAPI;

        const SINGLE_BUTTON_ACCEPT = [
            // "parse-error", // Parse errors now have a 2 button choice
            "unknown-word"
        ];

        if (SINGLE_BUTTON_ACCEPT.includes(annClass)) {

            return React.createElement(
                'div', {
                className: "annotation-buttons"
            },
                React.createElement(
                    IconButton, {
                    name: "Annotation__button_yes",
                    // active,
                    label: "Loka ábendingu",
                    title: "Loka ábendingu",
                    icon: "glyphicon glyphicon-ok normal",
                    onClick: () => {
                        let action = onRemove;
                        postData('fake-url', annData, "accept");
                        this.buttonHandler(action, entityKey);

                    }
                }
                )
            );
        }

        if (annClass === "wording") {

            return React.createElement(
                'div', {
                className: "annotation-buttons"
            },
                // Button for accepting annotation, calling onEdit and rerunning source component
                React.createElement(
                    IconButton, {
                    name: "Annotation__button_yes",
                    // active,
                    label: "Sammála",
                    title: "Uppástungan á við hér",
                    icon: "glyphicon glyphicon-ok normal",
                    onClick: () => {
                        // let action = annClass === "wording" ? onRemove : onEdit;
                        let action = onRemove;
                        postData('fake-url', annData, "accept");
                        this.buttonHandler(action, entityKey);

                    }
                }
                ),
                // Button for declining annotation, removing annotation entity
                // onRemove and entityKey passed as props and called further down
                React.createElement(
                    IconButton, {
                    name: "Annotation__button_no",
                    // active,
                    label: "Ósammála",
                    title: "Uppástungan á ekki við hér",
                    icon: "glyphicon glyphicon-remove normal",
                    onClick: () => {
                        // let action = annClass === "wording" ? onRemove : onEdit;
                        let action = onRemove;
                        postData('fake-url', annData, "reject");
                        this.buttonHandler(action, entityKey);

                    }
                }
                )
            );
        } else if (annClass === "wording-plus") {
            return React.createElement(
                'div', {
                className: "annotation-buttons"
            },
                // Button for accepting annotation, calling onEdit and rerunning source component
                React.createElement(
                    IconButton, {
                    name: "Annotation__button_yes",
                    label: "Sammála",
                    title: "Uppástungan á við hér",
                    icon: "glyphicon glyphicon-ok normal",
                    onClick: () => {
                        // let action = annClass === "wording" ? onRemove : onEdit;
                        let action = onRemove;
                        postData('fake-url', annData, "accept");
                        this.buttonHandler(action, entityKey);

                    }
                }
                ),

                // Button for declining annotation, removing annotation entity
                // onRemove and entityKey passed as props and called further down
                React.createElement(
                    DeclineButton, {
                    name: "Annotation__button_no",
                    label: "Ósammála",
                    title: "Uppástungan á ekki við hér",
                    icon: "glyphicon glyphicon-remove normal",
                    onRemove: onRemove,
                    entityKey: entityKey,
                    data: data
                }
                )
            );
        } else if (annClass === "parse-error") {
            return React.createElement(
                'div', {
                className: "annotation-buttons"
            },
                // Button for accepting annotation. Replies to API with 'accept'
                React.createElement(
                    IconButton, {
                    name: "Annotation__button_yes",
                    label: "Rétt ábending",
                    title: "Það er eitthvað að setningunni",
                    icon: "glyphicon glyphicon-ok normal",
                    onClick: () => {
                        // let action = annClass === "wording" ? onRemove : onEdit;
                        let action = onRemove;
                        postData('fake-url', annData, "accept");
                        this.buttonHandler(action, entityKey);

                    }
                }
                ),

                // generic IconButton NOT a DeclineButton 
                // replies to API with 'reject' without rendering feedback menu.
                React.createElement(
                    IconButton, {
                    name: "Annotation__button_no",
                    label: "Röng ábending",
                    title: "Það er ekkert að setningunni,\nábendingin er vitlaus",
                    icon: "glyphicon glyphicon-remove normal",
                    onClick: () => {
                        // let action = annClass === "wording" ? onRemove : onEdit;
                        let action = onRemove;
                        postData('fake-url', annData, "reject");
                        this.buttonHandler(action, entityKey);
                    }
                }
                )
            );
        }

        return React.createElement(
            'div', {
            className: "annotation-buttons"
        },
            // Button for accepting annotation, calling onEdit and rerunning source component
            React.createElement(
                IconButton, {
                name: "Annotation__button_yes",
                // active,
                label: "Samþykkja",
                title: "Samþykkja uppástungu",
                icon: "glyphicon glyphicon-ok normal",
                onClick: () => {
                    let action = annClass === "wording" ? onRemove : onEdit;
                    // let reply = annClass === "wording" ? "reject" : "accept";
                    let reply = "accept";
                    postData('fake-url', annData, reply);
                    this.buttonHandler(action, entityKey);

                }
            }
            ),
            // Button for declining annotation, removing annotation entity
            // onRemove and entityKey passed as props and called further down
            React.createElement(
                DeclineButton, {
                name: "Annotation__button_no",
                // active,
                label: "Hafna",
                title: "Hafna uppástungu",
                icon: "glyphicon glyphicon-remove normal",
                onRemove: onRemove,
                entityKey: entityKey,
                data: data
            }
            )
        );
    }

    render() {
        const {
            entityKey,
            children,
            onEdit,
            onRemove,
            data,
        } = this.props;

        const { showTooltipAt } = this.state;
        const annCode = data.annotation.code;
        // const annClass = getAnnotationClass(annCode);
        const annClass = data.annClass;

        // console.log("Annotation code:", annCode);
        // console.log("Annotation class:", annClass);


        // 'ann' element, contains the in-line annotation and children
        return React.createElement(
            "ann", {
            role: "button",
            onMouseUp: this.openTooltip,
            className: `${annClass}`
        },
            React.createElement(
                "span", {
                className: "Annotated__text"
            },
                children
            ),
            showTooltipAt &&
            // Portal for popover/tooltip
            React.createElement(
                Portal, {
                onClose: this.closeTooltip,
                closeOnClick: true,
                closeOnType: true,
                closeOnResize: true
            },
                // Popover component
                React.createElement(
                    Popover, {
                    target: showTooltipAt,
                    direction: "top",
                    // annClass: annClass,
                    clsName: `Tooltip Annotation-${annClass}`,
                    id: "annotation_popover"
                },
                    // div for popover contents
                    React.createElement(
                        "div", {
                        className: "ann-popover-contents"
                    },
                        // div for annoatation text message
                        React.createElement(
                            "div", {
                            className: "ann-text"
                        },
                            formatAnnotation(this.props.data.annotation.text)
                        ),

                        // div for annotation detail if present
                        typeof this.props.data.annotation.detail !== "undefined" && this.props.data.annotation.detail !== null ?
                            React.createElement(
                                "div", {
                                className: "ann-detail"
                            },
                                annClass === "parse-error" ?
                                    formatAnnotation(this.props.data.annotation.detail, ". <br><b>Setningin gæti verið vitlaus!</b>")
                                    :
                                    formatAnnotation(this.props.data.annotation.detail)
                            ) :
                            null
                    ),
                    React.createElement(
                        this.popoverButtons,
                        {
                            annClass: annClass,
                            buttonHandler: this.buttonHandler,
                            entityKey: entityKey,
                            onRemove: onRemove,
                            onEdit: onEdit,
                            data: data
                        }
                    )


                )
            )
        );
    }
}

module.exports = AnnotationEntity;