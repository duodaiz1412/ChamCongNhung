import {Button} from "antd";
import {useNavigate} from "react-router";

export default function Home(): JSX.Element {
  const navigate = useNavigate();
  return (
    <div className="container flex flex-col w-full h-full gap-4 p-6">
      <div className="text-4xl font-bold text-center">Home</div>
      <div className="text-2xl text-center">Welcome to the Home page!</div>
      <Button
        color="default"
        className="w-fit mx-auto"
        onClick={() => navigate("/about")}
      >
        Click me!
      </Button>
    </div>
  );
}
