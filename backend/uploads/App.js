import React from 'react';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import Home from './Home';
import About from './About';
import './styles.css';
function App() {
  return <Router className="e5tbn1u54">
            <div className="enevnlx3b">
                <nav className="e6hdv9s9a">
                    <Link to="/" className="eptdc4xs3">Home</Link>
                    <Link to="/about" className="e8f1chgu5">About</Link>
                </nav>
                <div className="eb37lw25z">
                    <Routes className="eemzy5gd1">
                        <Route path="/" element={<Home className="euy5wvyl3" />} className="ev465dr2k" />
                        <Route path="/about" element={<About className="e2rsz4kt7" />} className="ezm1fshov" />
                    </Routes>
                </div>
            </div>
        </Router>;
}
export default App;