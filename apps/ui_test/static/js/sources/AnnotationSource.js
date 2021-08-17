

const Modifier = window.DraftJS.Modifier;
const EditorState = window.DraftJS.EditorState;
const DraftUtils = window.Draftail.DraftUtils;
const SelectionState = window.DraftJS.SelectionState;
const convertToRaw = window.DraftJS.convertToRaw;

const AnnotationUtils = require('../utils/AnnotationUtils.js');
const GreynirUtils = require('../utils/GreynirUtils.js');
const callGreynirAPI = GreynirUtils.callGreynirAPI;
const replyGreynirAPI = GreynirUtils.replyGreynirAPI;
const processAPI = GreynirUtils.processAPI;

// const annScrollPosition = AnnotationUtils.annScrollPosition;
// const getReplacement = AnnotationUtils.getReplacement;
// const checkEntityClash = AnnotationUtils.checkEntityClash;
// const checkForAnnotations = AnnotationUtils.checkForAnnotations;
// const getOtherEntityRanges = AnnotationUtils.getOtherEntityRanges;
// const replaceAnnotation = AnnotationUtils.replaceAnnotation;
// const filterTextTags = AnnotationUtils.filterTextTags;
// const allFilteredDiffs = AnnotationUtils.allFilteredDiffs;
// const checkTextMarkers = AnnotationUtils.checkTextMarkers;





class AnnotationSource extends React.Component {

    componentDidMount() {

        const {
            editorState,
            entityType,
            onComplete,
            entityKey
        } = this.props;

        // If statement catches if entityKey is set, indicating annotation has been approved
        if (entityKey !== undefined && entityKey !== null) {
            // extract loaded entity with entityKey
            const currentContent = editorState.getCurrentContent();
            const entityToReplace = currentContent.getEntity(entityKey);
            // check whether correct entity type
            // replaced if ANNOTATION, skipped and logged if not
            if (entityToReplace.type === "ANNOTATION") {
                // entity content replaced with correction from API
                const correctedEntity = AnnotationUtils.replaceAnnotation(editorState, entityKey);
                // push to EditorState
                const correctedState = EditorState.push(editorState, correctedEntity, 'apply-entity');
                onComplete(correctedState);
                const [x, y] = AnnotationUtils.annScrollPosition();

                setTimeout(() => {
                    window.scrollTo(x, y);
                    console.log("scroll completed");
                }, 20);
            } else {
                console.log(`Incorrect entity selected.\nType: ${entityToReplace.type()}\nText:`);
            }

        } else {

            // Creating new annotation enties

            // (boolean) check for empty editor
            const editorHasContent = editorState.getCurrentContent().hasText();

            switch (editorHasContent) {

                // Editor contains text
                case true:

                    // rawState of editor extracted
                    const rawState = convertToRaw(editorState.getCurrentContent());
                    // checked whether there are annotations in the text
                    const editorHasAnnotations = AnnotationUtils.checkForAnnotations(rawState);

                    console.log("editorHasAnnotations", editorHasAnnotations);

                    switch (editorHasAnnotations) {
                        // remove all annotation entities from the editor
                        case true:

                            let currentContent = editorState.getCurrentContent();
                            // Create the new state as an undoable action.
                            const nextState = EditorState.push(
                                editorState,
                                currentContent,
                                "apply-entity"
                            );
                            // render next state through onComplete DraftTail method
                            onComplete(nextState);
                            break;

                        case false:
                            // Text extracted by mapping to array and joining with newline
                            let parTexts = rawState.blocks.map(object => object.text);
                            let filteredPars = parTexts.map(blockText => AnnotationUtils.filterTextTags(blockText));
                            const rawText = filteredPars.join('\n');

                            // async API call made
                            // NOTE: Editor content update (rendering annotations) now performed completely inside .then() block
                            callGreynirAPI("https://yfirlestur.is/correct.api", rawText)
                                .then(response => {
                                    if (response === null) {
                                        // this shouldn't be tripped
                                        console.log(`Empty block for key ${key}. Skipping...`);
                                    } else {
                                        // raw response logged to console
                                        console.log("API response:", response);

                                        // response flattened to a array of arrays of annotation data objects
                                        const processedResponse = processAPI(response);

                                        // container array for entities that will be rendered in the editor
                                        const entitiesToRender = AnnotationUtils.createAnnotationEntities(editorState, processedResponse);

                                        // current content saved as base new content state
                                        let currentContent = editorState.getCurrentContent();

                                        // iterate over list of entities to render and add to new content state
                                        entitiesToRender.forEach(entity => {
                                            console.log("entity from list:", entity);
                                            currentContent = Modifier.replaceText(
                                                currentContent,
                                                entity.blockSelection,
                                                entity.selectedText,
                                                entity.selectionStyle, // null, 
                                                entity.key
                                            );
                                        });

                                        // Create the new state as an undoable action.
                                        const nextState = EditorState.push(
                                            editorState,
                                            currentContent,
                                            "apply-entity"
                                        );
                                        // window.alert(`${entitiesToRender.length} ábendingar fundust!`);
                                        // render next state through onComplete DraftTail method
                                        onComplete(nextState);
                                    }
                                })
                                .catch(err => {
                                    window.alert("Villa í leiðréttingu!");
                                    console.log('Error:', err);
                                });

                            break;

                        default:
                            break;
                    }

                    break;

                // Editor is empty
                case false:

                    // current content state pushed to new editor state
                    const currentContent = editorState.getCurrentContent();
                    const unModifiedState = EditorState.push(editorState, currentContent, 'original-content');
                    onComplete(unModifiedState);
                    // log to console
                    console.log("...But the editor is empty");
                    break;

                // Other case (not meant to get here!)
                default:
                    // Other / Error
                    console.log("Annotation case not caught (ERROR)");
                    window.alert("Error: Empty editor check failed");
                    break;
            }
        }

    }
    // render doesn't return anything - not needed
    render() {
        return null;
    }
}

module.exports = AnnotationSource;