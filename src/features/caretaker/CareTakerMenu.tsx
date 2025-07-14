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
import emailjs from 'emailjs-com';
import FullPageLoader from '../../shared/Loader/FullPageLoader';

const PatientMenu: React.FC = () => {
  const [formData, setFormData] = useState({
    medicineName: '',
    dosage: '',
    time: '',
    fromDate: '',
    toDate: ''
  });
  const [loading, setLoading] = useState<boolean>(false);
  const navigate = useNavigate();
  const acc = getUserType();
  const [patienIdValue, setValue] = useState('');
  const location = useLocation();
  const userID = location.state?.userID;
  const [dataList, setDataList] = useState<any | null>(null);
  const [connectedAcc, setconnectedAcc] = useState<any | null>(null);
  const [meds, setMedicationList] = useState<any | null>(null);
  const [takenDates, setTakenDates] = useState<Date[]>([]);
  const [missedDates, setMissedDates] = useState<Date[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date()); // Defaults to today
  const [showModal, setShowModal] = useState(false);

  // Fetch profile initially
  useEffect(() => {
    if (userID) {
      fetchProfile(userID);
    }
  }, [userID]);

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    fetchMedicationByDate(date, connectedAcc?.id); // 🔁 update meds on date change
  };
  const fetchMedicationByDate = async (date: Date, patientID: any) => {
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
      .eq('patient_id', patientID)
      .eq('date', formattedDate())
      .single();

    if (medError) {
      setLoading(false);
      toast.error('No medications assigned yet.')
      console.error('Error fetching medications:', medError.message);
      setMedicationList(null)
    } else {
      setLoading(false);
      setMedicationList(data);
    }
  };
  const fetchProfile = async (id: any) => {
    setLoading(true);
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
        toast.error(assignedError.message)
        console.log('Error fetching connected account:', assignedError.message);
      } else {
        getDates(assignedProfile?.id);
        fetchMedicationByDate(selectedDate, assignedProfile?.id); // 🔁 load today initially
        setconnectedAcc(assignedProfile);
      }
    }
    setLoading(false);
  };

  function parseDateOnly(dateStr: string): Date {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day); // local date with no time zone shift
    return date;
  }

  const getDates = async (patientID: any) => {
    const { data, error } = await supabase
      .from('medications')
      .select('date, taken')
      .eq('patient_id', patientID);

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
  const connectPatient = async () => {
    setLoading(true);
    // Step 1: Check if a caretaker exists with that connection ID
    const { data: connectedAcc, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('acc_type', 'patient')
      // .eq('acc_type', acc?.careTaker ? 'patient' : 'careTaker')
      .eq('connection_id', patienIdValue)
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
      .update({ assigned_connection_id: patienIdValue })
      .eq('id', userID);

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

    //
    const { } = await supabase
      .from('profiles')
      .update({ assigned_connection_id: dataList?.connection_id })
      .eq('connection_id', patienIdValue);

    const { } = await supabase.auth.updateUser({
      data: {
        assignedID: Number(dataList?.connection_id)
      }
    });

    // Step 4: Success! Show alert with caretaker name
    setLoading(false);
    setconnectedAcc(connectedAcc)
    Swal.fire({
      icon: 'success',
      title: 'Connected!',
      text: acc?.careTaker ? `Your Patient is ${connectedAcc.first_name}` : `Your Caretaker is ${connectedAcc.first_name}`,
      confirmButtonText: 'OK',
    }).then(() => {
      fetchProfile(userID)
    });
  };
  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };
  // const addMedication = async (e: any) => {
  //   e.preventDefault();

  //   const {
  //     medicineName,
  //     dosage,
  //     time,
  //     fromDate,
  //     toDate
  //   } = formData;

  //   // Validate
  //   if (!medicineName || !dosage || !time || !fromDate || !toDate) {
  //     toast.error("All fields are required");
  //     return;
  //   }
  //   setLoading(true);
  //   // Convert date strings to Date objects
  //   const start = new Date(fromDate);
  //   const end = new Date(toDate);
  //   const datesToInsert: string[] = [];

  //   for (
  //     let date = new Date(start);
  //     date <= end;
  //     date.setDate(date.getDate() + 1)
  //   ) {
  //     // Convert date to YYYY-MM-DD
  //     const isoDate = date.toISOString().split("T")[0];
  //     datesToInsert.push(isoDate);
  //   }

  //   // Prepare insert payload
  //   const insertPayload = datesToInsert.map((date) => ({
  //     patient_id: connectedAcc?.id, // replace with real ID
  //     caretaker_id: userID, // replace with real ID
  //     medicine: [
  //       {
  //         name: medicineName,
  //         quantity: dosage,
  //       },
  //     ],
  //     time,
  //     taken: false,
  //     date,
  //   }));

  //   // Insert into Supabase
  //   const { error } = await supabase
  //     .from("medications")
  //     .insert(insertPayload);

  //   if (error) {
  //     setLoading(false);
  //     console.error("Failed to insert medications:", error.message);
  //     toast.error("Failed to add medication");
  //     return;
  //   }

  //   setLoading(false);
  //   toast.success("Medication schedule added!");
  //   setFormData({
  //     medicineName: '',
  //     dosage: '',
  //     time: '',
  //     fromDate: '',
  //     toDate: ''
  //   });
  //   setShowModal(false);
  //   fetchProfile(userID)
  // };

  const addMedication = async (e: any) => {
    e.preventDefault();

    const {
      medicineName,
      dosage,
      time,
      fromDate,
      toDate
    } = formData;

    if (!medicineName || !dosage || !time || !fromDate || !toDate) {
      toast.error("All fields are required");
      return;
    }

    setLoading(true);

    const start = new Date(fromDate);
    const end = new Date(toDate);
    const datesToInsert: string[] = [];

    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      const isoDate = date.toISOString().split("T")[0];
      datesToInsert.push(isoDate);
    }

    const patientId = connectedAcc?.id;

    for (const date of datesToInsert) {
      const { data: existing, error: fetchError } = await supabase
        .from("medications")
        .select("*")
        .eq("patient_id", patientId)
        .eq("date", date)
        .maybeSingle();

      if (fetchError) {
        console.error(`Error checking date ${date}:`, fetchError.message);
        continue;
      }

      const newMedicine = [
        {
          name: medicineName,
          quantity: dosage,
        },
      ];

      if (existing) {
        // 🔁 Update existing record
        const { error: updateError } = await supabase
          .from("medications")
          .update({
            medicine: newMedicine,
            time,
            taken: false,
          })
          .eq("id", existing.id);

        if (updateError) {
          console.error(`Failed to update date ${date}:`, updateError.message);
          toast.error(`Failed to update medication for ${date}`);
        }
      } else {
        // 🆕 Insert new record
        const { error: insertError } = await supabase
          .from("medications")
          .insert([{
            patient_id: patientId,
            caretaker_id: userID,
            medicine: newMedicine,
            time,
            taken: false,
            date,
          }]);

        if (insertError) {
          console.error(`Failed to insert date ${date}:`, insertError.message);
          toast.error(`Failed to add medication for ${date}`);
        }
      }
    }

    setLoading(false);
    toast.success("Medication schedule added/updated successfully!");
    setFormData({
      medicineName: '',
      dosage: '',
      time: '',
      fromDate: '',
      toDate: ''
    });
    setShowModal(false);
    fetchProfile(userID);
  };

  const handleLogout = () => {
    // Clear auth/session
    localStorage.clear();
    navigate('/'); // if using React Router
  };
  const sendReminderEmail = async () => {
    setLoading(true);
    const templateParams = {
      patient_name: connectedAcc?.first_name, // Replace with dynamic name if available
      patient_email: connectedAcc?.email, // Replace with patient email
      message: 'Please take your scheduled medication at 9:00 PM',
    };

    emailjs
      .send(
        'service_2n2c9ri',     // e.g., service_gmail
        'template_rtrzhib',    // e.g., template_abc123
        templateParams,
        'JSN2EVXWtf6_q6YGu'      // e.g., user_xxxxxxxxx
      )
      .then(
        (response) => {
          setLoading(false);
          console.log('SUCCESS!', response.status, response.text);
          Swal.fire('Email Sent!', 'Reminder email sent successfully.', 'success');
        },
        (err) => {
          setLoading(false);
          console.error('FAILED...', err);
          Swal.fire('Failed', 'Could not send email.', 'error');
        }
      );
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
              <img src="src/assets/medicologo.png" alt="" height="55px" width="55px" />
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
                <p className="font-semibold">Your account is not connected to a Patient.</p>
                <p className="text-sm ml-1">Please provide the Patient ID to continue.</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-md mx-auto max-w-2xl">
            <h2 className="text-xl font-semibold text-gray-700 mb-4">🔗 Connect to a Patient</h2>
            <div className="flex flex-col gap-4">
              <input
                type="text"
                placeholder="Enter Patient ID"
                className="border border-gray-300 px-4 py-2 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                value={patienIdValue}
                onChange={(e) => setValue(e.target.value)}
              />
              <button className="bg-teal-500 text-white px-6 py-2 rounded-lg shadow hover:bg-teal-600 transition w-fit" onClick={connectPatient}>
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
          {/* Patient Info  */}
          <div className="bg-white p-6 rounded-xl shadow-md">
            <div className="flex flex-row justify-between mb-3 mb-6">
              <h2 className="text-lg font-semibold text-gray-700 ">👤 Connected Patient Details</h2>
              <button
                onClick={() => setShowModal(true)}
                className="!bg-black !px-[10px] !py-0 !text-[12px] !rounded-[20px] !opacity-90 text-white"
              >
                Add Medication
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm ml-2">
              <div><span className="font-semibold text-gray-600">First Name:</span>{connectedAcc?.first_name}</div>
              <div><span className="font-semibold text-gray-600">Last Name:</span>{connectedAcc?.last_name}</div>
              <div><span className="font-semibold text-gray-600">Email:</span>{connectedAcc?.email}</div>
              <div><span className="font-semibold text-gray-600">Connection ID:</span>{connectedAcc?.connection_id}</div>
            </div>
            {/* <div className="flex justify-end mb-4">
  <button
    onClick={() => setShowModal(true)}
    className="bg-sky-600 text-white px-4 py-2 text-sm rounded-md hover:bg-sky-700 transition"
  >
    ➕ Add Medication
  </button>
</div> */}
          </div>
          {/* card */}
          {showModal && (
            <div className="fixed inset-0 z-50 bg-white/60 backdrop-blur-sm flex items-center justify-center">
              <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-lg">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Add Medication</h2>
                <form className="space-y-4" onSubmit={addMedication}>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Medicine Name</label>
                    <input
                      type="text"
                      name="medicineName"
                      value={formData.medicineName}
                      onChange={handleChange}
                      className="mt-1 w-full border rounded-md px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Dosage (per day)</label>
                    <input
                      type="text"
                      name="dosage"
                      value={formData.dosage}
                      onChange={handleChange}
                      className="mt-1 w-full border rounded-md px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Time</label>
                    <input
                      type="time"
                      name="time"
                      value={formData.time}
                      onChange={handleChange}
                      className="mt-1 w-full border rounded-md px-3 py-2"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 ">From Date</label>
                      <input
                        type="date"
                        name="fromDate"
                        value={formData.fromDate}
                        onChange={handleChange}
                        className="mt-1 w-full border rounded-md px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">To Date</label>
                      <input
                        type="date"
                        name="toDate"
                        value={formData.toDate}
                        onChange={handleChange}
                        className="mt-1 w-full border rounded-md px-3 py-2"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="bg-gray-100 px-4 py-2 rounded-md hover:bg-gray-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="bg-sky-600 text-white px-4 py-2 rounded-md hover:bg-sky-700"
                    >
                      Save
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}


          {/* Main Grid: Medications + Calendar */}
          <div className="grid grid-cols-1 grid-cols-1 md:grid-cols-[2fr_1fr] gap-6">
            {/* Left: Medication Check-In */}
            <div className="flex flex-col gap-7">
              <div className="bg-white p-6 rounded-xl shadow-md">
                <h2 className="text-xl font-semibold text-gray-700 mb-4">💊 {selectedDate.toDateString()}</h2>
                {meds?.medicine?.length > 0 ? (
                  <ul className="space-y-4 mb-6">
                    {meds?.medicine.map((med: any, index: number) => (
                      <li key={index} className="flex justify-between items-center border-b px-1 pb-1">
                        <span className="text-gray-700 font-medium">{med.name}</span>
                        <span className="text-sm font-semibold text-gray-500">{med.quantity}{meds.taken && <span className="ml-5 text-sky-600"><i className="fa fa-check"></i></span>}{!meds.taken && <span className="ml-5 text-red-500"><i className="fa fa-close"></i></span>}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500 mb-5">No medications assigned yet.</p>
                )}
              </div>
              {meds?.medicine?.length > 0 && <div className="bg-white p-6 rounded-xl shadow-md">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h2>
                <ul className="space-y-3">
                  <li>
                    <button className=" flex items-center gap-3 px-4 py-2 rounded-md border hover:bg-gray-50 transition" onClick={sendReminderEmail}>
                      <i className="fa fa-envelope"></i>
                      <span className="text-sm font-medium text-gray-700">Send Reminder Email</span>
                    </button>
                  </li>
                  <li>
                    <button className=" flex items-center gap-3 px-4 py-2 rounded-md border hover:bg-gray-50 transition">
                      <i className="fa fa-bell"></i>
                      <span className="text-sm font-medium text-gray-700">Configure Notifications</span>
                    </button>
                  </li>
                </ul>
              </div>}
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
