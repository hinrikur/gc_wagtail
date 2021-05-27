
const React = window.React;

const Modifier = window.DraftJS.Modifier;
const EditorState = window.DraftJS.EditorState;
const DraftUtils = window.Draftail.DraftUtils;
const SelectionState = window.DraftJS.SelectionState;

// const CompositeDecorator = window.DraftJS.CompositeDecorator;
// const AtomicBlockUtils = window.DraftJS.AtomicBlockUtils;
const convertToRaw = window.DraftJS.convertToRaw;


// Manninum á verkstæðinu vanntar hamar. Guðjón setti kókið í kælir.
// Mér dreimdi stórann brauðhleyf.

const AnnotationEntity = require('./components/annotation-entity.js');

// const processResponce = require('./components/processAPI.js');
const dummyApi = require('./components/correctedReference.json');

// console.log(dummyApi)

// Example POST method implementation:
async function callGreynirAPI(url = '', data = {}) {
    if (data === "") {
        // text is field is empty, returns null
        return null;
    } else {
        console.log("Data being sent via request");
        console.log(JSON.stringify(data));
        // Default options are marked with *
        const response = await fetch(url, {
            method: 'POST', // *GET, POST, PUT, DELETE, etc.
            // mode: 'no-cors', // no-cors, *cors, same-origin
            // cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
            // credentials: 'omit', // include, *same-origin, omit
            scheme: "https",
            headers: {
                // 'Content-Type': 'application/json; charset=UTF-8',
                'Content-Type': 'text/plain',
                // 'Content-Type': 'application/x-www-form-urlencoded',
                // 'Access-Control-Allow-Origin': 'http://localhost:8000' //'*', 
            },
            // redirect: 'follow', // manual, *follow, error
            // referrerPolicy: 'same-origin', // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
            body: data // body data type must match "Content-Type" header
        });

        return response.json(); // parses JSON response into native JavaScript objects
    }
}

function processAPI(json) {
    // iterates over API response JSON and returns flat
    // array of annotations (annotationArray)
    var annotationArray = [];
    // iterate through outer array
    for (var i = 0; i < json.result.length; i++) {
        // iterate through paragraphs
        for (var j = 0; j < json.result[i].length; j++) {
            // iterate through sentences
            var anns = json.result[i][j]["annotations"];
            console.log('list of annotations:', anns);
            // annotation added to return array
            var newArray = annotationArray.concat(anns);
            annotationArray = newArray;
            console.log("annotationArray length:", annotationArray.length)
        }
    }

    return annotationArray;
}

function getReplacement(data) {
    // finds valid replacement text in annotation data
    var replacement;
    if (data.suggest === "") {
        // in case of empty .suggest field in data,
        // example from .text field extracted with regex
        var realSuggest = data.text.match(/'[^']*'/)[0];
        realSuggest = realSuggest.substring(1, realSuggest.length-1);
        replacement = realSuggest;
    } else {
        // otherwise returns .suggest value
        replacement = data.suggest;
    }
    return replacement;
}


class DebugAnnotateSource extends React.Component {

    componentDidMount() {

        const { editorState, entityType, onComplete, entityKey } = this.props;
        // console.log(this.props)
        // console.log("Yes, the Annotation button was pressed.");

        // Debug errors:   /////////////////////////////////////////
        // óaunhæft
        // const debugAnnInfo = JSON.parse('{ "code": "S004", "detail": null, "end": 5, "start": 5, "suggest": "óraunhæft", "text": "Orðið \'óaunhæft\' var leiðrétt í \'óraunhæft\'" }');
        // Mér hlakkar
        // const debugAnnInfo = JSON.parse(`{"code": "P_WRONG_CASE_þgf_nf", "detail": "Sögnin 'að hlakka' er persónuleg. Frumlag hennar á að vera í nefnifalli í stað þágufalls.", "end": 0, "start": 0, "suggest": "", "text": "Á líklega að vera 'Ég'"}`);
        // Ég vill
        // const debugAnnInfo = JSON.parse(`{"code": "P_wrong_person", "detail": null, "end": 1, "start": 0, "suggest": "ég vil", "text": "Orðasambandið 'Ég vill' var leiðrétt í 'ég vil'"}`);
        // Mér langaði
        // const debugAnnInfo = JSON.parse(`"code": "P_WRONG_CASE_þgf_þf", "detail": "Sögnin 'að langa' er ópersónuleg. Frumlag hennar á að vera í þolfalli í stað þágufalls.", "end": 0, "start": 0, "suggest": "", "text": "Á líklega að vera 'Mig'"}`);


        // If statement catches if entityKey is set, indicating annotation has been approved
        if (entityKey !== undefined && entityKey !== null) {

            // console.log("IF CONDITION CAUGHT")

            // get entity to replace (via Draftail utils)
            const entityToReplace = DraftUtils.getEntitySelection(editorState, entityKey)
            // get editor content (via DraftJS API)
            const currentContent = editorState.getCurrentContent();
            // get entity inline style
            const currentBlock = currentContent.getBlockMap().get(entityToReplace.getStartKey());
            const start = entityToReplace.getAnchorOffset()
            const originalStyle = currentBlock.getInlineStyleAt(start)
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
                null)
            // push to EditorState
            const correctedState = EditorState.push(editorState, correctedEntity, 'apply-entity');
            onComplete(correctedState);

        } else { // Creating new annotation entity/ies   

            const editorHasContent = editorState.getCurrentContent().hasText();
            // const currentContent = editorState.getCurrentContent();
            // const unModifiedState = EditorState.push(editorState, currentContent, 'apply-entity');

            // console.log(debugAnnInfo);
            // // console.log(window)


            // capturing empty editors etc.
            switch (editorHasContent) {

                // Editor contains text
                case true:

                    // API eventually called here via POST request
                    // Until then, dummy response imported and used instead
                    // 
                    // 

                    const rawState = convertToRaw(editorState.getCurrentContent());
                    // console.log(rawState)
                    // const rawText = rawState.text;

                    // Text extracted by extracting to array and joining with newline
                    let textObject = rawState.blocks.map(object => object.text);
                    let toCorrectArray = Object.values(textObject);
                    const rawText = toCorrectArray.join('\n\n');

                    // callGreynirAPI("https://yfirlestur.is/correct.api", rawText)
                    //         .then(response => {
                    //             if (response === null) {
                    //                 console.log(`Empty block for key ${key}. Skipping...`);
                    //             } else {
                    //                 console.log("API response:", response);
                    //                 // console.log('Success:', response);
                    //                 // response flattened to a array of annotation data objects
                    //                 const processedResp = processAPI(response);
                    //                 // processed respnces added to blockMap
                    //                 rawContentBlocks[key]["APIresponse"] = processedResp;
                    //                 // consolresponse);
                    //             }

                    //         })
                    //         .catch(err => console.log('Error:', err));

                    var rawContentBlocks = rawState.blocks;
                    const entitiesToRender = [];

                     // response flattened to a array of arrays of annotation data objects
                     const processedResponse = processAPI(dummyApi);
                     console.log("Array of annotations:", processedResponse);
                     // (Dummy) response added to raw blockmap 
                        // (Dummy) response added to raw blockmap 
                     // (Dummy) response added to raw blockmap 
                     // NOTE: might be skipped? testing annotation in this loop
                     // rawContentBlocks[key]["APIresponse"] = processedResponse;
 
                    var i = 0;
                    for (var key in rawContentBlocks) {
                        console.log(key)
                        console.log(processedResponse[i]);
                        console.log(rawContentBlocks[key])
                        rawContentBlocks[key]["APIresponse"] = processedResponse[i];
                        i++;

                        // const toCorrect = rawContentBlocks[key].text;
                        // callGreynirAPI("https://yfirlestur.is/correct.api", toCorrect)
                        //     .then(response => {
                        //         if (response === null) {
                        //             console.log(`Empty block for key ${key}. Skipping...`);
                        //         } else {
                        //             console.log("API response:", response);
                        //             // console.log('Success:', response);
                        //             // response flattened to a array of annotation data objects
                        //             const processedResp = processAPI(response);
                        //             // processed respnces added to blockMap
                        //             rawContentBlocks[key]["APIresponse"] = processedResp;
                        //             // consolresponse);
                        //         }
                        //     })
                        //     .catch(err => console.log('Error:', err));

                    }

                   
                    // }
                    var aggrLen = 0;
                    i = 0; 
                    for (var blockKey in rawContentBlocks) {
                        console.log(rawContentBlocks[blockKey])
                        if (typeof rawContentBlocks[blockKey].APIresponse !== "undefined") {
                            rawContentBlocks[blockKey].APIresponse.forEach(annotation => {

                                // const selectionState = editorState.getSelection();
                                // const anchorKey = selectionState.getAnchorKey();
                                const anchorKey = rawContentBlocks[blockKey].key;
                                let currentContent = editorState.getCurrentContent();
                                console.log("currentContent:", currentContent)
                                console.log("blockMap:", currentContent.getBlockMap())
                                const currentContentBlock = currentContent.getBlockForKey(anchorKey);
                                console.log("anchorKey:", anchorKey)
                                console.log("currentContentBock, via anchorKey:", currentContentBlock)
                                // const start = selectionState.getStartOffset();
                                const start = annotation.start_char - aggrLen;
                                // const end = selectionState.getEndOffset();
                                const end = annotation.end_char - aggrLen;
                                const selectedText = currentContentBlock.getText().slice(start, end);
                                const selectionStyle = currentContentBlock.getInlineStyleAt(start)

                                const blockSelection = SelectionState
                                    .createEmpty(anchorKey)
                                    .merge({
                                        anchorOffset: start,
                                        focusOffset: end,
                                    });

                                console.log("Text to annotate: " + selectedText);
                                console.log("Start offset:", start);
                                console.log("End offset:", end);

                                // // Suggestion text extracted from annoatation data
                                // const suggestionText = getReplacement(annotation);
                                // // console.log("Replacement txx:", realSuggest); 
                            // // console.log("Replacement txx:", realSuggest); 
                                // // console.log("Replacement txx:", realSuggest); 

                                // The annotation entity contains information sent from the API during annotation
                                const annEntity = currentContent.createEntity(entityType.type, 'IMMUTABLE', annotation
                                    // { 
                                // { 
                                    // { 
                                    //     suggestion: suggestedWord,
                                    //     description: annotationText,

                                    // }
                                );
                                // console.log('Annotation entity:', annEntity)
                                const annotationEntityKey = annEntity.getLastCreatedEntityKey();

                                entitiesToRender.push({
                                    "key": annotationEntityKey,
                                    "blockSelection": blockSelection,
                                    "selectedText": selectedText,
                                    "selectionStyle": selectionStyle,
                                });
                                // console.log("annotationEntityKey: ", annotationEntityKey)
                               
                            });
                            aggrLen += rawContentBlocks[blockKey].text.length;
                            // if (i !== 0) {
                            //     aggrlen += rawContentBlocks.text.length;
                            // }
                        } else {
                            console.log("Undefined response, likely empty Block. BlockKey:", blockKey)
                        }

                        let newContentState = editorState.getCurrentContent();

                        entitiesToRender.forEach(entity => {
                            console.log("entity from list:", entity)
                            // console.log(entity.key)
                            // console.log(entity.blockSelection)
                            // console.log(entity.selectedText)
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

                        onComplete(nextState);

                        // Manninum á verkstæðinu vanntar hamar. 


                    }

                    // // processedResponse.forEach(annotation => {
                    // // As is the annotation entity is generated on selected text in the 

                    // const selectionState = editorState.getSelection();
                    // const anchorKey = selectionState.getAnchorKey();
                    // const currentContent = editorState.getCurrentContent();
                    // console.log("blockMap:", currentContent.getBlockMap())
                    // const currentContentBlock = currentContent.getBlockForKey(anchorKey);
                    // const start = selectionState.getStartOffset();
                    // const end = selectionState.getEndOffset();
                    // const selectedText = currentContentBlock.getText().slice(start, end);


                    // console.log("Text to annotate: " + selectedText);
                    // console.log("Start offset:", start);
                    // console.log("End offset:", end);



                    // // TESTING DECORATORS WITH REACT COMPONENTS

                    // // Uses the Draft.js API to create a new entity with the right data.

                    // const suggestedWord = debugAnnInfo.suggest;
                    // const annotationText = debugAnnInfo.text;

                    // // The annotation entity contains information sent from the API during annotation
                    // const annEntity = currentContent.createEntity(entityType.type, 'IMMUTABLE', debugAnnInfo
                    //     // { 
                    //     //     suggestion: suggestedWord,
                    //     //     description: annotationText,

                    //     // }
                    // );
                    // // console.log('Annotation entity:', annEntity)
                    // const annotationEntityKey = annEntity.getLastCreatedEntityKey();
                    // // console.log("annotationEntityKey: ", annotationEntityKey)

                    // // const newContentState = editorState.getCurrentContent();
                    // //  const newContentState = EditorState.createWithContent(currentContent, annotationDecorator)
                    // const newContentState = Modifier.replaceText(currentContent, selectionState, selectedText, null, annotationEntityKey);

                    // // Create the new state as an undoable action.
                    // const nextState = EditorState.push(
                    //     editorState,
                    //     newContentState,
                    //     "annotated-state"
                    // );
                    // });



                    // onComplete(nextState);
                    break;

                // Editor is empty
                case false:
                    onComplete(unModifiedState);
                    console.log("...But the editor is empty");
                    break;

                // Other case (not meant to get here!)
                default:
                    // Other / Error
                    console.log("Debug annotate case not caught");
                    break;
            }
        }

    }

    render() {
        return null;
    }
}



const DebugAnnotation = (props) => {

    const { entityKey,
        contentState,
        onEdit,
        onRemove } = props;

    const editor = document.querySelector('[data-draftail-input]');
    // console.log("selected as 'editor':", editor);

    const data = contentState.getEntity(entityKey).getData();
    // console.log("DATA FROM DEBUG ANNOTATION:", data);

    // console.log("ContentState from Annotation Entity:", contentState.getEntity(entityKey));

    // console.log('Annotation entity:', annEntity)
    // const annotationEntityKey = annEntity.getLastCreatedEntityKey();
    // console.log("annotationEntityKey: ", entityKey)

    // const currentContent = editorState.getCurrentContent();
    // const entity = contentState.getEntity(entityKey)
    // console.log("window props (if any):", window.props);

    return React.createElement(AnnotationEntity, {
        // role: 'annotation',
        // style: styles.annotation,
        class: 'ann',
        entityKey: entityKey,
        contentState: contentState,
        onEdit: onEdit,
        onRemove: onRemove,
        icon: null,
        label: null,
        data: data,
        onMouseUp: () => {

            console.log('Annotation clicked');

            // this._onButtonClick

        },

        onMouseEnter: () => {
            console.log('hovering on annotation');
            // console.log()
            // e => showButton(e);
            // this.style.background = "green"
            // this.style.border = "solid"
            // console.log(this.getElementById("myDiv"));

        },
        onMouseLeave: () => {
            console.log('not hovering any more');
            // e => hideButton(e);
            // this.childNodes[1].childNodes[1].style.background='red';
            // this.style.background = "orange"
            // this.style.border = "none"
        },
        // onClick: () => {
        //   const newContentState = Modifier.replaceText(currentContent, currentContent.getEntity(entityKey), data.suggestion, null, annotationEntityKey);
        // }

        // onMouseUp: () => {
        //     console.log("Debug annotation button pressed...");

        //     const newContentState = Modifier.replaceText(currentContent, contentState, data.suggestion, null, entityKey);

        //     // Create the new state as an undoable action.
        //     const nextState = EditorState.push(
        //         editorState,
        //         newContentState,
        //         "corrected-state"
        //     );
        //     onComplete(nextState)
        // },
    },

        // React.createElement('ann', {
        //   id: 'ann',

        // }),
        // React.createElement('e', {
        //     class: 'button',
        //     role: 'button',
        //     onClick: () => {
        //         console.log('button pressed')
        //     }
        // }),
        props.children);
};

window.draftail.registerPlugin({
    type: 'DANNOTATE',
    source: DebugAnnotateSource,
    decorator: DebugAnnotation,
});