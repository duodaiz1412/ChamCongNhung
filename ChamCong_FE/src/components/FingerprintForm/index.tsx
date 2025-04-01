import React, {useState} from "react";
import {Box, Input, Button, HStack, VStack, Text} from "@chakra-ui/react";

interface FingerprintFormProps {
  onAdd: (fingerID: string, name: string) => void;
}

const FingerprintForm: React.FC<FingerprintFormProps> = ({onAdd}) => {
  const [fingerID, setFingerID] = useState<string>("");
  const [name, setName] = useState<string>("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (fingerID && name) {
      onAdd(fingerID, name);
      setFingerID("");
      setName("");
    }
  };

  return (
    <Box as="form" onSubmit={handleSubmit}>
      <HStack gap={4} alignItems="flex-end">
        <VStack alignItems="flex-start" gap={1}>
          <Text fontWeight="medium" fontSize="sm">
            Fingerprint ID
          </Text>
          <Input
            value={fingerID}
            onChange={(e) => setFingerID(e.target.value)}
            placeholder="Enter Fingerprint ID"
            type="number"
          />
        </VStack>
        <VStack alignItems="flex-start" gap={1}>
          <Text fontWeight="medium" fontSize="sm">
            Name
          </Text>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter Name"
            type="text"
          />
        </VStack>
        <Button mt={2} colorScheme="teal" type="submit">
          Add
        </Button>
      </HStack>
    </Box>
  );
};

export default FingerprintForm;
