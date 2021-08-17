const React = window.React;

const PopoverUtils = require('../utils/popover-utils.js');
const getPopoverStyles = PopoverUtils.getPopoverStyles;

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
