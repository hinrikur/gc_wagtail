// testin demo from wagtail docs

const React = window.React;
const Modifier = window.DraftJS.Modifier;
const EditorState = window.DraftJS.EditorState;
const DraftUtils = window.Draftail.DraftUtils;
const SelectionState = window.DraftJS.SelectionState;

class RemoveAnnotationSource extends React.Component {
    componentDidMount() {
        const { editorState,
            onComplete
        } = this.props;

        var contentState = editorState.getCurrentContent();

        console.log("Block map before entity removal/rendering:", contentState.getBlockMap());
        const rangesToRemove = [];
        contentState.getBlockMap().forEach(contentBlock => {
            contentBlock.findEntityRanges(character => {
                // FILTER
                if (character.getEntity() !== null) {
                    const entityKey = character.getEntity();
                    const entity = contentState.getEntity(entityKey);
                    if (entity !== null && contentState.getEntity(entityKey).getType() === 'ANNOTATION') {
                        // console.log("FOUND ANNOTATION ENTITY IN TEXT");

                        return true;
                    }
                }
                return false;
            },
                // CALLBACK
                (start, end) => {   
                    const blockKey = contentBlock.getKey();
                    rangesToRemove.push([start, end, blockKey]);
                }
            );
            
        });

        // current content saved as base new content state
        // removes already annotated ranges (if annotation called on already annotated text!)
        let currentContent = editorState.getCurrentContent();

        rangesToRemove.forEach(range => {
            const start = range[0];
            const end = range [1];
            const blockKey = range[2];
            const blockSelection = SelectionState
                .createEmpty(blockKey)
                .merge({
                    anchorOffset: start,
                    focusOffset: end,
                });
            currentContent = Modifier.applyEntity(
                currentContent,
                blockSelection,
                null
                );
        });

        console.log(`Removed ${rangesToRemove.length} annotations.`);

        // Create the new state as an undoable action.
        const nextState = EditorState.push(
            editorState,
            currentContent,
            "apply-entity"
        );
        // render next state through onComplete DraftTail method
        onComplete(nextState);
    }
    render() {
        return null;
    }
}

const RMVANN = (props) => {
    
};

window.draftail.registerPlugin({
    type: 'RMVANN',
    source: RemoveAnnotationSource,
    decorator: RMVANN,
});