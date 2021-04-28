// testing demo from wagtail docs


const React = window.React;
const Modifier = window.DraftJS.Modifier;
const EditorState = window.DraftJS.EditorState;
const convertToRaw = window.DraftJS.convertToRaw;

// const DEMO_STOCKS = ['AMD', 'AAPL', 'TWTR', 'TSLA', 'BTC'];

// Not a real React component – just creates the entities as soon as it is rendered.
class CorrectSource extends React.Component {


    componentDidMount() {
        const { editorState, entityType, onComplete } = this.props;

        const content = editorState.getCurrentContent();
        const selection = editorState.getSelection();

        // const randomStock = DEMO_STOCKS[Math.floor(Math.random() * DEMO_STOCKS.length)];

        const apiOutput = 'dummy api'

        // Uses the Draft.js API to create a new entity with the right data.
        const contentWithEntity = content.createEntity(entityType.type, 'IMMUTABLE', {
            correction: apiOutput,
        });
        // const entityKey = contentWithEntity.getLastCreatedEntityKey();

        // We also add some text for the entity to be activated on.
        // const toCorrect = stateToHTML(editorState.getCurrentContent());
        const toCorrect = editorState.getCurrentContent();
        // const str = toCorrect.prop('outerHTML');

        console.log(stateToHTML(toCorrect));


        // const newContent = Modifier.replaceText(content, selection, text, null, entityKey);
        // const nextState = EditorState.push(editorState, newContent, 'insert-characters');

        onComplete(EditorState.setState(editorState.getCurrentContent()));
    }

    render() {
        return null;
    }
}

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

const CorrectionButton = (props) => {
    const { entityKey, contentState } = props;
    const data = contentState.getEntity(entityKey).getData();

    return React.createElement('a', {
        role: 'button',
        onMouseUp: () => {
            window.alert(`Correction called!`);
        },
    }, props.children);
};

window.draftail.registerPlugin({
    type: 'CORRECTION',
    source: CorrectSource,
    decorator: CorrectionButton,
});