import {Routes, Route, Navigate} from "react-router-dom"
import Login from "./pages/Login.jsx";
import Register from './pages/Register.jsx'
import Home from "./pages/Home.jsx"
import DriverDashboard from "./pages/DriverDashboard.jsx"
import PassengerDashboard from "./pages/PassengerDashboard.jsx"
import Portal from "./pages/Portal.jsx";
import Dashboard from "./pages/Dashboard.jsx";

function App() {

  const role = localStorage.getItem("role");

  return (
    <Routes>
      <Route path="/" element={<Home/>} />
      <Route path="/register" element={<Register/>} />
      <Route path="/login" element={<Login />} />
      <Route path="/portal" element={<Portal />} />
      <Route
        path="/dashboard"
        element={role === "ADMIN" ? <Dashboard /> : <Navigate to="/login" />}
      />
      <Route
        path="/driver"
        element={role==="DRIVER" ? <DriverDashboard/> : <Navigate to="/login"/>}
      />
      <Route
        path="/passenger"
        element={(role === "PASSENGER" || role === "DRIVER") ? <PassengerDashboard/> : <Navigate to="/login"/> }
      />
    </Routes>
  )

}

export default App;