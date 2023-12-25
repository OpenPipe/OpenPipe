import { useState } from "react";
import {
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  HStack,
  IconButton,
  useToast,
  Text,
  Tooltip,
} from "@chakra-ui/react";
import SyntaxHighlighter from "react-syntax-highlighter";
import { tomorrowNightBright } from "react-syntax-highlighter/dist/cjs/styles/hljs";
import { CopyIcon } from "lucide-react";

export type CodeTab = {
  title: string;
  code: string;
  language: string;
};

const CopiableCodeTabs = ({ tabs }: { tabs: CodeTab[] }) => {
  const [tabIndex, setTabIndex] = useState(0);

  const toast = useToast();

  const copyToClipboard = async (text?: string) => {
    try {
      await navigator.clipboard.writeText(text as string);
      toast({
        title: "Copied to clipboard",
        status: "success",
        duration: 2000,
      });
    } catch (err) {
      toast({
        title: "Failed to copy to clipboard",
        status: "error",
        duration: 2000,
      });
    }
  };

  return (
    <Tabs
      index={tabIndex}
      onChange={setTabIndex}
      variant="unstyled"
      colorScheme="blue"
      bgColor="black"
      borderTopLeftRadius={4}
      borderTopRightRadius={4}
      overflowY="hidden"
      minW={600}
    >
      <HStack w="full" justifyContent="space-between">
        <TabList>
          {tabs.map((tab, i) => (
            <StyledTab key={i} title={tab.title} />
          ))}
        </TabList>
        <Tooltip label="Copy" placement="bottom" bgColor="orange.500" borderRadius={8}>
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
      _selected={{ color: "orange.500", borderColor: "orange.500" }}
      _hover={{ color: "orange.500" }}
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
      style={tomorrowNightBright}
      customStyle={{
        backgroundColor: "#171923",
        padding: "32px",
      }}
    >
      {code}
    </SyntaxHighlighter>
  );
};

export default CopiableCodeTabs;
