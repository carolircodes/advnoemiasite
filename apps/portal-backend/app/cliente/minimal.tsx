export default function MinimalClientPage() {
  console.log("[cliente.minimal] === PÁGINA MINIMAL CARREGADA ===");
  
  return (
    <html>
      <head>
        <title>Teste Minimal</title>
      <meta charSet="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <script dangerouslySetInnerHTML={{
        __html: `
          console.log("[cliente.minimal] SCRIPT EXECUTADO NO CLIENT");
          window.addEventListener('error', function(e) {
            console.error('[cliente.minimal] ERRO GLOBAL:', e.error);
          });
          window.addEventListener('unhandledrejection', function(e) {
            console.error('[cliente.minimal] PROMESSA REJEITADA:', e.reason);
          });
        `
      }} />
      </head>
      <body style={{ margin: 0, padding: 0, fontFamily: 'Arial, sans-serif' }}>
        <div style={{ 
          padding: '20px', 
          backgroundColor: '#f5f5f5',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '40px',
            borderRadius: '8px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
            maxWidth: '600px',
            width: '100%'
          }}>
            <h1 style={{ color: '#333', marginBottom: '20px' }}>PÁGINA MINIMAL DE TESTE</h1>
            <p style={{ color: '#666', lineHeight: '1.6' }}>
              Esta é uma página HTML pura para testar se o problema está no React/Next.js.
            </p>
            <div style={{
              backgroundColor: '#e8f4f8',
              padding: '15px',
              borderRadius: '4px',
              marginTop: '20px'
            }}>
              <h3 style={{ color: '#0066cc', marginTop: 0 }}>DEBUG INFO:</h3>
              <ul style={{ color: '#333', paddingLeft: '20px' }}>
                <li>Se você está vendo esta página, o servidor está funcionando</li>
                <li>Se o console não mostrar erros, o problema está em outro lugar</li>
                <li>Verifique o console do navegador (F12)</li>
              </ul>
            </div>
            <div style={{ marginTop: '30px', textAlign: 'center' }}>
              <a href="/cliente" style={{
                display: 'inline-block',
                padding: '12px 24px',
                backgroundColor: '#007bff',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '4px',
                fontWeight: 'bold'
              }}>
                Voltar para página original
              </a>
            </div>
          </div>
        </div>
        <script dangerouslySetInnerHTML={{
          __html: `
            console.log("[cliente.minimal] SCRIPT NO BODY EXECUTADO");
            document.addEventListener('DOMContentLoaded', function() {
              console.log("[cliente.minimal] DOM CARREGADO");
            });
          `
        }} />
      </body>
    </html>
  );
}
