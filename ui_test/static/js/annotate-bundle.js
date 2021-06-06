(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
const React = window.React;

const Modifier = window.DraftJS.Modifier;
const EditorState = window.DraftJS.EditorState;
const DraftUtils = window.Draftail.DraftUtils;
const SelectionState = window.DraftJS.SelectionState;
const convertToRaw = window.DraftJS.convertToRaw;


const AnnotationEntity = require('./components/annotation-entity.js');

// Debug API responses (hard-coded) imported
// const processResponce = require('./components/processAPI.js');
// const dummyApi = require('./components/modifiedReference.json');
// const dummyApi = require('./components/correctedReference.json');
// const dummyApi = require('./components/showcaseResponse');

// Example POST method implementation:
async function callGreynirAPI(url = '', data = {}) {
    if (data === "") {
        // text is field is empty, returns null
        // NOTE: this was tripped when content blocks were annoatated one by one
        //       shouldn't occur now as whole editor content is annotated at once
        //       empty editor case handled at lower level
        return null;
    } else {
        console.log("Data being sent via request");
        console.log(JSON.stringify(data));
        const response = await fetch(url, {
            method: 'POST', // *GET, POST, PUT, DELETE, etc.
            scheme: "https",
            headers: {
                'Content-Type': 'text/plain', 
            },
            body: data // body data type must match "Content-Type" header
        });

        return response.json(); // parses JSON response into native JavaScript objects
    }
}

// iterates over API response JSON and returns flat
// array of annotations (annotationArray)
function processAPI(json) {
    // empty return array defined
    var annotationArray = [];
    // iterate through outer array
    for (var i = 0; i < json.result.length; i++) {
        // iterate through paragraphs
        var paragraphArray = [];
        for (var j = 0; j < json.result[i].length; j++) {
            // iterate through sentences
            // adjust likely errors in char locations from API
            var anns = json.result[i][j]["annotations"];
            // annotation added to return array
            var newArray = paragraphArray.concat(anns);
            paragraphArray = newArray;
        }
        annotationArray.push(paragraphArray);
    }

    return annotationArray;
}

// helper for adjusting wrong character spans in API response
// not used currently
// more low level fix likely needed (In GreynirCorrect or Yfirlestur API)
function adjustChars(sentAnnotation) {

    function range(start, end) {
        var ans = [];
        for (let i = start; i <= end; i++) {
            ans.push(i);
        }
        return ans;
    }

    // counter for aggregated changes
    var aggrChar = 1;
    for (var i = 0; i < sentAnnotation.annotations.length; i++) {
        // console.log('fsdfsdjkafl;sdjfklasd;jfklsed')
        // console.log(sentAnnotation.annotations[i])
        const firstToken = sentAnnotation.annotations[i].start;
        const lastToken = sentAnnotation.annotations[i].end;
        var relevantTokens = range(firstToken, lastToken);
        // for (var index in relevantTokens) {

        //     if (sentAnnotation.tokens[index].charAt(0) == ' '){
        //         ann.start_char += 1;
        //     } 
        // }
        // console.log("current token:", '"'+sentAnnotation.tokens[lastToken].o+'"')
        console.log(sentAnnotation.tokens[lastToken].o.charAt(0));
        if (sentAnnotation.tokens[lastToken].o.charAt(0).trim() === '') {
            console.log("Editing token offset:", sentAnnotation.tokens[lastToken].o);
            aggrChar += 1;
            offsetChange = aggrChar;
            console.log("Offset change:", offsetChange);
            if (sentAnnotation.annotations[i].start_char !== 0) {
                sentAnnotation.annotations[i].start_char += offsetChange;
            }
            sentAnnotation.annotations[i].end_char += offsetChange;

        }

    }
    return sentAnnotation;
}

function getReplacement(data) {
    // finds valid replacement text in annotation data
    var replacement;
    if (data.suggest === "") {
        // in case of empty .suggest field in data,
        // example from .text field extracted with regex
        var realSuggest = data.text.match(/'[^']*'/)[0];
        realSuggest = realSuggest.substring(1, realSuggest.length - 1);
        replacement = realSuggest;
    } else {
        // otherwise returns .suggest value
        replacement = data.suggest;
    }
    return replacement;
}


class DebugAnnotateSource extends React.Component {

    componentDidMount() {

        const {
            editorState,
            entityType,
            onComplete,
            entityKey
        } = this.props;

        // If statement catches if entityKey is set, indicating annotation has been approved
        if (entityKey !== undefined && entityKey !== null) {

            // get entity to replace (via Draftail utils)
            const entityToReplace = DraftUtils.getEntitySelection(editorState, entityKey);
            // get editor content (via DraftJS API)
            const currentContent = editorState.getCurrentContent();
            // get entity inline style
            const currentBlock = currentContent.getBlockMap().get(entityToReplace.getStartKey());
            const start = entityToReplace.getAnchorOffset();
            const originalStyle = currentBlock.getInlineStyleAt(start);
            // get entity data
            const data = currentContent.getEntity(entityKey).getData();
            // get suggestion text from entity data
            const suggestionText = getReplacement(data);
            // replace the annotation entity via DraftJS Modifier
            const correctedEntity = Modifier.replaceText(
                currentContent,
                entityToReplace,
                suggestionText,
                originalStyle,
                null
            );
            // push to EditorState
            const correctedState = EditorState.push(editorState, correctedEntity, 'apply-entity');
            onComplete(correctedState);

        } else { 

            // Creating new annotation enties
            const editorHasContent = editorState.getCurrentContent().hasText();

            // capture empty editors etc.
            switch (editorHasContent) {

                // Editor contains text
                case true:

                    // rawState of editor extracted
                    const rawState = convertToRaw(editorState.getCurrentContent());
                    // Text extracted by mapping to array and joining with newline
                    let textObject = rawState.blocks.map(object => object.text);
                    let toCorrectArray = Object.values(textObject);
                    const rawText = toCorrectArray.join('\n');
                    // raw content blocks set as variable
                    var rawContentBlocks = rawState.blocks;

                    // async API call made
                    // NOTE: Editory content update (rendering annotations) now performed completely inside .then() block
                    callGreynirAPI("https://yfirlestur.is/correct.api", rawText)
                        .then(response => {
                            if (response === null) {
                                console.log(`Empty block for key ${key}. Skipping...`);
                            } else {
                                // raw response logged to console
                                console.log("API response:", response);
                                // response flattened to a array of arrays of annotation data objects
                                const processedResponse = processAPI(response);
                                // processed response logged to console
                                console.log("Array of annotations:", processedResponse);
                                // response flattened to a array of annotation data objects
                                var i = 0;
                                for (var key in rawContentBlocks) {
                                    console.log(key);
                                    console.log(processedResponse[i]);
                                    console.log(rawContentBlocks[key]);
                                    rawContentBlocks[key]["APIresponse"] = processedResponse[i];
                                    i++;

                                }

                                console.log("rawContentBlocks after addition:", rawContentBlocks);

                                // container array for entities that will be rendered in the editor
                                const entitiesToRender = [];

                                // variable for aggregated text length
                                var aggrLen = 0;
                                // iterate over block keys in raw content blocks
                                for (var blockKey in rawContentBlocks) {
                                    // log current content block key
                                    console.log(rawContentBlocks[blockKey]);
                                    // check for empty API response
                                    if (typeof rawContentBlocks[blockKey].APIresponse !== "undefined") {
                                        // API response not empty
                                        // each content block assigned its relevant text annotations
                                        rawContentBlocks[blockKey].APIresponse.forEach(annotation => {

                                            const anchorKey = rawContentBlocks[blockKey].key;
                                            let currentContent = editorState.getCurrentContent();
                                            // 
                                            console.log("currentContent:", currentContent);
                                            console.log("blockMap:", currentContent.getBlockMap());
                                            // 
                                            const currentContentBlock = currentContent.getBlockForKey(anchorKey);
                                            console.log("anchorKey:", anchorKey);
                                            console.log("currentContentBock, via anchorKey:", currentContentBlock);
                                            // each annotation start and end char index reduced by aggregated char length (aggrLen)
                                            // API looks at location in total text, DrafTail looks at location in current block
                                            const start = annotation.start_char - aggrLen;
                                            const end = annotation.end_char - aggrLen;
                                            // text for annotation selected from content block text, with inline style
                                            const selectedText = currentContentBlock.getText().slice(start, end);
                                            const selectionStyle = currentContentBlock.getInlineStyleAt(start);

                                            const blockSelection = SelectionState
                                                .createEmpty(anchorKey)
                                                .merge({
                                                    anchorOffset: start,
                                                    focusOffset: end,
                                                });

                                            console.log("Text to annotate: " + selectedText);
                                            console.log("Start offset:", start);
                                            console.log("End offset:", end);

                                            // The annotation entity contains information sent from the API during annotation
                                            const annEntity = currentContent.createEntity(
                                                entityType.type,
                                                'MUTABLE', // DraftTail entity mutability
                                                annotation // data from API
                                            );
                                            // last created DraftTail entity extracted 
                                            const annotationEntityKey = annEntity.getLastCreatedEntityKey();
                                            // last created pushed to toRender array
                                            entitiesToRender.push({
                                                "key": annotationEntityKey,
                                                "blockSelection": blockSelection,
                                                "selectedText": selectedText,
                                                "selectionStyle": selectionStyle,
                                            });


                                        });
                                        // length of current block text added to aggregated text length variable
                                        aggrLen += rawContentBlocks[blockKey].text.length;

                                    } else {
                                        // API response was empty or undefined, usually because of an empty text block
                                        // TODO: keep empty blocks in order with annotated blocks
                                        console.log("Undefined response, likely empty Block. BlockKey:", blockKey);
                                    }

                                    // current content saved as base new content state
                                    let newContentState = editorState.getCurrentContent();

                                    // iterate over list of entities to render and add to new content state
                                    entitiesToRender.forEach(entity => {
                                        console.log("entity from list:", entity);
                                        newContentState = Modifier.replaceText(
                                            newContentState,
                                            entity.blockSelection,
                                            entity.selectedText,
                                            entity.selectionStyle, // null, 
                                            entity.key
                                        );
                                    });

                                    // Create the new state as an undoable action.
                                    const nextState = EditorState.push(
                                        editorState,
                                        newContentState,
                                        "apply-entity"
                                    );
                                    // render next state through onComplete DraftTail method
                                    onComplete(nextState);
                                }
                            }
                        })
                        .catch(err => console.log('Error:', err));

                    break;

                // Editor is empty
                case false:
                    onComplete(unModifiedState);
                    console.log("...But the editor is empty");
                    break;

                // Other case (not meant to get here!)
                default:
                    // Other / Error
                    console.log("Debug annotate case not caught");
                    break;
            }
        }

    }
    // render doesn't return anything - not needed
    render() {
        return null;
    }
}



const DebugAnnotation = (props) => {

    const {
        entityKey,
        contentState,
        onEdit,
        onRemove
    } = props;

    const data = contentState.getEntity(entityKey).getData();

    return React.createElement(AnnotationEntity, {
        class: 'ann',
        entityKey: entityKey,
        contentState: contentState,
        onEdit: onEdit,
        onRemove: onRemove,
        icon: null,
        label: null,
        data: data,
        onMouseUp: () => {
            // debug log for checking annotation interaction
            console.log('Annotation clicked');

        },

        onMouseEnter: () => {
            // debug log for checking annotation interaction
            console.log('hovering on annotation');
        },
        onMouseLeave: () => {
            console.log('not hovering any more');
        },
    },
        props.children);
};

// Register DANNOTATE plugin to draftail editor
window.draftail.registerPlugin({
    type: 'DANNOTATE',
    source: DebugAnnotateSource,
    decorator: DebugAnnotation,
});
},{"./components/annotation-entity.js":2}],2:[function(require,module,exports){
const React = window.React;
const Modifier = window.DraftJS.Modifier;
const DraftUtils = window.Draftail.DraftUtils;

// const dangerouslySetInnerHTML = window.React.dangerouslySetInnerHTML()



const Portal = require('./portal.js');
const AnnotationPopover = require('./popover.js');
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
    cls = classMap[codeChar]
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
        const annClass = getAnnotationClass(annCode)

        console.log("Annotation code:", annCode)
        console.log("Annotation class:", annClass)


        // 'ann' element, conteins the annotation 
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
                // AnnotationPopover component
                React.createElement(
                    AnnotationPopover, {
                        target: showTooltipAt,
                        direction: "top",
                        annClass: annClass
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
                            name: "yes",
                            // active,
                            label: "Samþykkja",
                            title: "Samþykkja uppástungu",
                            icon: "glyphicon glyphicon-ok normal",
                            onClick: () => {
                                    this.buttonHandler(onEdit, entityKey)
                                }
                                // onClick: onEdit.bind(this.props.data.suggest, entityKey),
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
                    // Button for declining annotation, removing annotation entity
                    React.createElement(
                        DeclineButton, {
                            name: "no",
                            // active,
                            label: "Hafna",
                            title: "Hafna uppástungu",
                            icon: "glyphicon glyphicon-remove normal",
                            // onClick: () => {
                            //     this.buttonHandler(onRemove, entityKey);
                            // }
                        }
                    )
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
},{"./decline-button.js":3,"./icon-button.js":5,"./popover.js":6,"./portal.js":7}],3:[function(require,module,exports){
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
},{"./feedbackMenu.js":4,"./portal.js":7}],4:[function(require,module,exports){

const React = window.React;

class FeedbackMenu extends React.Component {
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
        
    }
}

module.exports = FeedbackMenu;
},{}],5:[function(require,module,exports){

const React = window.React;
// const Icon = window.Draftail.Icon;

class IconButton extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      showTooltipOnHover: true
    };
    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseLeave = this.onMouseLeave.bind(this);
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

  render() {
    const { name, 
        active, 
        label, 
        title, 
        icon,
        onClick,
        onMouseUp,
    } = this.props;
    const { showTooltipOnHover } = this.state;
    return /*#__PURE__*/ React.createElement(
      "button",
      {
        name: name,
        className: `Annotation__button_${name}${
          active ? " Annotation__button_yes--active" : ""
        }`,
        type: "button",
        "aria-label": title || null,
        "data-draftail-balloon": title && showTooltipOnHover ? true : null,
        tabIndex: -1,
        onClick: onClick,
        onMouseUp: onMouseUp
        // onMouseDown: this.onMouseDown,
        // onMouseLeave: this.onMouseLeave
      },
      typeof icon !== "undefined" && icon !== null
        ? /*#__PURE__*/ React.createElement("span", {
            className: icon
          })
        : null,
      label
        ? /*#__PURE__*/ React.createElement(
            "span",
            {
              className: "Annotation__button_yes__label"
            },
            label
          )
        : null
    );
  }
}

module.exports = IconButton;
},{}],6:[function(require,module,exports){
const React = window.React;

const TOP = "top";
const LEFT = "left";
const TOP_LEFT = "top-left";

const getTooltipStyles = (target, direction) => {
  const top = window.pageYOffset + target.top;
  const left = window.pageXOffset + target.left;

  switch (direction) {
    case TOP:
      return {
        top: top + target.height,
        left: left + target.width / 2
      };

    case LEFT:
      return {
        top: top + target.height / 2,
        left: left + target.width
      };

    case TOP_LEFT:
    default:
      return {
        top: top + target.height,
        left
      };
  }
};

/**
 * A tooltip, with arbitrary content.
 */
const AnnotationTooltip = ({ target, children, direction, annClass }) =>
  /*#__PURE__*/ React.createElement(
  "div",
  {
    style: getTooltipStyles(target, direction),
    className: `Tooltip Annotation-${annClass}-${direction}`,
    role: "tooltip"
  },
  children
);





module.exports = AnnotationTooltip;

},{}],7:[function(require,module,exports){
const React = window.React;

class Portal extends React.Component {
  constructor(props) {
    super(props);
    this.onCloseEvent = this.onCloseEvent.bind(this);
  }

  componentDidMount() {
    const { onClose, closeOnClick, closeOnType, closeOnResize } = this.props;

    if (!this.portal) {
      this.portal = document.createElement("div");
      this.portal.setAttribute("id", "portal");

      if (document.body) {
        document.body.appendChild(this.portal);
      }

      if (onClose) {
        if (closeOnClick) {
          document.addEventListener("mouseup", this.onCloseEvent);
        }

        if (closeOnType) {
          document.addEventListener("keyup", this.onCloseEvent);
        }

        if (closeOnResize) {
          window.addEventListener("resize", onClose);
        }
      }
    }

    this.componentDidUpdate();
  }

  componentDidUpdate() {
    const { children } = this.props;
    ReactDOM.render(
        /*#__PURE__*/ React.createElement("div", null, children),
      this.portal
    );
  }

  componentWillUnmount() {
    const { onClose } = this.props;

    if (document.body) {
      document.body.removeChild(this.portal);
    }

    document.removeEventListener("mouseup", this.onCloseEvent);
    document.removeEventListener("keyup", this.onCloseEvent);
    window.removeEventListener("resize", onClose);
  }
  /* :: onCloseEvent: (e: Event) => void; */

  onCloseEvent(e) {
    const { onClose } = this.props;

    if (e.target instanceof Element && !this.portal.contains(e.target)) {
      onClose();
    }
  }

  render() {
    return null;
  }
}

Portal.defaultProps = {
  children: null,
  closeOnClick: false,
  closeOnType: false,
  closeOnResize: false
};

module.exports = Portal;
},{}]},{},[1]);
