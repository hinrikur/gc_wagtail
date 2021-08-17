
const React = window.React;


const CorrectionButton = (props) => {
    const { entityKey, contentState } = props;
    const data = contentState.getEntity(entityKey).getData();
  
    return React.createElement('ann', {
      role: 'button',
      onMouseUp: () => {
        console.log("Correction called!");
      },
    }, props.children);
  };

  module.exports = CorrectionButton;