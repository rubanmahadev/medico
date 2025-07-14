import React, { useState,useEffect } from "react";
import { useForm } from 'react-hook-form';
import styles from './Login.module.css'
import { Link } from "react-router-dom";
import { getUserType } from "../../core/userTypeservice";
import Swal from 'sweetalert2';
import { loginUser } from "../../core/authService";
import { useNavigate } from 'react-router-dom';
import FullPageLoader from '../../shared/Loader/FullPageLoader';
type LoginFormInputs = {
    userId: string;
    password: string;
};
type UserType = {
  careTaker: boolean;
  patient: boolean;
};

const Login: React.FC = () => {
    const [userType, setUserType] = useState<UserType | null>();
const [loading, setLoading] = useState<boolean>(false);
const navigate = useNavigate();

    const [userData, setUserData] = useState<any | null>(null);
    const {
        register,
        handleSubmit,
        formState: { errors }
    } = useForm<LoginFormInputs>();

   useEffect(() => {
  const user = getUserType();
  setUserType(user);
}, []); 
    
   const onSubmit = async (data: LoginFormInputs) => {
  setLoading(true);

  const { data: res, error } = await loginUser(data.userId, data.password);

  if (res && res.user) {
    const user = res.user;
    const userId = user.id;
    const accType = user.user_metadata?.accType;

    setUserData(user);

    // Route based on user type and metadata
    if (userType?.careTaker && accType === 'careTaker') {
      navigate('/caretakermenu', { state: { userID: userId } });
    } else if (userType?.patient && accType === 'patient') {
      navigate('/patientmenu', { state: { userID: userId } });
    } else {
        setLoading(false);
      Swal.fire({
        icon: 'error',
        title: 'Account Type Mismatch!',
        text: 'Login type does not match your account role.',
        confirmButtonText: 'OK',
      });
    }

  } else if (error) {
    // Show error message from Supabase login
    Swal.fire({
      icon: 'error',
      title: 'Login Failed',
      text: error.message,
      confirmButtonText: 'OK',
    }).then(() => {
      navigate('/');
    });
  }

  setLoading(false);
};


    return (
        <div className={styles.mainContainer}>
            {loading && <FullPageLoader />}
            <div className=" flex flex-col items-center">
                <div>
                    <h1 className="flex items-start font-semibold gap-1" >Medi<img src="src/assets/medicologo.png" alt="" height="55px" width="55px" />Co</h1>
                </div>
                <p className="font-semibold opacity-75 mt-1">Login as {userType?.careTaker ? 'Care Taker' : 'Patient'}</p>
            </div>
            <div className={styles.container}>
                <form onSubmit={handleSubmit(onSubmit)} >
                    <div className={styles['form-group']}>
                        <label>User ID</label>
                        <input type="text"
                            {...register('userId', { required: 'User ID is required' })}
                            placeholder="User ID"
                        />
                        {errors.userId && <p className={styles.reqText}>{errors.userId.message}</p>}
                    </div>
                    <div className={styles['form-group']}>
                        <label>Password</label>
                        <input type="password"
                            {...register('password', { required: 'password is required' })}
                            placeholder="Password"
                        />
                        {errors.password && <p className={styles.reqText}>{errors.password.message}</p>}
                    </div>
                    <div className="flex justify-between">
                        <button className={styles['login-button']} type="submit" >Login</button>
                        <Link to="/Register" ><button className={styles['login-button']}  >Sign Up</button></Link>
                    </div>
                </form>
            </div>
        </div>
    );
}



export default Login