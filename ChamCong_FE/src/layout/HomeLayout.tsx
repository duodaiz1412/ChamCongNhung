import Navbar from "./components/Navbar";
import "./index.scss";

interface HomeLayoutProps {
  children: JSX.Element;
}

export default function HomeLayout({children}: HomeLayoutProps) {
  return (
    <div className="relative min-h-screen">
      <Navbar />
      {/* <Header /> */}
      <main className="pt-[64px]">
        {children}
      </main>
    </div>
  );
}
