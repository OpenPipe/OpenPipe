import { useState, useRef, useEffect, forwardRef } from "react";
import { Button, VStack, HStack, Text, Divider, Box } from "@chakra-ui/react";

import General from "./General/General";
import TrainingData from "./TrainingData/TrainingData";
import TestingData from "./TestingData/TestingData";
import { useRouter } from "next/router";

const tabs = [
  {
    key: "general",
    title: "General",
  },
  {
    key: "training-data",
    title: "Training Data",
  },
  {
    key: "test-output",
    title: "Test Output",
  },
] as const;

const ContentTabs = () => {
  const [borderPosition, setBorderPosition] = useState({ left: "0", width: "0" });
  const headersRef = useRef<{ [key: string]: HTMLButtonElement }>({});

  const router = useRouter();
  const activeTabParam = router.query.tab as string;
  const activeTabKey = (activeTabParam as (typeof tabs)[number]["key"]) || "general";

  const setActiveTab = (newTabKey: string) => {
    void router.push(
      {
        pathname: router.pathname,
        query: { ...router.query, tab: newTabKey },
      },
      undefined,
      { shallow: true },
    );
  };

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
            onClick={() => setActiveTab(tab.key)}
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
        {activeTabKey === "test-output" && <TestingData />}
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
