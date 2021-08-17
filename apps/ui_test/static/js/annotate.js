const React = window.React;

const AnnotationEntity = require('./components/AnnotationEntity.js');
const AnnotationSource = require('./sources/AnnotationSource.js');

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
    },
        props.children);
};

// Register DANNOTATE plugin to draftail editor
window.draftail.registerPlugin({
    type: 'ANNOTATION',
    source: AnnotationSource,
    decorator: Annotation,
});