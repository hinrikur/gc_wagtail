
const TOP = "top";
const LEFT = "left";
const TOP_LEFT = "top-left";
const BOTTOM_LEFT = "bottom-left";
const WINDOW_X_PADDING = 16;
const WINDOW_Y_PADDING = 60;
const MENU_OVERLAP = 10;


const getTargetTop = (target) => {
    return window.pageYOffset + target.top + target.height;
};

const getTargetLeft = (target) => {
    return window.pageXOffset + target.left + (target.width / 2);
};


const positionFeedback = (target) => {

    const element = document.getElementById("feedback_popover");
    const parent = document.getElementById("annotation_popover");

    if (element === null | parent === null) {
        return;
    } else if (element["data-fixed"] === true) {
        return;
    }

    console.log(element);

    const CSS_X_TRANSFORM = element.offsetWidth * 0.40;
    const CSS_Y_TRANSFORM = element.offsetHeight * 0.09;

    const top = getTargetTop(target) - CSS_Y_TRANSFORM;
    const left = getTargetLeft(target) + CSS_X_TRANSFORM;
    var newTop = top;
    var newLeft = left;

    const trueRight = left + element.offsetWidth;
    const trueBottom = top + element.offsetHeight;

    const maxRight = window.innerWidth - WINDOW_X_PADDING;
    const maxLeft = maxRight - parent.offsetWidth - element.offsetWidth;
    const maxBottom = window.pageYOffset + window.innerHeight - WINDOW_Y_PADDING;
    const maxTop = maxBottom - element.offsetHeight;

    console.log("trueRight", trueRight);
    console.log("maxRight:", maxRight);

    if (trueRight > maxRight) {
        console.log("Previous feedback left:", left);
        // newLeft = maxLeft;

        element.style.top = `${newTop}px`;
        element.style.left = `${maxLeft}px`;
        console.log("New feedback left:", newLeft);
    }

    // element.focus();
};

const positionAnnotation = (target) => {

    const CSS_X_TRANSFORM = target.width * 0.75;
    const CSS_Y_TRANSFORM = target.height * 0.05;

    const top = getTargetTop(target);
    const left = getTargetLeft(target);
    var newTop = top;
    var newLeft = left;

    // getting by ID since only one annotation menu present in DOM at a time
    const element = document.getElementById("annotation_popover");
    if (element === null | parent === null) {
        return;
    } else if (element["data-fixed"] === true) {
        return;
    }

    const maxRight = window.innerWidth - WINDOW_X_PADDING;
    const maxLeft = maxRight - element.offsetWidth + CSS_X_TRANSFORM;
    const maxBottom = window.pageYOffset + window.innerHeight - WINDOW_Y_PADDING;
    const maxTop = maxBottom - element.offsetHeight;

    if (left > maxLeft) {
        newLeft = maxLeft;
    }
    if (top > maxTop) {
        newTop = top - element.offsetHeight - target.height - CSS_Y_TRANSFORM;
    }

    element.style.top = `${newTop}px`;
    element.style.left = `${newLeft}px`;
    element['data-fixed'] = true;
    console.log("true left:", element.style.left);
};


const getPopoverStyles = (target, direction) => {
    const top = window.pageYOffset + target.top;
    const left = window.pageXOffset + target.left;
    const bottom = window.pageYOffset;

    setTimeout(() => {
        positionAnnotation(target);
        positionFeedback(target);
    }, 1);

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

module.exports = {
    getPopoverStyles
};