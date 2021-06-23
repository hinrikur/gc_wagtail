const React = window.React;

const TOP = "top";
const LEFT = "left";
const TOP_LEFT = "top-left";
const BOTTOM_LEFT = "bottom-left";

const getPopoverStyles = (target, direction) => {
  const top = window.pageYOffset + target.top;
  const left = window.pageXOffset + target.left;
  const bottom = window.pageYOffset;

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
const Popover = ({ target, children, direction, clsName }) =>
  /*#__PURE__*/ React.createElement(
  "div",
  {
    style: getPopoverStyles(target, direction),
    className: `${clsName}-${direction}`,
    role: "tooltip"
  },
  children
);





module.exports = Popover;
