
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