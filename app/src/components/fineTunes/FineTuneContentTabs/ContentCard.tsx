import { Card, type CardProps } from "@chakra-ui/react";

const ContentCard = (props: CardProps) => (
  <Card variant="outline" w="full" p={4} br={4} borderColor="gray.200" {...props} />
);

export default ContentCard;
