"use client";

import {
  Box,
  Flex,
  Text,
  Button,
  Stack,
  useBreakpointValue,
  Link,
} from "@chakra-ui/react";
import { useColorModeValue } from "@chakra-ui/system";

export default function Navbar() {
  return (
    <Box position={"fixed"} w={"100%"} zIndex={1}>
      <Flex
        bg={useColorModeValue("white", "gray.800")}
        color={useColorModeValue("gray.600", "white")}
        minH={"60px"}
        py={{ base: 2 }}
        px={{ base: 4 }}
        borderBottom={1}
        borderStyle={"solid"}
        borderColor={useColorModeValue("gray.200", "gray.900")}
        align={"center"}
      >
        {/* First Stack: Logo */}
        <Stack direction={"row"} align={"center"} marginLeft={5}>
          <Text
            textAlign={useBreakpointValue({ base: "center", md: "left" })}
            fontFamily={"heading"}
            color={useColorModeValue("gray.800", "white")}
          >
            Logo
          </Text>
        </Stack>

        {/* Second Stack: Navigation Links (Home, Shop, Library, About) */}
        <Stack
          direction={"row"}
          gap={6}
          flex={1}
          justify={"center"}
          align={"center"}
          marginLeft={"24"}
          display={{ base: "none", md: "flex" }}
        >
          <Button asChild variant={"ghost"} colorScheme="blue">
            <Link href="/">Home</Link>
          </Button>
          <Button asChild variant={"ghost"} colorScheme="blue">
            <Link href="/attendance">Attendance</Link>
          </Button>
          <Button asChild variant={"ghost"} colorScheme="blue">
            <Link href="/library">Library</Link>
          </Button>
          <Button asChild variant={"ghost"} colorScheme="blue">
            <Link href="/about">About</Link>
          </Button>
        </Stack>

        {/* Third Stack: User Actions (Sign Up, Login) */}
        <Stack
          direction={"row"}
          gap={6}
          justify={"flex-end"}
          align={"center"}
          marginRight={5}
          display={{ base: "none", md: "flex" }}
        >
          <Button
            asChild
            fontSize={"sm"}
            fontWeight={400}
            variant={"ghost"}
            colorScheme="blue"
          >
            <Link href="#">Sign Up</Link>
          </Button>
          <Button
            asChild
            display={{ base: "none", md: "inline-flex" }}
            fontSize={"sm"}
            fontWeight={600}
            color={"white"}
            bg={"pink.400"}
            _hover={{
              bg: "pink.300",
            }}
          >
            <Link href="#">Login</Link>
          </Button>
        </Stack>
      </Flex>
    </Box>
  );
}