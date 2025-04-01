import {BrowserRouter, Outlet, Route, Routes} from "react-router";
import HomeLayout from "./layout/HomeLayout";
import Home from "./pages/Home";
import About from "./pages/About";
import Attendance from "./pages/Attendance";

function App() {
  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route
            element={
              <HomeLayout>
                <Outlet />
              </HomeLayout>
            }
          >
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/attendance" element={<Attendance />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;
