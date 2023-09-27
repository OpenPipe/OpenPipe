import { useState, useRef, useEffect, forwardRef } from "react";

import { Button, VStack, HStack, Text, Divider, Box } from "@chakra-ui/react";
import General from "./General/General";
import TrainingData from "./TrainingData/TrainingData";

const tabs = [
  {
    key: "general",
    title: "General",
  },
  {
    key: "training-data",
    title: "Training Data",
  },
] as const;

const ContentTabs = () => {
  const [activeTabKey, setActiveTabKey] = useState<(typeof tabs)[number]["key"]>(tabs[0].key);
  const [borderPosition, setBorderPosition] = useState({ left: "0", width: "0" });
  const headersRef = useRef<{ [key: string]: HTMLButtonElement }>({});

  useEffect(() => {
    const activeTab = headersRef.current[activeTabKey];
    if (activeTab) {
      setBorderPosition({
        left: `${activeTab.offsetLeft}px`,
        width: `${activeTab.offsetWidth}px`,
      });
    }
  }, [activeTabKey]);

  return (
    <VStack w="full" h="full" alignItems="flex-start" spacing={0}>
      <HStack position="relative">
        {tabs.map((tab) => (
          <TabHeader
            key={tab.key}
            title={tab.title}
            isSelected={activeTabKey === tab.key}
            onClick={() => setActiveTabKey(tab.key)}
            ref={(el) => {
              if (el) headersRef.current[tab.key] = el;
            }}
          />
        ))}
        <Box
          position="absolute"
          bottom="0"
          left={borderPosition.left}
          w={borderPosition.width}
          h="2px"
          bg="blue.500"
          transition="all 0.3s"
        />
      </HStack>
      <Divider />
      <HStack pt={8} w="full" h="full" alignSelf="center">
        {activeTabKey === "general" && <General />}
        {activeTabKey === "training-data" && <TrainingData />}
      </HStack>
    </VStack>
  );
};

const TabHeader = forwardRef(
  (
    {
      title,
      isSelected,
      onClick,
    }: {
      title: (typeof tabs)[number]["title"];
      isSelected: boolean;
      onClick: () => void;
    },
    ref: React.Ref<HTMLButtonElement>,
  ) => {
    return (
      <Button variant="unstyled" onClick={onClick} px={2} ref={ref}>
        <Text color={isSelected ? "black" : "gray"}>{title}</Text>
      </Button>
    );
  },
);

TabHeader.displayName = "TabHeader";

export default ContentTabs;
