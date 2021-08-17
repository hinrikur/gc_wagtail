


const RemoveAnnotationsSource = require('./sources/RemoveAnnotationsSource.js');

const RMVANN = (props) => {
    // Nothing rendered on annotation deletion!
};

window.draftail.registerPlugin({
    type: 'RMVANN',
    source: RemoveAnnotationsSource,
    decorator: RMVANN,
});