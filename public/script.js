// Attendance functions
async function markAttendance() {
    if (!currentMember) {
        alert('Please log in first');
        return;
    }

    try {
        const response = await fetch('http://localhost:3001/api/attendance/check-in', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ memberId: currentMember.id })
        });

        const data = await response.json();
        if (data.success) {
            alert('Attendance marked successfully!');
            loadAttendanceCalendar();
        } else {
            alert(data.message || 'Failed to mark attendance');
        }
    } catch (error) {
        console.error('Error marking attendance:', error);
        alert('Failed to mark attendance. Please try again.');
    }
}

async function loadAttendanceCalendar() {
    if (!currentMember) return;

    try {
        const response = await fetch(`http://localhost:3001/api/attendance/history/${currentMember.id}`);
        const data = await response.json();
        
        if (data.success) {
            const calendar = document.getElementById('attendanceCalendar');
            const currentDate = new Date();
            const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
            const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
            
            let calendarHTML = '<div class="calendar-grid">';
            for (let date = new Date(firstDay); date <= lastDay; date.setDate(date.getDate() + 1)) {
                const dateStr = date.toISOString().split('T')[0];
                const isPresent = data.attendance.includes(dateStr);
                calendarHTML += `
                    <div class="calendar-day ${isPresent ? 'present' : 'absent'}">
                        ${date.getDate()}
                    </div>
                `;
            }
            calendarHTML += '</div>';
            calendar.innerHTML = calendarHTML;
        }
    } catch (error) {
        console.error('Error loading attendance calendar:', error);
    }
}

// Payment functions
async function loadPaymentHistory() {
    if (!currentMember) return;

    try {
        const response = await fetch(`http://localhost:3001/api/payments/history/${currentMember.id}`);
        const data = await response.json();
        
        if (data.success) {
            const paymentHistory = document.getElementById('paymentHistory');
            let historyHTML = `
                <table>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Amount</th>
                            <th>Method</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            
            data.payments.forEach(payment => {
                historyHTML += `
                    <tr>
                        <td>${new Date(payment.date).toLocaleDateString()}</td>
                        <td>₹${payment.amount}</td>
                        <td>${payment.method}</td>
                        <td>${payment.status}</td>
                    </tr>
                `;
            });
            
            historyHTML += '</tbody></table>';
            paymentHistory.innerHTML = historyHTML;
        }
    } catch (error) {
        console.error('Error loading payment history:', error);
    }
}

// Payment form submission
document.getElementById('paymentForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentMember) {
        alert('Please log in first');
        return;
    }

    const amount = document.getElementById('paymentAmount').value;
    const method = document.getElementById('paymentMethod').value;

    try {
        const response = await fetch('http://localhost:3001/api/payments/make', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                memberId: currentMember.id,
                amount: parseFloat(amount),
                method
            })
        });

        const data = await response.json();
        if (data.success) {
            alert('Payment processed successfully!');
            document.getElementById('paymentForm').reset();
            loadPaymentHistory();
        } else {
            alert(data.message || 'Failed to process payment');
        }
    } catch (error) {
        console.error('Error processing payment:', error);
        alert('Failed to process payment. Please try again.');
    }
});

// Load attendance and payment history when page loads
document.addEventListener('DOMContentLoaded', () => {
    if (currentMember) {
        loadAttendanceCalendar();
        loadPaymentHistory();
    }
}); 