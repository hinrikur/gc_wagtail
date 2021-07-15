const React = window.React;

const Modifier = window.DraftJS.Modifier;
const EditorState = window.DraftJS.EditorState;
const DraftUtils = window.Draftail.DraftUtils;
const SelectionState = window.DraftJS.SelectionState;
const convertToRaw = window.DraftJS.convertToRaw;


const AnnotationEntity = require('./components/annotation-entity.js');

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
        var correction;
        // correction = data.suggest;
        if (data.suggest == "") {
            correction = "empty";
        } else if (data.suggest == null) {
            correction = "null";
        } else {
            correction = data.suggest;
        }
        const filtered = {
            sentence: data.sent,
            code: data.code,
            annotation: data.text,
            start: data.start,
            end: data.end,
            correction: correction,
            feedback: feedback,
            reason: reason,
            token: data.token,
            nonce: data.nonce
        };
        return filtered;
    }
    if (data === "") {
        return;
    } else {
        data = filterData(data);
        console.log("Data to send to API:", data);

        url = 'https://yfirlestur.is/feedback.api';

        await fetch(url, {
            method: 'POST',
            scheme: 'https',
            body: JSON.stringify(data),
            headers: {
                'Content-type': 'application/json',
                'Access-Control-Allow-Origin': 'https://yfirlestur.is/feedback.api'
            }
        }).then(function (response) {
            if (response.ok) {
                // console.log(response.json())
                return response.json();
            }
            return Promise.reject(response);
        }).then(function (data) {
            console.log(data);
        }).catch(function (error) {
            console.warn('Something went wrong with API feedback.', error);
        });
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

    // discards additional annotations if parse error in sentence
    // done so annotations don't render on top of each other
    // NOTE: fairly nuclear approach 
    function filterParseErrors(annotations) {
        for (var i = 0; i < annotations.length; i++) {
            if (annotations[i].code.includes("E001")) {
                return [annotations[i]];
            }
        }
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
            const currentSentence = json.result[i][j];
            var anns = filterParseErrors(json.result[i][j].annotations);
            anns.forEach(ann => {
                ann.sent = currentSentence.original;
                ann.token = currentSentence.token;
                ann.nonce = currentSentence.nonce;
            });
            // Sentence text added to annotation data
            // var anns = insertSentenceText(json.result[i][j], json.result[i][j].annotations);            
            // annotation added to return array
            // var newArray = ;
            paragraphArray = paragraphArray.concat(anns);
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
    console.log("Sentence start index:", START_INDEX);

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
            const relevantTokens = range(firstTokenIndex, lastTokenIndex);

            // console.log("Relevant tokens:", relevantTokens)

            var annLength = 0;
            relevantTokens.forEach(index => {
                // console.log("selected token from range:", sentence.tokens[index]);

                // hacky approach to prevent inserted tokens from joining original annotation span length
                // ex. "ennþá" -> "enn þá" annotates as if original span is "ennþáþá" 
                if (typeof sentence.tokens[index + 1] === 'undefined') {
                    annLength += sentence.tokens[index].o.length;
                } else if (sentence.tokens[index].i !== sentence.tokens[index + 1].i) {
                    // const nextTokenStart = sentence.tokens[index+1].i;
                    annLength += sentence.tokens[index].o.length;
                }

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

function annScrollPosition() {
    let x = window.pageXOffset;
    let y = window.pageYOffset;
    return [x, y];
}

function getAnnotationClass(code, replacement, annotatedText) {
    // Converts error's code from API to one of three classes
    // Relevant for rendering of annotation 

    var cls; // return variable

    const classMap = {
        "C": "grammar-error", // Compound error
        "N": "grammar-suggestion", // Punctuation error - N  
        "P": "grammar-suggestion", // Phrase error - P
        "W": "grammar-suggestion", // Spelling suggestion - W (not used in GreynirCorrect atm)
        "Z": "spelling", // Capitalization error - Z
        "A": "spelling", // Abbreviation - A
        "S": "spelling", // Spelling error - S
        "U": "unknown-word", // Unknown word - U (nothing can be done)
        "T": "wording", // Taboo warning
        "E": "parse-error" // Error in parsing step
    };

    // classes with non-conventional UI
    const specialClasses = ["unknown-word", "wording", "parse-error"];
    const normalClasses = ["spelling", "grammar-error", "grammar-suggestion"];

    var codeChar = code.charAt(0);
    cls = classMap[codeChar];
    if (annotatedText === replacement && normalClasses.includes(cls)) {
        cls = "wording-plus";
    }
    return cls;
}

function getReplacement(annotation, annotatedText) {
    // finds valid replacement text in annotation data
    var replacement;
    if (annotation.suggest === "") {
        // in case of empty .suggest field in data,
        // example from .text field extracted with regex
        var realSuggest = annotation.text.match(/'[^']*'/)[0];
        realSuggest = realSuggest.substring(1, realSuggest.length - 1);
        replacement = realSuggest;
    } else if (annotation.suggest === null) {
        replacement = annotatedText;
    } else {
        // otherwise returns .suggest value
        replacement = annotation.suggest;
    }
    return replacement;
}

function checkEntityClash(annStart, annEnd, entities) {
    var clash = false;
    if (entities.length !== 0) {
        entities.forEach(location => {
            const entityStart = location[0];
            const entityEnd = location[1];
            if (annStart <= entityEnd && entityStart <= annEnd) {
                clash = true;
            }
        });
    }
    return clash;
}

// return true if there is at least one annotation entity in editor
function checkForAnnotations(rawState) {
    var result = false;
    // console.log("rawState", rawState);
    const entities = rawState.entityMap;
    // console.log("entityMap", entities);


    for (const key in entities) {
        // console.log(`IN THE LOOP ${key}`);
        const entity = entities[key];
        // console.log("entity:", entity);
        // console.log("entity type:", entity.type);
        if (entity.type === "ANNOTATION") {
            // console.log("ANNOTATION found");
            result = true;
        }
    }
    return result;
}

function getOtherEntityRanges(editorState) {
    var contentState = editorState.getCurrentContent();

    // console.log("Block map before entity removal/rendering:", contentState.getBlockMap());
    const entityRanges = {};
    contentState.getBlockMap().forEach(contentBlock => {
        // if (!(rangesToRemove.hasOwnProperty(blockKey))){
        const blockKey = contentBlock.getKey();
        entityRanges[blockKey] = [];
        // }            
        contentBlock.findEntityRanges(character => {
            // FILTER
            if (character.getEntity() !== null) {
                const entityKey = character.getEntity();
                const entity = contentState.getEntity(entityKey);
                if (entity !== null && contentState.getEntity(entityKey).getType() !== 'ANNOTATION') {
                    // console.log("FOUND ANNOTATION ENTITY IN TEXT");
                    return true;
                }
            }
            return false;
        },
            // CALLBACK
            (start, end) => {
                // const blockKey = contentBlock.getKey();
                entityRanges[blockKey].push([start, end]);
                // console.log("ent ranges", entityRanges);
            }
        );

    });

    return entityRanges;
}

function getAnnotatedRanges(editorState) {

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
                const entitykey = contentBlock.getEntityAt(start);
                rangesToRemove.push([start, end, blockKey, entitykey]);
            }
        );

    });

    return rangesToRemove;
}

function createAnnotationEntities(editorState, response) {

    const rawState = convertToRaw(editorState.getCurrentContent());
    var rawContentBlocks = rawState.blocks;

    var entitiesToRender = [];

    const otherEntityRanges = getOtherEntityRanges(editorState);

    console.log("otherEntityRanges:", otherEntityRanges);

    // processed response logged to console
    console.log("Array of annotations:", response);
    // response flattened to a array of annotation data objects
    // each paragraph annotation matched with a content block
    var i = 0;
    for (var key in rawContentBlocks) {
        // content block skipped if no text present 
        // (to match with API reply)
        const blockText = rawContentBlocks[key].text;
        if (blockText.match(/^\s*$/)) { continue; }

        // console.log(key);
        // console.log(processedResponse[i]);
        // console.log(rawContentBlocks[key]);
        rawContentBlocks[key]["APIresponse"] = response[i];
        i++;
    }

    console.log("rawContentBlocks after addition:", rawContentBlocks);

    // iterate over block keys in raw content blocks
    for (var blockKey in rawContentBlocks) {
        // log current content block key
        console.log(rawContentBlocks[blockKey]);
        // check for empty API response
        if (typeof rawContentBlocks[blockKey].APIresponse !== "undefined") {
            // API response not empty

            // checking for whitespace at start of block, per block
            // editor content out of scope of adjustChars method,
            const whiteSpaceLen = (function () {
                // whitespace in front of list items should be ignored
                const ignoreTypes = [
                    "ordered-list-item",
                    "unordered-list-item"
                ];
                const blockText = rawContentBlocks[blockKey].text;
                const blockType = rawContentBlocks[blockKey].type;
                const whiteSpace = blockText.match(/^ +/);
                let len = 0;
                if (whiteSpace === null) {
                    return len;
                } else if (ignoreTypes.includes(blockType)) {
                    return len;
                } else {
                    len = whiteSpace[0].length;
                    return len;
                }
            })();

            console.log(`Start whitespace length for key ${blockKey}:`, whiteSpaceLen);

            // each content block assigned its relevant text annotations
            rawContentBlocks[blockKey].APIresponse.forEach(annotation => {

                const anchorKey = rawContentBlocks[blockKey].key;
                let currentContent = editorState.getCurrentContent();
                // 
                console.log("currentContent:", currentContent);
                // console.log("blockMap:", currentContent.getBlockMap());
                // 
                const currentContentBlock = currentContent.getBlockForKey(anchorKey);
                console.log("anchorKey:", anchorKey);
                console.log("currentContentBock, via anchorKey:", currentContentBlock);

                // // each annotation start and end char index reduced by aggregated char length (aggrLen)
                // // API looks at location in total text, DrafTail looks at location in current block
                // const start = annotation.start_char - aggrLen;
                // const end = annotation.end_char - aggrLen;
                // NOTE: aggrLen fix moved to ProcessAPI method

                // length of par-start whitespace added to char indexes (0 +)
                const start = annotation.start_char + whiteSpaceLen;
                const end = annotation.end_char + whiteSpaceLen;
                // text for annotation selected from content block text, with inline style
                const selectedText = currentContentBlock.getText().slice(start, end);
                const selectionStyle = currentContentBlock.getInlineStyleAt(start);

                // additional annotation data to add to entity
                const textReplacement = getReplacement(annotation, selectedText);
                const annClass = getAnnotationClass(annotation.code, textReplacement, selectedText);

                // selectionState for annotation render
                const blockSelection = SelectionState
                    .createEmpty(anchorKey)
                    .merge({
                        anchorOffset: start,
                        focusOffset: end,
                    });


                console.log("Text to annotate: " + selectedText);
                console.log("Start offset:", start);
                console.log("End offset:", end);

                // Check for entity clash in entity range
                const entitiesInBLock = otherEntityRanges[anchorKey];
                const entityClash = checkEntityClash(start, end, entitiesInBLock);

                if (entityClash) {
                    console.log(`Entity clash: Skipping annotation for "${selectedText}", block anchor key: ${anchorKey}`);
                } else {
                    // create annotation entity
                    // the annotation entity contains information sent from the API during annotation
                    const annEntity = currentContent.createEntity(
                        'ANNOTATION',
                        'MUTABLE', // Drafttail entity mutability
                        {
                            textReplacement, // processed replacement text
                            annClass,        // processed annotation error class
                            annotation,      // data from API 
                            replyGreynirAPI  // method for sending feedback
                        }
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
                }




            });
            console.log("Current block text content:", rawContentBlocks[blockKey].text);
            console.log("Current block text length:", rawContentBlocks[blockKey].text.length);
            // length of current block text added to aggregated text length variable
            // + 2 to compensate "\n" in API input string between paragraphs
            // aggrLen += rawContentBlocks[blockKey].text.replace(/ +$/, "").length;

        } else {
            // API response was empty or undefined, usually because of an empty text block
            console.log("Undefined response, likely empty Block. BlockKey:", blockKey);
        }
    }
    return entitiesToRender;
}

function replaceAnnotation(editorState, entityKey) {

    // get entity selection to replace (via Draftail utils)
    const entityToReplace = DraftUtils.getEntitySelection(editorState, entityKey);
    // get editor content (via DraftJS API)
    const currentContent = editorState.getCurrentContent();
    // get entity inline style
    const currentBlock = currentContent.getBlockMap().get(entityToReplace.getStartKey());
    const start = entityToReplace.getAnchorOffset();
    const end = entityToReplace.getFocusOffset();
    const originalStyle = currentBlock.getInlineStyleAt(start);
    // get entity data
    const data = currentContent.getEntity(entityKey).getData();
    // get annotated text from entity
    const annotatedText = currentBlock.getText().slice(start, end);
    // get suggestion text from entity data
    const suggestionText = data.textReplacement;
    // replace the annotation entity via DraftJS Modifier
    const correctedEntity = Modifier.replaceText(
        currentContent,
        entityToReplace,
        suggestionText,
        originalStyle,
        null
    );
    return correctedEntity;
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
            // extract loaded entity with entityKey
            const currentContent = editorState.getCurrentContent();
            const entityToReplace = currentContent.getEntity(entityKey);
            // check whether correct entity type
            // replaced if ANNOTATION, skipped and logged if not
            if (entityToReplace.type === "ANNOTATION") {
                // entity content replaced with correction from API
                const correctedEntity = replaceAnnotation(editorState, entityKey);
                // push to EditorState
                const correctedState = EditorState.push(editorState, correctedEntity, 'apply-entity');
                onComplete(correctedState);
                const [x, y] = annScrollPosition();
                                        
                setTimeout(() => {
                    window.scrollTo(x,y);
                    console.log("scroll completed")
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
                    const editorHasAnnotations = checkForAnnotations(rawState);

                    console.log("editorHasAnnotations", editorHasAnnotations);

                    switch (editorHasAnnotations) {
                        // remove all annotation entities from the editor
                        case true:

                            let currentContent = editorState.getCurrentContent();
                            // const rangesToRemove = getAnnotatedRanges(editorState);

                            // console.log(rangesToRemove);

                            // rangesToRemove.forEach(range => {
                            //     // entity location information
                            //     const start = range[0];
                            //     const end = range[1];
                            //     const blockKey = range[2];
                            //     const entityKey = range[3];
                            //     // entity selection state
                            //     const blockSelection = SelectionState
                            //         .createEmpty(blockKey)
                            //         .merge({
                            //             anchorOffset: start,
                            //             focusOffset: end,
                            //         });
                            //     // entity removed by applying null "entity" on selection
                            //     currentContent = Modifier.applyEntity(
                            //         currentContent,
                            //         blockSelection,
                            //         null
                            //     );
                            //     // gather entity being deleted
                            //     const removedAnnotation = currentContent.getEntity(entityKey);
                            //     console.log("removedAnnotation", removedAnnotation);
                            //     const entityData = removedAnnotation.getData();
                            //     // NOTE: feedback api call on mass delete not performed
                            //     // POST entity data with feedback
                            //     // replyGreynirAPI("",
                            //     //     entityData.annotation,
                            //     //     "reject",
                            //     //     "mass-reject"
                            //     // );
                            // });

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
                            let textObject = rawState.blocks.map(object => object.text);
                            let toCorrectArray = Object.values(textObject);
                            const rawText = toCorrectArray.join('\n');

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
                                        const entitiesToRender = createAnnotationEntities(editorState, processedResponse);

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
                                    window.alert("Villa í leiðréttingu!")
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