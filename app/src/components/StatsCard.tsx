import { VStack, HStack, type StackProps, Text, Divider } from "@chakra-ui/react";
import Link, { type LinkProps } from "next/link";

const StatsCard = ({
  title,
  href,
  children,
  ...rest
}: { title: string; href: string } & StackProps & LinkProps) => {
  return (
    <VStack flex={1} borderWidth={1} padding={4} borderRadius={4} borderColor="gray.300" {...rest}>
      <HStack w="full" justifyContent="space-between">
        <Text fontSize="md" fontWeight="bold">
          {title}
        </Text>
        <Link href={href}>
          <Text color="blue">View all</Text>
        </Link>
      </HStack>
      <Divider />
      {children}
    </VStack>
  );
};

export default StatsCard;
