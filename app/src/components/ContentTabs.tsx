import { useState, useRef, useEffect, forwardRef } from "react";
import { Button, VStack, HStack, Text, Divider, Box } from "@chakra-ui/react";

import { useRouter } from "next/router";

const ContentTabs = ({
  tabs,
}: {
  tabs: { key: string; title: string; component: React.ReactElement }[];
}) => {
  const [borderPosition, setBorderPosition] = useState({ left: "0", width: "0" });
  const headersRef = useRef<{ [key: string]: HTMLButtonElement }>({});

  const router = useRouter();
  const activeTabParam = router.query.tab as string;
  const activeTabKey = activeTabParam || tabs[0]?.key || "";

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
        {tabs.find((tab) => tab.key === activeTabKey)?.component}
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
      title: string;
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
