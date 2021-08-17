(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
const React = window.React;
const ReactDOM = window.ReactDOM;

const Modifier = window.DraftJS.Modifier;
const EditorState = window.DraftJS.EditorState;
const CompositeDecorator = window.DraftJS.CompositeDecorator;
const AtomicBlockUtils = window.DraftJS.AtomicBlockUtils;
const convertToRaw = window.DraftJS.convertToRaw;

// Example POST method implementation:
async function callGreynirAPI(url = '', data = {}) {
  if (data === "") {
    // text is field is empty, returns null
    return null;
  } else {
    console.log("Data being sent via request");
    console.log(JSON.stringify(data));
    // Default options are marked with *
    const response = await fetch(url, {
      method: 'POST', // *GET, POST, PUT, DELETE, etc.
      // mode: 'no-cors', // no-cors, *cors, same-origin
      // cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
      // credentials: 'omit', // include, *same-origin, omit
      scheme: "https",
      headers: {
        // 'Content-Type': 'application/json; charset=UTF-8',
        'Content-Type': 'text/plain',
        // 'Content-Type': 'application/x-www-form-urlencoded',
        // 'Access-Control-Allow-Origin': 'http://localhost:8000' //'*', 
      },
      // redirect: 'follow', // manual, *follow, error
      // referrerPolicy: 'same-origin', // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
      body: data // body data type must match "Content-Type" header
    });

    return response.json(); // parses JSON response into native JavaScript objects
  }
}

function processAPI(json) {
  // iterates over API response JSON and returns flat
  // array of annotations (annotationArray)
  var annotationArray = [];
  // iterate through outer array
  for (var i = 0; i < json.result.length; i++) {
    // iterate through paragraphs
    for (var j = 0; j < json.result[i].length; j++) {
      // iterate through sentences
      var anns = json.result[i][j]["annotations"];
      // console.log('list of annotations:', anns);
      // annotation added to return array
      var newArray = annotationArray.concat(anns);
      annotationArray = newArray;
      // console.log("annotationArray length:", annotationArray.length)
    }
  }

  return annotationArray;
}


// Not a real React component – just creates the entities as soon as it is rendered.
class CorrectSource extends React.Component {

  componentDidMount() {
    const { editorState, entityType, onComplete } = this.props;

    const editorHasContent = editorState.getCurrentContent().hasText();
    const currentContent = editorState.getCurrentContent();
    const unModifiedState = EditorState.push(editorState, currentContent, 'original-content');

    switch (editorHasContent) {
      case true:
        // Editor contains text
        const content = editorState.getCurrentContent();
        // const selectionState = editorState.getSelection();

        const apiOutput = 'dummy api';

        // Uses the Draft.js API to create a new entity with the right data.
        const contentWithEntity = content.createEntity(entityType.type, 'IMMUTABLE', {
          correction: apiOutput,
        });
        // const entityKey = contentWithEntity.getLastCreatedEntityKey();

        // We also add some text for the entity to be activated on.
        // const toCorrect = stateToHTML(editorState.getCurrentContent());

        const rawState = convertToRaw(editorState.getCurrentContent());
        // const toCorrect = editorState.getCurrentContent();

        console.log(rawState);

        const contentBlocks = currentContent.getBlockMap();

        var rawContentBlocks = rawState.blocks;

        console.log("rawContentBlocks:", rawContentBlocks)

        var paragraphs = {};

        let textObject = rawState.blocks.map(object => object.text);
        let toCorrectArray = Object.values(textObject);
        const toCorrect = toCorrectArray.join('\n');

        callGreynirAPI("https://yfirlestur.is/correct.api", toCorrect)
            .then(response => {
              if (response === null) {
                console.log(`Empty block for key ${key}. Skipping...`);
              } else {
                console.log("API response:", response);
                // console.log('Success:', response);
                const processedResp = processAPI(response);
                rawContentBlocks[key]["APIresponse"] = processedResp;
                // consolresponse);
              }

            })
            .catch(err => console.log('Error:', err));

        console.log("updated rawContentBlocks:", rawContentBlocks)

        // 
        // console.log(typeof toCorrect);

        // const annotations = []

        // toCorrect.forEach(function(paragraph, index) {
        // console.log('paragraph ' + index)
        // console.log(paragraph)

        // console.log("Texts to correct:");
        // console.log(toCorrect);

        // console.log("sending to API");
        // callGreynirAPI("https://yfirlestur.is/correct.api", toCorrect)
        //   .then(response => {
        //     // console.log("API response:");
        //     console.log('Success:', response);
        //     // consolresponse);
        //   })
        //   .catch(err => console.log('Error:', err));
        // .then(console.log("response:"))
        // .then(console.log(response))
        // .then(annotations.push(response))
        // .then(data => {annotations.push(data);




        // console.log("API response:");
        // console.log(annotations);

        const newContentState = editorState.getCurrentContent();

        // Create the new state as an undoable action.
        const nextState = EditorState.push(
          editorState,
          newContentState,
          "original-state"
        );

        // const newContent = Modifier.replaceText(content, selectionState, text, null, entityKey);
        // const nextState = EditorState.push(editorState, newContent, 'insert-characters');


        onComplete(nextState);
        break;
      case false:
        // Editor is empty
        onComplete(unModifiedState);
        console.log("Editor is empty");
        break;
      default:
        // Other / Error
        console.log("Case not caught");
        break;
    }

  }

  render() {
    return null;
  }
}

module.exports = CorrectSource;
  // CorrectionTask.prototype.submitFile = function(fd) {
  //     this.clearResult();
  //     this.updateProgress();
  //     // Send off ajax request
  //     $.ajax({
  //        url: '/correct.task',
  //        type: 'POST',
  //        data: fd,
  //        success: this.start.bind(this),
  //        error: this.handleError.bind(this),
  //        cache: false,
  //        contentType: false,
  //        processData: false
  //     });
  //  };
},{}],2:[function(require,module,exports){

const React = window.React;


const CorrectionButton = (props) => {
    const { entityKey, contentState } = props;
    const data = contentState.getEntity(entityKey).getData();
  
    return React.createElement('ann', {
      role: 'button',
      onMouseUp: () => {
        console.log("Correction called!");
      },
    }, props.children);
  };

  module.exports = CorrectionButton;
},{}],3:[function(require,module,exports){

// const React = window.React;
// const ReactDOM = window.ReactDOM;
// const useEffect = window.React.useEffect;
// const useRef = window.React.useRef;
// const useState = window.React.useState;

// const Modifier = window.DraftJS.Modifier;
// const EditorState = window.DraftJS.EditorState;
// const CompositeDecorator = window.DraftJS.CompositeDecorator;
// const AtomicBlockUtils = window.DraftJS.AtomicBlockUtils;
// const convertToRaw = window.DraftJS.convertToRaw;

// const TooltipEntity = window.draftail.TooltipEntity;

const Icon = window.Draftail.Icon;

const CorrectSource = require('./components/correct-source.js');
const CorrectionButton = require('./components/correction-button.js');
// const DebugAnnotateSource = require('./components/debug-annotate-source.js');
// const AnnotationEntity = require('./components/annotation-entity.js');
// const Portal = require('./components/portal.js');
// const AnnotationTooltip = require('./components/annotation-popover.js');

// // Button with Icon

// class ToolbarButton extends PureComponent {
//   constructor(props) {
//     super(props);
//     this.state = {
//       showTooltipOnHover: true
//     };
//     this.onMouseDown = this.onMouseDown.bind(this);
//     this.onMouseLeave = this.onMouseLeave.bind(this);
//   }
//   /* :: onMouseDown: (e: Event) => void; */

//   onMouseDown(e) {
//     const { name, onClick } = this.props;
//     e.preventDefault();
//     this.setState({
//       showTooltipOnHover: false
//     });

//     if (onClick) {
//       onClick(name || "");
//     }
//   }
//   /* :: onMouseLeave: () => void; */

//   onMouseLeave() {
//     this.setState({
//       showTooltipOnHover: true
//     });
//   }

//   render() {
//     const { name, active, label, title, icon } = this.props;
//     const { showTooltipOnHover } = this.state;
//     return /*#__PURE__*/ React.createElement(
//       "button",
//       {
//         name: name,
//         className: `Draftail-ToolbarButton${
//           active ? " Draftail-ToolbarButton--active" : ""
//         }`,
//         type: "button",
//         "aria-label": title || null,
//         "data-draftail-balloon": title && showTooltipOnHover ? true : null,
//         tabIndex: -1,
//         onMouseDown: this.onMouseDown,
//         onMouseLeave: this.onMouseLeave
//       },
//       typeof icon !== "undefined" && icon !== null
//         ? /*#__PURE__*/ React.createElement(Icon, {
//             icon: icon
//           })
//         : null,
//       label
//         ? /*#__PURE__*/ React.createElement(
//             "span",
//             {
//               className: "Draftail-ToolbarButton__label"
//             },
//             label
//           )
//         : null
//     );
//   }
// }

// STATIC CODE FOR TOOLTIP /////////////////////////////////////////////////////////////
// END /////////////////////////////////////////////////////////////////////////////////




// class DebugAnnotateSource extends React.Component {

//   componentDidMount() {


//     const { editorState, entityType, onComplete } = this.props;
//     // console.log(this.props)
//     console.log("Yes, the Annotation button was pressed.");

//     const editorHasContent = editorState.getCurrentContent().hasText();
//     const currentContent = editorState.getCurrentContent();
//     const unModifiedState = EditorState.push(editorState, currentContent, 'original-content');

//     const debugAnnInfo = JSON.parse('{ "code": "S004", "detail": null, "end": 5, "start": 5, "suggest": "óraunhæft", "text": "Orðið \'óaunhæft\' var leiðrétt í \'óraunhæft\'" }');

//     console.log(debugAnnInfo);
//     // console.log(window)



//     switch (editorHasContent) {
//       case true:
//         // Editor contains text

//         // As is the annotation entity is generated on selected text in the 

//         const selectionState = editorState.getSelection();
//         const anchorKey = selectionState.getAnchorKey();
//         const currentContent = editorState.getCurrentContent();
//         const currentContentBlock = currentContent.getBlockForKey(anchorKey);
//         const start = selectionState.getStartOffset();
//         const end = selectionState.getEndOffset();
//         const selectedText = currentContentBlock.getText().slice(start, end);

//         console.log("Text to annotate: " + selectedText);

//         // TESTING DECORATORS WITH REACT COMPONENTS

//         // Uses the Draft.js API to create a new entity with the right data.

//         const suggestedWord = debugAnnInfo.suggest;
//         const annotationText = debugAnnInfo.text;

//         // The annotation entity contains information sent from the API during annotation
//         const annEntity = currentContent.createEntity(entityType.type, 'IMMUTABLE', debugAnnInfo
//           // { 
//           //     suggestion: suggestedWord,
//           //     description: annotationText,

//           // }
//         );
//         console.log('Annotation entity:', annEntity)
//         const annotationEntityKey = annEntity.getLastCreatedEntityKey();
//         console.log("annotationEntityKey: ", annotationEntityKey)

//         // const newContentState = editorState.getCurrentContent();
//         //  const newContentState = EditorState.createWithContent(currentContent, annotationDecorator)
//         const newContentState = Modifier.replaceText(currentContent, selectionState, selectedText, null, annotationEntityKey);

//         // Create the new state as an undoable action.
//         const nextState = EditorState.push(
//           editorState,
//           newContentState,
//           "annotated-state"
//         );

//         onComplete(nextState);
//         break;
//       case false:
//         // Editor is empty
//         onComplete(unModifiedState);
//         console.log("...But the editor is empty");
//         break;
//       default:
//         // Other / Error
//         console.log("Debug annotate case not caught");
//         break;
//     }

//   }

//   render() {
//     return null;
//   }
// }



// class AnnotationEntity extends React.Component {
//     constructor(props) {
//         super(props);
//         this.state = {
//             showTooltipAt: null
//         };
//         this.openTooltip = this.openTooltip.bind(this);
//         this.closeTooltip = this.closeTooltip.bind(this);
//     }
//     /* :: openTooltip: (e: Event) => void; */

//     openTooltip(e) {
//         const trigger = e.target;

//         if (trigger instanceof Element) {
//             this.setState({
//                 showTooltipAt: trigger.getBoundingClientRect()
//             });
//         }
//     }
//     /* :: closeTooltip: () => void; */

//     closeTooltip() {
//         this.setState({
//             showTooltipAt: null
//         });
//     }

//     render() {
//         const {
//             editorState,
//             entityKey,
//             contentState,
//             children,
//             onEdit,
//             onRemove,
//             icon,
//             label,
//             data
//         } = this.props;

//         // const currentContentState = editorState.getCurrentContent();

//         // console.log("Editor State from within entity:", currentContentState)

//         const { showTooltipAt } = this.state;
//         // const { url } = contentState.getEntity(entityKey).getData(); // Contrary to what JSX A11Y says, this should be a button but it shouldn't be focusable.
//         // const errCode = data.code;
//         // const errSuggestion = data.suggest;
//         // const errMessage = data.text;

//         //   const newContentState = Modifier.replaceText(currentContent, selectionState, selectedText, null, annotationEntityKey);
//         // onReplace = () => {
//         //     console.log(`replacing word with "${this.props.data.suggest}"`);
//         //   }

//         return /*#__PURE__*/ React.createElement(
//             "ann",
//             {
//                 role: "button",
//                 onMouseUp: this.openTooltip,
//                 className: "ann"
//             },
//           // /*#__PURE__*/ React.createElement(Icon, {
//           //   icon: icon,
//           //   className: "TooltipEntity__icon"
//           // }),
//           /*#__PURE__*/ React.createElement(
//                 "span",
//                 {
//                     className: "TooltipEntity__text"
//                 },
//                 children
//             ),
//             showTooltipAt &&
//             /*#__PURE__*/ React.createElement(
//                 Portal,
//                 {
//                     onClose: this.closeTooltip,
//                     closeOnClick: true,
//                     closeOnType: true,
//                     closeOnResize: true
//                 },
//               /*#__PURE__*/ React.createElement(
//                     AnnotationTooltip,
//                     {
//                         target: showTooltipAt,
//                         direction: "top"
//                     },
//                     //     /*#__PURE__*/ React.createElement(
//                     //   "a",
//                     //   {
//                     //     href: url,
//                     //     title: url,
//                     //     target: "_blank",
//                     //     rel: "noopener noreferrer",
//                     //     className: "Tooltip__link"
//                     //   },
//                     //   this.props.data.code
//                     // ),
//                     React.createElement(
//                         "div",
//                         {

//                         },
//                         //   React.createElement(
//                         //       "h2",
//                         //       {
//                         //           className: "AnnotationClassLabel",
//                         //       },
//                         //       this.props.data.code
//                         // "Hello World!"
//                         //   ),
//                         React.createElement(
//                             "h3",
//                             {
//                                 className: "AnnotationMessage"
//                             },
//                             this.props.data.text
//                         )
//                     ),

//                 /*#__PURE__*/ React.createElement(
//                         "button",
//                         {
//                             type: "button",
//                             className: "Annotation__button_yes",
//                             //   onClick: onEdit.bind(null, entityKey)
//                             onClick: onRemove.bind(null, entityKey),
//                             icon: "check"
//                         },
//                         "Samþykkja"
//                     ),
//                 /*#__PURE__*/ React.createElement(
//                         "button",
//                         {
//                             type: "button",
//                             className: "Annotation__button_no",
//                             onClick: onRemove.bind(null, entityKey)
//                         },
//                         "Hafna"
//                     )
//                 )
//             )
//         );
//     }
// }

// const DebugAnnotation = (props) => {
  
//   const { entityKey, contentState,
//     onEdit,
//     onRemove } = props;
  
  
//   console.log("enityKey: ", entityKey)
//   console.log("contentstate: ", contentState)

//   const editor = document.querySelector('[data-draftail-input]');
//   console.log("selected as 'editor':", editor);

//   const data = contentState.getEntity(entityKey).getData();
//   console.log("DATA FROM DEBUG ANNOTATION:", data);

//   console.log("ContentState from Annotation Entity:", contentState.getEntity(entityKey));

//   // const currentContent = editorState.getCurrentContent();
//   // const entity = contentState.getEntity(entityKey)
//   // console.log("window props (if any):", window.props);

//   return React.createElement(AnnotationEntity, {
//     // role: 'annotation',
//     // style: styles.annotation,
//     class: 'ann',
//     entityKey: entityKey,
//     contentState: contentState,
//     onEdit: onEdit,
//     onRemove: onRemove,
//     icon: null,
//     label: null,
//     data: data,
//     onMouseUp: () => {

//       console.log('Annotation clicked');

//       // this._onButtonClick

//     },

//     onMouseEnter: () => {
//       console.log('hovering on annotation');
//       // console.log()
//       // e => showButton(e);
//       // this.style.background = "green"
//       // this.style.border = "solid"
//       // console.log(this.getElementById("myDiv"));

//     },
//     onMouseLeave: () => {
//       console.log('not hovering any more');
//       // e => hideButton(e);
//       // this.childNodes[1].childNodes[1].style.background='red';
//       // this.style.background = "orange"
//       // this.style.border = "none"
//     },
//     // onClick: () => {
//     //   const newContentState = Modifier.replaceText(currentContent, currentContent.getEntity(entityKey), data.suggestion, null, annotationEntityKey);
//     // }

//     // onMouseUp: () => {
//     //     console.log("Debug annotation button pressed...");

//     //     const newContentState = Modifier.replaceText(currentContent, contentState, data.suggestion, null, entityKey);

//     //     // Create the new state as an undoable action.
//     //     const nextState = EditorState.push(
//     //         editorState,
//     //         newContentState,
//     //         "corrected-state"
//     //     );
//     //     onComplete(nextState)
//     // },
//   },

//     // React.createElement('ann', {
//     //   id: 'ann',

//     // }),
//     // React.createElement('e', {
//     //     class: 'button',
//     //     role: 'button',
//     //     onClick: () => {
//     //         console.log('button pressed')
//     //     }
//     // }),
//     props.children);
// };

// // Register annotation popover UI
// // Separate plugin for debugging

// window.draftail.registerPlugin({
//   type: 'DANNOTATE',
//   source: DebugAnnotateSource,
//   decorator: DebugAnnotation,
// });


// Register correction API call
// Separate plugin for debugging

window.draftail.registerPlugin({
  type: 'CORRECTION',
  source: CorrectSource,
  decorator: CorrectionButton,
});




},{"./components/correct-source.js":1,"./components/correction-button.js":2}]},{},[3]);
