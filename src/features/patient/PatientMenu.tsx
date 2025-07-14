import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { getUserById } from "../../core/userService";
import { supabase } from '../../core/supabase'
import Swal from 'sweetalert2';
import 'react-day-picker/dist/style.css';
import MedicationCalendar from "../../shared/daypicker";
import { getUserType } from "../../core/userTypeservice";
import toast from 'react-hot-toast';
import { useNavigate } from "react-router-dom";
import FullPageLoader from '../../shared/Loader/FullPageLoader';
import logo from '../../assets/medicologo.png'

const PatientMenu: React.FC = () => {
  const todayDate = new Date();
  const [loading, setLoading] = useState<boolean>(false);
  const navigate = useNavigate();
  const acc = getUserType();
  const [careTakerIdvalue, setValue] = useState('');
  const location = useLocation();
  const userID = location.state?.userID;
  const [dataList, setDataList] = useState<any | null>(null);
  const [connectedAcc, setconnectedAcc] = useState<any | null>(null);
  const [meds, setMedicationList] = useState<any | null>(null);
  const [takenDates, setTakenDates] = useState<Date[]>([]);
  const [missedDates, setMissedDates] = useState<Date[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date()); // Defaults to today

  // Fetch profile initially
  useEffect(() => {
    if (userID) {
      setLoading(true)
      fetchProfile(userID);
    }
  }, [userID]);

  const handleDateSelect = (date: Date) => {
    console.log(date, selectedDate, todayDate)
    setSelectedDate(date);
    fetchMedicationByDate(date); // 🔁 update meds on date change
  };

  const fetchMedicationByDate = async (date: Date) => {
    setLoading(true);
    const formattedDate = (): string => {
      const year = date.getFullYear();
      const month = `${date.getMonth() + 1}`.padStart(2, '0'); // months are 0-based
      const day = `${date.getDate()}`.padStart(2, '0');
      return `${year}-${month}-${day}`; // 'YYYY-MM-DD'
    };

    const { data, error: medError } = await supabase
      .from('medications')
      .select('*')
      .eq('patient_id', userID)
      .eq('date', formattedDate())
      .single();

    if (medError) {
      setLoading(false);
      toast.error('No medications assigned yet.')
      console.error('Error fetching medications:', medError.message);
      setMedicationList(null)
    } else {
      setMedicationList(data);
    } setLoading(false);
  };


  const fetchProfile = async (id: any) => {
    const { data, error } = await getUserById(id);
    if (error) {
      setLoading(false);
      toast.error(error.message)
      console.log(error.message);
      return;
    }
    setDataList(data);
    if (data?.assigned_connection_id != 0) {
      const { data: assignedProfile, error: assignedError } = await supabase
        .from('profiles')
        .select('*')
        .eq('connection_id', data.assigned_connection_id)
        .single();
      if (assignedError) {
        setLoading(false);
        toast.error(assignedError.message)
        console.log('Error fetching connected account:', assignedError.message);
      } else {
        getDates();
        fetchMedicationByDate(selectedDate); // 🔁 load today initially
        setconnectedAcc(assignedProfile);
      }
    }
    setLoading(false)
  };

  function parseDateOnly(dateStr: string): Date {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day); // local date with no time zone shift
    console.log('Parsed local date:', date);
    return date;
  }

  const getDates = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('medications')
      .select('date, taken')
      .eq('patient_id', userID);

    if (error) {
      setLoading(false);
      toast.error(error.message)
    }
    if (data) {
      const taken: Date[] = [];
      const missed: Date[] = [];

      data.forEach((entry) => {
        const entryDate = parseDateOnly(entry.date);
        if (entry.taken) {
          taken.push(entryDate);
        } else {
          missed.push(entryDate);
        }
      });

      setTakenDates(taken);
      setMissedDates(missed);
    }
  }

  // Update unique ID and fetch again
  const connectCareTaker = async () => {
    setLoading(true)
    // Step 1: Check if a caretaker exists with that connection ID
    const { data: connectedAcc, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('acc_type', 'careTaker')
      // .eq('acc_type', acc?.careTaker ? 'patient' : 'careTaker')
      .eq('connection_id', careTakerIdvalue)
      .maybeSingle(); // because only one caretaker should match

    if (fetchError) {
      setLoading(false);
      toast.error(fetchError.message)
      console.error('Error checking caretaker:', fetchError.message);
      return;
    }
    if (!connectedAcc) {
      // Step 2: No match found
      setLoading(false);
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
      .update({ assigned_connection_id: careTakerIdvalue })
      .eq('id', userID);

    if (updateError) {
      setLoading(false);
      toast.error(updateError.message)
      console.error('Update failed:', updateError.message);
      Swal.fire({
        icon: 'error',
        title: 'Update Failed',
        text: updateError.message,
      });
      return;
    }

    const { } = await supabase
      .from('profiles')
      .update({ assigned_connection_id: dataList?.connection_id })
      .eq('connection_id', careTakerIdvalue);

      const { } = await supabase.auth.updateUser({
  data: {
    assignedID: Number(dataList?.connection_id) // assigning to yourself or to caretaker, adjust accordingly
  }
});

    // Step 4: Success! Show alert with caretaker name
    setconnectedAcc(connectedAcc)
    setLoading(false);
    Swal.fire({
      icon: 'success',
      title: 'Connected!',
      text: acc?.careTaker ? `Your Patient is ${connectedAcc.first_name}` : `Your Caretaker is ${connectedAcc.first_name}`,
      confirmButtonText: 'OK',
    });

    // Optionally re-fetch your own profile
    const { data: updatedUser } = await getUserById(userID);
    if (updatedUser) {
      setDataList(updatedUser);
    }
    setLoading(false)
  };

  const updateMedStatus = async (id: any) => {
    setLoading(true);
    const { error: updateError } = await supabase
      .from('medications')
      .update({ taken: true })
      .eq('id', id);

    if (updateError) {
      setLoading(false);
      console.error('Update failed:', updateError.message);
      Swal.fire({
        icon: 'error',
        title: 'Update Failed',
        text: updateError.message,
      });
      return;
    }
    setLoading(false);
    toast.success("Status Updated")
    fetchProfile(userID);
  }
  const handleLogout = () => {
    // Clear auth/session
    localStorage.clear();
    navigate('/'); // if using React Router
  };
  return (
    <div>
      {loading && <FullPageLoader />}
      <header className="bg-white shadow-sm rounded-xl p-4 flex items-center justify-between mb-6">
        {/* Left Side: Logo + Account Type */}
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-gray-800 flex items-start font-semibold gap-1">
              Medi
              <img src={logo} alt="" height="55px" width="55px" />
              <span className="text-teal-500">Co</span>
            </h1>
            <p className="text-sm text-gray-500 tracking-wide ml-1 font-semibold">
              {dataList?.acc_type}
            </p>
          </div>
        </div>
        {/* Right Side: Logout Button */}
        <div>
          <span className=" font-semibold mr-5">Connection Id: {dataList?.connection_id}</span>
          <button
            onClick={handleLogout} // <-- you define this function
            className="text-sm bg-red-100 text-red-600 px-4 py-2 rounded-md hover:bg-red-200 font-semibold transition"
          >
            Logout
          </button>
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
                value={careTakerIdvalue}
                onChange={(e) => setValue(e.target.value)}
              />
              <button className="bg-teal-500 text-white px-6 py-2 rounded-lg shadow hover:bg-teal-600 transition w-fit" onClick={connectCareTaker}>
                Connect
              </button>
            </div>
          </div>
        </div>}
        {dataList?.assigned_connection_id != 0 && <div className="space-y-6">
          {/* Greeting */}
          <div className="bg-white border border-blue-200 p-6 rounded-xl shadow-sm flex items-center gap-4 min-h-[120px]">
            {/* Patient Icon */}
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-3xl shadow-inner">
              👤
            </div>

            {/* Message */}
            <div>
              <h1 className="text-xl font-semibold text-gray-800">Hello, {dataList?.first_name}</h1>
              <p className="text-sm text-gray-600 mt-1">Welcome back! Let’s stay on track with your health today.</p>
            </div>
          </div>



          {/* Caretaker Info (Static) */}
          <div className="bg-white p-6 rounded-xl shadow-md">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">👤 Connected Caretaker Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
              <div><span className="font-semibold text-gray-600">First Name:</span>{connectedAcc?.first_name}</div>
              <div><span className="font-semibold text-gray-600">Last Name:</span>{connectedAcc?.last_name}</div>
              <div><span className="font-semibold text-gray-600">Email:</span>{connectedAcc?.email}</div>
              <div><span className="font-semibold text-gray-600">Connection ID:</span>{connectedAcc?.connection_id}</div>
            </div>
          </div>

          {/* Main Grid: Medications + Calendar */}
          <div className="grid grid-cols-1 grid-cols-1 md:grid-cols-[2fr_1fr] gap-6">
            {/* Left: Medication Check-In */}
            <div className="bg-white p-6 rounded-xl shadow-md">
              <h2 className="text-xl font-semibold text-gray-700 mb-4">💊 Check-in for {selectedDate.toLocaleDateString('en-IN')}</h2>
              {meds?.medicine?.length > 0 ? (
                <ul className="space-y-4 mb-6">
                  {meds?.medicine.map((med: any, index: number) => (
                    <li key={index} className="flex justify-between items-center border-b px-1 pb-1">
                      <span className="text-gray-700 font-medium">{med.name}</span>
                      <span className="text-sm font-semibold text-gray-500">{med.quantity}{meds.taken && <span className="ml-5 text-sky-600"><i className="fa fa-check"></i></span>}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500 mb-5">No medications assigned yet.</p>
              )}


              {(meds?.medicine?.length > 0 && !meds.taken && selectedDate.toLocaleDateString('en-CA') === todayDate.toLocaleDateString('en-CA')) &&
                <button className=" bg-sky-300 hover:bg-sky-500 text-white font-semibold py-2 px-3 rounded-lg transition" onClick={() => updateMedStatus(meds?.id)}>
                  Mark as Taken
                </button>}
            </div>

            {/* Right: Static Calendar Design */}
            <div className="bg-white p-6 rounded-xl shadow-md">
              <h2 className="text-xl font-semibold text-gray-700 mb-4">📅 Select Date</h2>
              <div className=" rounded-lg p-2 text-center text-gray-500">
                <MedicationCalendar takenDates={takenDates} missedDates={missedDates} onDateSelect={handleDateSelect} />
              </div>
            </div>
          </div>
        </div>}
      </div>
    </div>
  );
};

export default PatientMenu;
