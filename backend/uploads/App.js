import React from 'react';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import Home from './Home';
import About from './About';

function App() {
    return (
        <Router>
            <div>
                <nav className="navbar">
                    <Link to="/">Home</Link>
                    <Link to="/about">About</Link>
                </nav>
                <div className="container">
                    <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/about" element={<About />} />
                    </Routes>
                </div>
            </div>
        </Router>
    );
}

export default App;