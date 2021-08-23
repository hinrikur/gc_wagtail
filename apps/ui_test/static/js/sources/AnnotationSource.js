

const Modifier = window.DraftJS.Modifier;
const EditorState = window.DraftJS.EditorState;
const DraftUtils = window.Draftail.DraftUtils;
const SelectionState = window.DraftJS.SelectionState;
const convertToRaw = window.DraftJS.convertToRaw;

const AnnotationUtils = require('../utils/annotation-utils.js');
const GreynirUtils = require('../utils/greynir-utils.js');
const callGreynirAPI = GreynirUtils.callGreynirAPI;
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
            onClose,
            entityKey
        } = this.props;

        // console.log("Entity type prop:", entityType);

        // var nextState = editorState;

        // rawState of editor extracted
        const rawState = convertToRaw(editorState.getCurrentContent());

        // boolean check for empty editor
        const editorHasContent = editorState.getCurrentContent().hasText();

        // boolean check for annotations in the text
        const editorHasAnnotations = AnnotationUtils.checkForAnnotations(rawState);
        console.log("editorHasAnnotations", editorHasAnnotations);

        // Editor is empty or already annotated
        if (!entityKey && (!editorHasContent || editorHasAnnotations)) {

            // current content state pushed to new editor state
            // const currentContent = editorState.getCurrentContent();
            // const unModifiedState = EditorState.push(editorState, currentContent, 'apply-entity');
            onComplete(editorState);

            // log to console
            console.log("...But the editor is empty or already has annotations");
            // onClose();

            // If statement catches if entityKey is set, indicating annotation has been approved
        } else if (entityKey !== undefined && entityKey !== null) {

            // extract loaded entity with entityKey
            const currentContent = editorState.getCurrentContent();
            const entityToReplace = currentContent.getEntity(entityKey);

            // check whether correct entity type
            // replaced if ANNOTATION, skipped and logged if not
            if (entityToReplace.type !== "ANNOTATION") {

                console.log(`Incorrect entity selected.\nType: ${entityToReplace.type()}\nText:`);

            } else {

                // entity content replaced with correction from API
                const correctedEntity = AnnotationUtils.replaceAnnotation(editorState, entityKey);

                // push to EditorState
                const correctedState = EditorState.push(editorState, correctedEntity, 'apply-entity');

                // render next state through onComplete DraftTail method
                onComplete(correctedState);
                // nextState = correctedState;

                // viewport scroll bug hack
                AnnotationUtils.resetAnnotationScroll();
                // onClose();
            }

        } else {

            // // No annotations present - Annotate!
            // if (editorHasAnnotations) {

            //     // Annotations already present - do nothing!
            //     let currentContent = editorState.getCurrentContent();
            //     // Create the new state as an undoable action.
            //     const nextState = EditorState.push(
            //         editorState,
            //         currentContent,
            //         "apply-entity"
            //     );
            //     // render next state through onComplete DraftTail method
            //     onComplete(nextState);


            // }

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
                        window.alert("Villa í að ná í vefþjón!");
                        console.log("Problematic API responce:", response);

                        // current content state pushed to new editor state
                        const currentContent = editorState.getCurrentContent();
                        const unModifiedState = EditorState.push(editorState, currentContent, 'apply-entity');
                        onComplete(unModifiedState);
                    }

                    // raw response logged to console
                    console.log("API response:", response);

                    // response flattened to a array of arrays of annotation data objects
                    const processedResponse = processAPI(response);

                    // container array for entities that will be rendered in the editor
                    const entitiesToRender = AnnotationUtils.createAnnotationEntities(editorState, processedResponse);

                    // entities inserted to editor content state
                    const annotatedContentState = AnnotationUtils.addEntitiesToContentState(entitiesToRender, editorState);

                    // annotated state pushed to editor
                    const nextState = EditorState.push(
                        editorState,
                        annotatedContentState,
                        "apply-entity"
                    );

                    // window.alert(`${entitiesToRender.length} ábendingar fundust!`);
                    // render next state through onComplete Drafttail method
                    onComplete(nextState);

                })
                .catch(err => {
                    window.alert("Villa í leiðréttingu!");
                    console.log('Error:', err);
                });


        }
    }


    // render doesn't return anything - not needed
    render() {
        return null;
    }
}

module.exports = AnnotationSource;