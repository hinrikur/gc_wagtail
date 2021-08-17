(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
const React = window.React;

const Modifier = window.DraftJS.Modifier;
const EditorState = window.DraftJS.EditorState;
const DraftUtils = window.Draftail.DraftUtils;
const SelectionState = window.DraftJS.SelectionState;
const convertToRaw = window.DraftJS.convertToRaw;


const AnnotationEntity = require('./components/annotation-entity.js');

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

/**
 * Filters out in-line tags used in HTML rendering from raw text before sending to GreynirCorrect API call
 * Matches tags at exactly end or start of line
 * @param {string} editorText - concatenated raw text from Draftail editor
 * @returns {string} filtered - input text with matched tags removed 
 */
function filterTextTags(editorText) {
    const TAG_SEGMENT = "\\[(links|adspot|box|chart)\\]";
    const LINE_START_TAG = "^" + TAG_SEGMENT + "(?=\\S)";
    const LINE_END_TAG = "(?<=\\S|\\.)" + TAG_SEGMENT + "$";
    const TAG_RE = new RegExp("(" + LINE_START_TAG + "|" + LINE_END_TAG + ")"); 
    var filtered = editorText.replace(TAG_RE, "");
    return filtered;
}

/**
 * Finds in-line tags in a given string and returns length of the tag
 * Only checks for tags at start of line, end of line doesn't affect char locations down the line
 * @param {string} parText - any text (should be block text from Editor rawState)
 * @returns {number} charDiff - length of filtered  
 */
function getFilteredCharDiff(parText) {
    const LINE_START_TAG = /^\[(links|adspot|box|chart)\](?=\S)/;
    const match = parText.match(LINE_START_TAG);
    var charDiff = 0;
    if (match !== null) {
        charDiff += match[0].length;
    }
    return charDiff;
}

/**
 * Compiles char location differences due to filter applied on text sent to API
 * @param {Object} rawState - rawState of the Draftail editor contents
 * @returns {Object} differenceMap - contains block key [string] : char length [int] pairs 
 */
function allFilteredDiffs(rawState) {
    var differenceMap = {};
    rawState.blocks.forEach(block => {
        differenceMap[block.key] = getFilteredCharDiff(block.text);
    });
    return differenceMap;
}

/**
 * check for in-line markers in editor content markers used for HTML rendering of editor content
 * ex. [adspot] [links] etc.
 * NOTE: only applied when checking for whole-bloc tag, i.e. `\n[adspace]\n`
 * @param {string} blockText - whole content of a text block ( = paragraph)
 * @returns {boolean} 
 */
function checkTextMarkers(blockText) {
    BLOCK_MARKER = /^ *\[\S*\] *$/;
    return BLOCK_MARKER.test(blockText);

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

    // code classes intended for wording UI class if suggest is empty
    const intendedWording = ["U", "T", "E"];
    const code = annotation.code;
    const codeStart = code.charAt(0);
    // finds valid replacement text in annotation data
    var replacement;
    if (annotation.suggest === "" && intendedWording.includes(codeStart)) {
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
    // char length of filtered in-line tags extracted
    const filteredCharDiffs = allFilteredDiffs(rawState);
    console.log(filteredCharDiffs);
    // check for other entities in a given range
    const otherEntityRanges = getOtherEntityRanges(editorState);
    console.log("otherEntityRanges:", otherEntityRanges);
    // return array declared
    var entitiesToRender = [];

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
        const markerBlock = checkTextMarkers(rawContentBlocks[blockKey].text)
        // check for empty API response
        if (markerBlock) {
            console.log(`Markerblock: Skipping block with text "${rawContentBlocks[blockKey].text}", key ${blockKey}`);
        } else if (typeof rawContentBlocks[blockKey].APIresponse !== "undefined") {
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
                // NOTE: hack for adding filtered character differences ([adspce], [links] etc.)
                const start = annotation.start_char + whiteSpaceLen + filteredCharDiffs[anchorKey];
                var end = annotation.end_char + whiteSpaceLen + filteredCharDiffs[anchorKey];
                // text for annotation selected from content block text, with inline style
                var selectedText = currentContentBlock.getText().slice(start, end);
                const selectionStyle = currentContentBlock.getInlineStyleAt(start);

                // additional annotation data to add to entity
                const textReplacement = getReplacement(annotation, selectedText);
                const annClass = getAnnotationClass(annotation.code, textReplacement, selectedText);

                // decreased start offset by 1 if replacement is empty string
                if (textReplacement === "") {
                    end += 1;
                    selectedText += " ";
                }
                

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
                            let filteredPars = parTexts.map(blockText => filterTextTags(blockText));
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
},{"./components/annotation-entity.js":2}],2:[function(require,module,exports){
const React = window.React;
const Modifier = window.DraftJS.Modifier;
const DraftUtils = window.Draftail.DraftUtils;

// const dangerouslySetInnerHTML = window.React.dangerouslySetInnerHTML()



const Portal = require('./portal.js');
const Popover = require('./popover.js');
const IconButton = require('./icon-button.js');
const DeclineButton = require('./decline-button.js');

var entityMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;'
};

function escapeHtml(string) {
    return String(string).replace(/[&<>"'`=\/]/g, function (s) {
        return entityMap[s];
    });
}

function createMarkup(txt) {
    return { __html: txt };
}

function formatAnnotation(txt, note = "") {
    // Hack to convert all text within single quotation marks in
    // an annotation to bold, while also escaping the annotation
    // text to valid HTML
    // Allows an additional 'note', used for errors in sentence parsing
    var fmt = txt.replace(/'[^']*'/g, function (s) {
        // Be careful to not use characters that will be HTML-escaped
        // in the dummy markers
        return "[bold]" + s.slice(1, -1) + "[~bold]";
    });
    fmt = escapeHtml(fmt);
    // Replace the dummy markers with HTML tags
    replaced = fmt.replace(/\[bold\]/g, "<b>").replace(/\[~bold\]/g, "</b>");
    // Returned as React element
    return React.createElement("div", {
        // className: "ann-popover-contents", // incorrect placement of this className
        dangerouslySetInnerHTML: createMarkup(replaced + note)
    });
}

function getAnnotationClass(code) {
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

    var codeChar = code.charAt(0);
    cls = classMap[codeChar];
    return cls;
}



class AnnotationEntity extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            showTooltipAt: null
        };
        this.openTooltip = this.openTooltip.bind(this);
        this.closeTooltip = this.closeTooltip.bind(this);
        this.buttonHandler = this.buttonHandler.bind(this);
        this.popoverButtons = this.popoverButtons.bind(this);
    }
    /* :: openTooltip: (e: Event) => void; */

    openTooltip(e) {
        const trigger = e.target;

        if (trigger instanceof Element) {
            this.setState({
                showTooltipAt: trigger.getBoundingClientRect()
            });
        }
    }
    /* :: closeTooltip: () => void; */

    closeTooltip() {
        this.setState({
            showTooltipAt: null
        });
    }

    // handler for triggering Drafttail entity source via command passed
    // removes entity with onRemove, triggers entity source with onEdit
    // closes popover/tooltip at button click (bug fix)
    buttonHandler(command, key) {
        // console.log("buttonHandler function called")
        // console.log(onCommand)
        command(key);
        this.setState({
            showTooltipAt: null
        });
    }

    popoverButtons(props) {
        const annClass = props.annClass;
        // const buttonHandler = this.buttonHandler.bind(this);
        const entityKey = props.entityKey;
        const onRemove = props.onRemove;
        const onEdit = props.onEdit;
        const data = props.data;
        const annData = data.annotation;
        const postData = data.replyGreynirAPI;

        const SINGLE_BUTTON_ACCEPT = [
            // "parse-error", // Parse errors now have a 2 button choice
            "unknown-word"
        ];

        if (SINGLE_BUTTON_ACCEPT.includes(annClass)) {

            return React.createElement(
                'div', {
                className: "annotation-buttons"
            },
                React.createElement(
                    IconButton, {
                    name: "Annotation__button_yes",
                    // active,
                    label: "Loka ábendingu",
                    title: "Loka ábendingu",
                    icon: "glyphicon glyphicon-ok normal",
                    onClick: () => {
                        let action = onRemove;
                        postData('fake-url', annData, "accept");
                        this.buttonHandler(action, entityKey);

                    }
                }
                )
            );
        }

        if (annClass === "wording") {

            return React.createElement(
                'div', {
                className: "annotation-buttons"
            },
                // Button for accepting annotation, calling onEdit and rerunning source component
                React.createElement(
                    IconButton, {
                    name: "Annotation__button_yes",
                    // active,
                    label: "Sammála",
                    title: "Uppástungan á við hér",
                    icon: "glyphicon glyphicon-ok normal",
                    onClick: () => {
                        // let action = annClass === "wording" ? onRemove : onEdit;
                        let action = onRemove;
                        postData('fake-url', annData, "accept");
                        this.buttonHandler(action, entityKey);

                    }
                }
                ),
                // Button for declining annotation, removing annotation entity
                // onRemove and entityKey passed as props and called further down
                React.createElement(
                    IconButton, {
                    name: "Annotation__button_no",
                    // active,
                    label: "Ósammála",
                    title: "Uppástungan á ekki við hér",
                    icon: "glyphicon glyphicon-remove normal",
                    onClick: () => {
                        // let action = annClass === "wording" ? onRemove : onEdit;
                        let action = onRemove;
                        postData('fake-url', annData, "reject");
                        this.buttonHandler(action, entityKey);

                    }
                }
                )
            );
        } else if (annClass === "wording-plus") {
            return React.createElement(
                'div', {
                className: "annotation-buttons"
            },
                // Button for accepting annotation, calling onEdit and rerunning source component
                React.createElement(
                    IconButton, {
                    name: "Annotation__button_yes",
                    label: "Sammála",
                    title: "Uppástungan á við hér",
                    icon: "glyphicon glyphicon-ok normal",
                    onClick: () => {
                        // let action = annClass === "wording" ? onRemove : onEdit;
                        let action = onRemove;
                        postData('fake-url', annData, "accept");
                        this.buttonHandler(action, entityKey);

                    }
                }
                ),

                // Button for declining annotation, removing annotation entity
                // onRemove and entityKey passed as props and called further down
                React.createElement(
                    DeclineButton, {
                    name: "Annotation__button_no",
                    label: "Ósammála",
                    title: "Uppástungan á ekki við hér",
                    icon: "glyphicon glyphicon-remove normal",
                    onRemove: onRemove,
                    entityKey: entityKey,
                    data: data
                }
                )
            );
        } else if (annClass === "parse-error") {
            return React.createElement(
                'div', {
                className: "annotation-buttons"
            },
                // Button for accepting annotation. Replies to API with 'accept'
                React.createElement(
                    IconButton, {
                    name: "Annotation__button_yes",
                    label: "Rétt ábending",
                    title: "Það er eitthvað að setningunni",
                    icon: "glyphicon glyphicon-ok normal",
                    onClick: () => {
                        // let action = annClass === "wording" ? onRemove : onEdit;
                        let action = onRemove;
                        postData('fake-url', annData, "accept");
                        this.buttonHandler(action, entityKey);

                    }
                }
                ),

                // generic IconButton NOT a DeclineButton 
                // replies to API with 'reject' without rendering feedback menu.
                React.createElement(
                    IconButton, {
                    name: "Annotation__button_no",
                    label: "Röng ábending",
                    title: "Það er ekkert að setningunni,\nábendingin er vitlaus",
                    icon: "glyphicon glyphicon-remove normal",
                    onClick: () => {
                        // let action = annClass === "wording" ? onRemove : onEdit;
                        let action = onRemove;
                        postData('fake-url', annData, "reject");
                        this.buttonHandler(action, entityKey);
                    }
                }
                )
            );
        }

        return React.createElement(
            'div', {
            className: "annotation-buttons"
        },
            // Button for accepting annotation, calling onEdit and rerunning source component
            React.createElement(
                IconButton, {
                name: "Annotation__button_yes",
                // active,
                label: "Samþykkja",
                title: "Samþykkja uppástungu",
                icon: "glyphicon glyphicon-ok normal",
                onClick: () => {
                    let action = annClass === "wording" ? onRemove : onEdit;
                    // let reply = annClass === "wording" ? "reject" : "accept";
                    let reply = "accept";
                    postData('fake-url', annData, reply);
                    this.buttonHandler(action, entityKey);

                }
            }
            ),
            // Button for declining annotation, removing annotation entity
            // onRemove and entityKey passed as props and called further down
            React.createElement(
                DeclineButton, {
                name: "Annotation__button_no",
                // active,
                label: "Hafna",
                title: "Hafna uppástungu",
                icon: "glyphicon glyphicon-remove normal",
                onRemove: onRemove,
                entityKey: entityKey,
                data: data
            }
            )
        );
    }

    render() {
        const {
            entityKey,
            children,
            onEdit,
            onRemove,
            data,
        } = this.props;

        const { showTooltipAt } = this.state;
        const annCode = data.annotation.code;
        // const annClass = getAnnotationClass(annCode);
        const annClass = data.annClass;

        // console.log("Annotation code:", annCode);
        // console.log("Annotation class:", annClass);


        // 'ann' element, contains the in-line annotation and children
        return React.createElement(
            "ann", {
            role: "button",
            onMouseUp: this.openTooltip,
            className: `${annClass}`
        },
            React.createElement(
                "span", {
                className: "Annotated__text"
            },
                children
            ),
            showTooltipAt &&
            // Portal for popover/tooltip
            React.createElement(
                Portal, {
                onClose: this.closeTooltip,
                closeOnClick: true,
                closeOnType: true,
                closeOnResize: true
            },
                // Popover component
                React.createElement(
                    Popover, {
                    target: showTooltipAt,
                    direction: "top",
                    // annClass: annClass,
                    clsName: `Tooltip Annotation-${annClass}`,
                    id: "annotation_popover"
                },
                    // div for popover contents
                    React.createElement(
                        "div", {
                        className: "ann-popover-contents"
                    },
                        // div for annoatation text message
                        React.createElement(
                            "div", {
                            className: "ann-text"
                        },
                            formatAnnotation(this.props.data.annotation.text)
                        ),

                        // div for annotation detail if present
                        typeof this.props.data.annotation.detail !== "undefined" && this.props.data.annotation.detail !== null ?
                            React.createElement(
                                "div", {
                                className: "ann-detail"
                            },
                                annClass === "parse-error" ?
                                    formatAnnotation(this.props.data.annotation.detail, ". <br><b>Setningin gæti verið vitlaus!</b>")
                                    :
                                    formatAnnotation(this.props.data.annotation.detail)
                            ) :
                            null
                    ),
                    React.createElement(
                        this.popoverButtons,
                        {
                            annClass: annClass,
                            buttonHandler: this.buttonHandler,
                            entityKey: entityKey,
                            onRemove: onRemove,
                            onEdit: onEdit,
                            data: data
                        }
                    )


                )
            )
        );
    }
}

module.exports = AnnotationEntity;
},{"./decline-button.js":3,"./icon-button.js":4,"./popover.js":5,"./portal.js":6}],3:[function(require,module,exports){
const React = window.React;
// const Icon = window.Draftail.Icon;

const Portal = require('./portal.js');
const Popover = require('./popover.js');
const IconButton = require('./icon-button.js');

class DeclineButton extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            showTooltipOnHover: true
        };
        // for hover tooltip
        this.onMouseDown = this.onMouseDown.bind(this);
        this.onMouseLeave = this.onMouseLeave.bind(this);
        // for feedback menu
        this.openFeedback = this.openFeedback.bind(this);
        this.closeFeedback = this.closeFeedback.bind(this);
    }
    /* :: onMouseDown: (e: Event) => void; */

    onMouseDown(e) {
        const { name, onClick } = this.props;
        e.preventDefault();
        this.setState({
            showTooltipOnHover: false
        });

        if (onClick) {
            onClick(name || "");
        }
    }
    /* :: onMouseLeave: () => void; */

    onMouseLeave() {
        this.setState({
            showTooltipOnHover: true
        });
    }

    openFeedback(e) {
        const trigger = e.target;

        if (trigger instanceof Element) {
            this.setState({
                showFeedbackAt: trigger.getBoundingClientRect()
            });
        }
    }
    /* :: closeFeedback: () => void; */

    closeFeedback() {
        this.setState({
            showFeedbackAt: null
        });
    }

    buttonHandler(command, key) {
        // console.log("buttonHandler function called")
        // console.log(onCommand)
        command(key);
        this.setState({
            showFeedbackAt: null
        });
    }

    render() {
        const {
            name,
            active,
            label,
            title,
            icon,
            onClick,
            onMouseUp,
            onRemove,
            entityKey,
            data
        } = this.props;

        const annData = data.annotation;
        const postData = data.replyGreynirAPI;

        const { showTooltipOnHover } = this.state;
        const { showFeedbackAt } = this.state;
        return React.createElement(
            "button", {
            // name: name,
            className: `${name}${active ? " Annotation__button_yes--active" : ""
                }`,
            type: "button",
            "aria-label": title || null,
            "data-draftail-balloon": title && showTooltipOnHover ? true : null,
            tabIndex: -1,
            onClick: onClick,
            onMouseUp: this.openFeedback
            // onMouseDown: this.onMouseDown,
            // onMouseLeave: this.onMouseLeave
        },
            typeof icon !== "undefined" && icon !== null ?
                /*#__PURE__*/
                React.createElement("span", {
                    className: icon
                }) :
                null,
            label ?
                /*#__PURE__*/
                React.createElement(
                    "span",
                    {
                        className: "Annotation__button__label"
                    },
                    label
                ) : null,

            showFeedbackAt &&
            // Portal for feedback menu
            React.createElement(
                Portal, {
                onClose: this.closeFeedback,
                closeOnClick: true,
                closeOnType: true,
                closeOnResize: true
            },
                // AnnotationPopover component
                React.createElement(
                    Popover, {
                    target: showFeedbackAt,
                    direction: "bottom-left",
                    clsName: "Tooltip Feedback",
                    id: "feedback_popover"
                    // annClass: annClass
                },
                    React.createElement(
                        "div", {
                        className: "feedback-menu-contents"
                    },
                    React.createElement('div',
                    {
                        className: "feedback-title"
                    },
                    "Ástæða höfnunar:"
                    ),
                        React.createElement(
                            "div",
                            {
                                className: "feedback-button-1"
                            },
                            React.createElement(
                                IconButton, {
                                name: "feedback-button",
                                // active,
                                label: "Ekki villa",
                                title: "Merkti textinn inniheldur ekki villu",
                                icon: "glyphicon glyphicon-circle-remove normal",
                                onClick: () => {
                                    postData('fake-url', annData, "reject", "not-error");
                                    this.buttonHandler(onRemove, entityKey);
                                }
                            }
                            )
                        ),
                        React.createElement(
                            "div",
                            {
                                className: "feedback-button-2"
                            },
                            React.createElement(
                                IconButton, {
                                name: "feedback-button",
                                // active,
                                label: "Röng ábending",
                                title: "Textinn inniheldur villu, en \nábendingin á ekki við villuna",
                                icon: "glyphicon glyphicon-flag-waving normal",
                                onClick: () => {
                                    postData('fake-url', annData, "reject", "wrong-error");
                                    this.buttonHandler(onRemove, entityKey);
                                }
                            }
                            )
                        ),
                        React.createElement(
                            "div",
                            {
                                className: "feedback-button-3"
                            },
                            React.createElement(
                                IconButton, {
                                name: "feedback-button",
                                // active,
                                label: "Annað",
                                title: "Hafna ábendingu af annarri ástæðu (þarf ekki að tilgreina)",
                                icon: "glyphicon glyphicon-circle-question normal",
                                onClick: () => {
                                    postData('fake-url', annData, "reject", "other");
                                    this.buttonHandler(onRemove, entityKey);
                                }
                            }
                            )
                        )
                    )
                )
            )

        );
    }
}

module.exports = DeclineButton;
},{"./icon-button.js":4,"./popover.js":5,"./portal.js":6}],4:[function(require,module,exports){

const React = window.React;
// const Icon = window.Draftail.Icon;

class IconButton extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      showTooltipOnHover: true
    };
    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseLeave = this.onMouseLeave.bind(this);
  }
  /* :: onMouseDown: (e: Event) => void; */

  onMouseDown(e) {
    const { name, onClick } = this.props;
    e.preventDefault();
    this.setState({
      showTooltipOnHover: false
    });

    if (onClick) {
      onClick(name || "");
    }
  }
  /* :: onMouseLeave: () => void; */

  onMouseLeave() {
    this.setState({
      showTooltipOnHover: true
    });
  }

  render() {
    const { name, 
        active, 
        label, 
        title, 
        icon,
        onClick,
        onMouseUp,
    } = this.props;
    const { showTooltipOnHover } = this.state;
    return /*#__PURE__*/ React.createElement(
      "button",
      {
        name: name,
        className: `${name}${
          active ? " active" : ""
        }`,
        type: "button",
        "aria-label": title || null,
        "data-draftail-balloon": title && showTooltipOnHover ? true : null,
        tabIndex: -1,
        onClick: onClick,
        onMouseUp: onMouseUp
        // onMouseDown: this.onMouseDown,
        // onMouseLeave: this.onMouseLeave
      },
      typeof icon !== "undefined" && icon !== null
        ? /*#__PURE__*/ React.createElement("span", {
            className: icon
          })
        : null,
      label
        ? /*#__PURE__*/ React.createElement(
            "span",
            {
              className: "Annotation__button_yes__label"
            },
            label
          )
        : null
    );
  }
}

module.exports = IconButton;
},{}],5:[function(require,module,exports){
const React = window.React;

const TOP = "top";
const LEFT = "left";
const TOP_LEFT = "top-left";
const BOTTOM_LEFT = "bottom-left";
const WINDOW_X_PADDING = 16;
const WINDOW_Y_PADDING = 60;
const MENU_OVERLAP = 10;

const getTargetTop = (target) => {
  return window.pageYOffset + target.top + target.height;
};

const getTargetLeft = (target) => {
  return window.pageXOffset + target.left + (target.width / 2);
};

const positionFeedback = (target) => {



  const element = document.getElementById("feedback_popover");
  const parent = document.getElementById("annotation_popover");
  
  if (element === null | parent === null) {
    return;
  } else if (element["data-fixed"] === true) {
    return;
  }

  console.log(element);

  const CSS_X_TRANSFORM = element.offsetWidth * 0.40;
  const CSS_Y_TRANSFORM = element.offsetHeight * 0.09; 

  const top = getTargetTop(target) - CSS_Y_TRANSFORM;
  const left = getTargetLeft(target) + CSS_X_TRANSFORM;
  var newTop = top;
  var newLeft = left;

  const trueRight = left + element.offsetWidth;
  const trueBottom = top + element.offsetHeight;

  const maxRight = window.innerWidth - WINDOW_X_PADDING;
  const maxLeft = maxRight - parent.offsetWidth - element.offsetWidth;
  const maxBottom = window.pageYOffset + window.innerHeight - WINDOW_Y_PADDING;
  const maxTop = maxBottom - element.offsetHeight;

  console.log("trueRight",trueRight);
  console.log("maxRight:", maxRight);

  if (trueRight > maxRight) {
    console.log("Previous feedback left:", left);
    // newLeft = maxLeft;
    
    element.style.top = `${newTop}px`;
    element.style.left = `${maxLeft}px`;
    console.log("New feedback left:", newLeft);
  }

  // element.focus();
};

const positionAnnotation = (target) => {

  const CSS_X_TRANSFORM = target.width * 0.75;
  const CSS_Y_TRANSFORM = target.height * 0.05;

  const top = getTargetTop(target);
  const left = getTargetLeft(target);
  var newTop = top;
  var newLeft = left;

  // getting by ID since only one annotation menu present in DOM at a time
  const element = document.getElementById("annotation_popover");
  if (element === null | parent === null) {
    return;
  } else if (element["data-fixed"] === true) {
    return;
  }

  const maxRight = window.innerWidth - WINDOW_X_PADDING;
  const maxLeft = maxRight - element.offsetWidth + CSS_X_TRANSFORM;
  const maxBottom = window.pageYOffset + window.innerHeight - WINDOW_Y_PADDING;
  const maxTop = maxBottom - element.offsetHeight;

  if (left > maxLeft) {
    newLeft = maxLeft;
  }
  if (top > maxTop) {
    newTop = top - element.offsetHeight - target.height - CSS_Y_TRANSFORM;
  }

  element.style.top = `${newTop}px`;
  element.style.left = `${newLeft}px`;
  element['data-fixed'] = true;
  console.log("true left:", element.style.left);
};

const getPopoverStyles = (target, direction) => {
  const top = window.pageYOffset + target.top;
  const left = window.pageXOffset + target.left;
  const bottom = window.pageYOffset;

  setTimeout(() => {
    positionAnnotation(target);
    positionFeedback(target);
  }, 1);

  switch (direction) {
    case TOP:
      return {
        top: top + target.height,
        left: left + target.width / 2
      };

    case LEFT:
      return {
        top: top + target.height / 2,
        left: left + target.width
      };

    case BOTTOM_LEFT:
      return {
        top,
        left: left + target.width
      };

    case TOP_LEFT:
    default:
      return {
        top: top + target.height,
        left
      };
  }
};

/**
 * A tooltip, with arbitrary content.
 */
const Popover = ({ target, children, direction, clsName, id }) =>
  /*#__PURE__*/ React.createElement(
  "div",
  {
    style: getPopoverStyles(target, direction),
    className: `${clsName}-${direction}`,
    role: "tooltip",
    id: id,
    'data-fixed': false
  },
  children
);





module.exports = Popover;

},{}],6:[function(require,module,exports){
const React = window.React;

class Portal extends React.Component {
  constructor(props) {
    super(props);
    this.onCloseEvent = this.onCloseEvent.bind(this);
  }

  componentDidMount() {
    const { onClose, closeOnClick, closeOnType, closeOnResize } = this.props;

    if (!this.portal) {
      this.portal = document.createElement("div");
      this.portal.setAttribute("id", "portal");

      if (document.body) {
        document.body.appendChild(this.portal);
      }

      if (onClose) {
        if (closeOnClick) {
          document.addEventListener("mouseup", this.onCloseEvent);
        }

        if (closeOnType) {
          document.addEventListener("keyup", this.onCloseEvent);
        }

        if (closeOnResize) {
          window.addEventListener("resize", onClose);
        }
      }
    }

    this.componentDidUpdate();
  }

  componentDidUpdate() {
    const { children } = this.props;
    ReactDOM.render(
        /*#__PURE__*/ React.createElement("div", null, children),
      this.portal
    );
  }

  componentWillUnmount() {
    const { onClose } = this.props;

    if (document.body) {
      document.body.removeChild(this.portal);
    }

    document.removeEventListener("mouseup", this.onCloseEvent);
    document.removeEventListener("keyup", this.onCloseEvent);
    window.removeEventListener("resize", onClose);
  }
  /* :: onCloseEvent: (e: Event) => void; */

  onCloseEvent(e) {
    const { onClose } = this.props;

    if (e.target instanceof Element && !this.portal.contains(e.target)) {
      onClose();
    }
  }

  render() {
    return null;
  }
}

Portal.defaultProps = {
  children: null,
  closeOnClick: false,
  closeOnType: false,
  closeOnResize: false
};

module.exports = Portal;
},{}]},{},[1]);
