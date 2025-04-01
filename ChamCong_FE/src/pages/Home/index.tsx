import {Button} from "@chakra-ui/react";
import {useNavigate} from "react-router";

export default function Home(): JSX.Element {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center w-full h-full gap-4 mx-4 my-3">
      <div className="text-4xl font-bold text-center">Home</div>
      <div className="text-2xl text-center">Welcome to the Home page!</div>
      <Button
        colorScheme="brand"
        paddingX={"12px"}
        background="#4f4f4f"
        color="#FFF"
        onClick={() => navigate("/about")}
      >
        Click me!
      </Button>
    </div>
  );
}
