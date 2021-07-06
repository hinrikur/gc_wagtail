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

async function replyGreynirAPI(url = "", data = {}, feedback = "", reason = "") {
    // filter relevant annotation info from data
    // send annotation feedback to Yfirlestur.is API
    function filterData(data) {
        const filtered = {
            sentence: data.sent,
            code: data.code,
            annotation: data.text,
            start: data.start,
            end: data.end,
            correction: data.suggest,
            feedback: feedback,
            reason: reason
        };
        return filtered;
    }
    if (data === "") {
        return;
    } else {
        data = filterData(data)
        console.log("Data to send to API:", data);

        // post here
    }
}

// iterates over API response JSON and returns flat
// array of annotations (annotationArray)
function processAPI(json) {

    // collect tokens into single string and add to annotations
    function insertSentenceText(sentence, annotations) {
        var sentString = '';
        sentence.tokens.forEach(token => {
            sentString += token.o;
        });
        annotations.forEach(ann => {
            ann.sent = sentString;
        });
        return annotations;
    }

    // empty return array defined
    var annotationArray = [];
    // iterate through outer array
    for (var i = 0; i < json.result.length; i++) {
        // iterate through paragraphs
        var paragraphArray = [];
        // console.log("Paragraph before par adjust", json.result[i]);
        json.result[i] = adjustChars(json.result[i]);
        // console.log("Paragraph after par adjust", json.result[i]);
        for (var j = 0; j < json.result[i].length; j++) {
            // iterate through sentences
            // adjust likely errors in char locations from API
            // var adjustedJson = adjustChars(json.result[i][j]);

            // var anns = json.result[i][j].annotations;
            // Sentence text added to annotation data
            var anns = insertSentenceText(json.result[i][j], json.result[i][j].annotations);            
            // annotation added to return array
            var newArray = paragraphArray.concat(anns);
            paragraphArray = newArray;
        }
        annotationArray.push(paragraphArray);
    }

    return annotationArray;
}

// normalize each paragraph's token lists (per sent) to start at char index 0
function adjustChars(paragraph) {

    function range(start, end) {
        var ans = [];
        for (let i = start; i <= end; i++) {
            ans.push(i);
        }
        return ans;
    }

    START_INDEX = paragraph[0].tokens[0].i;
    console.log("Sentence start index:", START_INDEX)
    
        paragraph.forEach((sentence, sentIndex) => {
            sentence.tokens.forEach((token, tokenIndex) => {
                // console.log("Token and index:", token.o, token.i);
                if (START_INDEX !== 0) {
                paragraph[sentIndex].tokens[tokenIndex].i -= START_INDEX;
                }
                // console.log("Token after adjust:", token.o, token.i);
            });
            sentence.annotations.forEach((annotation, annIndex) => {
                
                const firstTokenIndex = annotation.start; 
                const lastTokenIndex = annotation.end;
                var relevantTokens = range(firstTokenIndex, lastTokenIndex);
                
                // console.log("Relevant tokens:", relevantTokens)
                
                var annLength = 0;
                relevantTokens.forEach(index => {
                    // console.log("selected token from range:", sentence.tokens[index]);
                    annLength += sentence.tokens[index].o.length;
                });
                // console.log("processed ann length:", annLength);
                
                
                // console.log("New start Char:", annotation.start_char);
                paragraph[sentIndex].annotations[annIndex].start_char = sentence.tokens[firstTokenIndex].i;
                // console.log("Start char after change:", annotation.start_char)
                paragraph[sentIndex].annotations[annIndex].end_char = annotation.start_char + annLength;
                
                // if (paragraph[sentIndex].tokens[lastTokenIndex].o.match(/^ /) || lastTokenIndex === 0) {
                //     paragraph[sentIndex].annotations[annIndex].end_char += 1;
                // }
                // only tokens starting with whitespace need to increment start by one
                if (paragraph[sentIndex].tokens[firstTokenIndex].o.match(/^ /)) {
                    paragraph[sentIndex].annotations[annIndex].start_char += 1;
                }
            });
        });
    
    return paragraph;
}


// helper for adjusting wrong character spans in API response
// not used currently
// more low level fix likely needed (In GreynirCorrect or Yfirlestur API)
function XadjustChars(sentAnnotation) {

    // function range(start, end) {
    //     var ans = [];
    //     for (let i = start; i <= end; i++) {
    //         ans.push(i);
    //     }
    //     return ans;
    // }

    // counter for aggregated changes
    var aggrChar = 1;
    for (var i = 0; i < sentAnnotation.annotations.length; i++) {
        // console.log('fsdfsdjkafl;sdjfklasd;jfklsed')
        // console.log(sentAnnotation.annotations[i])
        const firstToken = sentAnnotation.annotations[i].start;
        const lastToken = sentAnnotation.annotations[i].end;
        // var relevantTokens = range(firstToken, lastToken);

        // all annotations ends need to increment by one
        // sentAnnotation.annotations[i].end_char += 1;
        if (sentAnnotation.tokens[lastToken].o.match(/^ /) || lastToken === 0) {
            sentAnnotation.annotations[i].end_char += 1;
        }
        // only tokens starting with whitespace need to increment start by one
        if (sentAnnotation.tokens[firstToken].o.match(/^ /)) {
            sentAnnotation.annotations[i].start_char += 1;
        }

        // for (var index in relevantTokens) {

        //     if (sentAnnotation.tokens[index].charAt(0) == ' '){
        //         ann.start_char += 1;
        //     } 
        // }
        // console.log("current token:", '"'+sentAnnotation.tokens[lastToken].o+'"')
        // console.log(sentAnnotation.tokens[lastToken].o.charAt(0));
        // if (sentAnnotation.tokens[lastToken].o.charAt(0).trim() === '') {
        //     console.log("Editing token offset:", sentAnnotation.tokens[lastToken].o);
        //     aggrChar += 1;
        //     offsetChange = aggrChar;
        //     console.log("Offset change:", offsetChange);
        //     if (sentAnnotation.annotations[i].start_char !== 0) {
        //         sentAnnotation.annotations[i].start_char += offsetChange;
        //     }
        //     sentAnnotation.annotations[i].end_char += offsetChange;

        // }

    }
    return sentAnnotation;
}

function getReplacement(data, annotatedText) {
    // finds valid replacement text in annotation data
    var replacement;
    if (data.suggest === "") {
        // in case of empty .suggest field in data,
        // example from .text field extracted with regex
        var realSuggest = data.text.match(/'[^']*'/)[0];
        realSuggest = realSuggest.substring(1, realSuggest.length - 1);
        replacement = realSuggest;
    } else if (data.suggest === null) {
        replacement = annotatedText;
    } else {
        // otherwise returns .suggest value
        replacement = data.suggest;
    }
    return replacement;
}

function clearAnnotatedRanges(editorState) {

    // NOT IMPLEMENTED ATM
    // either runs without removing entities or crashes due to low-level error
    // 
    // Renoves already rendered annotations in editor content state
    // should be applied on the editor state after the API call but before rendering new entites from call

    var contentState = editorState.getCurrentContent();
    console.log("Block map before entity removal/rendering:", contentState.getBlockMap());
    const entitiesToRemove = [];
    contentState.getBlockMap().forEach(contentBlock => {
        // const blockKey = block.getKey();
        // const blockText = block.getText();
        contentBlock.findEntityRanges(character => {
            if (character.getEntity() !== null) {
                const entityKey = character.getEntity();
                const entity = contentState.getEntity(entityKey);
                if (entity !== null && contentState.getEntity(entityKey).getType() === 'ANNOTATION') {
                    const anchorKey = contentBlock.key;
                    const currentEntity = contentState.getEntity(character.getEntity());
                    const start = currentEntity.start;
                    const end = currentEntity.end;
                    const selectedText = contentBlock.getText().slice(start, end);
                    const originalStyle = contentBlock.getInlineStyleAt(start);
                    // const blockSelection = SelectionState
                    //     .createEmpty(anchorKey)
                    //     .merge({
                    //         anchorOffset: start,
                    //         focusOffset: end,
                    //     });
                    const blockSelection = DraftUtils.getEntitySelection(editorState, entityKey);

                    selectedEntity = {
                        "key": currentEntity,
                        "blockSelection": blockSelection,
                        "selectedText": selectedText,
                        "selectionStyle": originalStyle,
                    };
                    return true;
                }
            }
            return false;
        },
            (start, end) => {
                entitiesToRemove.push({ ...selectedEntity, start, end });
            }
        );

    });

    entitiesToRemove.forEach(entity => {
        contentState = Modifier.replaceText(
            contentState,
            entity.blockSelection,
            entity.selectedText,
            entity.selectionStyle, // null, 
            entity.key
        );

    });



    return contentState;
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
                                            // // each annotation start and end char index reduced by aggregated char length (aggrLen)
                                            // // API looks at location in total text, DrafTail looks at location in current block
                                            // const start = annotation.start_char - aggrLen;
                                            // const end = annotation.end_char - aggrLen;
                                            // NOTE: aggrLen fix moved to ProcessAPI method
                                            const start = annotation.start_char;
                                            const end = annotation.end_char;
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
                                                {annotation, replyGreynirAPI} // data from API
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
                                        console.log("Current block text content:", rawContentBlocks[blockKey].text);
                                        console.log("Current block text length:", rawContentBlocks[blockKey].text.length);
                                        // length of current block text added to aggregated text length variable
                                        // + 2 to compensate "\n" in API input string between paragraphs
                                        aggrLen += rawContentBlocks[blockKey].text.replace(/ +$/, "").length;

                                    } else {
                                        // API response was empty or undefined, usually because of an empty text block
                                        // TODO: keep empty blocks in order with annotated blocks
                                        console.log("Undefined response, likely empty Block. BlockKey:", blockKey);
                                    }


                                }





                                // current content saved as base new content state
                                // removes already annotated ranges (if annotation called on already annotated text!)
                                let currentContent = editorState.getCurrentContent();

                                // let currentContent = clearAnnotatedRanges(editorState);

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
                                // render next state through onComplete DraftTail method
                                onComplete(nextState);
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