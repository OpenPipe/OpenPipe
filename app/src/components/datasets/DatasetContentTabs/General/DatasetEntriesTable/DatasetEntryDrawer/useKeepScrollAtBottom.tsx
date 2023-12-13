import { useEffect, useState } from "react";

const useKeepScrollAtBottom = (parentId: string, childId: string) => {
  const [isScrolledToBottom, setIsScrolledToBottom] = useState(false);

  useEffect(() => {
    const container = document.getElementById(parentId);
    const child = document.getElementById(childId);
    if (!container || !child) return;

    // Function to check if the container is scrolled to the bottom
    const checkIfScrolledToBottom = (): void => {
      const atBottom = container.scrollHeight - container.clientHeight <= container.scrollTop + 1;
      setIsScrolledToBottom(atBottom);
    };

    // Function to scroll to the bottom
    const scrollToBottom = (): void => {
      container.scrollTop = container.scrollHeight - container.clientHeight;
    };

    // Check scroll position initially
    checkIfScrolledToBottom();

    // Event listener for scroll events
    const handleScroll = () => {
      checkIfScrolledToBottom();
    };

    // Add scroll event listener to the container
    container.addEventListener("scroll", handleScroll);

    // Observer to watch for changes in the child's size
    const resizeObserver = new ResizeObserver(() => {
      if (isScrolledToBottom) {
        scrollToBottom();
      }
    });

    resizeObserver.observe(child);

    return () => {
      container.removeEventListener("scroll", handleScroll);
      resizeObserver.disconnect();
    };
  }, [parentId, childId, isScrolledToBottom, setIsScrolledToBottom]);
};

export default useKeepScrollAtBottom;
