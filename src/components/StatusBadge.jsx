import React from 'react';

const StatusBadge = ({ status }) => {
    let bgColor = '';
    let textColor = '';
    let label = status ? status.toUpperCase() : 'UNKNOWN';

    switch (status?.toLowerCase()) {
        case 'approved':
            bgColor = '#d1fae5'; // bg-emerald-100
            textColor = '#065f46'; // text-emerald-800
            break;
        case 'pending':
            bgColor = '#fef3c7'; // bg-yellow-100
            textColor = '#92400e'; // text-yellow-800
            break;
        case 'active':
            bgColor = '#cffafe'; // bg-cyan-100
            textColor = '#155e75'; // text-cyan-800
            break;
        case 'overdue':
        case 'rejected':
            bgColor = '#ffe4e6'; // bg-rose-100
            textColor = '#9f1239'; // text-rose-800
            break;
        case 'completed':
        case 'void':
            bgColor = '#f1f5f9'; // bg-slate-100
            textColor = '#1e293b'; // text-slate-800
            break;
        default:
            bgColor = '#f3f4f6'; // default gray
            textColor = '#374151';
    }

    const badgeStyle = {
        backgroundColor: bgColor,
        color: textColor,
        padding: '4px 12px',
        borderRadius: '9999px',
        fontWeight: 'bold',
        fontSize: '0.75rem',
        display: 'inline-block',
        textTransform: 'uppercase'
    };

    return (
        <span style={badgeStyle}>
            {label}
        </span>
    );
};

export default StatusBadge;
