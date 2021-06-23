const React = window.React;
const Modifier = window.DraftJS.Modifier;
const DraftUtils = window.Draftail.DraftUtils;

// const dangerouslySetInnerHTML = window.React.dangerouslySetInnerHTML()



const Portal = require('./portal.js');
const Popover = require('./popover.js');
const IconButton = require('./icon-button.js');
const DeclineButton = require('./decline-button.js');

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
    return String(string).replace(/[&<>"'`=\/]/g, function(s) {
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
    var fmt = txt.replace(/'[^']*'/g, function(s) {
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

function getAnnotationClass(code) {
    // Converts error's code from API to one of three classes
    // Relevant for rendering of annotation 

    var cls; // return variable

    const classMap = {
        "C": "grammar-error", // Compound error
        "N": "grammar-suggestion", // Punctuation error - N  
        "P": "grammar-suggestion", // Phrase error - P
        "W": "grammar-suggestion", // Spelling suggestion - W (not used in GreynirCorrect atm)
        "Z": "spelling", // Capitalization error - Z
        "A": "spelling", // Abbreviation - A
        "S": "spelling", // Spelling error - S
        "U": "spelling", // Unknown word - U (nothing can be done)
        "T": "wording", // Taboo warning
    };

    var codeChar = code.charAt(0);
    cls = classMap[codeChar];
    return cls;
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

    // handler for triggering Drafttail entity source via command passed
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

    render() {
        const {
            entityKey,
            children,
            onEdit,
            onRemove,
            data
        } = this.props;

        const { showTooltipAt } = this.state;
        const annCode = data.code;
        const annClass = getAnnotationClass(annCode);

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
                        clsName: `Tooltip Annotation-${annClass}`
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
                            formatAnnotation(this.props.data.text)
                        ),

                        // div for annotation detail if present
                        typeof this.props.data.detail !== "undefined" && this.props.data.detail !== null ?
                        React.createElement(
                            "div", {
                                className: "ann-detail"
                            },
                            formatAnnotation(this.props.data.detail)
                        ) :
                        null
                    ),
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
                        }
                    )
                )
            )
        );
    }
}

module.exports = AnnotationEntity;