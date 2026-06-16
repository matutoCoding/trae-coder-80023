import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "@/pages/Home";
import Delivery from "@/pages/Delivery";
import Verify from "@/pages/Verify";
import Pricing from "@/pages/Pricing";
import Bills from "@/pages/Bills";
import Lockers from "@/pages/Lockers";
import OpsDashboard from "@/pages/OpsDashboard";
import BottomNav from "@/components/BottomNav";

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-industrial-900 text-white">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/delivery" element={<Delivery />} />
          <Route path="/verify" element={<Verify />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/bills" element={<Bills />} />
          <Route path="/lockers" element={<Lockers />} />
          <Route path="/ops" element={<OpsDashboard />} />
        </Routes>
        <BottomNav />
      </div>
    </Router>
  );
}
