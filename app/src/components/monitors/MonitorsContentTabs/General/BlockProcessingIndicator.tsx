import { ThreeDots } from "react-loader-spinner";

export const BlockProcessingIndicator = ({ isProcessing }: { isProcessing: boolean }) => (
  <ThreeDots
    visible={isProcessing}
    height={20}
    width={20}
    ariaLabel="three-dots-loading"
    color="blue"
  />
);
