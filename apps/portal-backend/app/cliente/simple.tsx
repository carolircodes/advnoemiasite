import { redirect } from "next/navigation";

import { requireProfile } from "@/lib/auth/guards";

export default async function SimpleClientPage() {
  console.log("[cliente.simple] === PÁGINA SIMPLES CARREGADA ===");
  
  try {
    console.log("[cliente.simple] Chamando requireProfile...");
    const profile = await requireProfile(["cliente"]);
    console.log("[cliente.simple] Profile carregado:", {
      id: profile.id,
      email: profile.email,
      role: profile.role
    });

    if (!profile.first_login_completed_at) {
      console.log("[cliente.simple] Redirecionando para primeiro acesso");
      redirect("/auth/primeiro-acesso");
    }

    console.log("[cliente.simple] Renderizando página simples...");
    
    return (
      <div style={{ 
        padding: "20px", 
        fontFamily: "Arial, sans-serif",
        backgroundColor: "#f8f9fa",
        minHeight: "100vh"
      }}>
        <div style={{
          maxWidth: "800px",
          margin: "0 auto",
          backgroundColor: "white",
          padding: "40px",
          borderRadius: "12px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.1)"
        }}>
          <h1 style={{ 
            color: "#333", 
            marginBottom: "20px",
            fontSize: "28px",
            fontWeight: "bold"
          }}>
            Portal do Cliente - Versão Simples
          </h1>
          
          <div style={{
            backgroundColor: "#e8f4f8",
            padding: "20px",
            borderRadius: "8px",
            marginBottom: "30px"
          }}>
            <h2 style={{ color: "#0066cc", marginTop: 0 }}>Dados do Perfil:</h2>
            <ul style={{ color: "#333", paddingLeft: "20px", lineHeight: "1.8" }}>
              <li><strong>ID:</strong> {profile.id}</li>
              <li><strong>Nome:</strong> {profile.full_name || "Não definido"}</li>
              <li><strong>Email:</strong> {profile.email}</li>
              <li><strong>Role:</strong> {profile.role}</li>
              <li><strong>First Login:</strong> {profile.first_login_completed_at || "Não concluído"}</li>
              <li><strong>Is Active:</strong> {profile.is_active ? "Sim" : "Não"}</li>
            </ul>
          </div>
          
          <div style={{
            backgroundColor: "#fff3cd",
            padding: "20px",
            borderRadius: "8px",
            marginBottom: "30px"
          }}>
            <h3 style={{ color: "#856404", marginTop: 0 }}>STATUS DA PÁGINA:</h3>
            <p style={{ color: "#333", lineHeight: "1.6" }}>
              ✅ Página carregou com sucesso<br/>
              ✅ Profile foi obtido<br/>
              ✅ Sem redirecionamento<br/>
              ✅ Renderização básica funcionando
            </p>
          </div>
          
          <div style={{ marginTop: "30px", textAlign: "center" }}>
            <a href="/cliente" style={{
              display: "inline-block",
              padding: "12px 24px",
              backgroundColor: "#007bff",
              color: "white",
              textDecoration: "none",
              borderRadius: "6px",
              fontWeight: "bold",
              marginRight: "10px"
            }}>
              Voltar para página original
            </a>
            <a href="/cliente/test" style={{
              display: "inline-block",
              padding: "12px 24px",
              backgroundColor: "#28a745",
              color: "white",
              textDecoration: "none",
              borderRadius: "6px",
              fontWeight: "bold"
            }}>
              Ir para página de teste
            </a>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error("[cliente.simple] ERRO:", error);
    
    return (
      <div style={{ 
        padding: "20px", 
        fontFamily: "Arial, sans-serif",
        backgroundColor: "#ffebee",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}>
        <div style={{
          backgroundColor: "white",
          padding: "40px",
          borderRadius: "12px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
          maxWidth: "600px",
          width: "100%"
        }}>
          <h1 style={{ color: "#d32f2f", marginBottom: "20px" }}>ERRO NA PÁGINA SIMPLES</h1>
          <p style={{ color: "#333", marginBottom: "10px" }}>
            <strong>Erro:</strong> {error instanceof Error ? error.message : String(error)}
          </p>
          <pre style={{ 
            backgroundColor: "#f8f9fa", 
            padding: "15px", 
            borderRadius: "4px",
            overflow: "auto",
            fontSize: "12px"
          }}>
            {error instanceof Error ? error.stack : 'No stack available'}
          </pre>
        </div>
      </div>
    );
  }
}
