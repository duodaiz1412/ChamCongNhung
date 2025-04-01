import React, { useState } from "react";
import { Box, Text, HStack, Button, VStack, Input } from "@chakra-ui/react";
import { IFingerprint } from "@/types";

interface FingerprintListProps {
  fingerprints: IFingerprint[];
  onUpdate: (timestamp: string, newFingerID: string) => void;
  onDelete: (timestamp: string) => void;
  fingerprintIds: number[]; // Danh sách ID từ cảm biến
  onDeleteFromSensor: (id: number) => void; // Callback xóa từ cảm biến
}

const FingerprintList: React.FC<FingerprintListProps> = ({
  fingerprints,
  onUpdate,
  onDelete,
  fingerprintIds,
  onDeleteFromSensor,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");

  const handleEdit = (fp: IFingerprint) => {
    setEditingId(fp.timestamp);
    setEditValue(fp.fingerID);
  };

  const handleSave = (timestamp: string) => {
    onUpdate(timestamp, editValue);
    setEditingId(null);
  };

  return (
    <VStack gap={4} w="100%">
      <Text fontWeight="bold">Fingerprints in Sensor:</Text>
      {fingerprintIds.length > 0 ? (
        fingerprintIds.map((id) => (
          <Box key={id} p={4} borderWidth="1px" borderRadius="md" w="100%">
            <HStack justify="space-between">
              <Text>ID: {id}</Text>
              <Button
                size="sm"
                colorScheme="red"
                onClick={() => onDeleteFromSensor(id)}
              >
                Delete from Sensor
              </Button>
            </HStack>
          </Box>
        ))
      ) : (
        <Text>No fingerprints in sensor</Text>
      )}

      <Text fontWeight="bold">Attendance Log:</Text>
      {fingerprints.length === 0 ? (
        <Text>No attendance records</Text>
      ) : (
        fingerprints.map((fp) => (
          <Box key={fp.timestamp} p={4} borderWidth="1px" borderRadius="md" w="100%">
            <HStack justify="space-between">
              {editingId === fp.timestamp ? (
                <Input
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  type="number"
                />
              ) : (
                <Text>Fingerprint ID: {fp.fingerID}</Text>
              )}
              <HStack>
                {editingId === fp.timestamp ? (
                  <Button
                    size="sm"
                    colorScheme="green"
                    onClick={() => handleSave(fp.timestamp)}
                  >
                    Save
                  </Button>
                ) : (
                  <Button size="sm" colorScheme="blue" onClick={() => handleEdit(fp)}>
                    Edit
                  </Button>
                )}
                <Button
                  size="sm"
                  colorScheme="red"
                  onClick={() => onDelete(fp.timestamp)}
                >
                  Delete
                </Button>
              </HStack>
            </HStack>
            <Text fontSize="sm" color="gray.500">
              {new Date(fp.timestamp).toLocaleString()}
            </Text>
          </Box>
        ))
      )}
    </VStack>
  );
};

export default FingerprintList;