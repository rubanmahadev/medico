import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { getUserById } from "../../core/userService";
import { supabase } from '../../core/supabase'
import Swal from 'sweetalert2';

const Home: React.FC = () => {
    const [value, setValue] = useState('');
    const location = useLocation();
    const userID = location.state?.userID;
    const [dataList, setDataList] = useState<any | null>(null);

    // Fetch profile initially
    useEffect(() => {
        const fetchProfile = async (id: any) => {
            const { data, error } = await getUserById(id);
            if (error) {
                console.log(error.message);
                return;
            }
            setDataList(data);
        };

        if (userID) {
            fetchProfile(userID);
        }
    }, [userID]);

    // Update unique ID and fetch again
  const updateUniqueId = async () => {
  // Step 1: Check if a caretaker exists with that connection ID
  const { data: caretakers, error: fetchError } = await supabase
    .from('profiles')
    .select('*')
    .eq('acc_type', 'careTaker')
    .eq('connection_id', value)
    .maybeSingle(); // because only one caretaker should match

  if (fetchError) {
    console.error('Error checking caretaker:', fetchError.message);
    return;
  }

  if (!caretakers) {
    // Step 2: No match found
    Swal.fire({
      icon: 'error',
      title: 'Invalid Code',
      text: 'Connection ID not found or not a caretaker.',
      confirmButtonText: 'OK',
    });
    return;
  }

  // Step 3: Update current user's assigned_connection_id
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ assigned_connection_id: value })
    .eq('id', userID);

  if (updateError) {
    console.error('Update failed:', updateError.message);
    Swal.fire({
      icon: 'error',
      title: 'Update Failed',
      text: updateError.message,
    });
    return;
  }

  // Step 4: Success! Show alert with caretaker name
  Swal.fire({
    icon: 'success',
    title: 'Connected!',
    text: `Your care taker is ${caretakers.first_name}`,
    confirmButtonText: 'OK',
  });

  // Optionally re-fetch your own profile
  const { data: updatedUser } = await getUserById(userID);
  if (updatedUser) {
    setDataList(updatedUser);
  }
};

    return (
        <div>
            <header className="bg-white shadow-sm rounded-xl p-4 flex items-center mb-6">
                <div className="flex items-center gap-4">
                    <div>
                        <h1 className="text-gray-800 flex items-start font-semibold gap-1">Medi<img src="src/assets/medicologo.png" alt="" height="55px" width="55px" /><span className="text-teal-500">Co</span></h1>
                        <p className="text-sm text-gray-500 tracking-wide ml-1 font-semibold">{dataList?.acc_type}</p>
                    </div>
                </div>
            </header>
            <div className="max-w-7xl mx-auto px-4 py-6">
                {dataList?.assigned_connection_id == 0 && <div>
                    <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 p-4 rounded-lg shadow-md mb-6">
                        <div className="flex items-center gap-3">
                            <span className="text-xl">⚠️</span>
                            <div>
                                <p className="font-semibold">Your account is not connected to a Caretaker.</p>
                                <p className="text-sm ml-1">Please provide the Caretaker ID to continue.</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-md mx-auto max-w-2xl">
                        <h2 className="text-xl font-semibold text-gray-700 mb-4">🔗 Connect to a Caretaker</h2>
                        <div className="flex flex-col gap-4">
                            <input
                                type="text"
                                placeholder="Enter Caretaker ID"
                                className="border border-gray-300 px-4 py-2 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                                value={value}
                                onChange={(e) => setValue(e.target.value)}
                            />
                            <button className="bg-teal-500 text-white px-6 py-2 rounded-lg shadow hover:bg-teal-600 transition w-fit" onClick={updateUniqueId}>
                                Connect
                            </button>
                        </div>
                    </div>
                </div>}
            </div>


        </div>
    );
};

export default Home;
