
export const TimeConverter = (stripeEpochTimestamp) => {

    // Convert to a Date object (UTC time)
    const dateObject = new Date(stripeEpochTimestamp * 1000); // Stripe uses timestamps in seconds, so multiply by 1000 to get milliseconds
    
    // Convert to IST (UTC+5:30)
    const dateIST = new Date(dateObject.getTime() + (5 * 60 + 30) * 60 * 1000);
    
    // Format the Date object to a readable date in IST (DD-MM-YY)
    const formattedDate = `${dateIST.getDate().toString().padStart(2, '0')}-${(dateIST.getMonth() + 1).toString().padStart(2, '0')}-${dateIST.getFullYear().toString().slice(-2)}`;
    
    // Format the Date object to a readable time in IST (HH:MM AM/PM)
    const hours = dateIST.getHours();
    const minutes = dateIST.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const formattedTime = `${(hours % 12 || 12).toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${ampm}`;
    
    return `${formattedDate} ${formattedTime}`;
}


