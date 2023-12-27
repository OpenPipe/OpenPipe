import { useState } from "react";
import {
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  HStack,
  IconButton,
  Text,
  Tooltip,
} from "@chakra-ui/react";
import SyntaxHighlighter from "react-syntax-highlighter";
import { srcery } from "react-syntax-highlighter/dist/cjs/styles/hljs";
import { CopyIcon } from "lucide-react";

import { useCopyToClipboard } from "~/utils/useCopyToClipboard";

export type CodeTab = {
  title: string;
  code: string;
  language: string;
};

const CopiableCodeTabs = ({ tabs }: { tabs: CodeTab[] }) => {
  const [tabIndex, setTabIndex] = useState(0);

  const copyToClipboard = useCopyToClipboard();

  return (
    <Tabs
      index={tabIndex}
      onChange={setTabIndex}
      variant="unstyled"
      colorScheme="blue"
      bgColor="black"
      borderRadius="md"
      overflowY="hidden"
      minW={600}
    >
      <HStack w="full" justifyContent="space-between">
        <TabList>
          {tabs.map((tab, i) => (
            <StyledTab key={i} title={tab.title} />
          ))}
        </TabList>
        <Tooltip label="Copy" placement="bottom" bgColor="blue.500" borderRadius={8}>
          <IconButton
            aria-label="Copy"
            icon={<CopyIcon />}
            size="xs"
            marginRight={4}
            bgColor="transparent"
            color="gray.500"
            _hover={{
              color: "white",
            }}
            onClick={() => void copyToClipboard(tabs[tabIndex]?.code)}
          />
        </Tooltip>
      </HStack>
      <TabPanels bgColor="white">
        {tabs.map((tab, i) => (
          <TabPanel key={i} p={0} maxW={600} overflow="auto" bgColor="gray.900">
            <CodeBlock code={tab.code} language={tab.language} />
          </TabPanel>
        ))}
      </TabPanels>
    </Tabs>
  );
};

const StyledTab = ({ title }: { title: string }) => {
  const [isHovered, setIsHovered] = useState(false);
  return (
    <Tab
      color="white"
      borderColor="black"
      borderBottomWidth={1}
      _selected={{ color: "blue.500", borderColor: "blue.500" }}
      _hover={{ color: "blue.500" }}
      transition={"all 0s"}
      px={4}
      py={3}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Text py={0.5} px={2} borderRadius={8} bgColor={isHovered ? "gray.700" : undefined}>
        {title}
      </Text>
    </Tab>
  );
};

const CodeBlock = ({ code, language }: { code: string; language: string }) => {
  return (
    <SyntaxHighlighter
      language={language}
      style={srcery}
      customStyle={{
        backgroundColor: "#171923",
        padding: "32px",
        fontSize: "14px",
      }}
    >
      {code}
    </SyntaxHighlighter>
  );
};

export default CopiableCodeTabs;
