import { useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, Clock, User, Stethoscope, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import html2canvas from 'html2canvas';

interface AppointmentTicketProps {
  doctorName: string;
  doctorSpeciality: string;
  patientName: string;
  appointmentDate: string;
  appointmentTime: string;
  slotTime: string;
  appointmentId: string;
  patientId?: string;
  onDownload?: () => void;
}

const AppointmentTicket = ({
  doctorName,
  doctorSpeciality,
  patientName,
  appointmentDate,
  appointmentTime,
  slotTime,
  appointmentId,
  patientId,
  onDownload,
}: AppointmentTicketProps) => {
  const ticketRef = useRef<HTMLDivElement>(null);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (timeString: string) => {
    const date = new Date(timeString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const handleDownload = async () => {
    if (!ticketRef.current) return;

    try {
      const canvas = await html2canvas(ticketRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
        useCORS: true,
      });

      const link = document.createElement('a');
      link.download = `appointment-ticket-${appointmentId}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();

      if (onDownload) {
        onDownload();
      }
    } catch (error) {
      console.error('Error generating image:', error);
    }
  };

  return (
    <div className="space-y-4">
      <div
        ref={ticketRef}
        className="bg-white p-8 rounded-lg shadow-2xl border-4 border-primary max-w-md mx-auto"
        style={{ width: '500px' }}
      >
        {/* Header */}
        <div className="text-center mb-6 pb-4 border-b-2 border-dashed border-gray-300">
          <h2 className="text-3xl font-bold text-primary mb-2">Appointment Confirmed</h2>
          <p className="text-gray-600">Asaan Zindagi Healthcare</p>
        </div>

        {/* Appointment Details */}
        <div className="space-y-4 mb-6">
          <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
            <User className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <p className="text-xs text-gray-500 uppercase">Patient Name</p>
              <p className="text-lg font-semibold text-gray-900">{patientName}</p>
              {patientId && (
                <p className="text-xs text-gray-600 mt-1">Patient ID: {patientId.substring(0, 8).toUpperCase()}</p>
              )}
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
            <Stethoscope className="w-5 h-5 text-green-600 mt-0.5" />
            <div>
              <p className="text-xs text-gray-500 uppercase">Doctor</p>
              <p className="text-lg font-semibold text-gray-900">{doctorName}</p>
              <p className="text-sm text-gray-600">{doctorSpeciality}</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg">
            <Calendar className="w-5 h-5 text-purple-600 mt-0.5" />
            <div>
              <p className="text-xs text-gray-500 uppercase">Appointment Date</p>
              <p className="text-lg font-semibold text-gray-900">{formatDate(appointmentDate)}</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg">
            <Clock className="w-5 h-5 text-orange-600 mt-0.5" />
            <div>
              <p className="text-xs text-gray-500 uppercase">Appointment Time</p>
              <p className="text-lg font-semibold text-gray-900">{formatTime(appointmentTime)}</p>
              <p className="text-sm text-gray-600">Slot Duration: 10 minutes</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t-2 border-dashed border-gray-300 text-center">
          <p className="text-xs text-gray-500 mb-1">Appointment ID: {appointmentId.substring(0, 8).toUpperCase()}</p>
          {patientId && (
            <p className="text-xs text-gray-500 mb-2">Patient ID: {patientId.substring(0, 8).toUpperCase()}</p>
          )}
          <p className="text-xs text-gray-400">
            Please arrive 10 minutes before your scheduled time
          </p>
        </div>
      </div>

      {/* Download Button */}
      <div className="text-center">
        <Button
          onClick={handleDownload}
          className="bg-gradient-to-r from-primary to-primary-glow hover:from-primary/90 hover:to-primary-glow/90 text-white font-semibold px-8 py-3 shadow-lg hover:shadow-xl transition-all duration-300"
        >
          <Download className="w-5 h-5 mr-2" />
          Download Ticket
        </Button>
      </div>
    </div>
  );
};

export default AppointmentTicket;

