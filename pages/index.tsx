import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the static HTML file
    window.location.href = '/dist/index.html';
  }, []);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      fontFamily: 'system-ui',
      background: '#f8fafc'
    }}>
      <div style={{
        textAlign: 'center',
        padding: '40px',
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{ color: '#1e40af', marginBottom: '20px' }}>🤖 BomBot</h1>
        <p style={{ color: '#6b7280', marginBottom: '20px' }}>Loading application...</p>
        <div style={{
          width: '40px',
          height: '40px',
          border: '4px solid #e5e7eb',
          borderTop: '4px solid #3b82f6',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto'
        }}></div>
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
        <p style={{ color: '#9ca3af', fontSize: '14px', marginTop: '20px' }}>
          If this page doesn't redirect automatically, 
          <a href="/dist/index.html" style={{ color: '#3b82f6', textDecoration: 'none' }}> click here</a>
        </p>
      </div>
    </div>
  );
} 