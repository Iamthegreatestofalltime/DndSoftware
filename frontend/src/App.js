import logo from './logo.svg';
import './App.css';
import { UserProvider } from './components/UserContext';
import Home from './components/Home';
import { BrowserRouter as Router, Route, Routes, Navigate, useNavigate } from 'react-router-dom';
import SignUp from './components/SignUp';
import Documentation from './components/Documentation';
import Dashboard from './components/Dashboard';
import Editor from './components/Editor';

function App() {
  return (
    <Router>
      <UserProvider>
        <Routes>
          <Route path="*" element={<Home />} />
          <Route path="/SignUp" element={<SignUp/>} />
          <Route path="/Documentation" element={<Documentation/>}/>
          <Route path="/Dashboard" element={<Dashboard/>}/>
          <Route path="/Editor" element={<Editor/>} />
        </Routes>
      </UserProvider>
    </Router>
  );
}

export default App;
