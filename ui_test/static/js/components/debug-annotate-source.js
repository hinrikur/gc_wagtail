
const React = window.React;

const Modifier = window.DraftJS.Modifier;
const EditorState = window.DraftJS.EditorState;


class DebugAnnotateSource extends React.Component {

    componentDidMount() {
  
  
      const { editorState, entityType, onComplete } = this.props;
      // console.log(this.props)
      console.log("Yes, the Annotation button was pressed.");
  
      const editorHasContent = editorState.getCurrentContent().hasText();
      const currentContent = editorState.getCurrentContent();
      const unModifiedState = EditorState.push(editorState, currentContent, 'original-content');
  
      const debugAnnInfo = JSON.parse('{ "code": "S004", "detail": null, "end": 5, "start": 5, "suggest": "óraunhæft", "text": "Orðið \'óaunhæft\' var leiðrétt í \'óraunhæft\'" }');
  
      console.log(debugAnnInfo);
      // console.log(window)
  
  
  
      switch (editorHasContent) {
        case true:
          // Editor contains text
  
          // As is the annotation entity is generated on selected text in the 
  
          const selectionState = editorState.getSelection();
          const anchorKey = selectionState.getAnchorKey();
          const currentContent = editorState.getCurrentContent();
          const currentContentBlock = currentContent.getBlockForKey(anchorKey);
          const start = selectionState.getStartOffset();
          const end = selectionState.getEndOffset();
          const selectedText = currentContentBlock.getText().slice(start, end);
  
          console.log("Text to annotate: " + selectedText);
  
          // TESTING DECORATORS WITH REACT COMPONENTS
  
          // Uses the Draft.js API to create a new entity with the right data.
  
          const suggestedWord = debugAnnInfo.suggest;
          const annotationText = debugAnnInfo.text;
  
          // The annotation entity contains information sent from the API during annotation
          const annEntity = currentContent.createEntity(entityType.type, 'IMMUTABLE', debugAnnInfo
            // { 
            //     suggestion: suggestedWord,
            //     description: annotationText,
  
            // }
          );
          const annotationEntityKey = annEntity.getLastCreatedEntityKey();
  
          // const newContentState = editorState.getCurrentContent();
          //  const newContentState = EditorState.createWithContent(currentContent, annotationDecorator)
          const newContentState = Modifier.replaceText(currentContent, selectionState, selectedText, null, annotationEntityKey);
  
          // Create the new state as an undoable action.
          const nextState = EditorState.push(
            editorState,
            newContentState,
            "annotated-state"
          );
  
          onComplete(nextState);
          break;
        case false:
          // Editor is empty
          onComplete(unModifiedState);
          console.log("...But the editor is empty");
          break;
        default:
          // Other / Error
          console.log("Debug annotate case not caught");
          break;
      }
  
    }
  
    render() {
      return null;
    }
  }

module.exports = DebugAnnotateSource;