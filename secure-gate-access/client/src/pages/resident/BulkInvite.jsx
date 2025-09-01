import React, { useState } from "react";
import { QRCodeCanvas } from "qrcode.react";

export default function BulkInvite() {
  const [numGuests, setNumGuests] = useState(1);
  const [eventType, setEventType] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [guestList, setGuestList] = useState([]);
  const [otp, setOtp] = useState("");
  const [qrCode, setQrCode] = useState("");

  const handleGenerate = () => {
    if (!eventType || !eventDate) return alert("Fill all fields!");
    // Generate OTP
    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    setOtp(generatedOtp);
    // Generate QR code string
    setQrCode(`${eventType}-${eventDate}-${generatedOtp}`);

    // Prepare guest preview
    const guests = Array.from({ length: numGuests }, (_, i) => ({
      id: i + 1,
      name: "",
      email: "",
    }));
    setGuestList(guests);
  };

  const handleGuestChange = (index, field, value) => {
    const updatedGuests = [...guestList];
    updatedGuests[index][field] = value;
    setGuestList(updatedGuests);
  };

  const handleSubmit = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/bulk-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType,
          eventDate,
          otp,
          guestList,
        }),
      });
      const data = await res.json();
      if (!res.ok) return alert(data.message || "Error sending invites");
      alert("Bulk invites sent successfully!");
      setGuestList([]);
      setOtp("");
      setQrCode("");
    } catch (err) {
      alert("Server error. Try again later.");
    }
  };

  return (
    <div className="p-6 flex justify-center">
      <div className="bg-white shadow-lg rounded-2xl p-6 w-full max-w-3xl">
        <h2 className="text-xl font-bold mb-4">Bulk Invite</h2>

        <div className="form-group mb-4">
          <label className="block font-medium mb-1">Number of Guests (max 700)</label>
          <select
            value={numGuests}
            onChange={(e) => setNumGuests(Number(e.target.value))}
            className="w-full border rounded-lg p-2"
          >
            {Array.from({ length: 700 }, (_, i) => (
              <option key={i} value={i + 1}>
                {i + 1}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group mb-4">
          <label className="block font-medium mb-1">Event Type</label>
          <input
            type="text"
            placeholder="Event type (e.g., Wedding)"
            value={eventType}
            onChange={(e) => setEventType(e.target.value)}
            className="w-full border rounded-lg p-2"
          />
        </div>

        <div className="form-group mb-4">
          <label className="block font-medium mb-1">Event Date</label>
          <input
            type="date"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            className="w-full border rounded-lg p-2"
          />
        </div>

        <button
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          onClick={handleGenerate}
        >
          Generate OTP & QR
        </button>

        {otp && (
          <div className="mt-4 text-center">
            <h4 className="font-semibold mb-2">OTP: {otp}</h4>
            <QRCodeCanvas value={qrCode} size={128} />
          </div>
        )}

        {guestList.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-bold mb-2">Guest Preview</h3>
            <table className="table-auto w-full border rounded-lg">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-2 py-1">#</th>
                  <th className="px-2 py-1">Name</th>
                  <th className="px-2 py-1">Email</th>
                </tr>
              </thead>
              <tbody>
                {guestList.map((guest, i) => (
                  <tr key={i}>
                    <td className="border px-2 py-1">{i + 1}</td>
                    <td className="border px-2 py-1">
                      <input
                        type="text"
                        value={guest.name}
                        onChange={(e) =>
                          handleGuestChange(i, "name", e.target.value)
                        }
                        className="w-full border rounded p-1"
                      />
                    </td>
                    <td className="border px-2 py-1">
                      <input
                        type="email"
                        value={guest.email}
                        onChange={(e) =>
                          handleGuestChange(i, "email", e.target.value)
                        }
                        className="w-full border rounded p-1"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button
              className="mt-4 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
              onClick={handleSubmit}
            >
              Send Bulk Invites
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
