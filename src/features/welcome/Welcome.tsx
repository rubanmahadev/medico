import React from "react";
import styles from './Welcome.module.css';
import { useNavigate } from "react-router-dom";
import { setUserType } from "../../core/userTypeservice";
const Welcome:React.FC = ()=>{
    const navigate = useNavigate();
     const handleSelect = (role: 'careTaker' | 'patient') => {
    const userType = {
      careTaker: role === 'careTaker',
      patient: role === 'patient'
    };
    setUserType(userType);
    navigate('/login');
  };
  localStorage.removeItem('userType');
    return(
       <div className="h-screen flex justify-center items-center">
        <div className="container px-4 flex flex-col justify-center items-center">
        <h1 className={`mb-3 font-semibold ${styles.welcomeNote}`}>Welcome to MediCo</h1>
        <p className="mb-10 text-xl">Where daily wellness meets attentive care</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-10" >
            <div onClick={() => handleSelect('patient')} className="bg-gradient-to-br from-blue-100 to-white shadow-md hover:shadow-xl hover:scale-105 transition rounded-2xl p-6  text-center w-[400px] sm:w-[380px] cursor-pointer">
                <h3 className="text-2xl font-semibold mb-4">Patient</h3>
                <p className="text-md text-black/40 mb-2">Track your medication schedule and maintain your health records</p>
                <span className="font-semibold text-sm">Click to Continue</span>
                {/* <button className="" >Continue as Patient</button> */}
            </div>
            <div onClick={() => handleSelect('careTaker')} className="bg-gradient-to-br from-green-100 to-white shadow-md hover:shadow-xl hover:scale-105 transition rounded-2xl p-6 text-center  w-[400px] sm:w-[380px] cursor-pointer ">
                <h3 className="text-2xl font-semibold mb-4">Caretaker</h3>
                <p className="text-md text-black/40 mb-2">Monitor and support your loved one's medication adherence</p>
                <span className="font-semibold text-sm">Click to Continue</span>
                {/* <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-xl shadow-sm transition duration-200" >Continue as Caretaker</button> */}
            </div>
        </div>
        </div>
       </div>
    )
}
export default Welcome