// testin demo from wagtail docs

const React = window.React;
const Modifier = window.DraftJS.Modifier;
const EditorState = window.DraftJS.EditorState;

const DEMO_STOCKS = ['AMD', 'AAPL', 'TWTR', 'TSLA', 'BTC'];

// Not a real React component – just creates the entities as soon as it is rendered.
class StockSource extends React.Component {
    componentDidMount() {
        const { editorState, entityType, onComplete } = this.props;

        const content = editorState.getCurrentContent();
        const selection = editorState.getSelection();

        const randomStock = DEMO_STOCKS[Math.floor(Math.random() * DEMO_STOCKS.length)];

        // Uses the Draft.js API to create a new entity with the right data.
        const contentWithEntity = content.createEntity(entityType.type, 'IMMUTABLE', {
            stock: randomStock,
        });
        const entityKey = contentWithEntity.getLastCreatedEntityKey();

        // We also add some text for the entity to be activated on.
        const text = `$${randomStock}`;

        const newContent = Modifier.replaceText(content, selection, text, null, entityKey);
        const nextState = EditorState.push(editorState, newContent, 'insert-characters');

        onComplete(nextState);
    }

    render() {
        return null;
    }
}

const Stock = (props) => {
    const { entityKey, contentState } = props;
    const data = contentState.getEntity(entityKey).getData();

    return React.createElement('a', {
        role: 'button',
        onMouseUp: () => {
            window.open(`https://finance.yahoo.com/quote/${data.stock}`);
        },
    }, props.children);
};

window.draftail.registerPlugin({
    type: 'STOCK',
    source: StockSource,
    decorator: Stock,
});