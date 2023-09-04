import { VStack, HStack, Tooltip, IconButton, Icon } from "@chakra-ui/react";
import { type CreateChatCompletionRequestMessage } from "openai/resources/chat";
import { BsX } from "react-icons/bs";

import AutoResizeTextArea from "~/components/AutoResizeTextArea";
import InputDropdown from "~/components/InputDropdown";
import { parseableToFunctionCall } from "~/utils/utils";
import FunctionCallEditor from "./FunctionCallEditor";

const MESSAGE_ROLE_OPTIONS = ["system", "user", "assistant", "function"] as const;
const OUTPUT_OPTIONS = ["plaintext", "func_call"] as const;

const EditableMessage = ({
  message,
  onEdit,
  onDelete,
  isOutput,
}: {
  message: CreateChatCompletionRequestMessage | null;
  onEdit: (message: CreateChatCompletionRequestMessage) => void;
  onDelete?: () => void;
  isOutput?: boolean;
}) => {
  const { role = "assistant", content = "", function_call } = message || {};

  const currentOutputOption: (typeof OUTPUT_OPTIONS)[number] = function_call
    ? "func_call"
    : "plaintext";

  return (
    <VStack w="full">
      <HStack w="full" justifyContent="space-between">
        <HStack>
          {!isOutput && (
            <InputDropdown
              options={MESSAGE_ROLE_OPTIONS}
              selectedOption={role}
              onSelect={(option) => {
                const updatedMessage = { role: option, content };
                if (role === "assistant" && currentOutputOption === "func_call") {
                  updatedMessage.content = JSON.stringify(function_call, null, 2);
                }
                onEdit(updatedMessage);
              }}
              inputGroupProps={{ w: "32", bgColor: "white" }}
            />
          )}
          {role === "assistant" && (
            <InputDropdown
              options={OUTPUT_OPTIONS}
              selectedOption={currentOutputOption}
              onSelect={(option) => {
                const updatedMessage: CreateChatCompletionRequestMessage = {
                  role,
                  content: null,
                  function_call: undefined,
                };
                if (option === "plaintext") {
                  updatedMessage.content = JSON.stringify(function_call, null, 2);
                } else if (option === "func_call") {
                  updatedMessage.function_call =
                    content && parseableToFunctionCall(content)
                      ? JSON.parse(content)
                      : { name: "", arguments: "{}" };
                }
                onEdit(updatedMessage);
              }}
              inputGroupProps={{ w: "32", bgColor: "white" }}
            />
          )}
        </HStack>
        {!isOutput && (
          <HStack>
            <Tooltip label="Delete" hasArrow>
              <IconButton
                aria-label="Delete"
                icon={<Icon as={BsX} boxSize={6} />}
                onClick={onDelete}
                size="xs"
                display="flex"
                colorScheme="gray"
                color="gray.500"
                variant="ghost"
              />
            </Tooltip>
          </HStack>
        )}
      </HStack>
      {function_call ? (
        <FunctionCallEditor
          function_call={function_call}
          onEdit={(function_call) => onEdit({ role, function_call, content: null })}
        />
      ) : (
        <AutoResizeTextArea
          value={content || JSON.stringify(function_call, null, 2)}
          onChange={(e) => onEdit({ role, content: e.target.value })}
          bgColor="white"
        />
      )}
    </VStack>
  );
};

export default EditableMessage;
