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
        // NOTE: this was tripped when content blocks were annoatated one by one,
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

            // (boolean) check for empty editor
            const editorHasContent = editorState.getCurrentContent().hasText();

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
                                // each paragraph annotation matched with a content block
                                for (var key in rawContentBlocks) {
                                    // content block skipped if no text present 
                                    // (to match with API reply)
                                    const blockText = rawContentBlocks[key].text;
                                    if (blockText.match(/^\s*$/)) { continue; }

                                    // console.log(key);
                                    // console.log(processedResponse[i]);
                                    // console.log(rawContentBlocks[key]);
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
                    break;
            }
        }

    }
    // render doesn't return anything - not needed
    render() {
        return null;
    }
}



const Annotation = (props) => {

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
    type: 'ANNOTATION',
    source: AnnotationSource,
    decorator: Annotation,
});