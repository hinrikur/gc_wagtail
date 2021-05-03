const React = window.React;
const ReactDOM = window.ReactDOM;

const Modifier = window.DraftJS.Modifier;
const EditorState = window.DraftJS.EditorState;
const CompositeDecorator = window.DraftJS.CompositeDecorator;
const AtomicBlockUtils = window.DraftJS.AtomicBlockUtils;
const convertToRaw = window.DraftJS.convertToRaw;

// Example POST method implementation:
async function callGreynirAPI(url = '', data = {}) {
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

        for (var key in rawContentBlocks) {
          const toCorrect = rawContentBlocks[key].text;

          callGreynirAPI("https://yfirlestur.is/correct.api", toCorrect)
          .then(response => {
            // console.log("API response:");
            // console.log('Success:', response);
            rawContentBlocks[key]["APIresponse"] = response;
            // consolresponse);
          })
          .catch(err => console.log('Error:', err));

        }

        console.log("updated rawContentBlocks:", rawContentBlocks)

        let textObject = rawState.blocks.map(object => object.text);
        let toCorrectArray = Object.values(textObject);
        const toCorrect = toCorrectArray.join('\n');
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




