import React, {useState} from "react";
import { useForm } from 'react-hook-form';
import styles from './register.module.css'
import { supabase } from '../../core/supabase'
import { Link } from "react-router-dom";
import { getUserType } from "../../core/userTypeservice";
import { useNavigate } from "react-router-dom";
import Swal from 'sweetalert2';
import { registerUser } from "../../core/authService";
import FullPageLoader from '../../shared/Loader/FullPageLoader';
import toast from 'react-hot-toast';
import logo from '../../assets/medicologo.png'
import prevIcon from '../../assets/back-button.png'

// import { toast } from 'react-hot-toast';
type registerFormInputs = {
    firstName: string;
    lastName: string;
    password: string;
    email: string;
    accType: string;
    assignedID: Number;
}

const Register: React.FC = () => {
    const [loading, setLoading] = useState<boolean>(false);
    
    const navigate = useNavigate();
    const {
        register,
        handleSubmit,
        formState: { errors }
    } = useForm<registerFormInputs>();

    const onSubmit = async (data: registerFormInputs) => {
        setLoading(true);
        let metaData = {
            firstName: data.firstName,
            lastName: data.lastName,
            accType: user?.careTaker ? 'careTaker' : 'patient',
            connectionID: Math.floor(1000 + Math.random() * 9000),
            assignedID: Number(data.assignedID) || 0,
        }
        const { data: res, error } = await registerUser(data.email, data.password, metaData)
        if (error) {
            setLoading(false);
            console.error('Registration Error:', error.message);
            Swal.fire({
                icon: 'error',
                title: 'Registration Failed',
                text: error.message,
            });
            return;
        }
        if (res && res.user) {
            const userId = res.user.id;

            const { error: insertError } = await supabase.from('profiles').insert({
                id: userId,
                first_name: data.firstName,
                last_name: data.lastName,
                email: data.email,
                acc_type: res.user.user_metadata.accType,
                connection_id: res.user.user_metadata.connectionID,
                assigned_connection_id: res.user.user_metadata.assignedID,
            });

            if (insertError) {
                setLoading(false);
                toast.error(insertError.message)
                console.error('Error inserting into profiles table:', insertError.message);
                return;
            }

            //   ✅ Step: If patient registered with caretaker ID, update that caretaker's record
            const myConnectionId = res.user.user_metadata.connectionID;
            const assignedID = res.user.user_metadata.assignedID;

            if (assignedID && myConnectionId) {
                // Find the other user by their connection ID
                const { data: otherUser, error: findError } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('connection_id', assignedID)
                    .maybeSingle();

                if (findError) {
                    setLoading(false);
                    console.error('Error finding other user:', findError.message);
                } else if (otherUser) {
                    // Update their assigned_connection_id to this user's connection ID
                    const { error: updateError } = await supabase
                        .from('profiles')
                        .update({ assigned_connection_id: myConnectionId })
                        .eq('id', otherUser.id);

                    if (updateError) {
                        setLoading(false);
                        console.error('Error updating other user:', updateError.message);
                    }
                }
            }
            setLoading(false);
            Swal.fire({
                icon: 'success',
                title: 'Registered Successfully',
                text: 'Verify the email to continue login',
                confirmButtonText: 'OK',
            }).then(() => {
                navigate('/login');
            });
        }
    }

    const user = getUserType();
    return (
        <div className={styles.mainContainer}>
            {loading && <FullPageLoader />}
            <div className=" flex flex-col items-center">
                <div className="flex items-center gap-3">
                    <a href="/login">
            <img src={prevIcon} alt="Previous" height={30} width={30} className="opacity-75 cursor-pointer" />
          </a>
                    <h1 className="flex items-start font-semibold gap-1" >Medi<img src={logo} alt="" height="55px" width="55px" />Co</h1>
                </div>
                <p className="font-semibold opacity-75 mt-1">Register as {user?.careTaker ? 'Care Taker' : 'Patient'}</p>
            </div>
            <div className={styles.container}>
                <form>
                    <div className={styles['form-group']}>
                        <input type="text"
                            {...register('firstName', { required: 'First Name is required' })}
                            placeholder="First Name"
                        />
                        {errors.firstName && <p className={styles.reqText}>{errors.firstName.message}</p>}
                    </div>
                    <div className={styles['form-group']}>
                        <input type="text"
                            {...register('lastName', { required: 'Last Name is required' })}
                            placeholder="Last Name"
                        />
                        {errors.lastName && <p className={styles.reqText}>{errors.lastName.message}</p>}
                    </div>
                    <div className={styles['form-group']}>
                        <input type="text"
                            {...register('email', { required: 'Email ID is required' })}
                            placeholder="Email ID"
                        />
                        {errors.email && <p className={styles.reqText}>{errors.email.message}</p>}
                    </div>
                    <div className={styles['form-group']}>
                        <input type="text"
                            {...register('assignedID')}
                            placeholder={user?.careTaker ? "Enter Patient ID (Optional)" : "Enter Caretaker ID (Optional)"}
                        />
                    </div>
                    <div className={styles['form-group']}>
                        <input type="password"
                            {...register('password', { required: 'password is required' })}
                            placeholder="Password"
                        />
                        {errors.password && <p className={styles.reqText}>{errors.password.message}</p>}
                    </div>
                    {/* <div className="ml-2">
                        <label>Account type</label>
                    <div className="flex gap-3 mb-3 radio-group">
                        <span>
                            <label className="radio">
                                <input type="radio"  value="CareTaker" 
                                {...register('accType',{required:'Account Type is Required'})}
                                />&nbsp;
                                Care Taker
                            </label>
                        </span>
                        <span>
                            <label className="radio">
                                <input type="radio"  value="Patient" 
                                {...register('accType',{required:'Account Type is Required'})}
                                />&nbsp;
                                Patient
                            </label>
                        </span>
                    </div>
                    </div> */}
                    <div className="flex justify-between">
                        <button className={styles['login-button']} type="button" onClick={handleSubmit(onSubmit)} >Continue</button>
                        <Link to="/login" ><button className={styles['login-button']} type="button" >Back</button></Link>
                    </div>
                </form>
            </div>
        </div>
    )

}

export default Register