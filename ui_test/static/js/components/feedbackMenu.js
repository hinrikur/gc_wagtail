
const React = window.React;

class FeedbackMenu extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            showTooltipAt: null
        };
        this.openTooltip = this.openTooltip.bind(this);
        this.closeTooltip = this.closeTooltip.bind(this);
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

    render() {
        const {
            editorState,
            entityKey,
            contentState,
            children,
            onEdit,
            onRemove,
            icon,
            label,
            data
        } = this.props;

        const { showTooltipAt } = this.state;

    }
}

module.exports = FeedbackMenu;