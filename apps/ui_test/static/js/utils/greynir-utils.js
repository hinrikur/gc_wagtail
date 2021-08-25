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

function range(start, end) {
    var ans = [];
    for (let i = start; i <= end; i++) {
        ans.push(i);
    }
    return ans;
}

function adjustChars(paragraph) {

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

// iterates over API response JSON and returns flat
// array of annotations (annotationArray)
function processAPI(json) {

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

module.exports = {
    callGreynirAPI,
    replyGreynirAPI,
    processAPI,
};