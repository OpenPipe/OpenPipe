import { useState, useEffect } from "react";

const useScrolledPast = (scrollThreshold: number) => {
  const [hasScrolledPast, setHasScrolledPast] = useState(true);

  useEffect(() => {
    const container = document.getElementById("output-container");

    if (!container) {
      console.warn('Element with id "outputs-container" not found.');
      return;
    }

    const checkScroll = () => {
      const { scrollTop } = container;

      // Check if scrollTop is greater than or equal to scrollThreshold
      setHasScrolledPast(scrollTop > scrollThreshold);
    };

    checkScroll();

    container.addEventListener("scroll", checkScroll);

    // Cleanup
    return () => {
      container.removeEventListener("scroll", checkScroll);
    };
  }, []);

  return hasScrolledPast;
};

export default useScrolledPast;
