import { useState, useRef, useEffect, forwardRef } from "react";
import { Button, VStack, HStack, Text, Divider, Box, type StackProps } from "@chakra-ui/react";

import { useRouter, type NextRouter } from "next/router";

const ContentTabs = ({
  tabs,
  headerProps,
  rightHeader,
  trackTabInUrl = true,
}: {
  tabs: { key: string; title: string; component: React.ReactElement }[];
  headerProps?: StackProps;
  rightHeader?: React.ReactElement;
  trackTabInUrl?: boolean;
}) => {
  const [borderPosition, setBorderPosition] = useState({ left: "0", width: "0" });
  const headersRef = useRef<{ [key: string]: HTMLButtonElement }>({});

  const router = useRouter();
  const activeTabParam = router.query.tab as string;
  const [activeTabState, setActiveTabState] = useState(tabs[0]?.key || "");

  const activeTabKey = trackTabInUrl ? activeTabParam || tabs[0]?.key || "" : activeTabState;

  useEffect(() => {
    const activeTab = headersRef.current[activeTabKey];
    if (activeTab) {
      setBorderPosition({
        left: `${activeTab.offsetLeft}px`,
        width: `${activeTab.offsetWidth}px`,
      });
    }
  }, [activeTabKey]);

  const handleTabChange = (newTabKey: string) => {
    if (trackTabInUrl) {
      setActiveTab(newTabKey, router);
    } else {
      setActiveTabState(newTabKey);
    }
  };

  return (
    <>
      <VStack w="full" alignItems="flex-start" spacing={0} pb={8} {...headerProps}>
        <HStack w="full" justifyContent="space-between">
          <HStack position="relative">
            {tabs.map((tab) => (
              <TabHeader
                key={tab.key}
                title={tab.title}
                isSelected={activeTabKey === tab.key}
                onClick={() => handleTabChange(tab.key)}
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
          {rightHeader}
        </HStack>
        <Divider />
      </VStack>
      {tabs.find((tab) => tab.key === activeTabKey)?.component}
    </>
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
  const projectSlug = router.query.projectSlug as string;
  const id = router.query.id as string;
  const basePath = router.pathname
    .split("/")
    .slice(0, -1)
    .join("/") as "/p/[projectSlug]/datasets/[id]";

  void router.push(
    { pathname: `${basePath}/[tab]`, query: { projectSlug, id, tab: newTabKey } },
    undefined,
    { shallow: true },
  );
};
