import { useLayer, Arrow } from "react-laag";
import { motion, AnimatePresence } from "framer-motion";

function PopoverMenu() {
  const [isOpen, setOpen] = React.useState(false);

  // helper function to close the menu
  function close() {
    setOpen(false);
  }

  const { renderLayer, triggerProps, layerProps, arrowProps } = useLayer({
    isOpen,
    onOutsideClick: close, // close the menu when the user clicks outside
    onDisappear: close, // close the menu when the menu gets scrolled out of sight
    overflowContainer: false, // keep the menu positioned inside the container
    auto: true, // automatically find the best placement
    placement: "top-end", // we prefer to place the menu "top-end"
    triggerOffset: 12, // keep some distance to the trigger
    containerOffset: 16, // give the menu some room to breath relative to the container
    arrowOffset: 16 // let the arrow have some room to breath also
  });

  // Again, we're using framer-motion for the transition effect
  return (
    <>
      <button {...triggerProps} onClick={() => setOpen(!isOpen)}>
        {isOpen ? "Hide" : "Show"}
      </button>
      {renderLayer(
        <AnimatePresence>
          {isOpen && (
            <motion.ul {...layerProps}>
              <li>Item 1</li>
              <li>Item 2</li>
              <li>Item 3</li>
              <li>Item 4</li>
              <Arrow {...arrowProps} />
            </Menu>
          )}
        </AnimatePresence>
      )}
    </>
  );
}