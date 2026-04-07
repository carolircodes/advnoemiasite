export default function Home() {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>🚀 Advnoemia Site</h1>
      <p>Next.js App Router is working!</p>
      <div style={{ marginTop: '20px' }}>
        <h3>API Test Links:</h3>
        <ul>
          <li><a href="/api/test" target="_blank">/api/test</a></li>
          <li><a href="/api/whatsapp/webhook" target="_blank">/api/whatsapp/webhook</a></li>
        </ul>
      </div>
    </div>
  );
}
