
const Modifier = window.DraftJS.Modifier;
const EditorState = window.DraftJS.EditorState;
const DraftUtils = window.Draftail.DraftUtils;
const SelectionState = window.DraftJS.SelectionState;
const convertToRaw = window.DraftJS.convertToRaw;

const GreynirUtils = require('../utils/GreynirUtils.js');
const replyGreynirAPI = GreynirUtils.replyGreynirAPI;


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

// checking for whitespace at start of block, per block
// editor content out of scope of adjustChars method,
function whiteSpaceLen(textBlock) {
    // whitespace in front of list items should be ignored
    const ignoreTypes = [
        "ordered-list-item",
        "unordered-list-item"
    ];
    const blockText = textBlock.text;
    const blockType = textBlock.type;
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
        const markerBlock = checkTextMarkers(rawContentBlocks[blockKey].text);
        // check for empty API response
        if (markerBlock) {
            console.log(`Markerblock: Skipping block with text "${rawContentBlocks[blockKey].text}", key ${blockKey}`);
        } else if (typeof rawContentBlocks[blockKey].APIresponse !== "undefined") {
            // API response not empty



            console.log(`Start whitespace length for key ${blockKey}:`, whiteSpaceLen);

            // each content block assigned its relevant text annotations
            rawContentBlocks[blockKey].APIresponse.forEach(annotation => {

                const anchorKey = rawContentBlocks[blockKey].key;
                let currentContent = editorState.getCurrentContent();
                console.log("currentContent:", currentContent);
                const currentContentBlock = currentContent.getBlockForKey(anchorKey);
                console.log("anchorKey:", anchorKey);
                console.log("currentContentBock, via anchorKey:", currentContentBlock);

                const startWhiteSpace = whiteSpaceLen(rawContentBlocks[blockKey]); 

                // // each annotation start and end char index reduced by aggregated char length (aggrLen)
                // // API looks at location in total text, DrafTail looks at location in current block
                // const start = annotation.start_char - aggrLen;
                // const end = annotation.end_char - aggrLen;
                // NOTE: aggrLen fix moved to ProcessAPI method

                // length of par-start whitespace added to char indexes (0 +)
                // NOTE: hack for adding filtered character differences ([adspce], [links] etc.)
                const start = annotation.start_char + startWhiteSpace + filteredCharDiffs[anchorKey];
                var end = annotation.end_char + startWhiteSpace + filteredCharDiffs[anchorKey];
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

module.exports = {
    annScrollPosition,
    checkForAnnotations,
    getOtherEntityRanges,
    replaceAnnotation,
    filterTextTags,
    allFilteredDiffs,
    checkTextMarkers,
    getAnnotationClass,
    createAnnotationEntities
};