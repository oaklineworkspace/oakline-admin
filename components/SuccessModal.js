// components/SuccessModal.js
import React from 'react';
import Link from 'next/link';

export default function SuccessModal({ accountNumber, enrollLink, onClose }) {
  return (
    <div style={{
      position: 'fixed',
      top:0, left:0,
      width:'100%', height:'100%',
      background:'rgba(0,0,0,0.6)',
      display:'flex', justifyContent:'center', alignItems:'center',
      zIndex:1000
    }}>
      <div style={{ background:'#fff', padding:'30px', borderRadius:'10px', textAlign:'center', maxWidth:'400px' }}>
        <h2>Application Submitted!</h2>
        <p>Your account number is: <strong>{accountNumber}</strong></p>
        <p>Click below to enroll in online banking:</p>
        <Link href={enrollLink}>
          <button style={{ padding:'10px 20px', background:'#0070f3', color:'#fff', border:'none', borderRadius:'5px', cursor:'pointer' }}>
            Enroll Now
          </button>
        </Link>
        <button onClick={onClose} style={{ marginTop:'15px', background:'none', border:'none', color:'#555', cursor:'pointer' }}>Close</button>
      </div>
    </div>
  );
}
