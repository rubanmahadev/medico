// import { useState } from 'react'
import './App.css'

import { BrowserRouter as Router,Routes,Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast';
import Login from './features/login/Login';
import Register from './features/register/Register';
import Welcome from './features/welcome/Welcome';
import Home from './features/home/home';
import CareTakerMenu from './features/caretaker/CareTakerMenu';
import PatientMenu from './features/patient/PatientMenu';
function App() {

  return (
    <>
      <Toaster position="top-right" />
    <Router>
      <Routes>
        <Route path="/" element={<Welcome />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/home" element={<Home />} />
        <Route path="/caretakermenu" element={<CareTakerMenu />} />
        <Route path="/patientmenu" element={<PatientMenu />} />
      </Routes>
    </Router>
    </>
  )
}

export default App
