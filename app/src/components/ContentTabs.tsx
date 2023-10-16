import { useState, useRef, useEffect, forwardRef } from "react";
import { Button, VStack, HStack, Text, Divider, Box, type StackProps } from "@chakra-ui/react";

import { useRouter, type NextRouter } from "next/router";

const ContentTabs = ({
  tabs,
  headerProps,
  ...props
}: {
  tabs: { key: string; title: string; component: React.ReactElement }[];
  headerProps?: StackProps;
} & StackProps) => {
  const [borderPosition, setBorderPosition] = useState({ left: "0", width: "0" });
  const headersRef = useRef<{ [key: string]: HTMLButtonElement }>({});

  const router = useRouter();
  const activeTabParam = router.query.tab as string;
  const activeTabKey = activeTabParam || tabs[0]?.key || "";

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
    <VStack w="full" flex={1} {...props}>
      <VStack w="full" alignItems="flex-start" spacing={0} {...headerProps}>
        <HStack position="relative">
          {tabs.map((tab) => (
            <TabHeader
              key={tab.key}
              title={tab.title}
              isSelected={activeTabKey === tab.key}
              onClick={() => setActiveTab(tab.key, router)}
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
      </VStack>
      <Box w="full" pt={8}>
        {tabs.find((tab) => tab.key === activeTabKey)?.component}
      </Box>
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

export const setActiveTab = (newTabKey: string, router: NextRouter) => {
  const datasetId = router.query.id as string; // extract dataset id from the router
  void router.push(
    { pathname: "/datasets/[id]/[tab]", query: { id: datasetId, tab: newTabKey } },
    undefined,
    { shallow: true },
  );
};