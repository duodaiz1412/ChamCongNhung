import {useState, useEffect} from "react";
import {Box, Heading, VStack, Text} from "@chakra-ui/react";
import axios from "axios";
import {IFingerprint, IFingerprintData} from "@/types";
import FingerprintForm from "@/components/FingerprintForm";
import FingerprintList from "@/components/FingerprintList";

const API_URL = "http://localhost:3000/api/data";
const FINGERPRINTS_URL = "http://localhost:3000/api/fingerprints";
const DELETE_URL = "http://localhost:3000/api/delete-fingerprint";

export default function Attendance() {
  const [fingerprints, setFingerprints] = useState<IFingerprint[]>([]);
  const [fingerprintData, setFingerprintData] = useState<IFingerprintData>({
    count: 0,
    ids: [],
  });

  const fetchFingerprints = async () => {
    try {
      const response = await axios.get<{status: string; data: IFingerprint[]}>(
        API_URL,
      );
      setFingerprints(response.data.data);
    } catch (error) {
      console.error("Error fetching fingerprints:", error);
    }
  };

  const fetchFingerprintData = async () => {
    try {
      const response = await axios.get<{
        status: string;
        data: IFingerprintData;
      }>(FINGERPRINTS_URL);
      setFingerprintData(response.data.data);
    } catch (error) {
      console.error("Error fetching fingerprint data:", error);
    }
  };

  useEffect(() => {
    fetchFingerprints();
    fetchFingerprintData();
    // Tự động cập nhật mỗi 5 giây để phản ánh thay đổi từ ESP8266
    const interval = setInterval(() => {
      fetchFingerprintData();
      fetchFingerprints();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const addFingerprint = async (fingerID: string, name: string) => {
    try {
      const response = await axios.post<{status: string; data: IFingerprint}>(
        API_URL,
        {
          id: fingerID,
          name, // Thêm name vào payload
          action: "add",
        },
      );
      setFingerprints([...fingerprints, response.data.data]);
    } catch (error) {
      console.error("Error adding fingerprint:", error);
    }
  };

  const updateFingerprint = async (timestamp: string, newFingerID: string) => {
    try {
      const response = await axios.put<{status: string; data: IFingerprint}>(
        `${API_URL}/${timestamp}`,
        {fingerID: newFingerID},
      );
      setFingerprints(
        fingerprints.map((fp) =>
          fp.timestamp === timestamp ? response.data.data : fp,
        ),
      );
    } catch (error) {
      console.error("Error updating fingerprint:", error);
    }
  };

  const deleteFingerprint = async (timestamp: string) => {
    try {
      await axios.delete(`${API_URL}/${timestamp}`);
      setFingerprints(fingerprints.filter((fp) => fp.timestamp !== timestamp));
    } catch (error) {
      console.error("Error deleting fingerprint:", error);
    }
  };

  const deleteFromSensor = async (id: number) => {
    try {
      await axios.post(DELETE_URL, {id});
      console.log("Delete request sent for ID:", id);
      // Đợi ESP8266 cập nhật (tự động qua interval)
    } catch (error) {
      console.error("Error sending delete request:", error);
    }
  };

  return (
    <Box p={8} maxW="600px" mx="auto">
      <Heading mb={6}>Fingerprint Manager</Heading>
      <Text mb={4}>Total fingerprints in sensor: {fingerprintData.count}</Text>
      <VStack gap={4}>
        <FingerprintForm onAdd={addFingerprint} />
        <FingerprintList
          fingerprints={fingerprints}
          onUpdate={updateFingerprint}
          onDelete={deleteFingerprint}
          fingerprintIds={fingerprintData.ids}
          onDeleteFromSensor={deleteFromSensor}
        />
      </VStack>
    </Box>
  );
}
